import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST() {
  try {
    const db = getDb();

    // 1. Seed historical USDT/TRY rates
    const insertRate = db.prepare('INSERT OR REPLACE INTO historical_rates (day, rate) VALUES (?, ?)');
    db.exec('BEGIN TRANSACTION');

    const rates = [
      { day: '2021-01-15', rate: 7.45 },
      { day: '2021-05-10', rate: 8.35 },
      { day: '2021-11-10', rate: 9.80 },
      { day: '2022-03-20', rate: 14.80 },
      { day: '2022-09-15', rate: 18.25 },
      { day: '2023-01-10', rate: 18.75 },
      { day: '2023-06-15', rate: 23.60 },
      { day: '2023-11-20', rate: 28.70 },
      { day: '2024-03-10', rate: 31.90 },
      { day: '2024-08-15', rate: 33.70 },
      { day: '2024-11-01', rate: 34.30 },
      { day: '2025-01-15', rate: 35.80 },
      { day: '2026-01-15', rate: 37.50 },
      { day: '2026-09-20', rate: 38.40 },
    ];

    for (const r of rates) {
      insertRate.run(r.day, r.rate);
    }

    // 2. Seed Transfers (TRY Deposits & Withdrawals)
    const insertTransfer = db.prepare(`
      INSERT OR REPLACE INTO transfers (id, asset, amount, type, fiat_or_crypto, time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertTransfer.run('demo_dep_1', 'TRY', 25000, 'DEPOSIT', 'FIAT', new Date('2021-01-15').getTime(), 'SUCCESS');
    insertTransfer.run('demo_dep_2', 'TRY', 50000, 'DEPOSIT', 'FIAT', new Date('2022-03-20').getTime(), 'SUCCESS');
    insertTransfer.run('demo_dep_3', 'USDT', 2000, 'DEPOSIT', 'CRYPTO', new Date('2023-06-15').getTime(), 'SUCCESS');
    insertTransfer.run('demo_wd_1', 'TRY', 15000, 'WITHDRAW', 'FIAT', new Date('2023-11-20').getTime(), 'SUCCESS');

    // 3. Seed Trades (Spot Trades)
    const insertTrade = db.prepare(`
      INSERT OR REPLACE INTO trades (id, source, symbol, base_asset, quote_asset, side, price, qty, quote_qty, commission, commission_asset, time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // BTC
    insertTrade.run('demo_t_1', 'SPOT', 'BTCUSDT', 'BTC', 'USDT', 'BUY', 32000, 0.08, 2560, 2.56, 'USDT', new Date('2021-01-20').getTime());
    insertTrade.run('demo_t_2', 'SPOT', 'BTCUSDT', 'BTC', 'USDT', 'BUY', 22000, 0.12, 2640, 2.64, 'USDT', new Date('2022-06-18').getTime());
    insertTrade.run('demo_t_3', 'SPOT', 'BTCUSDT', 'BTC', 'USDT', 'SELL', 64000, 0.05, 3200, 3.20, 'USDT', new Date('2024-03-12').getTime());

    // ETH
    insertTrade.run('demo_t_4', 'SPOT', 'ETHUSDT', 'ETH', 'USDT', 'BUY', 1800, 1.5, 2700, 2.7, 'USDT', new Date('2021-05-15').getTime());
    insertTrade.run('demo_t_5', 'SPOT', 'ETHUSDT', 'ETH', 'USDT', 'SELL', 4200, 0.8, 3360, 3.36, 'USDT', new Date('2021-11-12').getTime());

    // SOL
    insertTrade.run('demo_t_6', 'SPOT', 'SOLUSDT', 'SOL', 'USDT', 'BUY', 22, 50, 1100, 1.1, 'USDT', new Date('2023-01-15').getTime());
    insertTrade.run('demo_t_7', 'SPOT', 'SOLUSDT', 'SOL', 'USDT', 'SELL', 160, 20, 3200, 3.2, 'USDT', new Date('2024-04-05').getTime());

    // AVAX
    insertTrade.run('demo_t_8', 'SPOT', 'AVAXUSDT', 'AVAX', 'USDT', 'BUY', 75, 25, 1875, 1.87, 'USDT', new Date('2021-12-01').getTime());
    insertTrade.run('demo_t_9', 'SPOT', 'AVAXUSDT', 'AVAX', 'USDT', 'SELL', 18, 10, 180, 0.18, 'USDT', new Date('2022-10-15').getTime());

    // DOGE
    insertTrade.run('demo_t_10', 'SPOT', 'DOGEUSDT', 'DOGE', 'USDT', 'BUY', 0.35, 4000, 1400, 1.4, 'USDT', new Date('2021-05-08').getTime());
    insertTrade.run('demo_t_11', 'SPOT', 'DOGEUSDT', 'DOGE', 'USDT', 'SELL', 0.08, 3000, 240, 0.24, 'USDT', new Date('2023-03-10').getTime());

    // 4. Seed Futures Income
    const insertFutures = db.prepare(`
      INSERT OR REPLACE INTO futures_income (id, symbol, asset, income, income_type, time)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertFutures.run('demo_f_1', 'BTCUSDT', 'USDT', 420.50, 'REALIZED_PNL', new Date('2023-08-10').getTime());
    insertFutures.run('demo_f_2', 'ETHUSDT', 'USDT', -180.20, 'REALIZED_PNL', new Date('2023-10-15').getTime());
    insertFutures.run('demo_f_3', 'SOLUSDT', 'USDT', 310.80, 'REALIZED_PNL', new Date('2024-02-20').getTime());

    db.exec('COMMIT');

    // Update sync state
    db.prepare('INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)').run('last_synced_at', 'Demo Data Loaded');

    return NextResponse.json({ success: true, message: 'Demo data loaded successfully.' });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
