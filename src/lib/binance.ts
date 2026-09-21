import crypto from 'node:crypto';
import { getDb } from './db';

const SPOT_BASE = 'https://api.binance.com';
const FUTURES_BASE = 'https://fapi.binance.com';

export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
  source?: 'env' | 'database';
}

export function getCredentials(): BinanceCredentials | null {
  const envApiKey = process.env.BINANCE_API_KEY?.trim();
  const envApiSecret = process.env.BINANCE_API_SECRET?.trim();

  if (envApiKey && envApiSecret) {
    return { apiKey: envApiKey, apiSecret: envApiSecret, source: 'env' };
  }

  try {
    const db = getDb();
    const keyRow = db.prepare("SELECT value FROM settings WHERE key = 'binance_api_key'").get() as { value: string } | undefined;
    const secretRow = db.prepare("SELECT value FROM settings WHERE key = 'binance_api_secret'").get() as { value: string } | undefined;

    if (keyRow?.value && secretRow?.value) {
      return { apiKey: keyRow.value.trim(), apiSecret: secretRow.value.trim(), source: 'database' };
    }
  } catch {
    // Database may not be initialized yet
  }

  return null;
}

export async function testBinanceConnection(creds?: BinanceCredentials): Promise<{
  success: boolean;
  message: string;
  accountType?: string;
  permissions?: string[];
  balancesCount?: number;
}> {
  try {
    const account = await binanceRequest<{
      accountType?: string;
      permissions?: string[];
      balances?: Array<{ asset: string; free: string; locked: string }>;
    }>('/api/v3/account', {}, true, false, creds);

    const nonZeroBalances = (account.balances || []).filter(
      (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
    ).length;

    return {
      success: true,
      message: 'Connection successful! Read permissions verified.',
      accountType: account.accountType || 'SPOT',
      permissions: account.permissions || ['SPOT'],
      balancesCount: nonZeroBalances,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      message: error.message || 'Failed to authenticate with Binance API.',
    };
  }
}

function signQuery(queryString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

export async function binanceRequest<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {},
  isSigned = false,
  isFutures = false,
  credentials?: BinanceCredentials
): Promise<T> {
  const creds = credentials || getCredentials();
  if (isSigned && (!creds || !creds.apiKey || !creds.apiSecret)) {
    throw new Error('Binance API Key or Secret Key not configured (check .env.local).');
  }

  const base = isFutures ? FUTURES_BASE : SPOT_BASE;
  const cleanParams: Record<string, string> = {};

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      cleanParams[key] = String(val);
    }
  }

  if (isSigned && creds) {
    cleanParams.timestamp = Date.now().toString();
    cleanParams.recvWindow = '60000';
  }

  const queryString = new URLSearchParams(cleanParams).toString();
  let url = `${base}${endpoint}`;

  if (queryString) {
    if (isSigned && creds) {
      const signature = signQuery(queryString, creds.apiSecret);
      url = `${url}?${queryString}&signature=${signature}`;
    } else {
      url = `${url}?${queryString}`;
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (creds?.apiKey) {
    headers['X-MBX-APIKEY'] = creds.apiKey;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    let parsedMsg = errorText;
    try {
      const errJson = JSON.parse(errorText);
      parsedMsg = errJson.msg || errorText;
    } catch {
      // keep raw errorText
    }
    throw new Error(`Binance API Error [${response.status}]: ${parsedMsg}`);
  }

  return response.json() as Promise<T>;
}

// 1. Spot Account Information (Balances)
export async function getSpotAccount(creds?: BinanceCredentials) {
  return binanceRequest<{
    balances: Array<{ asset: string; free: string; locked: string }>;
  }>('/api/v3/account', {}, true, false, creds);
}

// 2. All Wallet Overview Balances (Spot, Futures, Funding, etc.)
export async function getWalletBalances(creds?: BinanceCredentials) {
  try {
    return await binanceRequest<Array<{
      activate: boolean;
      balance: string; // in BTC
      walletName: string;
    }>>('/sapi/v1/asset/wallet/balance', {}, true, false, creds);
  } catch {
    return [];
  }
}

// 3. All Current Prices
export async function getAllPrices() {
  return binanceRequest<Array<{ symbol: string; price: string }>>('/api/v3/ticker/price', {}, false);
}

// 4. Crypto Deposits (with 90-day window loop, supports incremental startTime)
export async function getCryptoDeposits(creds?: BinanceCredentials, customStartTime?: number) {
  const allDeposits: Array<{
    id: string;
    amount: string;
    coin: string;
    insertTime: number;
    status: number;
    address: string;
    txId: string;
  }> = [];

  const NINETY_DAYS = 89 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const EARLIEST_DEFAULT_START = new Date('2017-01-01').getTime();
  const startFrom = customStartTime !== undefined && customStartTime > 0 ? customStartTime : EARLIEST_DEFAULT_START;

  for (let start = startFrom; start < now; start += NINETY_DAYS) {
    const end = Math.min(start + NINETY_DAYS, now);
    try {
      const chunk = await binanceRequest<Array<{
        id: string;
        amount: string;
        coin: string;
        insertTime: number;
        status: number;
        address: string;
        txId: string;
      }>>('/sapi/v1/capital/deposit/hisrec', { startTime: start, endTime: end, limit: 1000 }, true, false, creds);
      if (Array.isArray(chunk) && chunk.length > 0) {
        allDeposits.push(...chunk);
      }
    } catch (e) {
      console.warn(`Deposit chunk error [${new Date(start).toISOString()}]:`, e);
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  return allDeposits;
}
export const get8YearCryptoDeposits = getCryptoDeposits;

// 5. Crypto Withdrawals (with 90-day window loop, supports incremental startTime)
export async function getCryptoWithdrawals(creds?: BinanceCredentials, customStartTime?: number) {
  const allWithdrawals: Array<{
    id: string;
    amount: string;
    coin: string;
    applyTime: string;
    status: number;
    address: string;
    txId: string;
  }> = [];

  const NINETY_DAYS = 89 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const EARLIEST_DEFAULT_START = new Date('2017-01-01').getTime();
  const startFrom = customStartTime !== undefined && customStartTime > 0 ? customStartTime : EARLIEST_DEFAULT_START;

  for (let start = startFrom; start < now; start += NINETY_DAYS) {
    const end = Math.min(start + NINETY_DAYS, now);
    try {
      const chunk = await binanceRequest<Array<{
        id: string;
        amount: string;
        coin: string;
        applyTime: string;
        status: number;
        address: string;
        txId: string;
      }>>('/sapi/v1/capital/withdraw/history', { startTime: start, endTime: end, limit: 1000 }, true, false, creds);
      if (Array.isArray(chunk) && chunk.length > 0) {
        allWithdrawals.push(...chunk);
      }
    } catch (e) {
      console.warn(`Withdraw chunk error [${new Date(start).toISOString()}]:`, e);
    }
    await new Promise((r) => setTimeout(r, 40));
  }

  return allWithdrawals;
}
export const get8YearCryptoWithdrawals = getCryptoWithdrawals;

// 6. Fiat Deposits & Withdrawals (TRY, EUR, USD via Bank/Card)
export async function getFiatOrders(transactionType: 0 | 1, beginTime?: number, endTime?: number, creds?: BinanceCredentials) {
  try {
    return await binanceRequest<{
      data?: Array<{
        orderNo: string;
        fiatCurrency: string;
        indicatedAmount: string;
        amount: string;
        totalFee: string;
        method: string;
        status: string;
        createTime: number;
        updateTime: number;
      }>;
    }>('/sapi/v1/fiat/orders', { transactionType, beginTime, endTime, rows: 500 }, true, false, creds);
  } catch {
    return { data: [] };
  }
}

// 7. Spot Trades for a Symbol
export async function getSymbolTrades(symbol: string, fromId?: number, startTime?: number, creds?: BinanceCredentials) {
  try {
    return await binanceRequest<Array<{
      id: number;
      symbol: string;
      orderId: number;
      price: string;
      qty: string;
      quoteQty: string;
      commission: string;
      commissionAsset: string;
      time: number;
      isBuyer: boolean;
      isMaker: boolean;
    }>>('/api/v3/myTrades', { symbol, fromId, startTime, limit: 1000 }, true, false, creds);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message.includes('-1121') || error.message.includes('Invalid symbol')) {
      return [];
    }
    throw error;
  }
}

// 8. Convert Trade History
export async function getConvertHistory(startTime?: number, endTime?: number, creds?: BinanceCredentials) {
  try {
    return await binanceRequest<{
      list?: Array<{
        quoteId: string;
        orderId: number;
        orderStatus: string;
        fromAsset: string;
        fromAmount: string;
        toAsset: string;
        toAmount: string;
        ratio: string;
        inverseRatio: string;
        createTime: number;
      }>;
    }>('/sapi/v1/convert/tradeFlow', { startTime, endTime, limit: 100 }, true, false, creds);
  } catch {
    return { list: [] };
  }
}

// 9. Futures Income (Realized PnL, Commission, Funding Fees)
export async function getFuturesIncome(startTime?: number, endTime?: number, creds?: BinanceCredentials) {
  try {
    return await binanceRequest<Array<{
      symbol: string;
      incomeType: string;
      income: string;
      asset: string;
      time: number;
      tranId: number;
      tradeId: string;
    }>>('/fapi/v1/income', { startTime, endTime, limit: 1000 }, true, true, creds);
  } catch {
    return [];
  }
}

// 9b. Live Open Futures Positions (Risk & Mark Price)
export interface BinancePositionRisk {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  breakEvenPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxNotionalValue: string;
  marginType: string;
  isolatedMargin: string;
  positionSide: string;
  notional: string;
  updateTime: number;
}

export async function getFuturesPositions(creds?: BinanceCredentials): Promise<BinancePositionRisk[]> {
  try {
    const data = await binanceRequest<BinancePositionRisk[]>('/fapi/v2/positionRisk', {}, true, true, creds);
    if (!Array.isArray(data)) return [];
    return data.filter((p) => Math.abs(parseFloat(p.positionAmt)) > 0);
  } catch (e) {
    console.warn('Futures getFuturesPositions error:', e);
    return [];
  }
}

// 10. Historical USDT/TRY Daily Klines
export async function getUsdtTryDailyKlines(startTime?: number, endTime?: number) {
  try {
    const klines = await binanceRequest<Array<[number, string, string, string, string, string, number]>>(
      '/api/v3/klines',
      {
        symbol: 'USDTTRY',
        interval: '1d',
        startTime,
        endTime,
        limit: 1000,
      },
      false
    );

    return klines.map((k) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    }));
  } catch {
    return [];
  }
}

// 11. Generic Daily Klines for any symbol
export async function getDailyKlines(symbol: string, startTime?: number, endTime?: number) {
  try {
    const klines = await binanceRequest<Array<[number, string, string, string, string, string, number]>>(
      '/api/v3/klines',
      {
        symbol,
        interval: '1d',
        startTime,
        endTime,
        limit: 1000,
      },
      false
    );

    return klines.map((k) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    }));
  } catch {
    return [];
  }
}
