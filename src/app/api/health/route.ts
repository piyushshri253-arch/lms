import { NextResponse } from 'next/server';
import { checkSystemHealth, getSecurityHeaders } from '@/lib/security';

export async function GET() {
  const health = await checkSystemHealth();
  const headers = getSecurityHeaders();

  return NextResponse.json(health, {
    status: health.status === 'HEALTHY' ? 200 : 503,
    headers
  });
}
