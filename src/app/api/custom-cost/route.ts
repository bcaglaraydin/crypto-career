import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT asset, cost_usd FROM custom_costs').all();
  return NextResponse.json({ success: true, customCosts: rows });
}

export async function POST(req: NextRequest) {
  try {
    const { asset, costUSD } = await req.json();
    if (!asset) {
      return NextResponse.json({ success: false, error: 'Asset zorunludur' }, { status: 400 });
    }

    const db = getDb();
    const cleanAsset = asset.toUpperCase().trim();
    const cost = parseFloat(costUSD);

    if (isNaN(cost) || cost <= 0) {
      db.prepare('DELETE FROM custom_costs WHERE asset = ?').run(cleanAsset);
    } else {
      db.prepare('INSERT OR REPLACE INTO custom_costs (asset, cost_usd) VALUES (?, ?)').run(cleanAsset, cost);
    }

    return NextResponse.json({ success: true, asset: cleanAsset, costUSD: cost });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
