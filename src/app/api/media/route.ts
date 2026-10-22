import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const type = searchParams.get('type');
    const provider = searchParams.get('provider');

    const where: any = {};
    if (search) {
      where.name = { contains: search };
    }
    if (type && type !== 'ALL') {
      where.type = type;
    }
    if (provider && provider !== 'ALL') {
      where.provider = provider;
    }

    // If instructor, filter by their authored assets or general assets
    if (user.role === 'INSTRUCTOR') {
      where.OR = [{ uploadedBy: user.id }, { uploadedBy: null }];
    }

    const assets = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Check which lessons currently use each asset url
    const allAssetUrls = assets.map((a) => a.url);
    const linkedLessons = await prisma.lesson.findMany({
      where: { videoUrl: { in: allAssetUrls } },
      select: {
        id: true,
        title: true,
        videoUrl: true,
        section: {
          select: {
            title: true,
            courseId: true,
            course: { select: { id: true, title: true } }
          }
        }
      }
    });

    const urlToLessonMap = new Map<string, any[]>();
    linkedLessons.forEach((l) => {
      if (l.videoUrl) {
        const existing = urlToLessonMap.get(l.videoUrl) || [];
        existing.push({
          id: l.id,
          title: l.title,
          sectionTitle: l.section.title,
          courseId: l.section.course.id,
          courseTitle: l.section.course.title
        });
        urlToLessonMap.set(l.videoUrl, existing);
      }
    });

    const enriched = assets.map((a) => ({
      ...a,
      usedInLessons: urlToLessonMap.get(a.url) || [],
      isUsed: (urlToLessonMap.get(a.url) || []).length > 0
    }));

    return NextResponse.json({ assets: enriched });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    const status = isAuth ? 401 : isForbidden ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const force = searchParams.get('force') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'Media Asset ID is required.' }, { status: 400 });
    }

    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ error: 'Media Asset not found.' }, { status: 404 });
    }

    if (user.role === 'INSTRUCTOR' && asset.uploadedBy !== user.id) {
      return NextResponse.json({ error: 'Forbidden: Cannot delete assets of another instructor.' }, { status: 403 });
    }

    // Check if asset is used by any lesson
    const usingLessons = await prisma.lesson.findMany({
      where: { videoUrl: asset.url },
      select: { id: true, title: true }
    });

    if (usingLessons.length > 0 && !force) {
      return NextResponse.json(
        {
          error: `Cannot delete asset. It is currently being used in ${usingLessons.length} course lesson(s) ("${usingLessons[0].title}"). Detach or pass force=true to proceed.`,
          usingLessons
        },
        { status: 409 }
      );
    }

    // If local file, delete from disk
    if (asset.url.startsWith('/uploads/videos/')) {
      const filename = path.basename(asset.url);
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'videos', filename);
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
        } catch {}
      }
    }

    await prisma.mediaAsset.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: 'DELETE_MEDIA_ASSET',
        entity: 'MediaAsset',
        entityId: id,
        description: `${user.role} deleted media asset "${asset.name}".`
      }
    });

    return NextResponse.json({ success: true, message: 'Media asset deleted successfully.' });
  } catch (err: any) {
    const isAuth = err.message?.includes('Authentication');
    const isForbidden = err.message?.includes('forbidden') || err.message?.includes('Insufficient');
    const status = isAuth ? 401 : isForbidden ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
