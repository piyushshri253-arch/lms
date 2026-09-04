import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    await requireSuperAdmin();

    const jobs = await prisma.systemJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    const summary = {
      totalJobs: jobs.length,
      pendingCount: jobs.filter((j) => j.status === 'PENDING').length,
      runningCount: jobs.filter((j) => j.status === 'RUNNING').length,
      completedCount: jobs.filter((j) => j.status === 'COMPLETED').length,
      failedCount: jobs.filter((j) => j.status === 'FAILED').length
    };

    return NextResponse.json({
      summary,
      jobs
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();

    const { jobId, action = 'RETRY' } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const job = await prisma.systemJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    let updated;
    if (action === 'RETRY') {
      updated = await prisma.systemJob.update({
        where: { id: jobId },
        data: { status: 'PENDING', errorDetails: null }
      });
    } else if (action === 'CANCEL') {
      updated = await prisma.systemJob.update({
        where: { id: jobId },
        data: { status: 'CANCELLED' }
      });
    }

    await createAuditLog({
      actorId: admin.id,
      actorEmail: admin.email,
      action: `JOB_${action}`,
      entity: 'SystemJob',
      entityId: jobId,
      description: `Super Admin executed ${action} on job ${job.type} (#${jobId}).`
    });

    return NextResponse.json({
      message: `Job ${action.toLowerCase()} processed successfully`,
      job: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
