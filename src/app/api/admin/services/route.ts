import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';
import { createService } from '@/lib/services';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const orgId = user.organizationId;
    if (!orgId && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No organization scope found' }, { status: 400 });
    }

    const where: any = {};
    if (user.role !== 'SUPER_ADMIN' || orgId) {
      where.organizationId = orgId;
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        bookings: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ services });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const orgId = user.organizationId;
    if (!orgId && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No organization scope found' }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      description,
      shortDescription,
      category = 'DESIGN',
      thumbnail,
      pricingType = 'FIXED',
      price = 0,
      currency = 'INR',
      deliveryDays = 3,
      packages = [],
      requirements = []
    } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'Service name and description are required.' }, { status: 400 });
    }

    const service = await createService({
      organizationId: orgId!,
      name,
      description,
      shortDescription,
      category,
      thumbnail,
      pricingType,
      price,
      currency,
      deliveryDays,
      packages,
      requirements
    });

    await logAudit({
      organizationId: orgId!,
      adminId: user.id,
      adminEmail: user.email,
      action: 'SERVICE_CREATED',
      entity: 'Service',
      entityId: service.id,
      description: `Created service "${service.name}" (₹${service.price})`
    });

    return NextResponse.json({ success: true, service });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create service' }, { status: 500 });
  }
}
