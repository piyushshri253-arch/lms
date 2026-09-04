import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { UserRole, PlatformType, DEFAULT_ROLE_PERMISSIONS } from './permissions';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'aadhyara-saas-production-secure-jwt-key-2026'
);

export const SALES_COOKIE_NAME = 'sales_session_token';
export const LMS_COOKIE_NAME = 'lms_session_token';

// Legacy cookies for backward compatibility
export const LEGACY_COOKIE_NAME = 'aadhyara_session_token';
export const IMPERSONATION_COOKIE = 'aadhyara_impersonation_token';

export type { UserRole, PlatformType };

export interface AuthSessionUser {
  id: string;
  name: string;
  email: string;
  platform?: PlatformType; // 'SALES' | 'LMS'
  role: UserRole;
  organizationId?: string | null;
  organizationSlug?: string | null;
  organizationName?: string | null;
  organizationStatus?: string | null;
  plan?: string | null;
  avatar?: string | null;
  phone?: string | null;
  customRole?: string | null;
  permissions?: string[];
  status?: string;
  emailVerified?: boolean;
  sessionVersion?: number;
  impersonatedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: AuthSessionUser): Promise<string> {
  return new SignJWT({ ...payload, platform: payload.platform || 'LMS' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AuthSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthSessionUser;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SALES PLATFORM SESSIONS
// ---------------------------------------------------------------------------

export async function setSalesSessionCookie(user: AuthSessionUser) {
  const token = await createSessionToken({ ...user, platform: 'SALES' });
  const cookieStore = await cookies();
  cookieStore.set(SALES_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

export async function clearSalesSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SALES_COOKIE_NAME);
}

export async function getSalesCurrentUser(): Promise<AuthSessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SALES_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await verifySessionToken(token);
    if (!session || session.platform !== 'SALES') return null;

    const dbUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        platform: true,
        role: true,
        avatar: true,
        phone: true,
        customRole: true,
        permissions: true,
        status: true,
        emailVerified: true,
        sessionVersion: true,
        isSuspended: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            plan: true,
            subscriptionStatus: true,
            onboardingCompleted: true
          }
        }
      }
    });

    if (!dbUser || dbUser.platform !== 'SALES' || dbUser.isSuspended || dbUser.status === 'SUSPENDED') {
      return null;
    }

    if (session.sessionVersion && dbUser.sessionVersion !== session.sessionVersion) {
      return null;
    }

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = JSON.parse(dbUser.permissions || '[]');
      if (parsedPermissions.length === 0) {
        parsedPermissions = DEFAULT_ROLE_PERMISSIONS[dbUser.role as UserRole] || [];
      }
    } catch {
      parsedPermissions = DEFAULT_ROLE_PERMISSIONS[dbUser.role as UserRole] || [];
    }

    return {
      id: dbUser.id,
      organizationId: dbUser.organizationId || null,
      organizationName: dbUser.organization?.name || null,
      organizationSlug: dbUser.organization?.slug || null,
      organizationStatus: dbUser.organization?.status || null,
      plan: dbUser.organization?.plan || null,
      name: dbUser.name,
      email: dbUser.email,
      platform: 'SALES',
      role: dbUser.role as UserRole,
      avatar: dbUser.avatar,
      phone: dbUser.phone,
      customRole: dbUser.customRole,
      permissions: parsedPermissions,
      status: dbUser.status,
      emailVerified: dbUser.emailVerified,
      sessionVersion: dbUser.sessionVersion
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// LMS PLATFORM SESSIONS
// ---------------------------------------------------------------------------

export async function setLmsSessionCookie(user: AuthSessionUser) {
  const token = await createSessionToken({ ...user, platform: 'LMS' });
  const cookieStore = await cookies();
  cookieStore.set(LMS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
  // Also set legacy cookie for backwards compatibility
  cookieStore.set(LEGACY_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearLmsSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(LMS_COOKIE_NAME);
  cookieStore.delete(LEGACY_COOKIE_NAME);
  cookieStore.delete(IMPERSONATION_COOKIE);
}

export async function getLmsCurrentUser(): Promise<AuthSessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get(LMS_COOKIE_NAME)?.value ||
      cookieStore.get(LEGACY_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await verifySessionToken(token);
    if (!session || (session.platform && session.platform !== 'LMS' && session.role !== 'SUPER_ADMIN')) {
      return null;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        platform: true,
        role: true,
        avatar: true,
        phone: true,
        customRole: true,
        permissions: true,
        status: true,
        emailVerified: true,
        sessionVersion: true,
        isSuspended: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            plan: true,
            subscriptionStatus: true
          }
        }
      }
    });

    if (!dbUser || dbUser.isSuspended || dbUser.status === 'SUSPENDED') {
      return null;
    }

    if (session.sessionVersion && dbUser.sessionVersion !== session.sessionVersion) {
      return null;
    }

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = JSON.parse(dbUser.permissions || '[]');
      if (parsedPermissions.length === 0) {
        parsedPermissions = DEFAULT_ROLE_PERMISSIONS[dbUser.role as UserRole] || [];
      }
    } catch {
      parsedPermissions = DEFAULT_ROLE_PERMISSIONS[dbUser.role as UserRole] || [];
    }

    return {
      id: dbUser.id,
      organizationId: dbUser.organizationId || null,
      organizationName: dbUser.organization?.name || null,
      organizationSlug: dbUser.organization?.slug || null,
      organizationStatus: dbUser.organization?.status || null,
      plan: dbUser.organization?.plan || null,
      name: dbUser.name,
      email: dbUser.email,
      platform: (dbUser.platform as PlatformType) || 'LMS',
      role: dbUser.role as UserRole,
      avatar: dbUser.avatar,
      phone: dbUser.phone,
      customRole: dbUser.customRole,
      permissions: parsedPermissions,
      status: dbUser.status,
      emailVerified: dbUser.emailVerified,
      sessionVersion: dbUser.sessionVersion
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GENERAL COMPATIBILITY HELPERS & GUARDS
// ---------------------------------------------------------------------------

export async function setSessionCookie(user: AuthSessionUser) {
  if (user.platform === 'SALES') {
    await setSalesSessionCookie(user);
  } else {
    await setLmsSessionCookie(user);
  }
}

export async function clearSessionCookie() {
  await clearSalesSessionCookie();
  await clearLmsSessionCookie();
}

export async function getCurrentUser(): Promise<AuthSessionUser | null> {
  const salesUser = await getSalesCurrentUser();
  if (salesUser) return salesUser;
  return getLmsCurrentUser();
}

export async function requireAuth(req?: Request): Promise<AuthSessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireTenantAuth(req?: Request): Promise<AuthSessionUser> {
  const user = await getLmsCurrentUser();
  if (user) return user;
  const genericUser = await getCurrentUser();
  if (genericUser) return genericUser;
  throw new Error('UNAUTHORIZED');
}

export async function requireSalesAuth(req?: Request): Promise<AuthSessionUser> {
  const user = await getSalesCurrentUser();
  if (!user || user.platform !== 'SALES') {
    throw new Error('SALES_UNAUTHORIZED: Valid Sales account session required.');
  }
  return user;
}

export async function requireLmsAuth(req?: Request): Promise<AuthSessionUser> {
  const user = await getLmsCurrentUser();
  if (!user || (user.platform !== 'LMS' && user.role !== 'SUPER_ADMIN')) {
    throw new Error('LMS_UNAUTHORIZED: Valid LMS account session required.');
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<AuthSessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  if (user.role === 'SUPER_ADMIN') {
    return user;
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requireTenantRole(allowedRoles: UserRole[]): Promise<AuthSessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  if (user.role === 'SUPER_ADMIN') {
    return user;
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requireSuperAdmin(): Promise<AuthSessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error('SUPER_ADMIN_REQUIRED');
  }
  return user;
}

export async function requireTenantAdmin(): Promise<AuthSessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'SALES_ADMIN' || user.role === 'LMS_ADMIN') {
    return user;
  }
  throw new Error('FORBIDDEN');
}

export async function requirePermission(permission: string): Promise<AuthSessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  if (user.role === 'SUPER_ADMIN' || user.role === 'SALES_ADMIN' || user.role === 'LMS_ADMIN') {
    return user;
  }
  if (user.permissions?.includes(permission) || user.permissions?.includes('ALL')) {
    return user;
  }
  throw new Error('INSUFFICIENT_PERMISSIONS');
}

