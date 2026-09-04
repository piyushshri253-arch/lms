import { NextRequest, NextResponse } from 'next/server';
import { verifyLicenseKey } from '@/lib/license';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`license_verify_${ip}`, 60, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please retry in a moment.' }, { status: 429 });
    }

    const body = await req.json();
    const { licenseKey } = body;

    if (!licenseKey) {
      return NextResponse.json({ error: 'Missing required field: "licenseKey".' }, { status: 400 });
    }

    const result = await verifyLicenseKey(licenseKey);
    return NextResponse.json(result, { status: result.valid ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ error: 'License verification service error.' }, { status: 500 });
  }
}
