import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTenantRole } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && existing.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
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
      requirements,
      status
    } = body;

    const updated = await prisma.service.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        description: description !== undefined ? description.trim() : existing.description,
        shortDescription: shortDescription !== undefined ? shortDescription.trim() : existing.shortDescription,
        category: category !== undefined ? category : existing.category,
        thumbnail: thumbnail !== undefined ? thumbnail : existing.thumbnail,
        pricingType: pricingType !== undefined ? pricingType : existing.pricingType,
        price: price !== undefined ? Number(price) : existing.price,
        currency: currency !== undefined ? currency : existing.currency,
        deliveryDays: deliveryDays !== undefined ? Number(deliveryDays) : existing.deliveryDays,
        packages: packages !== undefined ? JSON.stringify(packages) : existing.packages,
        requirements: requirements !== undefined ? JSON.stringify(requirements) : existing.requirements,
        status: status !== undefined ? status : existing.status
      }
    });

    return NextResponse.json({ success: true, service: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { id } = await params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    if (user.role !== 'SUPER_ADMIN' && existing.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Service deleted.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete service' }, { status: 500 });
  }
}
