import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await requireSuperAdmin();
    const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ assets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { name, url, type, sizeBytes } = body;

    if (!name || !url || !type) {
      return NextResponse.json({ error: 'name, url, and type are required' }, { status: 400 });
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        type,
        sizeBytes: Number(sizeBytes) || 102400,
        uploadedBy: admin.name
      }
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'UPLOAD_MEDIA_ASSET',
        entity: 'MediaAsset',
        entityId: asset.id,
        description: `Super Admin uploaded media asset "${asset.name}".`
      }
    });

    return NextResponse.json({ message: 'Media asset uploaded.', asset });
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
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    await prisma.mediaAsset.delete({ where: { id } });

    return NextResponse.json({ message: 'Media asset deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
