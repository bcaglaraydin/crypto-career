import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'crypto_tracker.db');

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      symbol TEXT NOT NULL,
      base_asset TEXT NOT NULL,
      quote_asset TEXT NOT NULL,
      side TEXT NOT NULL,
      price REAL NOT NULL,
      qty REAL NOT NULL,
      quote_qty REAL NOT NULL,
      commission REAL DEFAULT 0,
      commission_asset TEXT,
      time INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trades_base_asset ON trades(base_asset);
    CREATE INDEX IF NOT EXISTS idx_trades_time ON trades(time);
    CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);

    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      asset TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      fiat_or_crypto TEXT NOT NULL,
      time INTEGER NOT NULL,
      status TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_transfers_asset ON transfers(asset);
    CREATE INDEX IF NOT EXISTS idx_transfers_time ON transfers(time);

    CREATE TABLE IF NOT EXISTS futures_income (
      id TEXT PRIMARY KEY,
      symbol TEXT,
      asset TEXT NOT NULL,
      income REAL NOT NULL,
      income_type TEXT NOT NULL,
      time INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_futures_time ON futures_income(time);

    CREATE TABLE IF NOT EXISTS earn_rewards (
      id TEXT PRIMARY KEY,
      asset TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT,
      time INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS historical_rates (
      day TEXT PRIMARY KEY,
      rate REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS historical_crypto_rates (
      pair TEXT NOT NULL,
      day TEXT NOT NULL,
      rate REAL NOT NULL,
      PRIMARY KEY (pair, day)
    );

    CREATE TABLE IF NOT EXISTS spot_balances (
      asset TEXT PRIMARY KEY,
      free REAL NOT NULL,
      locked REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_balances (
      wallet_name TEXT PRIMARY KEY,
      balance_btc REAL NOT NULL,
      balance_usdt REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_costs (
      asset TEXT PRIMARY KEY,
      cost_usd REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS futures_positions (
      symbol TEXT PRIMARY KEY,
      position_amt REAL NOT NULL,
      entry_price REAL NOT NULL,
      mark_price REAL NOT NULL,
      unrealized_profit REAL NOT NULL,
      liquidation_price REAL NOT NULL,
      leverage INTEGER NOT NULL,
      notional REAL NOT NULL,
      margin_type TEXT NOT NULL,
      position_side TEXT NOT NULL,
      update_time INTEGER NOT NULL
    );
  `);
}
