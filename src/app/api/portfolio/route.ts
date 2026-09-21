import { NextResponse } from 'next/server';
import { calculatePortfolio } from '@/lib/pnl-calculator';
import { getSyncStatus } from '@/lib/sync-engine';
import { getCredentials } from '@/lib/binance';

export async function GET() {
  try {
    const syncStatus = getSyncStatus();
    const creds = getCredentials();
    const portfolio = await calculatePortfolio();

    return NextResponse.json({
      success: true,
      hasCredentials: Boolean(creds),
      syncStatus,
      portfolio,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Portfolio calculation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
