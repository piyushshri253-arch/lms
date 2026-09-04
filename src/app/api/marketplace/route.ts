import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const category = searchParams.get('category') || 'ALL';
    const type = searchParams.get('type') || 'ALL'; // ALL, PRODUCT, SOFTWARE, COURSE, SERVICE
    const sort = searchParams.get('sort') || 'POPULAR'; // POPULAR, NEWEST, PRICE_LOW, PRICE_HIGH, RATING
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;
    const minRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : null;

    // 1. Query Products & Software
    const productWhere: any = {
      status: 'ACTIVE',
      visibility: 'PUBLIC'
    };

    if (query) {
      productWhere.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
        { shortDescription: { contains: query } }
      ];
    }

    if (category !== 'ALL') {
      productWhere.category = category;
    }

    if (type === 'SOFTWARE') {
      productWhere.type = 'SOFTWARE';
    } else if (type === 'PRODUCT') {
      productWhere.type = { not: 'SOFTWARE' };
    }

    if (maxPrice !== null) {
      productWhere.price = { lte: maxPrice };
    }

    if (minRating !== null) {
      productWhere.rating = { gte: minRating };
    }

    const products = type === 'COURSE' || type === 'SERVICE' ? [] : await prisma.product.findMany({
      where: productWhere,
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true, verifiedSeller: true, sellerRating: true }
        },
        pricings: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'asc' }
        },
        files: {
          select: { id: true, fileName: true, fileType: true, fileSizeBytes: true, version: true }
        }
      },
      orderBy: sort === 'NEWEST' ? { createdAt: 'desc' } : sort === 'PRICE_LOW' ? { price: 'asc' } : sort === 'PRICE_HIGH' ? { price: 'desc' } : { totalSales: 'desc' },
      take: 40
    });

    // 2. Query Courses
    const courseWhere: any = {
      status: 'PUBLISHED'
    };

    if (query) {
      courseWhere.OR = [
        { title: { contains: query } },
        { description: { contains: query } }
      ];
    }

    if (maxPrice !== null) {
      courseWhere.price = { lte: maxPrice };
    }

    const courses = type === 'PRODUCT' || type === 'SOFTWARE' || type === 'SERVICE' ? [] : await prisma.course.findMany({
      where: courseWhere,
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true, verifiedSeller: true, sellerRating: true }
        },
        category: {
          select: { id: true, name: true, slug: true }
        },
        instructor: {
          select: { id: true, name: true, avatar: true }
        },
        _count: {
          select: { enrollments: true, reviews: true }
        }
      },
      orderBy: sort === 'NEWEST' ? { createdAt: 'desc' } : sort === 'PRICE_LOW' ? { price: 'asc' } : sort === 'PRICE_HIGH' ? { price: 'desc' } : { createdAt: 'desc' },
      take: 40
    });

    // 3. Query Services
    const serviceWhere: any = {
      status: 'ACTIVE'
    };

    if (query) {
      serviceWhere.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
        { shortDescription: { contains: query } }
      ];
    }

    if (category !== 'ALL') {
      serviceWhere.category = category;
    }

    if (maxPrice !== null) {
      serviceWhere.price = { lte: maxPrice };
    }

    const services = type === 'PRODUCT' || type === 'SOFTWARE' || type === 'COURSE' ? [] : await prisma.service.findMany({
      where: serviceWhere,
      include: {
        organization: {
          select: { id: true, name: true, slug: true, logo: true, verifiedSeller: true, sellerRating: true }
        }
      },
      orderBy: sort === 'NEWEST' ? { createdAt: 'desc' } : sort === 'PRICE_LOW' ? { price: 'asc' } : sort === 'PRICE_HIGH' ? { price: 'desc' } : { totalBookings: 'desc' },
      take: 40
    });

    // 4. Query Verified Sellers / Businesses
    const sellers = await prisma.organization.findMany({
      where: {
        status: 'ACTIVE',
        verifiedSeller: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        tagline: true,
        industry: true,
        businessType: true,
        sellerRating: true,
        sellerReviewCount: true,
        _count: {
          select: { products: true, courses: true, services: true }
        }
      },
      take: 12
    });

    return NextResponse.json({
      products,
      courses,
      services,
      sellers,
      counts: {
        products: products.length,
        courses: courses.length,
        services: services.length,
        sellers: sellers.length
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Marketplace search failed' }, { status: 500 });
  }
}
