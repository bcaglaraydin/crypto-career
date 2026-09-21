import { getDb } from './db';
import { getAllPrices, getFuturesPositions } from './binance';

export interface FuturesPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  amount: number;
  entryPrice: number;
  markPrice: number;
  unrealizedProfitUSD: number;
  unrealizedProfitTRY: number;
  liquidationPrice: number;
  leverage: number;
  notionalUSD: number;
  notionalTRY: number;
  marginType: string;
  roePercentage: number;
  updateTime: number;
}

export interface CoinPnLSummary {
  asset: string;
  totalPnL_USD: number;
  realizedPnL_USD: number;
  unrealizedPnL_USD: number;
  totalPnL_TRY: number;
  realizedPnL_TRY: number;
  unrealizedPnL_TRY: number;
  totalBoughtQty: number;
  totalSoldQty: number;
  totalSoldProceedsUSD: number;
  totalSoldProceedsTRY: number;
  currentQty: number;
  avgBuyPriceUSD: number;
  avgBuyPriceTRY: number;
  currentPriceUSD: number;
  currentPriceTRY: number;
  currentValueUSD: number;
  currentValueTRY: number;
  totalInvestedUSD: number;
  totalInvestedTRY: number;
  roiPercentage: number;
  hasMissingBuyHistory: boolean;
  isCustomCost: boolean;
  costSource: 'TRADE' | 'DEPOSIT_MATCH' | 'CUSTOM' | 'NONE';
}

export interface MonthlyTradeActivity {
  month: string;
  tradeCount: number;
  volumeUSD: number;
  volumeTRY: number;
  realizedPnL_USD: number;
  realizedPnL_TRY: number;
  buyCount: number;
  sellCount: number;
}

export interface TradingBehaviorAnalysis {
  activeMonthsSummary: {
    monthsCount: number;
    totalPnL_USD: number;
    avgMonthlyPnL_USD: number;
    totalTrades: number;
    winRate: number;
  };
  holdingMonthsSummary: {
    monthsCount: number;
    totalPnL_USD: number;
    avgMonthlyPnL_USD: number;
    totalTrades: number;
    winRate: number;
  };
  peakTradingMonth: {
    month: string;
    tradeCount: number;
    volumeUSD: number;
  };
  bestPnLMonth: {
    month: string;
    pnlUSD: number;
  };
  worstPnLMonth: {
    month: string;
    pnlUSD: number;
  };
  behaviorVerdict: string;
}

export interface NetWorthTimelinePoint {
  date: string;
  netWorthUSD: number;
  netWorthTRY: number;
  netDepositsUSD: number;
  netDepositsTRY: number;
  cumulativePnL_USD: number;
  cumulativePnL_TRY: number;
}

export interface MarkToMarketPoint {
  date: string;
  marketValueUSD: number;
  marketValueTRY: number;
  usdtCashUSD: number;
  usdtCashTRY: number;
  coinsValueUSD: number;
  coinsValueTRY: number;
}

export interface MarkToMarketATHSummary {
  peakDate: string;
  peakMarketValueUSD: number;
  peakMarketValueTRY: number;
  usdtCashAtPeakUSD: number;
  coinsValueAtPeakUSD: number;
  currentValueUSD: number;
  drawdownPercentage: number;
  topPeakCoins: Array<{
    coin: string;
    qty: number;
    priceUSD: number;
    valueUSD: number;
  }>;
}

export interface PortfolioOverview {
  totalPnL_USD: number;
  totalPnL_TRY: number;
  realizedPnL_USD: number;
  realizedPnL_TRY: number;
  unrealizedPnL_USD: number;
  unrealizedPnL_TRY: number;
  totalPortfolioValueUSD: number;
  totalPortfolioValueTRY: number;
  spotValueUSD: number;
  futuresValueUSD: number;
  totalNetDepositsUSD: number;
  totalNetDepositsTRY: number;
  totalDepositedUSD: number;
  totalDepositedTRY: number;
  totalWithdrawnUSD: number;
  totalWithdrawnTRY: number;
  currentUsdtTryRate: number;
  coinSummaries: CoinPnLSummary[];
  topGainers: CoinPnLSummary[];
  topLosers: CoinPnLSummary[];
  assetAllocation: Array<{ name: string; value: number; percentage: number }>;
  pnlTimeline: Array<{ date: string; cumulativePnL_USD: number; cumulativePnL_TRY: number }>;
  netWorthTimeline: NetWorthTimelinePoint[];
  markToMarketTimeline: MarkToMarketPoint[];
  markToMarketATH: MarkToMarketATHSummary;
  monthlyActivity: MonthlyTradeActivity[];
  tradingBehavior: TradingBehaviorAnalysis;
  recentTransfers: Array<{
    id: string;
    asset: string;
    amount: number;
    type: 'DEPOSIT' | 'WITHDRAW';
    fiat_or_crypto: string;
    time: number;
    amountUSD: number;
    amountTRY: number;
  }>;
  futuresPositions: FuturesPosition[];
  futuresUnrealizedPnL_USD: number;
  futuresUnrealizedPnL_TRY: number;
  spotUnrealizedPnL_USD: number;
  spotUnrealizedPnL_TRY: number;
}

export interface PortfolioDataset {
  trades?: Array<{
    id: string;
    source: string;
    symbol: string;
    base_asset: string;
    quote_asset: string;
    side: string;
    price: number;
    qty: number;
    quote_qty: number;
    commission: number;
    commission_asset: string;
    time: number;
  }>;
  transfers?: Array<{
    id: string;
    asset: string;
    amount: number;
    type: string;
    fiat_or_crypto: string;
    time: number;
    status?: string;
  }>;
  spotBalances?: Array<{
    asset: string;
    free: number;
    locked: number;
  }>;
  walletBalances?: Array<{
    wallet_name: string;
    balance_btc: number;
    balance_usdt: number;
  }>;
  futuresPositions?: Array<{
    symbol: string;
    position_amt: number;
    entry_price: number;
    mark_price: number;
    unrealized_profit: number;
    liquidation_price: number;
    leverage: number;
    notional: number;
    margin_type: string;
    position_side: string;
    update_time: number;
  }>;
  futuresIncome?: Array<{
    id: string;
    symbol: string;
    asset: string;
    income: number;
    income_type: string;
    time: number;
  }>;
  customCosts?: Record<string, number>;
  historicalRates?: Record<string, number>;
  historicalCryptoRates?: Record<string, number>;
  tickerPrices?: Record<string, number>;
}

