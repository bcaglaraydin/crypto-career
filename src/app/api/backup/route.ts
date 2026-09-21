import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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

    if (db) {
      try {
        trades = db.prepare('SELECT * FROM trades ORDER BY time ASC').all();
        transfers = db.prepare('SELECT * FROM transfers ORDER BY time ASC').all();
        balances = db.prepare('SELECT * FROM spot_balances').all();
        futures = db.prepare('SELECT * FROM futures_positions').all();
        settings = db.prepare('SELECT * FROM settings').all();
      } catch (err) {
        console.warn('Backup db read warning:', err);
      }
    }

    const backup = {
      app: 'CryptoTrack',
      version: 1,
      exportedAt: new Date().toISOString(),
      dataset: {
        trades,
        transfers,
        balances,
        futures,
      },
      settings,
      stats: {
        tradesCount: trades.length,
        transfersCount: transfers.length,
        balancesCount: balances.length,
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
