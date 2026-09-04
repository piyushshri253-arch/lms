import { NextResponse } from 'next/server';
import { requireTenantRole, validateTenantOwnership, resolveAdminOrganization } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const { searchParams } = new URL(request.url);
    let targetOrgId = searchParams.get('organizationId') || user.organizationId;
    if (!targetOrgId) {
      const resolvedOrg = await resolveAdminOrganization(user);
      targetOrgId = resolvedOrg.id;
    }
    const orgId = targetOrgId;

    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const posts = await prisma.blogPost.findMany({
      where: { organizationId: orgId || undefined },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        featuredImage: p.featuredImage,
        authorName: p.authorName,
        category: p.category,
        tags: p.tags ? JSON.parse(p.tags) : [],
        status: p.status,
        publishedAt: p.publishedAt,
        createdAt: p.createdAt
      }))
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR']);
    const body = await request.json();
    const {
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      authorName,
      category,
      tags = [],
      seoTitle,
      seoDescription,
      status = 'DRAFT',
      organizationId: targetOrgParam
    } = body;

    let targetOrgId = targetOrgParam || user.organizationId;
    if (!targetOrgId) {
      const resolvedOrg = await resolveAdminOrganization(user);
      targetOrgId = resolvedOrg.id;
    }
    const orgId = targetOrgId;

    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const postSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const post = await prisma.blogPost.create({
      data: {
        organizationId: orgId,
        title,
        slug: postSlug,
        content,
        excerpt: excerpt || content.substring(0, 160),
        featuredImage,
        authorName: authorName || user.name,
        category: category || 'General',
        tags: JSON.stringify(tags),
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || excerpt,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null
      }
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'CREATE_BLOG_POST',
      entity: 'BlogPost',
      entityId: post.id,
      description: `Created blog post "${post.title}" (status: ${post.status}).`
    });

    return NextResponse.json({
      message: 'Blog post created successfully',
      post
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
