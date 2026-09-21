import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCredentials } from '@/lib/binance';

const SPOT_BASE = 'https://api.binance.com';
const FUTURES_BASE = 'https://fapi.binance.com';

function signQuery(queryString: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(queryString).digest('hex');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint, params = {}, isSigned = false, isFutures = false } = body;

    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'Endpoint is required.' }, { status: 400 });
    }

    // Determine credentials: client provided or fallback to server env
    let apiKey = body.apiKey;
    let apiSecret = body.apiSecret;

    if (!apiKey || !apiSecret) {
      const serverCreds = getCredentials();
      if (serverCreds) {
        apiKey = serverCreds.apiKey;
        apiSecret = serverCreds.apiSecret;
      }
    }

    if (isSigned && (!apiKey || !apiSecret)) {
      return NextResponse.json(
        { success: false, error: 'API Key and Secret Key are required for this signed endpoint.' },
        { status: 401 }
      );
    }

    const base = isFutures ? FUTURES_BASE : SPOT_BASE;
    const cleanParams: Record<string, string> = {};

    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        cleanParams[key] = String(val);
      }
    }

    if (isSigned && apiKey && apiSecret) {
      cleanParams.timestamp = Date.now().toString();
      cleanParams.recvWindow = '60000';
    }

    const queryString = new URLSearchParams(cleanParams).toString();
    let url = `${base}${endpoint}`;

    if (queryString) {
      if (isSigned && apiSecret) {
        const signature = signQuery(queryString, apiSecret);
        url = `${url}?${queryString}&signature=${signature}`;
      } else {
        url = `${url}?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CryptoTrack/1.0',
    };

    if (isSigned && apiKey) {
      headers['X-MBX-APIKEY'] = apiKey;
    }

    const response = await fetch(url, { headers, cache: 'no-store' });

    if (!response.ok) {
      const errText = await response.text();
      let parsedMsg = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedMsg = jsonErr.msg || jsonErr.message || errText;
      } catch {
        // use raw
      }
      return NextResponse.json(
        { success: false, error: `Binance [${response.status}]: ${parsedMsg}`, code: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
