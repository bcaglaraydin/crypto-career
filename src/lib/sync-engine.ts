import { getDb } from './db';
import {
  getSpotAccount,
  getWalletBalances,
  getCryptoDeposits,
  getCryptoWithdrawals,
  getFiatOrders,
  getSymbolTrades,
  getConvertHistory,
  getFuturesIncome,
  getFuturesPositions,
  getUsdtTryDailyKlines,
  getDailyKlines,
  getAllPrices,
  getCredentials,
} from './binance';

export interface SyncStatus {
  inProgress: boolean;
  stage: string;
  progress: number;
  totalStages: number;
  message: string;
  error?: string;
  tradesCount: number;
  transfersCount: number;
  lastSyncedAt?: string;
  lastSyncedTime?: number;
  isIncremental?: boolean;
  newTradesCount?: number;
  newTransfersCount?: number;
}

let activeSync: SyncStatus = {
  inProgress: false,
  stage: 'IDLE',
  progress: 0,
  totalStages: 6,
  message: 'No synchronization performed yet.',
  tradesCount: 0,
  transfersCount: 0,
};

export function parseLastSyncTime(dateStr?: string, timeStr?: string): number | null {
  if (timeStr && !isNaN(Number(timeStr))) {
    return Number(timeStr);
  }
  if (!dateStr) return null;

  // Support legacy format: "DD.MM.YYYY HH:mm:ss" as well as standard en-US / ISO strings
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;
    const dt = new Date(year, month, day, hour, min, sec);
    if (!isNaN(dt.getTime())) return dt.getTime();
  }

  const parsed = new Date(dateStr).getTime();
  return isNaN(parsed) ? null : parsed;
}

export function getSyncStatus(): SyncStatus {
  const db = getDb();
  const tradeCountRow = db.prepare('SELECT COUNT(*) as count FROM trades').get() as { count: number };
  const transferCountRow = db.prepare('SELECT COUNT(*) as count FROM transfers').get() as { count: number };
  const lastSyncRow = db.prepare('SELECT value FROM sync_state WHERE key = ?').get('last_synced_at') as { value: string } | undefined;
  const lastSyncTimeRow = db.prepare('SELECT value FROM sync_state WHERE key = ?').get('last_synced_time') as { value: string } | undefined;

  const parsedTime = parseLastSyncTime(lastSyncRow?.value, lastSyncTimeRow?.value);

  return {
    ...activeSync,
    tradesCount: tradeCountRow ? tradeCountRow.count : 0,
    transfersCount: transferCountRow ? transferCountRow.count : 0,
    lastSyncedAt: lastSyncRow ? lastSyncRow.value : undefined,
    lastSyncedTime: parsedTime || undefined,
  };
}

export interface RunSyncOptions {
  fullSync?: boolean;
}

