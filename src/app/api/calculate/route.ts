import { NextResponse } from 'next/server';
import { calculatePortfolio, PortfolioDataset } from '@/lib/pnl-calculator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dataset = (body.dataset || body) as PortfolioDataset;

    // Run stateless portfolio & lifetime PnL calculations
    const portfolio = await calculatePortfolio(dataset);

    return NextResponse.json({
      success: true,
      portfolio,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Stateless calculation failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
