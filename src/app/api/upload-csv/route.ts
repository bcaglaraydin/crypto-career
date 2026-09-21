import { NextRequest, NextResponse } from 'next/server';
import { parseBinanceCsv } from '@/lib/csv-parser';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    const text = await file.text();
    const result = parseBinanceCsv(text);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