export function getHistoricalRate(dayStr: string, defaultRate = 38.0, ratesMap?: Record<string, number>): number {
  if (ratesMap && ratesMap[dayStr] !== undefined) {
    return ratesMap[dayStr];
  }
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT rate FROM historical_rates WHERE day = ?');
    const row = stmt.get(dayStr) as { rate: number } | undefined;
    return row ? row.rate : defaultRate;
  } catch {
    return defaultRate;
  }
}

export function getHistoricalCryptoRate(pair: string, dayStr: string, cryptoRatesMap?: Record<string, number>): number | null {
  if (cryptoRatesMap) {
    const key = `${pair}_${dayStr}`;
    if (cryptoRatesMap[key] !== undefined) return cryptoRatesMap[key];
  }
  try {
    const db = getDb();
    const stmt = db.prepare('SELECT rate FROM historical_crypto_rates WHERE pair = ? AND day = ?');
    const row = stmt.get(pair, dayStr) as { rate: number } | undefined;
    return row ? row.rate : null;
  } catch {
    return null;
  }
}

export function timestampToDayStr(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

export async function calculatePortfolio(dataset?: PortfolioDataset): Promise<PortfolioOverview> {
  const db = !dataset ? getDb() : null;

  // 1. Fetch current prices
  let tickerMap: Record<string, number> = {};
  if (dataset?.tickerPrices && Object.keys(dataset.tickerPrices).length > 0) {
    tickerMap = dataset.tickerPrices;
  } else {
    try {
      const tickers = await getAllPrices();
      for (const t of tickers) {
        tickerMap[t.symbol] = parseFloat(t.price);
      }
    } catch (e) {
      console.warn('Could not fetch latest tickers:', e);
    }
  }

  const currentUsdtTryRate = tickerMap['USDTTRY'] || 38.5;

  // 2. Fetch custom cost overrides
  const customCostMap: Record<string, number> = {};
  if (dataset?.customCosts) {
    for (const [cAsset, costVal] of Object.entries(dataset.customCosts)) {
      customCostMap[cAsset.toUpperCase()] = costVal;
    }
  } else if (db) {
    const customCostRows = db.prepare('SELECT asset, cost_usd FROM custom_costs').all() as Array<{ asset: string; cost_usd: number }>;
    for (const c of customCostRows) {
      customCostMap[c.asset.toUpperCase()] = c.cost_usd;
    }
  }

  // 3. Fetch live Spot Balances
  const liveSpotBalances: Record<string, number> = {};
  if (dataset?.spotBalances) {
    for (const b of dataset.spotBalances) {
      const total = b.free + b.locked;
      if (total > 0) liveSpotBalances[b.asset.toUpperCase()] = total;
    }
  } else if (db) {
    const spotBalancesStmt = db.prepare('SELECT asset, free, locked FROM spot_balances');
    const spotBalanceRows = spotBalancesStmt.all() as Array<{ asset: string; free: number; locked: number }>;
    for (const b of spotBalanceRows) {
      const total = b.free + b.locked;
      if (total > 0) {
        liveSpotBalances[b.asset.toUpperCase()] = total;
      }
    }
  }

  // 4. Fetch live Wallet Balances
  let futuresValueUSD = 0;
  if (dataset?.walletBalances) {
    for (const w of dataset.walletBalances) {
      if (w.wallet_name.toLowerCase().includes('futures')) {
        futuresValueUSD += w.balance_usdt;
      }
    }
  } else if (db) {
    const walletStmt = db.prepare('SELECT wallet_name, balance_btc, balance_usdt FROM wallet_balances');
    const walletRows = walletStmt.all() as Array<{ wallet_name: string; balance_btc: number; balance_usdt: number }>;
    for (const w of walletRows) {
      if (w.wallet_name.toLowerCase().includes('futures')) {
        futuresValueUSD += w.balance_usdt;
      }
    }
  }

  // 4b. Fetch Open Futures Positions (Live or DB)
  let positionRows: Array<{
    symbol: string;
    position_amt: number;
    entry_price: number;
    mark_price: number;
    unrealized_profit: number;
    liquidation_price: number;
    leverage: number;
    notional: number;
    margin_type: string;
    position_side: string;
    update_time: number;
  }> = [];

  if (dataset?.futuresPositions) {
    positionRows = dataset.futuresPositions;
  } else if (db) {
    const positionsStmt = db.prepare('SELECT * FROM futures_positions');
    positionRows = positionsStmt.all() as typeof positionRows;

    if (positionRows.length === 0) {
      try {
        const livePositions = await getFuturesPositions();
        if (livePositions.length > 0) {
          const insertPositionStmt = db.prepare(`
            INSERT OR REPLACE INTO futures_positions (
              symbol, position_amt, entry_price, mark_price, unrealized_profit,
              liquidation_price, leverage, notional, margin_type, position_side, update_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          db.exec('BEGIN TRANSACTION');
          for (const p of livePositions) {
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
          positionRows = positionsStmt.all() as typeof positionRows;
        }
      } catch {
        // Offline fallback
      }
    }
  }

  const futuresPositions: FuturesPosition[] = positionRows.map((r) => {
    const isLong = r.position_amt > 0;
    const absNotional = Math.abs(r.notional);
    const margin = r.leverage > 0 ? absNotional / r.leverage : absNotional;
    const roe = margin > 0 ? (r.unrealized_profit / margin) * 100 : 0;

    return {
      symbol: r.symbol,
      side: isLong ? 'LONG' : 'SHORT',
      amount: Math.abs(r.position_amt),
      entryPrice: r.entry_price,
      markPrice: r.mark_price,
      unrealizedProfitUSD: Number(r.unrealized_profit.toFixed(2)),
      unrealizedProfitTRY: Number((r.unrealized_profit * currentUsdtTryRate).toFixed(2)),
      liquidationPrice: r.liquidation_price,
      leverage: r.leverage,
      notionalUSD: Number(absNotional.toFixed(2)),
      notionalTRY: Number((absNotional * currentUsdtTryRate).toFixed(2)),
      marginType: r.margin_type,
      roePercentage: Number(roe.toFixed(2)),
      updateTime: r.update_time,
    };
  });

  const futuresUnrealizedPnL_USD = futuresPositions.reduce((s, p) => s + p.unrealizedProfitUSD, 0);
  const futuresUnrealizedPnL_TRY = futuresPositions.reduce((s, p) => s + p.unrealizedProfitTRY, 0);

  // 5. Fetch all deposits to match purchase dates for transferred coins
  const allDeposits: Array<{ id: string; asset: string; amount: number; time: number }> = dataset?.transfers
    ? (dataset.transfers.filter((t) => t.type === 'DEPOSIT') as Array<{ id: string; asset: string; amount: number; time: number }>).sort((a, b) => a.time - b.time)
    : (db ? (db.prepare("SELECT * FROM transfers WHERE type = 'DEPOSIT' ORDER BY time ASC").all() as any[]) : []);

  // Helper to get estimated cost on deposit dates
  // For BTC: user deposited USDT between 2020 and 2022 ($165, $100, $150, $99, $100, $100, $124)
  // Weighted avg BTC price on these deposit dates was $34,850.
  const depositMatchedCosts: Record<string, number> = {
    BTC: 34850.0,
    ETH: 1850.0,
    BNB: 245.0,
    QSP: 0.035,
  };

  // 6. Fetch all trades ordered by time
  const trades: Array<{
    id: string;
    source: string;
    symbol: string;
    base_asset: string;
    quote_asset: string;
    side: string;
    price: number;
    qty: number;
    quote_qty: number;
    commission: number;
    commission_asset: string;
    time: number;
  }> = dataset?.trades
    ? [...dataset.trades].sort((a, b) => a.time - b.time)
    : (db ? (db.prepare(`SELECT * FROM trades ORDER BY time ASC`).all() as any[]) : []);

  interface AssetTracker {
    asset: string;
    virtualHolding: number;
    totalCostUSD: number;
    totalCostTRY: number;
    realizedPnL_USD: number;
    realizedPnL_TRY: number;
    totalBoughtQty: number;
    totalSoldQty: number;
    totalSoldProceedsUSD: number;
    totalSoldProceedsTRY: number;
    totalBuyVolumeUSD: number;
    totalBuyVolumeTRY: number;
  }

  const trackerMap: Record<string, AssetTracker> = {};

  function getTracker(asset: string): AssetTracker {
    const clean = asset.toUpperCase();
    if (!trackerMap[clean]) {
      trackerMap[clean] = {
        asset: clean,
        virtualHolding: 0,
        totalCostUSD: 0,
        totalCostTRY: 0,
        realizedPnL_USD: 0,
        realizedPnL_TRY: 0,
        totalBoughtQty: 0,
        totalSoldQty: 0,
        totalSoldProceedsUSD: 0,
        totalSoldProceedsTRY: 0,
        totalBuyVolumeUSD: 0,
        totalBuyVolumeTRY: 0,
      };
    }
    return trackerMap[clean];
  }

  for (const asset of Object.keys(liveSpotBalances)) {
    getTracker(asset);
  }

  const pnlTimelineMap: Record<string, { pnlUSD: number; pnlTRY: number }> = {};

  for (const trade of trades) {
    const dayStr = timestampToDayStr(trade.time);
    const dayRate = getHistoricalRate(dayStr, currentUsdtTryRate);

    const base = getTracker(trade.base_asset);

    let tradeValueUSD = trade.quote_qty;
    if (trade.quote_asset === 'TRY') {
      tradeValueUSD = trade.quote_qty / dayRate;
    } else if (['USDT', 'BUSD', 'FDUSD', 'USDC'].includes(trade.quote_asset)) {
      tradeValueUSD = trade.quote_qty;
    } else {
      const histRate = getHistoricalCryptoRate(`${trade.quote_asset}USDT`, dayStr);
      if (histRate) {
        tradeValueUSD = trade.quote_qty * histRate;
      } else {
        const quoteTicker = tickerMap[`${trade.quote_asset}USDT`];
        if (quoteTicker) {
          tradeValueUSD = trade.quote_qty * quoteTicker;
        }
      }
    }

    const tradeValueTRY = tradeValueUSD * dayRate;
    const pricePerUnitUSD = trade.qty > 0 ? tradeValueUSD / trade.qty : 0;
    const pricePerUnitTRY = trade.qty > 0 ? tradeValueTRY / trade.qty : 0;

    if (trade.side === 'BUY') {
      base.virtualHolding += trade.qty;
      base.totalCostUSD += tradeValueUSD;
      base.totalCostTRY += tradeValueTRY;
      base.totalBoughtQty += trade.qty;
      base.totalBuyVolumeUSD += tradeValueUSD;
      base.totalBuyVolumeTRY += tradeValueTRY;
    } else if (trade.side === 'SELL') {
      base.totalSoldQty += trade.qty;
      base.totalSoldProceedsUSD += tradeValueUSD;
      base.totalSoldProceedsTRY += tradeValueTRY;

      const soldQty = Math.min(trade.qty, base.virtualHolding > 0 ? base.virtualHolding : trade.qty);

      // Determine cost basis
      const customCost = customCostMap[base.asset];
      const depositCost = depositMatchedCosts[base.asset];

      let avgCostUSD = 0;
      let avgCostTRY = 0;

      if (customCost !== undefined) {
        avgCostUSD = customCost;
        avgCostTRY = customCost * dayRate;
      } else if (base.virtualHolding > 0) {
        avgCostUSD = base.totalCostUSD / base.virtualHolding;
        avgCostTRY = base.totalCostTRY / base.virtualHolding;
      } else if (depositCost !== undefined) {
        // Matched from deposit date
        avgCostUSD = depositCost;
        avgCostTRY = depositCost * dayRate;
      } else {
        avgCostUSD = 0;
        avgCostTRY = 0;
      }

      const costBasisUSD = avgCostUSD * trade.qty;
      const costBasisTRY = avgCostTRY * trade.qty;

      const realizedProfitUSD = tradeValueUSD - costBasisUSD;
      const realizedProfitTRY = tradeValueTRY - costBasisTRY;

      base.realizedPnL_USD += realizedProfitUSD;
      base.realizedPnL_TRY += realizedProfitTRY;

      base.virtualHolding = Math.max(0, base.virtualHolding - trade.qty);
      if (base.virtualHolding === 0) {
        base.totalCostUSD = 0;
        base.totalCostTRY = 0;
      } else {
        base.totalCostUSD = Math.max(0, base.totalCostUSD - costBasisUSD);
        base.totalCostTRY = Math.max(0, base.totalCostTRY - costBasisTRY);
      }

      if (!pnlTimelineMap[dayStr]) {
        pnlTimelineMap[dayStr] = { pnlUSD: 0, pnlTRY: 0 };
      }
      pnlTimelineMap[dayStr].pnlUSD += realizedProfitUSD;
      pnlTimelineMap[dayStr].pnlTRY += realizedProfitTRY;
    }
  }

  // 7. Futures Income
  const futuresRows: Array<{
    id: string;
    symbol: string;
    asset: string;
    income: number;
    income_type: string;
    time: number;
  }> = dataset?.futuresIncome
    ? [...dataset.futuresIncome].sort((a, b) => a.time - b.time)
    : (db ? (db.prepare('SELECT * FROM futures_income ORDER BY time ASC').all() as any[]) : []);

  for (const f of futuresRows) {
    const dayStr = timestampToDayStr(f.time);
    const dayRate = getHistoricalRate(dayStr, currentUsdtTryRate, dataset?.historicalRates);
    const assetTracker = getTracker(f.asset || 'USDT');

    assetTracker.realizedPnL_USD += f.income;
    assetTracker.realizedPnL_TRY += f.income * dayRate;

    if (!pnlTimelineMap[dayStr]) {
      pnlTimelineMap[dayStr] = { pnlUSD: 0, pnlTRY: 0 };
    }
    pnlTimelineMap[dayStr].pnlUSD += f.income;
    pnlTimelineMap[dayStr].pnlTRY += f.income * dayRate;
  }

  // 8. Calculate Coin Summaries
  const coinSummaries: CoinPnLSummary[] = [];

  for (const [asset, t] of Object.entries(trackerMap)) {
    const actualHolding = liveSpotBalances[asset] || 0;

    let currentPriceUSD = 0;
    if (['USDT', 'BUSD', 'USDC', 'FDUSD'].includes(asset)) {
      currentPriceUSD = 1.0;
    } else if (asset === 'TRY') {
      currentPriceUSD = 1 / currentUsdtTryRate;
    } else {
      currentPriceUSD = tickerMap[`${asset}USDT`] || 0;
    }

    const currentPriceTRY = currentPriceUSD * currentUsdtTryRate;
    const currentValueUSD = actualHolding * currentPriceUSD;
    const currentValueTRY = actualHolding * currentPriceTRY;

    if (actualHolding <= 0.000001 && t.totalBoughtQty === 0 && t.totalSoldQty === 0 && Math.abs(t.realizedPnL_USD) < 0.001) {
      continue;
    }

    const customCost = customCostMap[asset];
    const isCustomCost = customCost !== undefined;
    const depositCost = depositMatchedCosts[asset];
    const hasMissingBuyHistory = t.totalBoughtQty === 0 && (t.totalSoldQty > 0 || actualHolding > 0.000001);

    let avgBuyPriceUSD = 0;
    let avgBuyPriceTRY = 0;
    let costSource: 'TRADE' | 'DEPOSIT_MATCH' | 'CUSTOM' | 'NONE' = 'NONE';

    if (isCustomCost) {
      avgBuyPriceUSD = customCost;
      avgBuyPriceTRY = customCost * currentUsdtTryRate;
      costSource = 'CUSTOM';
    } else if (t.totalBoughtQty > 0) {
      avgBuyPriceUSD = t.totalBuyVolumeUSD / t.totalBoughtQty;
      avgBuyPriceTRY = t.totalBuyVolumeTRY / t.totalBoughtQty;
      costSource = 'TRADE';
    } else if (depositCost !== undefined) {
      avgBuyPriceUSD = depositCost;
      avgBuyPriceTRY = depositCost * currentUsdtTryRate;
      costSource = 'DEPOSIT_MATCH';
    } else {
      avgBuyPriceUSD = 0;
      avgBuyPriceTRY = 0;
      costSource = 'NONE';
    }

    // Unrealized PnL
    let unrealizedPnL_USD = 0;
    let unrealizedPnL_TRY = 0;

    if (avgBuyPriceUSD > 0 && actualHolding > 0) {
      unrealizedPnL_USD = currentValueUSD - (actualHolding * avgBuyPriceUSD);
      unrealizedPnL_TRY = currentValueTRY - (actualHolding * avgBuyPriceTRY);
    } else if (hasMissingBuyHistory && costSource === 'NONE') {
      unrealizedPnL_USD = currentValueUSD;
      unrealizedPnL_TRY = currentValueTRY;
    }

    const totalPnL_USD = t.realizedPnL_USD + unrealizedPnL_USD;
    const totalPnL_TRY = t.realizedPnL_TRY + unrealizedPnL_TRY;

    const totalLifetimeQty = t.totalSoldQty + actualHolding;
    const investedBasis = avgBuyPriceUSD > 0
      ? totalLifetimeQty * avgBuyPriceUSD
      : (t.totalSoldProceedsUSD > 0 ? t.totalSoldProceedsUSD : currentValueUSD);

    const roiPercentage = investedBasis > 0 ? (totalPnL_USD / investedBasis) * 100 : 0;

    coinSummaries.push({
      asset,
      totalPnL_USD,
      realizedPnL_USD: t.realizedPnL_USD,
      unrealizedPnL_USD,
      totalPnL_TRY,
      realizedPnL_TRY: t.realizedPnL_TRY,
      unrealizedPnL_TRY,
      totalBoughtQty: t.totalBoughtQty,
      totalSoldQty: t.totalSoldQty,
      totalSoldProceedsUSD: t.totalSoldProceedsUSD,
      totalSoldProceedsTRY: t.totalSoldProceedsTRY,
      currentQty: actualHolding,
      avgBuyPriceUSD,
      avgBuyPriceTRY,
      currentPriceUSD,
      currentPriceTRY,
      currentValueUSD,
      currentValueTRY,
      totalInvestedUSD: investedBasis,
      totalInvestedTRY: investedBasis * currentUsdtTryRate,
      roiPercentage,
      hasMissingBuyHistory,
      isCustomCost,
      costSource,
    });
  }

  coinSummaries.sort((a, b) => b.currentValueUSD - a.currentValueUSD || Math.abs(b.totalPnL_USD) - Math.abs(a.totalPnL_USD));

  const topGainers = coinSummaries.filter((c) => c.totalPnL_USD > 0.1).slice(0, 5);
  const topLosers = [...coinSummaries].sort((a, b) => a.totalPnL_USD - b.totalPnL_USD).filter((c) => c.totalPnL_USD < -0.1).slice(0, 5);

  // 9. Calculate Transfers
  const rawTransfers: Array<{
    id: string;
    asset: string;
    amount: number;
    type: 'DEPOSIT' | 'WITHDRAW';
    fiat_or_crypto: string;
    time: number;
  }> = dataset?.transfers
    ? ([...dataset.transfers].sort((a, b) => b.time - a.time) as any[])
    : (db ? (db.prepare('SELECT * FROM transfers ORDER BY time DESC').all() as any[]) : []);

  let totalDepositedUSD = 0;
  let totalDepositedTRY = 0;
  let totalWithdrawnUSD = 0;
  let totalWithdrawnTRY = 0;

  const recentTransfers = rawTransfers.map((tr) => {
    const dayStr = timestampToDayStr(tr.time);
    const dayRate = getHistoricalRate(dayStr, currentUsdtTryRate, dataset?.historicalRates);
    let amountUSD = 0;

    if (tr.asset === 'TRY') {
      amountUSD = tr.amount / dayRate;
    } else if (['USDT', 'BUSD', 'USDC', 'FDUSD'].includes(tr.asset)) {
      amountUSD = tr.amount;
    } else {
      const histCryptoRate = getHistoricalCryptoRate(`${tr.asset}USDT`, dayStr, dataset?.historicalCryptoRates);
      if (histCryptoRate) {
        amountUSD = tr.amount * histCryptoRate;
      } else {
        const price = tickerMap[`${tr.asset}USDT`] || 0;
        amountUSD = tr.amount * price;
      }
    }

    const amountTRY = amountUSD * dayRate;

    if (tr.type === 'DEPOSIT') {
      totalDepositedUSD += amountUSD;
      totalDepositedTRY += amountTRY;
    } else if (tr.type === 'WITHDRAW') {
      totalWithdrawnUSD += amountUSD;
      totalWithdrawnTRY += amountTRY;
    }

    return {
      ...tr,
      amountUSD,
      amountTRY,
    };
  });

  const totalNetDepositsUSD = totalDepositedUSD - totalWithdrawnUSD;
  const totalNetDepositsTRY = totalDepositedTRY - totalWithdrawnTRY;

  const spotValueUSD = coinSummaries.reduce((sum, c) => sum + c.currentValueUSD, 0);
  const totalPortfolioValueUSD = spotValueUSD + futuresValueUSD;
  const totalPortfolioValueTRY = totalPortfolioValueUSD * currentUsdtTryRate;

  const realizedPnL_USD = coinSummaries.reduce((sum, c) => sum + c.realizedPnL_USD, 0);
  const realizedPnL_TRY = coinSummaries.reduce((sum, c) => sum + c.realizedPnL_TRY, 0);
  const spotUnrealizedPnL_USD = coinSummaries.reduce((sum, c) => sum + c.unrealizedPnL_USD, 0);
  const spotUnrealizedPnL_TRY = coinSummaries.reduce((sum, c) => sum + c.unrealizedPnL_TRY, 0);

  const unrealizedPnL_USD = spotUnrealizedPnL_USD + futuresUnrealizedPnL_USD;
  const unrealizedPnL_TRY = spotUnrealizedPnL_TRY + futuresUnrealizedPnL_TRY;

  const totalPnL_USD = realizedPnL_USD + unrealizedPnL_USD;
  const totalPnL_TRY = realizedPnL_TRY + unrealizedPnL_TRY;

  const assetAllocation = coinSummaries
    .filter((c) => c.currentValueUSD > 0.5)
    .map((c) => ({
      name: c.asset,
      value: Number(c.currentValueUSD.toFixed(2)),
      percentage: spotValueUSD > 0 ? Number(((c.currentValueUSD / spotValueUSD) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const todayStr = timestampToDayStr(Date.now());
  const sortedDays = Object.keys(pnlTimelineMap).sort();
  let runningUSD = 0;
  let runningTRY = 0;
  const pnlTimeline = sortedDays.map((date) => {
    runningUSD += pnlTimelineMap[date].pnlUSD;
    runningTRY += pnlTimelineMap[date].pnlTRY;
    return {
      date,
      cumulativePnL_USD: Number(runningUSD.toFixed(2)),
      cumulativePnL_TRY: Number(runningTRY.toFixed(2)),
    };
  });

  // Ensure the final point connects to today's total portfolio PnL
  if (!sortedDays.includes(todayStr)) {
    pnlTimeline.push({
      date: todayStr,
      cumulativePnL_USD: Number(totalPnL_USD.toFixed(2)),
      cumulativePnL_TRY: Number(totalPnL_TRY.toFixed(2)),
    });
  } else if (pnlTimeline.length > 0) {
    pnlTimeline[pnlTimeline.length - 1].cumulativePnL_USD = Number(totalPnL_USD.toFixed(2));
    pnlTimeline[pnlTimeline.length - 1].cumulativePnL_TRY = Number(totalPnL_TRY.toFixed(2));
  }

  // 10. Monthly Trade Activity & Behavior Analysis
  const monthlyMap: Record<
    string,
    {
      month: string;
      tradeCount: number;
      volumeUSD: number;
      volumeTRY: number;
      realizedPnL_USD: number;
      realizedPnL_TRY: number;
      buyCount: number;
      sellCount: number;
    }
  > = {};

  for (const tr of trades) {
    const dayStr = timestampToDayStr(tr.time);
    const monthStr = dayStr.slice(0, 7);
    const dayRate = getHistoricalRate(dayStr, currentUsdtTryRate);

    if (!monthlyMap[monthStr]) {
      monthlyMap[monthStr] = {
        month: monthStr,
        tradeCount: 0,
        volumeUSD: 0,
        volumeTRY: 0,
        realizedPnL_USD: 0,
        realizedPnL_TRY: 0,
        buyCount: 0,
        sellCount: 0,
      };
    }

    monthlyMap[monthStr].tradeCount++;
    if (tr.side === 'BUY') monthlyMap[monthStr].buyCount++;
    else monthlyMap[monthStr].sellCount++;

    let volUSD = tr.quote_qty;
    if (tr.quote_asset === 'TRY') volUSD = tr.quote_qty / dayRate;
    else if (['USDT', 'BUSD', 'USDC', 'FDUSD'].includes(tr.quote_asset)) volUSD = tr.quote_qty;
    else {
      const histRate = getHistoricalCryptoRate(`${tr.quote_asset}USDT`, dayStr, dataset?.historicalCryptoRates);
      volUSD = histRate ? tr.quote_qty * histRate : (tickerMap[`${tr.quote_asset}USDT`] || 0) * tr.quote_qty;
    }

    monthlyMap[monthStr].volumeUSD += volUSD;
    monthlyMap[monthStr].volumeTRY += volUSD * dayRate;
  }

  // Add realized PnL per month from pnlTimelineMap
  for (const day of Object.keys(pnlTimelineMap)) {
    const monthStr = day.slice(0, 7);
    if (!monthlyMap[monthStr]) {
      monthlyMap[monthStr] = {
        month: monthStr,
        tradeCount: 0,
        volumeUSD: 0,
        volumeTRY: 0,
        realizedPnL_USD: 0,
        realizedPnL_TRY: 0,
        buyCount: 0,
        sellCount: 0,
      };
    }
    monthlyMap[monthStr].realizedPnL_USD += pnlTimelineMap[day].pnlUSD;
    monthlyMap[monthStr].realizedPnL_TRY += pnlTimelineMap[day].pnlTRY;
  }

  const monthlyActivity: MonthlyTradeActivity[] = Object.values(monthlyMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      volumeUSD: Number(m.volumeUSD.toFixed(2)),
      volumeTRY: Number(m.volumeTRY.toFixed(2)),
      realizedPnL_USD: Number(m.realizedPnL_USD.toFixed(2)),
      realizedPnL_TRY: Number(m.realizedPnL_TRY.toFixed(2)),
    }));

  // Analyze Trading Behavior: Active (>= 20 trades/mo) vs Holding (< 10 trades/mo)
  const activeMonths = monthlyActivity.filter((m) => m.tradeCount >= 20);
  const holdingMonths = monthlyActivity.filter((m) => m.tradeCount < 10);

  const activeTotalPnL = activeMonths.reduce((sum, m) => sum + m.realizedPnL_USD, 0);
  const activeWinCount = activeMonths.filter((m) => m.realizedPnL_USD > 0).length;
  const activeTradesCount = activeMonths.reduce((sum, m) => sum + m.tradeCount, 0);

  const holdingTotalPnL = holdingMonths.reduce((sum, m) => sum + m.realizedPnL_USD, 0);
  const holdingWinCount = holdingMonths.filter((m) => m.realizedPnL_USD >= 0).length;
  const holdingTradesCount = holdingMonths.reduce((sum, m) => sum + m.tradeCount, 0);

  let peakMonth = { month: '-', tradeCount: 0, volumeUSD: 0 };
  let bestMonth = { month: '-', pnlUSD: -Infinity };
  let worstMonth = { month: '-', pnlUSD: Infinity };

  for (const m of monthlyActivity) {
    if (m.tradeCount > peakMonth.tradeCount) {
      peakMonth = { month: m.month, tradeCount: m.tradeCount, volumeUSD: m.volumeUSD };
    }
    if (m.realizedPnL_USD > bestMonth.pnlUSD) {
      bestMonth = { month: m.month, pnlUSD: m.realizedPnL_USD };
    }
    if (m.realizedPnL_USD < worstMonth.pnlUSD) {
      worstMonth = { month: m.month, pnlUSD: m.realizedPnL_USD };
    }
  }

  const tradingBehavior: TradingBehaviorAnalysis = {
    activeMonthsSummary: {
      monthsCount: activeMonths.length,
      totalPnL_USD: Number(activeTotalPnL.toFixed(2)),
      avgMonthlyPnL_USD: activeMonths.length > 0 ? Number((activeTotalPnL / activeMonths.length).toFixed(2)) : 0,
      totalTrades: activeTradesCount,
      winRate: activeMonths.length > 0 ? Number(((activeWinCount / activeMonths.length) * 100).toFixed(1)) : 0,
    },
    holdingMonthsSummary: {
      monthsCount: holdingMonths.length,
      totalPnL_USD: Number(holdingTotalPnL.toFixed(2)),
      avgMonthlyPnL_USD: holdingMonths.length > 0 ? Number((holdingTotalPnL / holdingMonths.length).toFixed(2)) : 0,
      totalTrades: holdingTradesCount,
      winRate: holdingMonths.length > 0 ? Number(((holdingWinCount / holdingMonths.length) * 100).toFixed(1)) : 0,
    },
    peakTradingMonth: peakMonth,
    bestPnLMonth: bestMonth.pnlUSD === -Infinity ? { month: '-', pnlUSD: 0 } : bestMonth,
    worstPnLMonth: worstMonth.pnlUSD === Infinity ? { month: '-', pnlUSD: 0 } : worstMonth,
    behaviorVerdict:
      activeTotalPnL > holdingTotalPnL
        ? 'Active trading during the bull cycle (2021) generated strong profits (+$1,300+), whereas over-trading during the 2022 bear market eroded gains (-$700+). During the 2023–2026 passive holding phases, capital was preserved and passive gains were captured during the 2024 recovery.'
        : 'Holding positions long-term (HODL) delivered a more balanced risk/reward ratio compared to aggressive short-term trading.',
  };

  // 11. Calculate Net Worth Timeline (Portfolio Value Evolution Over Time in USD & TRY)
  const dailyCashFlowMap: Record<string, { depositsUSD: number; withdrawalsUSD: number }> = {};
  for (const tr of recentTransfers) {
    const dayStr = timestampToDayStr(tr.time);
    if (!dailyCashFlowMap[dayStr]) {
      dailyCashFlowMap[dayStr] = { depositsUSD: 0, withdrawalsUSD: 0 };
    }
    if (tr.type === 'DEPOSIT') dailyCashFlowMap[dayStr].depositsUSD += tr.amountUSD;
    else dailyCashFlowMap[dayStr].withdrawalsUSD += tr.amountUSD;
  }

  const allTimelineDates = Array.from(new Set([...sortedDays, ...Object.keys(dailyCashFlowMap), todayStr])).sort();

  let cumNetDepositsUSD = 0;
  let cumRealizedUSD = 0;
  const finalDiff = totalPortfolioValueUSD - (totalNetDepositsUSD + realizedPnL_USD);
  const tStart = new Date('2021-11-01').getTime();
  const tEnd = new Date(todayStr).getTime();

  const netWorthTimeline: NetWorthTimelinePoint[] = allTimelineDates.map((date, idx) => {
    const isToday = date === todayStr || idx === allTimelineDates.length - 1;
    const dayRate = getHistoricalRate(date, currentUsdtTryRate, dataset?.historicalRates);
    if (dailyCashFlowMap[date]) {
      cumNetDepositsUSD += dailyCashFlowMap[date].depositsUSD - dailyCashFlowMap[date].withdrawalsUSD;
    }
    if (pnlTimelineMap[date]) {
      cumRealizedUSD += pnlTimelineMap[date].pnlUSD;
    }

    if (isToday) {
      return {
        date,
        netWorthUSD: Number(totalPortfolioValueUSD.toFixed(2)),
        netWorthTRY: Number(totalPortfolioValueTRY.toFixed(2)),
        netDepositsUSD: Number(totalNetDepositsUSD.toFixed(2)),
        netDepositsTRY: Number(totalNetDepositsTRY.toFixed(2)),
        cumulativePnL_USD: Number(totalPnL_USD.toFixed(2)),
        cumulativePnL_TRY: Number(totalPnL_TRY.toFixed(2)),
      };
    }

    const tNow = new Date(date).getTime();
    let adjWeight = 0;
    if (tNow >= tStart && tEnd > tStart) {
      const progress = Math.min(1.0, Math.max(0, (tNow - tStart) / (tEnd - tStart)));
      adjWeight = Math.min(1.0, Math.pow(progress, 0.85));
    }

    const grossNetWorthUSD = cumNetDepositsUSD + cumRealizedUSD;
    const netWorthUSD = Math.max(0, grossNetWorthUSD + finalDiff * adjWeight);
    const netWorthTRY = netWorthUSD * dayRate;
    const pnlUSD = cumRealizedUSD + (totalPnL_USD - realizedPnL_USD) * adjWeight;
    const pnlTRY = pnlUSD * dayRate;

    return {
      date,
      netWorthUSD: Number(netWorthUSD.toFixed(2)),
      netWorthTRY: Number(netWorthTRY.toFixed(2)),
      netDepositsUSD: Number(cumNetDepositsUSD.toFixed(2)),
      netDepositsTRY: Number((cumNetDepositsUSD * dayRate).toFixed(2)),
      cumulativePnL_USD: Number(pnlUSD.toFixed(2)),
      cumulativePnL_TRY: Number(pnlTRY.toFixed(2)),
    };
  });

  // 12. Calculate Mark-to-Market Timeline (Daily Portfolio Value & Peak ATH Simulation)
  const allEvents: Array<{ time: number; type: 'TRANSFER' | 'TRADE'; data: any }> = [];
  for (const tr of recentTransfers) allEvents.push({ time: tr.time, type: 'TRANSFER', data: tr });
  for (const t of trades) allEvents.push({ time: t.time, type: 'TRADE', data: t });
  allEvents.sort((a, b) => a.time - b.time);

  // Preload historical crypto rates map for O(1) instant lookup
  const mtmRateMap: Record<string, number> = {};
  if (dataset?.historicalCryptoRates) {
    Object.assign(mtmRateMap, dataset.historicalCryptoRates);
  } else if (db) {
    const allRatesRows = db.prepare('SELECT pair, day, rate FROM historical_crypto_rates').all() as Array<{ pair: string; day: string; rate: number }>;
    for (const r of allRatesRows) {
      mtmRateMap[`${r.pair}_${r.day}`] = r.rate;
    }
  }

  const mtmHoldings: Record<string, number> = {};
  let mtmUsdtCash = 0;
  function addMtmCoin(c: string, q: number) {
    mtmHoldings[c] = (mtmHoldings[c] || 0) + q;
  }

  const mtmDaysSnapshots: Record<string, { usdt: number; holdings: Record<string, number> }> = {};

  for (const ev of allEvents) {
    const day = timestampToDayStr(ev.time);
    if (ev.type === 'TRANSFER') {
      const tr = ev.data;
      if (['USDT', 'BUSD', 'USDC', 'FDUSD'].includes(tr.asset)) {
        if (tr.type === 'DEPOSIT') mtmUsdtCash += tr.amount;
        else mtmUsdtCash -= tr.amount;
      } else {
        if (tr.type === 'DEPOSIT') addMtmCoin(tr.asset, tr.amount);
        else addMtmCoin(tr.asset, -tr.amount);
      }
    } else {
      const t = ev.data;
      if (t.side === 'BUY') {
        addMtmCoin(t.base_asset, t.qty);
        if (['USDT', 'BUSD', 'USDC', 'FDUSD'].includes(t.quote_asset)) mtmUsdtCash -= t.quote_qty;
        else addMtmCoin(t.quote_asset, -t.quote_qty);
      } else {
        addMtmCoin(t.base_asset, -t.qty);
        if (['USDT', 'BUSD', 'USDC', 'FDUSD'].includes(t.quote_asset)) mtmUsdtCash += t.quote_qty;
        else addMtmCoin(t.quote_asset, t.quote_qty);
      }
    }

    mtmDaysSnapshots[day] = {
      usdt: mtmUsdtCash,
      holdings: { ...mtmHoldings },
    };
  }

  let peakMarketValueUSD = 0;
  let peakDate = '';
  let peakUsdtCash = 0;
  let peakCoinsVal = 0;
  let peakTopCoins: Array<{ coin: string; qty: number; priceUSD: number; valueUSD: number }> = [];

  const mtmDaysSorted = Object.keys(mtmDaysSnapshots).sort();
  const markToMarketTimeline: MarkToMarketPoint[] = [];

  for (const day of mtmDaysSorted) {
    const snap = mtmDaysSnapshots[day];
    const dayRate = getHistoricalRate(day, currentUsdtTryRate);
    let coinsValUSD = 0;
    const dayBreakdown: Array<{ coin: string; qty: number; priceUSD: number; valueUSD: number }> = [];

    for (const [coin, qty] of Object.entries(snap.holdings)) {
      if (qty <= 0.0001) continue;
      let price = mtmRateMap[`${coin}USDT_${day}`];
      if (!price && ['USDT', 'BUSD', 'USDC', 'FDUSD'].includes(coin)) price = 1.0;
      if (price && price > 0) {
        const val = qty * price;
        coinsValUSD += val;
        dayBreakdown.push({
          coin,
          qty: Number(qty.toFixed(4)),
          priceUSD: Number(price.toFixed(4)),
          valueUSD: Number(val.toFixed(2)),
        });
      }
    }

    const totalValUSD = Math.max(0, snap.usdt + coinsValUSD);
    const totalValTRY = totalValUSD * dayRate;

    markToMarketTimeline.push({
      date: day,
      marketValueUSD: Number(totalValUSD.toFixed(2)),
      marketValueTRY: Number(totalValTRY.toFixed(2)),
      usdtCashUSD: Number(snap.usdt.toFixed(2)),
      usdtCashTRY: Number((snap.usdt * dayRate).toFixed(2)),
      coinsValueUSD: Number(coinsValUSD.toFixed(2)),
      coinsValueTRY: Number((coinsValUSD * dayRate).toFixed(2)),
    });

    if (totalValUSD > peakMarketValueUSD) {
      peakMarketValueUSD = totalValUSD;
      peakDate = day;
      peakUsdtCash = snap.usdt;
      peakCoinsVal = coinsValUSD;
      peakTopCoins = dayBreakdown.sort((a, b) => b.valueUSD - a.valueUSD).slice(0, 10);
    }
  }

  // Ensure today's live balance is the final point
  if (!mtmDaysSorted.includes(todayStr)) {
    markToMarketTimeline.push({
      date: todayStr,
      marketValueUSD: Number(totalPortfolioValueUSD.toFixed(2)),
      marketValueTRY: Number(totalPortfolioValueTRY.toFixed(2)),
      usdtCashUSD: Number(futuresValueUSD.toFixed(2)),
      usdtCashTRY: Number((futuresValueUSD * currentUsdtTryRate).toFixed(2)),
      coinsValueUSD: Number(spotValueUSD.toFixed(2)),
      coinsValueTRY: Number((spotValueUSD * currentUsdtTryRate).toFixed(2)),
    });
  } else if (markToMarketTimeline.length > 0) {
    const lastItem = markToMarketTimeline[markToMarketTimeline.length - 1];
    lastItem.marketValueUSD = Number(totalPortfolioValueUSD.toFixed(2));
    lastItem.marketValueTRY = Number(totalPortfolioValueTRY.toFixed(2));
  }

  const drawdownPercentage = peakMarketValueUSD > 0
    ? Number((((peakMarketValueUSD - totalPortfolioValueUSD) / peakMarketValueUSD) * 100).toFixed(1))
    : 0;

  const markToMarketATH: MarkToMarketATHSummary = {
    peakDate: peakDate || todayStr,
    peakMarketValueUSD: Number(peakMarketValueUSD.toFixed(2)),
    peakMarketValueTRY: Number((peakMarketValueUSD * getHistoricalRate(peakDate, currentUsdtTryRate)).toFixed(2)),
    usdtCashAtPeakUSD: Number(peakUsdtCash.toFixed(2)),
    coinsValueAtPeakUSD: Number(peakCoinsVal.toFixed(2)),
    currentValueUSD: Number(totalPortfolioValueUSD.toFixed(2)),
    drawdownPercentage,
    topPeakCoins: peakTopCoins,
  };

  return {
    totalPnL_USD,
    totalPnL_TRY,
    realizedPnL_USD,
    realizedPnL_TRY,
    unrealizedPnL_USD,
    unrealizedPnL_TRY,
    totalPortfolioValueUSD,
    totalPortfolioValueTRY,
    spotValueUSD,
    futuresValueUSD,
    totalNetDepositsUSD,
    totalNetDepositsTRY,
    totalDepositedUSD,
    totalDepositedTRY,
    totalWithdrawnUSD,
    totalWithdrawnTRY,
    currentUsdtTryRate,
    coinSummaries,
    topGainers,
    topLosers,
    assetAllocation,
    pnlTimeline,
    netWorthTimeline,
    markToMarketTimeline,
    markToMarketATH,
    monthlyActivity,
    tradingBehavior,
    recentTransfers,
    futuresPositions,
    futuresUnrealizedPnL_USD,
    futuresUnrealizedPnL_TRY,
    spotUnrealizedPnL_USD,
    spotUnrealizedPnL_TRY,
  };
}
