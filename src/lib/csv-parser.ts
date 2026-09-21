import { getDb } from './db';

export interface CsvParseResult {
  tradesImported: number;
  tradesSkipped: number;
  transfersImported: number;
  errors: string[];
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim().replace(/^"|"$/g, ''));
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim().replace(/^"|"$/g, ''));
  return result;
}

export function parseBinanceCsv(csvContent: string): CsvParseResult {
  const db = getDb();
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { tradesImported: 0, tradesSkipped: 0, transfersImported: 0, errors: ['CSV file is empty or invalid.'] };
  }

  const rawHeader = lines[0].toLowerCase();
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());

  let tradesImported = 0;
  let tradesSkipped = 0;
  let transfersImported = 0;
  const errors: string[] = [];

  // Load all existing trades from the database for anti-duplicate matching
  const existingTrades = db.prepare('SELECT id, symbol, side, price, qty, time FROM trades').all() as Array<{
    id: string;
    symbol: string;
    side: string;
    price: number;
    qty: number;
    time: number;
  }>;

  const insertTradeStmt = db.prepare(`
    INSERT OR REPLACE INTO trades (id, source, symbol, base_asset, quote_asset, side, price, qty, quote_qty, commission, commission_asset, time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTransferStmt = db.prepare(`
    INSERT OR REPLACE INTO transfers (id, asset, amount, type, fiat_or_crypto, time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION');

  try {
    const isTradeHistory = rawHeader.includes('pair') || rawHeader.includes('market') || rawHeader.includes('price');
    const isStatement = rawHeader.includes('operation') || rawHeader.includes('account');

    if (isTradeHistory) {
      const orderNoIdx = headers.findIndex((h) => h.includes('order'));
      const dateIdx = headers.findIndex((h) => h === 'time' || h === 'date' || h.includes('time') || h.includes('date'));
      const pairIdx = headers.findIndex((h) => h === 'pair' || h === 'market' || h === 'symbol');
      const sideIdx = headers.findIndex((h) => h === 'side' || h === 'type');
      const priceIdx = headers.findIndex((h) => h === 'price');
      const executedIdx = headers.findIndex((h) => h === 'executed');
      const amountIdx = headers.findIndex((h) => h === 'amount');
      const totalIdx = headers.findIndex((h) => h.includes('total') || h.includes('quote'));
      const feeIdx = headers.findIndex((h) => h === 'fee' || h.includes('fee'));
      const feeCoinIdx = headers.findIndex((h) => h.includes('fee coin') || h.includes('fee asset'));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cleanParts = splitCsvLine(line);

        if (cleanParts.length < 4) continue;
        if (pairIdx === -1 || sideIdx === -1) continue;

        const dateStr = cleanParts[dateIdx] || new Date().toISOString();
        const time = new Date(dateStr).getTime() || Date.now();
        const pair = (cleanParts[pairIdx] || '').toUpperCase().replace(/[\/_]/g, '');
        const side = (cleanParts[sideIdx] || '').toUpperCase().includes('BUY') ? 'BUY' : 'SELL';
        const price = parseFloat(cleanParts[priceIdx]) || 0;

        // Base asset quantity executed
        let qty = 0;
        if (executedIdx !== -1) {
          qty = parseFloat(cleanParts[executedIdx]) || 0;
        } else if (amountIdx !== -1) {
          qty = parseFloat(cleanParts[amountIdx]) || 0;
        }

        // Quote asset total
        let quoteQty = 0;
        if (executedIdx !== -1 && amountIdx !== -1) {
          quoteQty = parseFloat(cleanParts[amountIdx]) || 0;
        } else if (totalIdx !== -1) {
          quoteQty = parseFloat(cleanParts[totalIdx]) || 0;
        }
        if (isNaN(quoteQty) || quoteQty === 0) {
          quoteQty = price * qty;
        }

        if (qty <= 0) continue;

        // Parse fee & fee currency
        let fee = 0;
        let feeCoin = '';
        if (feeIdx !== -1 && cleanParts[feeIdx]) {
          const feeRaw = cleanParts[feeIdx];
          const feeMatch = feeRaw.match(/^([0-9.]+)\s*([A-Za-z]+)?$/);
          if (feeMatch) {
            fee = parseFloat(feeMatch[1]) || 0;
            feeCoin = (feeMatch[2] || '').toUpperCase();
          } else {
            fee = parseFloat(feeRaw) || 0;
          }
        }
        if (!feeCoin && feeCoinIdx !== -1) {
          feeCoin = (cleanParts[feeCoinIdx] || '').toUpperCase();
        }

        // Extract base and quote asset
        const quotes = ['USDT', 'TRY', 'BUSD', 'FDUSD', 'USDC', 'BTC', 'ETH', 'BNB'];
        let quoteAsset = 'USDT';
        for (const q of quotes) {
          if (pair.endsWith(q)) {
            quoteAsset = q;
            break;
          }
        }
        const baseAsset = pair.substring(0, pair.length - quoteAsset.length) || pair;

        // 1. DUPLICATE CHECK: Verify if this trade already exists in DB
        // Check against existing trades (e.g. from API or previous import)
        const isDuplicate = existingTrades.some((ex) => {
          if (ex.symbol !== pair || ex.side !== side) return false;
          const qtyDiff = Math.abs(ex.qty - qty) / (qty || 1);
          const priceDiff = Math.abs(ex.price - price) / (price || 1);
          const timeDiff = Math.abs(ex.time - time);

          // If exact same qty and price within 10 seconds, it's definitely the same trade
          if (qtyDiff < 0.0001 && priceDiff < 0.0001 && timeDiff < 10000) return true;
          // Or if on the exact same second
          if (Math.abs(Math.floor(ex.time / 1000) - Math.floor(time / 1000)) === 0 && qtyDiff < 0.001) return true;

          return false;
        });

        if (isDuplicate) {
          tradesSkipped++;
          continue;
        }

        const orderNo = orderNoIdx !== -1 ? cleanParts[orderNoIdx] : '';
        const tradeId = orderNo ? `csv_order_${orderNo}_${i}` : `csv_trade_${time}_${pair}_${i}`;

        insertTradeStmt.run(tradeId, 'CSV', pair, baseAsset, quoteAsset, side, price, qty, quoteQty, fee, feeCoin, time);

        // Add to in-memory list so duplicates within the CSV itself are also caught
        existingTrades.push({ id: tradeId, symbol: pair, side, price, qty, time });
        tradesImported++;
      }
    } else if (isStatement) {
      // Binance all-in-one statement format
      const dateIdx = headers.findIndex((h) => h.includes('time') || h.includes('date'));
      const opIdx = headers.findIndex((h) => h.includes('operation'));
      const coinIdx = headers.findIndex((h) => h.includes('coin') || h.includes('asset'));
      const changeIdx = headers.findIndex((h) => h.includes('change') || h.includes('amount'));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        const cleanParts = parts.map((p) => p.trim().replace(/^"|"$/g, ''));
        if (cleanParts.length < 4) continue;

        const dateStr = cleanParts[dateIdx] || new Date().toISOString();
        const time = new Date(dateStr).getTime() || Date.now();
        const op = (cleanParts[opIdx] || '').toLowerCase();
        const coin = (cleanParts[coinIdx] || '').toUpperCase();
        const change = parseFloat(cleanParts[changeIdx]) || 0;

        if (op.includes('deposit')) {
          insertTransferStmt.run(`csv_dep_${time}_${i}`, coin, Math.abs(change), 'DEPOSIT', 'CRYPTO', time, 'SUCCESS');
          transfersImported++;
        } else if (op.includes('withdraw')) {
          insertTransferStmt.run(`csv_wd_${time}_${i}`, coin, Math.abs(change), 'WITHDRAW', 'CRYPTO', time, 'SUCCESS');
          transfersImported++;
        }
      }
    }

    db.exec('COMMIT');
  } catch (err: unknown) {
    db.exec('ROLLBACK');
    const error = err as Error;
    errors.push(error.message);
  }

  return { tradesImported, tradesSkipped, transfersImported, errors };
}
