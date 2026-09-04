import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const organization = await prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        tagline: true,
        industry: true,
        businessType: true,
        verifiedSeller: true,
        verificationStatus: true,
        sellerRating: true,
        sellerReviewCount: true,
        currency: true,
        createdAt: true,
        products: {
          where: { status: 'ACTIVE', visibility: 'PUBLIC' },
          include: {
            pricings: { where: { status: 'ACTIVE' } },
            files: { select: { id: true, fileName: true, fileType: true, version: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        courses: {
          where: { status: 'PUBLISHED' },
          include: {
            instructor: { select: { id: true, name: true, avatar: true } },
            category: { select: { id: true, name: true } },
            _count: { select: { enrollments: true, reviews: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        services: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' }
        },
        productReviews: {
          where: { status: 'APPROVED' },
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          },
          take: 15,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ business: organization });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch business profile' }, { status: 500 });
  }
}
