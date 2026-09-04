import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        xpPoints: true,
        currentStreak: true,
        longestStreak: true,
        lastLearningDate: true,
        userBadges: {
          include: { badge: true },
          orderBy: { earnedAt: 'desc' }
        }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Organization Leaderboard
    let leaderboard: any[] = [];
    if (user.organizationId) {
      leaderboard = await prisma.user.findMany({
        where: {
          organizationId: user.organizationId,
          role: 'STUDENT'
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          xpPoints: true,
          currentStreak: true
        },
        orderBy: { xpPoints: 'desc' },
        take: 10
      });
    }

    return NextResponse.json({
      profile: {
        xpPoints: dbUser.xpPoints,
        currentStreak: dbUser.currentStreak,
        longestStreak: dbUser.longestStreak,
        lastLearningDate: dbUser.lastLearningDate,
        badgesCount: dbUser.userBadges.length,
        badges: dbUser.userBadges.map((ub) => ({
          id: ub.badge.id,
          name: ub.badge.name,
          description: ub.badge.description,
          icon: ub.badge.icon,
          xpReward: ub.badge.xpReward,
          earnedAt: ub.earnedAt
        }))
      },
      leaderboard
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
