import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { calculatePortfolio } from '@/lib/pnl-calculator';

export async function GET() {
  try {
    let db: any = null;
    try {
      db = getDb();
    } catch {}

    let trades: any[] = [];
    let transfers: any[] = [];
    let balances: any[] = [];
    let futures: any[] = [];
    let settings: any[] = [];
    let wallets: any[] = [];
    let customCosts: any[] = [];
    let cachedPortfolio: any = null;

    if (db) {
      try {
        trades = db.prepare('SELECT * FROM trades ORDER BY time ASC').all();
        transfers = db.prepare('SELECT * FROM transfers ORDER BY time ASC').all();
        balances = db.prepare('SELECT * FROM spot_balances').all();
        futures = db.prepare('SELECT * FROM futures_positions').all();
        settings = db.prepare('SELECT * FROM settings').all();
        wallets = db.prepare('SELECT * FROM wallet_balances').all();
        customCosts = db.prepare('SELECT * FROM custom_costs').all();
      } catch (err) {
        console.warn('Backup db read warning:', err);
      }

      try {
        cachedPortfolio = await calculatePortfolio();
      } catch (calcErr) {
        console.warn('Backup portfolio calculation warning:', calcErr);
      }
    }

    const tickerPrices: Record<string, number> = {};
    if (cachedPortfolio?.coinSummaries) {
      for (const c of cachedPortfolio.coinSummaries) {
        if (c.currentPriceUSD > 0) {
          tickerPrices[`${c.asset}USDT`] = c.currentPriceUSD;
        }
      }
      if (cachedPortfolio.currentUsdtTryRate) {
        tickerPrices['USDTTRY'] = cachedPortfolio.currentUsdtTryRate;
      }
    }

    const backup = {
      app: 'CryptoTrack',
      version: 1,
      exportedAt: new Date().toISOString(),
      dataset: {
        trades,
        transfers,
        spotBalances: balances,
        balances,
        futuresPositions: futures,
        futures,
        walletBalances: wallets,
        wallets,
        customCosts,
        tickerPrices,
      },
      cachedPortfolio,
      settings,
      stats: {
        tradesCount: trades.length,
        transfersCount: transfers.length,
        spotBalancesCount: balances.length,
        futuresCount: futures.length,
      },
    };

    return NextResponse.json({
      success: true,
      backup,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
