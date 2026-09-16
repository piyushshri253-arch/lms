import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await requireAuth();

    if (session.role === 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Super Admins have access to all facilities in the network
    if (session.role === 'SUPER_ADMIN') {
      const allOrgs = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          plan: true,
          status: true
        },
        orderBy: { name: 'asc' }
      });

      return NextResponse.json({
        facilities: allOrgs.map((o) => ({
          ...o,
          role: 'SUPER_ADMIN'
        }))
      });
    }

    // Regular Admins: gather direct organization + membership organizations
    const facilityIds = new Set<string>();
    if (session.organizationId) {
      facilityIds.add(session.organizationId);
    }

    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: session.id,
        status: 'ACTIVE'
      },
      select: {
        organizationId: true,
        role: true
      }
    });

    memberships.forEach((m) => facilityIds.add(m.organizationId));

    if (facilityIds.size === 0) {
      // Fallback: create or retrieve primary facility
      const defaultOrg = await prisma.organization.findFirst({
        select: { id: true, name: true, slug: true, logo: true, plan: true }
      });
      if (defaultOrg) {
        facilityIds.add(defaultOrg.id);
      }
    }

    const facilities = await prisma.organization.findMany({
      where: {
        id: { in: Array.from(facilityIds) }
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        plan: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ facilities });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
