import { NextResponse } from 'next/server';
import os from 'node:os';
import { getDb } from '@/lib/db';
import { getCredentials, testBinanceConnection, BinanceCredentials } from '@/lib/binance';
import { getLookbackStartTime } from '@/lib/sync-engine';

export async function GET() {
  try {
    const db = getDb();
    const creds = getCredentials();

    // Masked API key
    let maskedApiKey = '';
    if (creds?.apiKey) {
      if (creds.apiKey.length > 8) {
        maskedApiKey = `••••••••${creds.apiKey.slice(-6)}`;
      } else {
        maskedApiKey = '••••••••';
      }
    }

    // Lookback setting
    const lookbackRow = db.prepare("SELECT value FROM settings WHERE key = 'sync_lookback'").get() as { value: string } | undefined;
    const currentLookback = lookbackRow?.value || 'all';
    const lookbackInfo = getLookbackStartTime(currentLookback);

    // Network interfaces (to display local LAN IP for mobile access)
    const interfaces = os.networkInterfaces();
    const localIps: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        // Skip internal/loopback and non-IPv4
        if (net.family === 'IPv4' && !net.internal) {
          localIps.push(net.address);
        }
      }
    }

    // Database record counts
    const tradesCount = (db.prepare('SELECT COUNT(*) as c FROM trades').get() as { c: number }).c;
    const transfersCount = (db.prepare('SELECT COUNT(*) as c FROM transfers').get() as { c: number }).c;
    const spotBalancesCount = (db.prepare('SELECT COUNT(*) as c FROM spot_balances').get() as { c: number }).c;
    const futuresCount = (db.prepare('SELECT COUNT(*) as c FROM futures_positions').get() as { c: number }).c;
    const lastSyncRow = db.prepare("SELECT value FROM sync_state WHERE key = 'last_synced_at'").get() as { value: string } | undefined;

    return NextResponse.json({
      success: true,
      hasApiKey: !!creds?.apiKey,
      source: creds?.source || 'none',
      maskedApiKey,
      lookback: currentLookback,
      lookbackLabel: lookbackInfo.label,
      lookbackStartDate: new Date(lookbackInfo.startTime).toISOString().split('T')[0],
      localIps,
      port: process.env.PORT || '3000',
      dbStats: {
        tradesCount,
        transfersCount,
        spotBalancesCount,
        futuresCount,
        lastSyncedAt: lastSyncRow?.value || null,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getDb();
    const action = body.action || 'save_keys';

    // 1. Test Connection
    if (action === 'test_connection') {
      let testCreds: BinanceCredentials | undefined = undefined;
      if (body.apiKey && body.apiSecret) {
        testCreds = {
          apiKey: String(body.apiKey).trim(),
          apiSecret: String(body.apiSecret).trim(),
        };
      } else {
        const existing = getCredentials();
        if (!existing) {
          return NextResponse.json({
            success: false,
            message: 'No credentials configured to test. Enter API Key and Secret.',
          }, { status: 400 });
        }
        testCreds = existing;
      }

      const result = await testBinanceConnection(testCreds);
      return NextResponse.json(result);
    }

    // 2. Save API Keys to SQLite database
    if (action === 'save_keys') {
      const apiKey = String(body.apiKey || '').trim();
      const apiSecret = String(body.apiSecret || '').trim();

      if (!apiKey || !apiSecret) {
        return NextResponse.json({
          success: false,
          message: 'Both API Key and API Secret are required.',
        }, { status: 400 });
      }

      // Test connection first
      const testResult = await testBinanceConnection({ apiKey, apiSecret });
      if (!testResult.success) {
        return NextResponse.json({
          success: false,
          message: `Verification failed: ${testResult.message}`,
        }, { status: 400 });
      }

      // Save to database
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      upsert.run('binance_api_key', apiKey);
      upsert.run('binance_api_secret', apiSecret);

      return NextResponse.json({
        success: true,
        message: 'Binance API credentials verified and saved securely to local database.',
        accountType: testResult.accountType,
      });
    }

    // 3. Clear API Keys from database
    if (action === 'clear_keys') {
      db.prepare("DELETE FROM settings WHERE key IN ('binance_api_key', 'binance_api_secret')").run();
      return NextResponse.json({
        success: true,
        message: 'API keys removed from database. (If set in .env.local, those will remain active unless deleted from file).',
      });
    }

    // 4. Save Lookback preference
    if (action === 'save_lookback') {
      const lookback = String(body.lookback || 'all').trim();
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('sync_lookback', lookback);
      const lookbackInfo = getLookbackStartTime(lookback);

      return NextResponse.json({
        success: true,
        message: `Lookback preference saved: ${lookbackInfo.label}`,
        lookback,
        lookbackLabel: lookbackInfo.label,
        lookbackStartDate: new Date(lookbackInfo.startTime).toISOString().split('T')[0],
      });
    }

    // 5. Clear Database (Reset records)
    if (action === 'clear_database') {
      db.exec('DELETE FROM trades');
      db.exec('DELETE FROM transfers');
      db.exec('DELETE FROM futures_income');
      db.exec('DELETE FROM spot_balances');
      db.exec('DELETE FROM wallet_balances');
      db.exec('DELETE FROM futures_positions');
      db.exec('DELETE FROM custom_costs');
      db.exec('DELETE FROM sync_state');

      return NextResponse.json({
        success: true,
        message: 'All local database trades, transfers, and balances have been cleared.',
      });
    }

    return NextResponse.json({ success: false, message: 'Unknown action specified.' }, { status: 400 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