export const requireTenantPermission = requirePermission;

export async function enforceTenantPlanLimits(
  organizationId?: string | null,
  resourceType?: string,
  count?: number
): Promise<{ allowed: boolean; message?: string }> {
  return { allowed: true };
}

export function validateTenantOwnership(
  first: any,
  second: any
): boolean {
  const orgA = typeof first === 'object' && first !== null ? first.organizationId : first;
  const orgB = typeof second === 'object' && second !== null ? second.organizationId : second;
  if (!orgA && !orgB) return true;
  if (!orgA || !orgB) return true; // If one side has no tenant constraint, allow
  return orgA === orgB;
}

export async function resolveAdminOrganization(user: AuthSessionUser): Promise<any> {
  if (user.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId }
    });
    if (org) return org;
  }
  return prisma.organization.findFirst();
}

// ---------------------------------------------------------------------------
// CENTRALIZED ADMIN AUTHORIZATION HELPERS
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export function isAdminRole(role?: string): boolean {
  if (!role) return false;
  return (
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'LMS_ADMIN' ||
    role === 'SALES_ADMIN'
  );
}

/**
 * Server Component Guard for /admin/* and other administrative layouts/pages.
 * Must be used in Server Component layouts and pages.
 * Rejects unauthenticated users (redirects to /login?callbackUrl=...).
 * Rejects non-admin users (e.g. STUDENT, regular INSTRUCTOR).
 */
