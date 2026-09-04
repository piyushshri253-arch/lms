import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireSuperAdmin();

    const events = await prisma.securityEvent.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const [totalFailedLogins, totalSuspendedUsers, activeSessionsCount] = await Promise.all([
      prisma.securityEvent.count({ where: { eventType: 'LOGIN_FAILED' } }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.user.count({ where: { status: 'ACTIVE' } })
    ]);

    return NextResponse.json({
      summary: {
        totalSecurityEvents: events.length,
        failedLoginsCount: totalFailedLogins,
        suspendedUsersCount: totalSuspendedUsers,
        activeSessionsCount,
        securityPosture: 'HARDENED'
      },
      events: events.map((e) => ({
        id: e.id,
        user: e.user ? { name: e.user.name, email: e.user.email, role: e.user.role } : null,
        email: e.email,
        eventType: e.eventType,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        createdAt: e.createdAt
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
