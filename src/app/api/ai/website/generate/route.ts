import { NextResponse } from 'next/server';
import { requireTenantRole } from '@/lib/auth';
import { AIWebsiteGenerator } from '@/lib/ai/websiteGenerator';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await req.json();
    const { prompt, applyDirectly = false } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt description is required' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId || '' }
    });

    const site = await AIWebsiteGenerator.generateWebsiteFromPrompt(
      prompt,
      {
        name: org?.name || 'Academy',
        description: org?.description || ''
      },
      user.organizationId || undefined
    );

    // If admin wants to stage directly into draft sections
    if (applyDirectly && user.organizationId) {
      const homePage = await prisma.websitePage.findFirst({
        where: { organizationId: user.organizationId, slug: 'home' }
      });

      if (homePage) {
        // Replace draft contents for home page
        for (const sec of site.sections) {
          const existing = await prisma.websiteSection.findFirst({
            where: { pageId: homePage.id, type: sec.type }
          });

          if (existing) {
            await prisma.websiteSection.update({
              where: { id: existing.id },
              data: {
                title: sec.title,
                subtitle: sec.subtitle,
                draftContent: JSON.stringify(sec.content),
                order: sec.order
              }
            });
          } else {
            await prisma.websiteSection.create({
              data: {
                pageId: homePage.id,
                type: sec.type,
                title: sec.title,
                subtitle: sec.subtitle,
                content: JSON.stringify(sec.content),
                draftContent: JSON.stringify(sec.content),
                order: sec.order,
                status: 'DRAFT'
              }
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, website: site });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}