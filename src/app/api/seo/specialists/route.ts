import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const specialists = await prisma.user.findMany({
      where: {
        role: {
          in: ['SEO_SPECIALIST', 'SEO_MANAGER', 'SEO', 'ADMIN']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ specialists });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
