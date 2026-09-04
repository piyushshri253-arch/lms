import { NextRequest, NextResponse } from 'next/server';
import { deactivateLicenseDevice } from '@/lib/license';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, deviceId } = body;

    if (!licenseKey || !deviceId) {
      return NextResponse.json({ error: 'Both "licenseKey" and "deviceId" are mandatory.' }, { status: 400 });
    }

    const result = await deactivateLicenseDevice(licenseKey, deviceId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Deactivation failed.' }, { status: 500 });
  }
}
