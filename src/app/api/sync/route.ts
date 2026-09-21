import { NextResponse } from 'next/server';
import { runSync, getSyncStatus } from '@/lib/sync-engine';

export async function GET() {
  const status = getSyncStatus();
  return NextResponse.json({ success: true, status });
}

export async function POST(req: Request) {
  try {
    const status = getSyncStatus();
    if (status.inProgress) {
      return NextResponse.json({ success: true, message: 'Synchronization is already in progress.', status });
    }

    let fullSync = false;
    try {
      const body = await req.json();
      if (body && body.fullSync) {
        fullSync = true;
      }
    } catch {
      // Body may be empty or not json, default to incremental sync
    }

    // Trigger sync asynchronously in background
    runSync({ fullSync }).catch((err) => {
      console.error('Background sync failed:', err);
    });

    return NextResponse.json({
      success: true,
      message: fullSync ? 'Full synchronization started.' : 'Delta synchronization started.',
      status: getSyncStatus(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
