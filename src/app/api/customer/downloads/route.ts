import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Fetch all paid order items with attached products and files
    const paidOrders = await prisma.order.findMany({
      where: {
        userId: user.id,
        status: { in: ['PAID', 'COMPLETED'] }
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                files: true,
                organization: {
                  select: { id: true, name: true, slug: true, logo: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const downloads: any[] = [];

    for (const order of paidOrders) {
      for (const item of order.items) {
        if (item.product && item.product.files.length > 0) {
          for (const file of item.product.files) {
            downloads.push({
              fileId: file.id,
              fileName: file.fileName,
              fileType: file.fileType,
              fileSizeBytes: file.fileSizeBytes,
              version: file.version || item.product.version || '1.0.0',
              fileUrl: file.fileUrl,
              productName: item.product.name,
              productSlug: item.product.slug,
              productId: item.product.id,
              organization: item.product.organization,
              purchasedAt: order.createdAt,
              orderNumber: order.orderNumber,
              licenseKey: item.licenseKey
            });
          }
        }
      }
    }

    return NextResponse.json({ downloads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch downloads' }, { status: 500 });
  }
}
