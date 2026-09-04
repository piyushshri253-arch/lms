import { prisma } from './prisma';

export interface CreateAuditLogParams {
  organizationId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  adminId?: string | null;
  adminEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  req?: Request;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    let ip = params.ipAddress;
    let ua = params.userAgent;

    if (params.req) {
      ip = ip || params.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
      ua = ua || params.req.headers.get('user-agent') || 'Browser/Client';
    }

    return await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId || null,
        adminId: params.actorId || params.adminId || null,
        adminEmail: params.actorEmail || params.adminEmail || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        description: params.description,
        ipAddress: ip || '127.0.0.1',
        userAgent: ua || 'System'
      }
    });
  } catch (error) {
    console.error('[Audit Log Error]:', error);
    return null;
  }
}

export const logAudit = createAuditLog;

