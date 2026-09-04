import { NextRequest, NextResponse } from 'next/server';
import { activateLicenseDevice } from '@/lib/license';
import { checkRateLimit } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rateLimit = checkRateLimit(`license_activate_${ip}`, 30, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body = await req.json();
    const { licenseKey, deviceId, deviceName, deviceFingerprint } = body;

    if (!licenseKey || !deviceId) {
      return NextResponse.json({ error: 'Both "licenseKey" and "deviceId" are mandatory.' }, { status: 400 });
    }

    const result = await activateLicenseDevice({
      licenseKey,
      deviceId,
      deviceName,
      deviceFingerprint,
      ipAddress: ip
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Activation failed.' }, { status: 500 });
  }
}
