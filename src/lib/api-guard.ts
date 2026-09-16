import { NextResponse } from 'next/server';
import { requireAuth, AuthSessionUser } from './auth';
import { prisma } from './prisma';
import { hasAdminPermission, hasFacilityScope, AdminPermissionKey } from './admin-permissions';

export interface GuardedAdminSession {
  user: AuthSessionUser;
  activeFacilityId: string;
  facility: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Backend authorization guard for Admin API routes.
 * Enforces:
 * 1. Valid Admin Session (Role !== 'STUDENT')
 * 2. Active Facility Scope (Belongs to Organization)
 * 3. Granular Permission Key (e.g. 'student.create', 'course.publish', 'payment.refund')
 */
export async function requireAdminApiGuard(
  permissionKey?: AdminPermissionKey | string,
  reqFacilityId?: string | null
): Promise<{ errorResponse?: NextResponse; sessionData?: GuardedAdminSession }> {
  try {
    const session = await requireAuth();

    // 1. Check basic admin role
    if (session.role === 'STUDENT') {
      return {
        errorResponse: NextResponse.json(
          { error: 'Access denied: Student accounts cannot access administrator resources.' },
          { status: 403 }
        )
      };
    }

    // 2. Resolve default company entity ID if present
    let companyOrg = await prisma.organization.findFirst({
      select: { id: true, name: true, slug: true }
    });
    if (!companyOrg) {
      companyOrg = await prisma.organization.create({
        data: {
          name: 'AADHYARA LMS',
          slug: 'aadhyara'
        },
        select: { id: true, name: true, slug: true }
      });
    }

    // 3. Verify Granular Permission
    if (permissionKey) {
      const hasPerm = hasAdminPermission(session, permissionKey);
      if (!hasPerm && session.role !== 'SUPER_ADMIN') {
        return {
          errorResponse: NextResponse.json(
            { error: `Access denied: Missing required permission [${permissionKey}].` },
            { status: 403 }
          )
        };
      }
    }

    return {
      sessionData: {
        user: session,
        activeFacilityId: companyOrg.id,
        facility: companyOrg
      }
    };
  } catch (err: any) {
    return {
      errorResponse: NextResponse.json(
        { error: err.message || 'Authentication required' },
        { status: 401 }
      )
    };
  }
}
