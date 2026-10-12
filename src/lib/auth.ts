import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { UserRole, PlatformType, DEFAULT_ROLE_PERMISSIONS } from './permissions';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'morena-teach-saas-production-secure-jwt-key-2026'
);

export const SALES_COOKIE_NAME = 'sales_session_token';
export const LMS_COOKIE_NAME = 'lms_session_token';
export const REVIEWER_COOKIE_NAME = 'reviewer_session_token';

// Legacy cookies for backward compatibility
export const LEGACY_COOKIE_NAME = 'aadhyara_session_token';
export const IMPERSONATION_COOKIE = 'morena_impersonation_token';
export const LEGACY_IMPERSONATION_COOKIE = 'aadhyara_impersonation_token';

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
  try {
    const cookieStore = await cookies();
    // Delete any active LMS and impersonation tokens to prevent session collisions
    cookieStore.delete(LMS_COOKIE_NAME);
    cookieStore.delete(LEGACY_COOKIE_NAME);
    cookieStore.delete(IMPERSONATION_COOKIE);
    cookieStore.delete(LEGACY_IMPERSONATION_COOKIE);

    cookieStore.set(SALES_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
  } catch {
    // Gracefully handle calls outside Next.js request scope (e.g. test runners)
  }
}

export async function clearSalesSessionCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SALES_COOKIE_NAME);
  } catch {
    // Gracefully handle calls outside Next.js request scope
  }
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
  try {
    const cookieStore = await cookies();
    // Actively purge any sales and impersonation tokens to prevent admin/sales session bleeding into student sessions
    cookieStore.delete(SALES_COOKIE_NAME);
    cookieStore.delete(IMPERSONATION_COOKIE);
    cookieStore.delete(LEGACY_IMPERSONATION_COOKIE);

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
  } catch {
    // Gracefully handle calls outside Next.js request scope (e.g. test runners)
  }
}

export async function clearLmsSessionCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(LMS_COOKIE_NAME);
    cookieStore.delete(LEGACY_COOKIE_NAME);
    cookieStore.delete(IMPERSONATION_COOKIE);
    cookieStore.delete(LEGACY_IMPERSONATION_COOKIE);
  } catch {
    // Gracefully handle calls outside Next.js request scope
  }
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

    if (
      !dbUser ||
      dbUser.isSuspended ||
      dbUser.status === 'SUSPENDED' ||
      dbUser.status === 'INACTIVE' ||
      dbUser.status === 'DISABLED' ||
      dbUser.status === 'REJECTED' ||
      dbUser.status === 'PENDING_VERIFICATION' ||
      dbUser.status === 'PENDING_APPROVAL' ||
      ((dbUser.role === 'INSTRUCTOR' || dbUser.role === 'REVIEWER' || dbUser.role === 'AUDITOR') && dbUser.emailVerified === false)
    ) {
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
      platform: 'LMS',
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
// REVIEWER PLATFORM SESSIONS (Isolated session for Course Review Studio)
// ---------------------------------------------------------------------------

export async function setReviewerSessionCookie(user: AuthSessionUser) {
  const token = await createSessionToken({ ...user, platform: 'LMS', role: user.role });
  try {
    const cookieStore = await cookies();
    cookieStore.set(REVIEWER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
  } catch {
    // Gracefully handle calls outside Next.js request scope
  }
}

export async function clearReviewerSessionCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(REVIEWER_COOKIE_NAME);
  } catch {
    // Gracefully handle calls outside Next.js request scope
  }
}

export async function getReviewerCurrentUser(): Promise<AuthSessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(REVIEWER_COOKIE_NAME)?.value;
    if (!token) {
      // Fallback to LMS user if they have reviewer/admin role
      const lmsUser = await getLmsCurrentUser();
      if (lmsUser && ['REVIEWER', 'AUDITOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(lmsUser.role)) {
        return lmsUser;
      }
      return null;
    }

    const session = await verifySessionToken(token);
    if (!session) return null;

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

    if (
      !dbUser ||
      dbUser.isSuspended ||
      dbUser.status === 'SUSPENDED' ||
      dbUser.status === 'INACTIVE' ||
      dbUser.status === 'DISABLED' ||
      dbUser.status === 'REJECTED' ||
      dbUser.status === 'PENDING_VERIFICATION' ||
      ((dbUser.role === 'REVIEWER' || dbUser.role === 'AUDITOR') && dbUser.emailVerified === false)
    ) {
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
      platform: 'LMS',
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

export async function requireReviewerAuth(): Promise<AuthSessionUser> {
  const user = (await getReviewerCurrentUser()) || (await getCurrentUser());
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  const allowed = ['REVIEWER', 'AUDITOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'];
  if (!allowed.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

// ---------------------------------------------------------------------------
// GENERAL COMPATIBILITY HELPERS & GUARDS
// ---------------------------------------------------------------------------

export async function setSessionCookie(user: AuthSessionUser) {
  if (user.platform === 'SALES') {
    await setSalesSessionCookie(user);
  } else if (user.role === 'REVIEWER' || user.role === 'AUDITOR') {
    await setReviewerSessionCookie(user);
  } else {
    await setLmsSessionCookie(user);
  }
}

export async function clearSessionCookie(portal?: string) {
  if (portal === 'REVIEWER' || portal === 'AUDITOR') {
    await clearReviewerSessionCookie();
    return;
  }
  if (portal === 'SALES') {
    await clearSalesSessionCookie();
    return;
  }
  if (portal === 'LMS' || portal === 'INSTRUCTOR' || portal === 'STUDENT') {
    await clearLmsSessionCookie();
    return;
  }
  await clearSalesSessionCookie();
  await clearLmsSessionCookie();
  await clearReviewerSessionCookie();
}

export async function getCurrentUser(): Promise<AuthSessionUser | null> {
  // LMS (Student / Storefront / Teacher) session takes top precedence for Morena Teach
  const lmsUser = await getLmsCurrentUser();
  if (lmsUser) return lmsUser;
  const reviewerUser = await getReviewerCurrentUser();
  if (reviewerUser) return reviewerUser;
  return getSalesCurrentUser();
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
      ? `/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : '/admin/login';
    redirect(target);
  }

  if (!isAdminRole(user.role)) {
    redirect(
      '/admin/login?error=' +
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

export const getServerSession = getCurrentUser;

export function validateStrongPassword(password: string): {
  isValid: boolean;
  checks: {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  error?: string;
} {
  const checks = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)
  };
  const isValid =
    checks.minLength &&
    checks.uppercase &&
    checks.lowercase &&
    checks.number &&
    checks.special;

  if (!isValid) {
    return {
      isValid: false,
      checks,
      error:
        'Password must be at least 8 characters long and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (e.g. Abc@12345).'
    };
  }
  return { isValid: true, checks };
}