export async function requireAdmin(callbackUrl?: string): Promise<AuthSessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = callbackUrl
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : '/login';
    redirect(target);
  }

  if (!isAdminRole(user.role)) {
    redirect(
      '/unauthorized?msg=' +
        encodeURIComponent('Access denied: Administrator privileges required.')
    );
  }

  return user;
}

/**
 * API Route Guard for sensitive admin endpoints.
 * Throws typed AuthError with semantic status code (401 or 403).
 */
export async function requireAdminApi(req?: Request): Promise<AuthSessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError(
      'Authentication required. Please log into an administrator account.',
      401
    );
  }

  if (!isAdminRole(user.role)) {
    throw new AuthError(
      'Access denied: Insufficient administrative privileges.',
      403
    );
  }

  return user;
}

/**
 * Handles error responses in API routes returning proper HTTP 401 / 403 / 500 JSON.
 */
export function handleAuthError(err: any): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
  const msg = String(err?.message || '');
  if (
    msg === 'UNAUTHORIZED' ||
    msg.includes('UNAUTHORIZED') ||
    msg.toLowerCase().includes('authentication required')
  ) {
    return NextResponse.json(
      { error: 'Authentication required. Please log in.' },
      { status: 401 }
    );
  }
  if (
    msg === 'FORBIDDEN' ||
    msg.includes('FORBIDDEN') ||
    msg.includes('INSUFFICIENT_PERMISSIONS') ||
    msg.includes('SUPER_ADMIN_REQUIRED') ||
    msg.toLowerCase().includes('access denied') ||
    msg.toLowerCase().includes('insufficient')
  ) {
    return NextResponse.json(
      { error: 'Access denied: Insufficient administrative privileges.' },
      { status: 403 }
    );
  }
  return NextResponse.json(
    { error: err?.message || 'An unexpected error occurred.' },
    { status: 500 }
  );
}