export async function runSync(options?: RunSyncOptions, onProgress?: (status: SyncStatus) => void): Promise<SyncStatus> {
  if (activeSync.inProgress) {
    return activeSync;
  }

  const creds = getCredentials();
  if (!creds) {
    throw new Error('BINANCE_API_KEY or BINANCE_API_SECRET not found in .env.local.');
  }

  const db = getDb();

  // Clean demo records
  db.exec("DELETE FROM trades WHERE id LIKE 'demo_%'");
  db.exec("DELETE FROM transfers WHERE id LIKE 'demo_%'");
  db.exec("DELETE FROM futures_income WHERE id LIKE 'demo_%'");

  // Check if we can do an incremental (delta) sync
  const lastSyncAtRow = db.prepare('SELECT value FROM sync_state WHERE key = ?').get('last_synced_at') as { value: string } | undefined;
  const lastSyncTimeRow = db.prepare('SELECT value FROM sync_state WHERE key = ?').get('last_synced_time') as { value: string } | undefined;
  const tradeCountRow = db.prepare('SELECT COUNT(*) as count FROM trades').get() as { count: number };

  const parsedLastSync = parseLastSyncTime(lastSyncAtRow?.value, lastSyncTimeRow?.value);
  const isIncremental = !options?.fullSync && parsedLastSync !== null && tradeCountRow.count > 0;

  // 48-hour safety lookback buffer to catch any recent settlements or delayed reporting
  const SAFETY_BUFFER = 48 * 60 * 60 * 1000;
  const syncStartTime = isIncremental
    ? Math.max(0, parsedLastSync! - SAFETY_BUFFER)
    : Date.now() - 8 * 365 * 24 * 60 * 60 * 1000;

  const syncStartDateStr = isIncremental ? new Date(syncStartTime).toLocaleDateString('en-US') : 'All History';

  activeSync.inProgress = true;
  activeSync.progress = 1;
  activeSync.totalStages = 6;
  activeSync.stage = 'INITIALIZING';
  activeSync.isIncremental = isIncremental;
  activeSync.newTradesCount = 0;
  activeSync.newTransfersCount = 0;
  activeSync.message = isIncremental
    ? `Delta synchronization starting (from ${syncStartDateStr} to present)...`
    : 'Full synchronization (8-year history) starting...';
  if (onProgress) onProgress(activeSync);

  let newTradesCount = 0;
  let newTransfersCount = 0;

  try {
    // -------------------------------------------------------------
    // 1. Update historical USDT/TRY rates
    // -------------------------------------------------------------
    activeSync.stage = 'HISTORICAL_RATES';
    activeSync.progress = 1;
    activeSync.message = isIncremental
      ? 'Fetching recent USDT/TRY rates...'
      : 'Scanning historical USDT/TRY rates (2019–present)...';
    if (onProgress) onProgress(activeSync);

    const now = Date.now();
    let startKlines = new Date('2019-01-01').getTime();

    if (isIncremental) {
      const maxRateRow = db.prepare('SELECT MAX(day) as max_day FROM historical_rates').get() as { max_day: string | null } | undefined;
      if (maxRateRow?.max_day) {
        startKlines = Math.max(startKlines, new Date(maxRateRow.max_day).getTime() - 2 * 24 * 60 * 60 * 1000);
      }
    }

    const insertRateStmt = db.prepare('INSERT OR REPLACE INTO historical_rates (day, rate) VALUES (?, ?)');

    while (startKlines < now) {
      const klines = await getUsdtTryDailyKlines(startKlines);
      if (!klines || klines.length === 0) break;

      db.exec('BEGIN TRANSACTION');
      for (const k of klines) {
        const dayStr = new Date(k.time).toISOString().split('T')[0];
        insertRateStmt.run(dayStr, k.close);
      }
      db.exec('COMMIT');

      const lastTime = klines[klines.length - 1].time;
      if (lastTime <= startKlines) break;
      startKlines = lastTime + 24 * 60 * 60 * 1000;
    }

    // -------------------------------------------------------------
    // 2. Fetch Live Wallet and Spot Balances
    // -------------------------------------------------------------
    activeSync.stage = 'BALANCES';
    activeSync.progress = 2;
    activeSync.message = 'Fetching spot and futures wallet balances...';
    if (onProgress) onProgress(activeSync);

    const account = await getSpotAccount();
    const insertSpotBalance = db.prepare('INSERT OR REPLACE INTO spot_balances (asset, free, locked) VALUES (?, ?, ?)');
    db.exec('DELETE FROM spot_balances');
    db.exec('BEGIN TRANSACTION');
    for (const b of account.balances) {
      const free = parseFloat(b.free);
      const locked = parseFloat(b.locked);
      if (free > 0 || locked > 0) {
        insertSpotBalance.run(b.asset.toUpperCase(), free, locked);
      }
    }
    db.exec('COMMIT');

    const walletBalances = await getWalletBalances();
    const tickers = await getAllPrices();
    const btcPrice = parseFloat(tickers.find((t) => t.symbol === 'BTCUSDT')?.price || '80000');

    const insertWalletBalance = db.prepare('INSERT OR REPLACE INTO wallet_balances (wallet_name, balance_btc, balance_usdt) VALUES (?, ?, ?)');
    db.exec('DELETE FROM wallet_balances');
    db.exec('BEGIN TRANSACTION');
    for (const wb of walletBalances) {
      if (wb.activate) {
        const btcVal = parseFloat(wb.balance);
        const usdtVal = btcVal * btcPrice;
        insertWalletBalance.run(wb.walletName, btcVal, usdtVal);
      }
    }
    db.exec('COMMIT');

    // -------------------------------------------------------------
    // 3. Fetch Deposit & Withdrawal History (Transfers)
    // -------------------------------------------------------------
    activeSync.stage = 'TRANSFERS';
    activeSync.progress = 3;
    activeSync.message = isIncremental
      ? 'Checking for new deposits and withdrawals since last sync...'
      : 'Scanning 8-year deposit and withdrawal history...';
    if (onProgress) onProgress(activeSync);

    const insertTransferStmt = db.prepare(`
      INSERT OR REPLACE INTO transfers (id, asset, amount, type, fiat_or_crypto, time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const checkTransferStmt = db.prepare('SELECT id FROM transfers WHERE id = ?');

    const deposits = await getCryptoDeposits(creds, isIncremental ? syncStartTime : undefined);
    const withdrawals = await getCryptoWithdrawals(creds, isIncremental ? syncStartTime : undefined);

    db.exec('BEGIN TRANSACTION');
    for (const dep of deposits) {
      const transferId = `crypto_dep_${dep.id || dep.txId}`;
      if (!checkTransferStmt.get(transferId)) {
        newTransfersCount++;
      }
      insertTransferStmt.run(
        transferId,
        dep.coin.toUpperCase(),
        parseFloat(dep.amount),
        'DEPOSIT',
        'CRYPTO',
        dep.insertTime,
        dep.status === 1 ? 'SUCCESS' : 'PENDING'
      );
    }
    for (const w of withdrawals) {
      const transferId = `crypto_wd_${w.id || w.txId}`;
      if (!checkTransferStmt.get(transferId)) {
        newTransfersCount++;
      }
      insertTransferStmt.run(
        transferId,
        w.coin.toUpperCase(),
        parseFloat(w.amount),
        'WITHDRAW',
        'CRYPTO',
        new Date(w.applyTime).getTime(),
        w.status === 6 ? 'SUCCESS' : 'PENDING'
      );
    }
    db.exec('COMMIT');

    // Fiat orders
    const fiatDeposits = await getFiatOrders(0, isIncremental ? syncStartTime : undefined);
    const fiatWithdrawals = await getFiatOrders(1, isIncremental ? syncStartTime : undefined);

    db.exec('BEGIN TRANSACTION');
    if (fiatDeposits.data) {
      for (const fd of fiatDeposits.data) {
        const transferId = `fiat_dep_${fd.orderNo}`;
        if (!checkTransferStmt.get(transferId)) {
          newTransfersCount++;
        }
        insertTransferStmt.run(
          transferId,
          fd.fiatCurrency.toUpperCase(),
          parseFloat(fd.amount),
          'DEPOSIT',
          'FIAT',
          fd.createTime,
          fd.status
        );
      }
    }
    if (fiatWithdrawals.data) {
      for (const fw of fiatWithdrawals.data) {
        const transferId = `fiat_wd_${fw.orderNo}`;
        if (!checkTransferStmt.get(transferId)) {
          newTransfersCount++;
        }
        insertTransferStmt.run(
          transferId,
          fw.fiatCurrency.toUpperCase(),
          parseFloat(fw.amount),
          'WITHDRAW',
          'FIAT',
          fw.createTime,
          fw.status
        );
      }
    }
    db.exec('COMMIT');

    // -------------------------------------------------------------
    // 4. Identify Traded Pairs (Discovery)
    // -------------------------------------------------------------
    activeSync.stage = 'DISCOVERY';
    activeSync.progress = 4;
    activeSync.message = isIncremental
      ? 'Preparing active and portfolio trading pairs...'
      : 'Discovering all historical trading pairs...';
    if (onProgress) onProgress(activeSync);

    const quoteAssets = ['USDT', 'TRY', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'];
    const targetPairsSet = new Set<string>();

    if (isIncremental) {
      // 1. All pairs already known and traded in database
      const existingSymbols = db.prepare('SELECT DISTINCT symbol FROM trades').all() as Array<{ symbol: string }>;
      for (const row of existingSymbols) {
        if (row.symbol) targetPairsSet.add(row.symbol.toUpperCase());
      }

      // 2. Pairs for any asset currently held with non-zero balance
      for (const b of account.balances) {
        const free = parseFloat(b.free);
        const locked = parseFloat(b.locked);
        if (free > 0 || locked > 0) {
          const asset = b.asset.toUpperCase();
          if (!['USDT', 'USD', 'TRY', 'BUSD', 'FDUSD', 'USDC'].includes(asset)) {
            for (const quote of ['USDT', 'TRY', 'BTC', 'FDUSD']) {
              if (asset !== quote) {
                targetPairsSet.add(`${asset}${quote}`);
              }
            }
          }
        }
      }

      // 3. Newly deposited coins
      for (const dep of deposits) {
        const coin = dep.coin.toUpperCase();
        if (!['USDT', 'USD', 'TRY', 'BUSD', 'FDUSD', 'USDC'].includes(coin)) {
          for (const quote of ['USDT', 'TRY', 'BTC', 'FDUSD']) {
            targetPairsSet.add(`${coin}${quote}`);
          }
        }
      }
    } else {
      // Full sync discovery
      const discoveredAssets = new Set<string>();
      for (const b of account.balances) {
        if (parseFloat(b.free) > 0 || parseFloat(b.locked) > 0) {
          discoveredAssets.add(b.asset.toUpperCase());
        }
      }
      for (const dep of deposits) discoveredAssets.add(dep.coin.toUpperCase());
      for (const w of withdrawals) discoveredAssets.add(w.coin.toUpperCase());

      const topHistoricalAssets = [
        'ADA', 'NANO', 'XNO', 'IOTA', 'MIOTA', 'MATIC', 'POL', 'XLM', 'NEO',
        'SOL', 'AVAX', 'DOT', 'DOGE', 'SHIB', 'XRP', 'LTC', 'LINK', 'UNI',
        'NEAR', 'APT', 'SUI', 'ARB', 'OP', 'PEPE', 'FTM', 'SAND', 'MANA',
        'GALA', 'CHZ', 'HOT', 'BTT', 'BTTC', 'VET', 'TRX', 'EOS', 'XTZ'
      ];
      for (const a of topHistoricalAssets) discoveredAssets.add(a);

      for (const asset of Array.from(discoveredAssets)) {
        if (['USDT', 'USD', 'TRY', 'BUSD', 'FDUSD', 'USDC'].includes(asset)) continue;
        for (const quote of quoteAssets) {
          if (asset !== quote) {
            targetPairsSet.add(`${asset}${quote}`);
          }
        }
      }
    }

    const targetPairs = Array.from(targetPairsSet);

    // -------------------------------------------------------------
    // 5. Scan Spot Trades
    // -------------------------------------------------------------
    activeSync.stage = 'SPOT_TRADES';
    activeSync.progress = 5;
    activeSync.message = isIncremental
      ? `Scanning new trades across ${targetPairs.length} pairs (${syncStartDateStr} - Present)...`
      : `Scanning entire trade history across ${targetPairs.length} pairs...`;
    if (onProgress) onProgress(activeSync);

    const insertTradeStmt = db.prepare(`
      INSERT OR REPLACE INTO trades (id, source, symbol, base_asset, quote_asset, side, price, qty, quote_qty, commission, commission_asset, time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const checkTradeStmt = db.prepare('SELECT id FROM trades WHERE id = ?');

    const CHUNK_SIZE = 8;
    for (let i = 0; i < targetPairs.length; i += CHUNK_SIZE) {
      const chunk = targetPairs.slice(i, i + CHUNK_SIZE);
      const processedCount = Math.min(i + CHUNK_SIZE, targetPairs.length);
      activeSync.message = `Checking trade history (${processedCount}/${targetPairs.length})...`;
      if (onProgress) onProgress(activeSync);

      const results = await Promise.all(
        chunk.map(async (pair) => {
          try {
            const trades = await getSymbolTrades(pair, undefined, isIncremental ? syncStartTime : undefined);
            return { pair, trades };
          } catch (err: unknown) {
            const error = err as Error;
            if (!error.message.includes('-1121') && !error.message.includes('Invalid symbol')) {
              console.warn(`Pair check error ${pair}:`, error.message);
            }
            return { pair, trades: [] };
          }
        })
      );

      db.exec('BEGIN TRANSACTION');
      for (const { pair, trades } of results) {
        if (trades && trades.length > 0) {
          for (const tr of trades) {
            const tradeId = `spot_${tr.id}`;
            if (!checkTradeStmt.get(tradeId)) {
              newTradesCount++;
            }

            let quote = 'USDT';
            for (const q of quoteAssets) {
              if (pair.endsWith(q)) {
                quote = q;
                break;
              }
            }
            const base = pair.substring(0, pair.length - quote.length);

            insertTradeStmt.run(
              tradeId,
              'SPOT',
              tr.symbol,
              base,
              quote,
              tr.isBuyer ? 'BUY' : 'SELL',
              parseFloat(tr.price),
              parseFloat(tr.qty),
              parseFloat(tr.quoteQty),
              parseFloat(tr.commission),
              tr.commissionAsset,
              tr.time
            );
          }
        }
      }
      db.exec('COMMIT');

      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    // Convert trades
    const convertRes = await getConvertHistory(isIncremental ? syncStartTime : undefined);
    if (convertRes.list && convertRes.list.length > 0) {
      db.exec('BEGIN TRANSACTION');
      for (const c of convertRes.list) {
        if (c.orderStatus === 'SUCCESS') {
          const tradeId = `convert_from_${c.orderId}`;
          if (!checkTradeStmt.get(tradeId)) {
            newTradesCount++;
          }
          insertTradeStmt.run(
            tradeId,
            'CONVERT',
            `${c.fromAsset}${c.toAsset}`,
            c.fromAsset.toUpperCase(),
            c.toAsset.toUpperCase(),
            'SELL',
            parseFloat(c.ratio),
            parseFloat(c.fromAmount),
            parseFloat(c.toAmount),
            0,
            '',
            c.createTime
          );
        }
      }
      db.exec('COMMIT');
    }

    // -------------------------------------------------------------
    // 6. Futures Income & PnL
    // -------------------------------------------------------------
    activeSync.stage = 'FUTURES_INCOME';
    activeSync.progress = 6;
    activeSync.message = 'Scanning futures income, realized PnL, and commissions...';
    if (onProgress) onProgress(activeSync);

    const insertFuturesStmt = db.prepare(`
      INSERT OR REPLACE INTO futures_income (id, symbol, asset, income, income_type, time)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const futuresIncome = await getFuturesIncome(isIncremental ? syncStartTime : undefined);
    if (futuresIncome && futuresIncome.length > 0) {
      db.exec('BEGIN TRANSACTION');
      for (const f of futuresIncome) {
        insertFuturesStmt.run(
          `futures_${f.tranId}_${f.time}`,
          f.symbol || '',
          f.asset.toUpperCase(),
          parseFloat(f.income),
          f.incomeType,
          f.time
        );
      }
      db.exec('COMMIT');
    }

    // Live Open Futures Positions
    const insertPositionStmt = db.prepare(`
      INSERT OR REPLACE INTO futures_positions (
        symbol, position_amt, entry_price, mark_price, unrealized_profit,
        liquidation_price, leverage, notional, margin_type, position_side, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const openPositions = await getFuturesPositions(creds);
    db.exec('DELETE FROM futures_positions');
    if (openPositions && openPositions.length > 0) {
      db.exec('BEGIN TRANSACTION');
      for (const p of openPositions) {
        insertPositionStmt.run(
          p.symbol,
          parseFloat(p.positionAmt),
          parseFloat(p.entryPrice),
          parseFloat(p.markPrice),
          parseFloat(p.unRealizedProfit),
          parseFloat(p.liquidationPrice),
          parseInt(p.leverage, 10),
          parseFloat(p.notional),
          p.marginType,
          p.positionSide,
          p.updateTime
        );
      }
      db.exec('COMMIT');
    }

    // -------------------------------------------------------------
    // 7. Update Daily Historical Rates for Active Holdings
    // -------------------------------------------------------------
    // Ensures mark-to-market daily rates stay fresh for active holdings
    const insertCryptoRateStmt = db.prepare('INSERT OR REPLACE INTO historical_crypto_rates (pair, day, rate) VALUES (?, ?, ?)');
    const heldAssets = account.balances.filter((b) => (parseFloat(b.free) > 0 || parseFloat(b.locked) > 0) && !['USDT', 'USD', 'TRY', 'BUSD', 'FDUSD', 'USDC'].includes(b.asset.toUpperCase()));

    for (const b of heldAssets) {
      const symbol = `${b.asset.toUpperCase()}USDT`;
      try {
        const klines = await getDailyKlines(symbol, isIncremental ? syncStartTime : Date.now() - 30 * 24 * 60 * 60 * 1000);
        if (klines && klines.length > 0) {
          db.exec('BEGIN TRANSACTION');
          for (const k of klines) {
            const dayStr = new Date(k.time).toISOString().split('T')[0];
            insertCryptoRateStmt.run(symbol, dayStr, k.close);
          }
          db.exec('COMMIT');
        }
      } catch {
        // Silently continue if pair doesn't exist against USDT
      }
    }

    // -------------------------------------------------------------
    // Completed: Save State
    // -------------------------------------------------------------
    const nowTime = Date.now();
    const syncTimeStr = new Date(nowTime).toLocaleString('en-US');
    db.prepare('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)').run('last_synced_at', syncTimeStr);
    db.prepare('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)').run('last_synced_time', nowTime.toString());

    activeSync.inProgress = false;
    activeSync.stage = 'COMPLETED';
    activeSync.newTradesCount = newTradesCount;
    activeSync.newTransfersCount = newTransfersCount;

    if (isIncremental) {
      if (newTradesCount > 0 || newTransfersCount > 0) {
        activeSync.message = `Delta sync complete! Added ${newTradesCount} new trade(s) and ${newTransfersCount} new transfer(s).`;
      } else {
        activeSync.message = 'Data is up to date! No new transactions since last sync.';
      }
    } else {
      activeSync.message = 'All historical data successfully synchronized!';
    }

    if (onProgress) onProgress(activeSync);

    return getSyncStatus();
  } catch (err: unknown) {
    const error = err as Error;
    activeSync.inProgress = false;
    activeSync.stage = 'ERROR';
    activeSync.error = error.message;
    activeSync.message = `Sync error: ${error.message}`;
    if (onProgress) onProgress(activeSync);
    throw error;
  }
}
