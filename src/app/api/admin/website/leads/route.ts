import { NextResponse } from 'next/server';
import { requireTenantRole, validateTenantOwnership, resolveAdminOrganization } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notification';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const { searchParams } = new URL(request.url);
    let targetOrgId = searchParams.get('organizationId') || user.organizationId;
    if (!targetOrgId) {
      const resolvedOrg = await resolveAdminOrganization(user);
      targetOrgId = resolvedOrg.id;
    }
    const orgId = targetOrgId;
    const status = searchParams.get('status');

    if (!validateTenantOwnership(orgId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const whereClause: any = { organizationId: orgId };
    if (status) {
      whereClause.status = status;
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    const summary = {
      total: leads.length,
      newCount: leads.filter((l) => l.status === 'NEW').length,
      contactedCount: leads.filter((l) => l.status === 'CONTACTED').length,
      qualifiedCount: leads.filter((l) => l.status === 'QUALIFIED').length,
      convertedCount: leads.filter((l) => l.status === 'CONVERTED').length,
      lostCount: leads.filter((l) => l.status === 'LOST').length
    };

    return NextResponse.json({
      summary,
      leads
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      organizationId,
      name,
      email,
      phone,
      sourceForm = 'CONTACT',
      sourceCourseId,
      message
    } = body;

    if (!organizationId || !name || !email) {
      return NextResponse.json({ error: 'organizationId, name, and email are required' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        name,
        email,
        phone,
        sourceForm,
        sourceCourseId,
        message,
        status: 'NEW'
      }
    });

    // Notify organization admins
    const admins = await prisma.user.findMany({
      where: { organizationId, role: 'ADMIN' },
      select: { id: true }
    });

    for (const adm of admins) {
      await createNotification({
        organizationId,
        userId: adm.id,
        title: 'New Lead Captured 🎯',
        message: `${name} (${email}) submitted inquiry via ${sourceForm} form.`,
        type: 'SYSTEM',
        category: 'STUDENTS'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your inquiry has been received.',
      leadId: lead.id
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireTenantRole(['ADMIN', 'SUPER_ADMIN']);
    const body = await request.json();
    const { leadId, status, notes } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (!validateTenantOwnership(lead.organizationId, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: status || lead.status,
        notes: notes !== undefined ? notes : lead.notes
      }
    });

    await createAuditLog({
      organizationId: lead.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'UPDATE_LEAD_STATUS',
      entity: 'Lead',
      entityId: lead.id,
      description: `Updated lead ${lead.name} status to ${updated.status}.`
    });

    return NextResponse.json({
      message: 'Lead updated successfully',
      lead: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
