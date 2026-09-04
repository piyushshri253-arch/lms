import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const bookings = await prisma.serviceBooking.findMany({
      where: { userId: user.id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            category: true,
            deliveryDays: true
          }
        },
        organization: {
          select: { id: true, name: true, slug: true, logo: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ bookings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch customer bookings' }, { status: 500 });
  }
}
