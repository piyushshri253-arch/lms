import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireSuperAdmin();
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ coupons });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { code, discountPercent, discountType, usageLimit, expiryDate } = body;

    if (!code || !discountPercent) {
      return NextResponse.json({ error: 'code and discountPercent are required' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await prisma.coupon.findFirst({ where: { code: cleanCode } });
    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        discountPercent: Number(discountPercent),
        discountType: discountType || 'PERCENTAGE',
        usageLimit: usageLimit ? Number(usageLimit) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: 'ACTIVE'
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'CREATE_COUPON',
        entity: 'Coupon',
        entityId: coupon.id,
        description: `Super Admin created promotional coupon "${coupon.code}" (${coupon.discountPercent}% discount).`
      }
    });

    return NextResponse.json({ message: `Coupon "${coupon.code}" created successfully.`, coupon });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { id, status, discountPercent, usageLimit } = body;

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (discountPercent !== undefined) data.discountPercent = Number(discountPercent);
    if (usageLimit !== undefined) data.usageLimit = usageLimit ? Number(usageLimit) : null;

    const updated = await prisma.coupon.update({ where: { id }, data });

    return NextResponse.json({ message: `Coupon updated.`, coupon: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    await prisma.coupon.delete({ where: { id } });

    return NextResponse.json({ message: 'Coupon deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
