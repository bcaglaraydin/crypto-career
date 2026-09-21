'use client';

import {
  saveStoredTrades,
  getStoredTrades,
  saveStoredTransfers,
  getStoredTransfers,
  saveStoredBalances,
  saveStoredFutures,
  setStoredSetting,
  getStoredSetting,
  setCachedPortfolio,
} from './client-storage';
import { SyncStatus } from './sync-engine';
import { PortfolioOverview } from './pnl-calculator';

// Call Binance proxy from browser
async function callBinanceProxy<T>(
  endpoint: string,
  params: Record<string, any> = {},
  isSigned = false,
  isFutures = false,
  apiKey?: string,
  apiSecret?: string
): Promise<T> {
  const res = await fetch('/api/proxy/binance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint,
      params,
      isSigned,
      isFutures,
      apiKey,
      apiSecret,
    }),
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Binance API proxy request failed.');
  }
  return json.data as T;
}

export async function runClientSync(
  options?: { fullSync?: boolean; lookback?: string },
  onProgress?: (status: SyncStatus) => void
): Promise<PortfolioOverview> {
  const apiKey = (await getStoredSetting('binance_api_key')) || undefined;
  const apiSecret = (await getStoredSetting('binance_api_secret')) || undefined;

  const status: SyncStatus = {
    inProgress: true,
    stage: 'INITIALIZING',
    progress: 1,
    totalStages: 6,
    message: 'Starting browser-based synchronization...',
    tradesCount: 0,
    transfersCount: 0,
    isIncremental: !options?.fullSync,
  };

  const updateStatus = (updates: Partial<SyncStatus>) => {
    Object.assign(status, updates);
    if (onProgress) onProgress({ ...status });
  };

  updateStatus({ stage: 'INITIALIZING', message: 'Initializing client storage...' });

  const existingTrades = await getStoredTrades();
  const existingTransfers = await getStoredTransfers();
  const lastSyncedTimeStr = await getStoredSetting('last_synced_time');
  const parsedLastSync = lastSyncedTimeStr ? Number(lastSyncedTimeStr) : null;

  const isIncremental = !options?.fullSync && parsedLastSync !== null && existingTrades.length > 0;
  const SAFETY_BUFFER = 48 * 60 * 60 * 1000;
  const syncStartTime = isIncremental
    ? Math.max(0, parsedLastSync! - SAFETY_BUFFER)
    : new Date('2017-01-01').getTime();

  // -------------------------------------------------------------
  // Stage 1 & 2: Balances & Positions
  // -------------------------------------------------------------
  updateStatus({ stage: 'BALANCES', progress: 2, message: 'Fetching spot and futures wallet balances...' });

  const spotAccount = await callBinanceProxy<{
    balances: Array<{ asset: string; free: string; locked: string }>;
  }>('/api/v3/account', {}, true, false, apiKey, apiSecret);

  const spotBalances = (spotAccount.balances || [])
    .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
    .map((b) => ({
      asset: b.asset.toUpperCase(),
      free: parseFloat(b.free),
      locked: parseFloat(b.locked),
    }));

  await saveStoredBalances(spotBalances);

  // Open Futures Positions
  let futuresPositions: any[] = [];
  try {
    const rawPositions = await callBinanceProxy<any[]>('/fapi/v2/positionRisk', {}, true, true, apiKey, apiSecret);
    futuresPositions = (rawPositions || [])
      .filter((p) => Math.abs(parseFloat(p.positionAmt || '0')) > 0.0000001)
      .map((p) => ({
        symbol: p.symbol,
        position_amt: parseFloat(p.positionAmt),
        entry_price: parseFloat(p.entryPrice),
        mark_price: parseFloat(p.markPrice),
        unrealized_profit: parseFloat(p.unRealizedProfit),
        liquidation_price: parseFloat(p.liquidationPrice),
        leverage: parseInt(p.leverage, 10),
        notional: parseFloat(p.notional),
        margin_type: p.marginType,
        position_side: p.positionSide,
        update_time: p.updateTime,
      }));
    await saveStoredFutures(futuresPositions);
  } catch (err) {
    console.warn('Could not fetch futures positions:', err);
  }

  // -------------------------------------------------------------
  // Stage 3: Transfers (Deposits & Withdrawals)
  // -------------------------------------------------------------
  updateStatus({ stage: 'TRANSFERS', progress: 3, message: 'Scanning deposit and withdrawal history...' });

  const newTransfers: any[] = [];
  const NINETY_DAYS = 89 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (let start = syncStartTime; start < now; start += NINETY_DAYS) {
    const end = Math.min(start + NINETY_DAYS, now);
    try {
      const deposits = await callBinanceProxy<any[]>(
        '/sapi/v1/capital/deposit/hisrec',
        { startTime: start, endTime: end, limit: 1000 },
        true,
        false,
        apiKey,
        apiSecret
      );
      if (Array.isArray(deposits)) {
        for (const dep of deposits) {
          newTransfers.push({
            id: `crypto_dep_${dep.id || dep.txId}`,
            asset: dep.coin.toUpperCase(),
            amount: parseFloat(dep.amount),
            type: 'DEPOSIT',
            fiat_or_crypto: 'CRYPTO',
            time: dep.insertTime,
            status: dep.status === 1 ? 'SUCCESS' : 'PENDING',
          });
        }
      }
    } catch {
      // Continue
    }

    try {
      const withdrawals = await callBinanceProxy<any[]>(
        '/sapi/v1/capital/withdraw/history',
        { startTime: start, endTime: end, limit: 1000 },
        true,
        false,
        apiKey,
        apiSecret
      );
      if (Array.isArray(withdrawals)) {
        for (const w of withdrawals) {
          newTransfers.push({
            id: `crypto_wd_${w.id || w.txId}`,
            asset: w.coin.toUpperCase(),
            amount: parseFloat(w.amount),
            type: 'WITHDRAW',
            fiat_or_crypto: 'CRYPTO',
            time: new Date(w.applyTime).getTime(),
            status: w.status === 6 ? 'SUCCESS' : 'PENDING',
          });
        }
      }
    } catch {
      // Continue
    }
  }

  // Deduplicate and save transfers
  const transferMap = new Map<string, any>();
  for (const tr of existingTransfers) transferMap.set(tr.id, tr);
  for (const tr of newTransfers) transferMap.set(tr.id, tr);
  const allTransfers = Array.from(transferMap.values());
  await saveStoredTransfers(allTransfers);

  // -------------------------------------------------------------
  // Stage 4 & 5: Spot Trades
  // -------------------------------------------------------------
  updateStatus({ stage: 'SPOT_TRADES', progress: 5, message: 'Scanning trade history across portfolio pairs...' });

  const targetPairs = new Set<string>();
  for (const b of spotBalances) {
    if (!['USDT', 'USD', 'TRY', 'BUSD', 'FDUSD', 'USDC'].includes(b.asset)) {
      for (const q of ['USDT', 'TRY', 'BTC']) targetPairs.add(`${b.asset}${q}`);
    }
  }
  for (const t of existingTrades) {
    if (t.symbol) targetPairs.add(t.symbol);
  }

  // Include top major pairs by default
  const majorCoins = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'AVAXUSDT', 'DOGEUSDT', 'XRPUSDT', 'ADAUSDT'];
  for (const m of majorCoins) targetPairs.add(m);

  const pairList = Array.from(targetPairs);
  const newTrades: any[] = [];
  const quoteAssets = ['USDT', 'TRY', 'BTC', 'ETH', 'BNB', 'BUSD', 'FDUSD'];

  for (let i = 0; i < pairList.length; i++) {
    const pair = pairList[i];
    updateStatus({
      message: `Checking trade history (${i + 1}/${pairList.length} - ${pair})...`,
    });

    try {
      const trades = await callBinanceProxy<any[]>(
        '/api/v3/myTrades',
        { symbol: pair, startTime: syncStartTime, limit: 1000 },
        true,
        false,
        apiKey,
        apiSecret
      );

      if (Array.isArray(trades)) {
        for (const tr of trades) {
          let quote = 'USDT';
          for (const q of quoteAssets) {
            if (pair.endsWith(q)) {
              quote = q;
              break;
            }
          }
          const base = pair.substring(0, pair.length - quote.length);

          newTrades.push({
            id: `spot_${tr.id}`,
            source: 'SPOT',
            symbol: tr.symbol,
            base_asset: base,
            quote_asset: quote,
            side: tr.isBuyer ? 'BUY' : 'SELL',
            price: parseFloat(tr.price),
            qty: parseFloat(tr.qty),
            quote_qty: parseFloat(tr.quoteQty),
            commission: parseFloat(tr.commission),
            commission_asset: tr.commissionAsset,
            time: tr.time,
          });
        }
      }
    } catch {
      // Pair not traded, continue
    }
  }

  // Deduplicate and save trades
  const tradeMap = new Map<string, any>();
  for (const t of existingTrades) tradeMap.set(t.id, t);
  for (const t of newTrades) tradeMap.set(t.id, t);
  const allTrades = Array.from(tradeMap.values());
  await saveStoredTrades(allTrades);

  // -------------------------------------------------------------
  // Stage 6: Calculate Portfolio via Stateless /api/calculate
  // -------------------------------------------------------------
  updateStatus({ stage: 'FUTURES_INCOME', progress: 6, message: 'Calculating lifetime PnL & timelines...' });

  const calcRes = await fetch('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset: {
        trades: allTrades,
        transfers: allTransfers,
        spotBalances,
        futuresPositions,
      },
    }),
  });

  const calcJson = await calcRes.json();
  if (!calcJson.success || !calcJson.portfolio) {
    throw new Error(calcJson.error || 'Failed to calculate portfolio overview.');
  }

  const portfolio = calcJson.portfolio as PortfolioOverview;

  // Save sync state & cache portfolio for instant offline hydration
  const nowTime = Date.now();
  const syncDateStr = new Date(nowTime).toLocaleString('en-US');
  await setStoredSetting('last_synced_at', syncDateStr);
  await setStoredSetting('last_synced_time', nowTime.toString());
  await setCachedPortfolio(portfolio);

  updateStatus({
    inProgress: false,
    stage: 'COMPLETED',
    message: `Sync complete! Stored ${allTrades.length} trades and ${allTransfers.length} transfers in browser.`,
    tradesCount: allTrades.length,
    transfersCount: allTransfers.length,
    lastSyncedAt: syncDateStr,
    lastSyncedTime: nowTime,
  });

  return portfolio;
}
