import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const licenses = await prisma.softwareLicense.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            version: true,
            thumbnail: true,
            demoUrl: true,
            documentationUrl: true,
            files: {
              select: { id: true, fileName: true, fileType: true, fileSizeBytes: true }
            }
          }
        },
        organization: {
          select: { id: true, name: true, slug: true, logo: true }
        },
        activations: {
          where: { status: 'ACTIVE' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ licenses });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch customer licenses' }, { status: 500 });
  }
}
