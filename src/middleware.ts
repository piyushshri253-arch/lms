import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'aadhyara-saas-production-secure-jwt-key-2026'
);

const SALES_COOKIE = 'sales_session_token';
const LMS_COOKIE = 'lms_session_token';
const LEGACY_COOKIE = 'aadhyara_session_token';

interface TokenPayload {
  id: string;
  email: string;
  platform?: 'SALES' | 'LMS';
  role: string;
  organizationId?: string | null;
  emailVerified?: boolean;
}

async function verifyToken(token?: string): Promise<TokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

function isAuthorizedAdminRole(role?: string): boolean {
  return (
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'LMS_ADMIN' ||
    role === 'SALES_ADMIN'
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const salesCookieVal = request.cookies.get(SALES_COOKIE)?.value;
  const lmsCookieVal =
    request.cookies.get(LMS_COOKIE)?.value ||
    request.cookies.get(LEGACY_COOKIE)?.value;

  const salesSession = await verifyToken(salesCookieVal);
  const lmsSession = await verifyToken(lmsCookieVal);

  const isSalesValid = !!salesSession && salesSession.platform === 'SALES';
  const isLmsValid =
    !!lmsSession && (lmsSession.platform === 'LMS' || lmsSession.role === 'SUPER_ADMIN' || !lmsSession.platform);

  // Clone headers and forward current pathname for Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // -------------------------------------------------------------------------
  // 1. GENERAL / ENTRY ACCESS
  // -------------------------------------------------------------------------
  if (pathname === '/login') {
    return createSecureResponse(
      NextResponse.next({
        request: { headers: requestHeaders }
      })
    );
  }

  // -------------------------------------------------------------------------
  // 2. ADMIN ROUTE PROTECTION (/admin and /admin/*)
  // -------------------------------------------------------------------------
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const adminSession = lmsSession || salesSession;
    const isAuth = isLmsValid || isSalesValid;

    // A. Unauthenticated visitor: immediately redirect to /login with callbackUrl
    if (!isAuth || !adminSession) {
      const callback = encodeURIComponent(pathname + (search || ''));
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callback}`, request.url));
    }

    const role = adminSession.role;

    // B. Student account: forbid admin access
    if (role === 'STUDENT') {
      return NextResponse.redirect(
        new URL(
          '/unauthorized?msg=' +
            encodeURIComponent('Access denied: Student accounts cannot access administrative portals.'),
          request.url
        )
      );
    }

    // C. Instructor account: redirect builder or forbid general admin access
    if (role === 'INSTRUCTOR') {
      if (pathname === '/admin/courses/builder' || pathname.startsWith('/admin/courses/builder/')) {
        const target = new URL('/instructor/courses/builder', request.url);
        target.search = request.nextUrl.search;
        return NextResponse.redirect(target);
      }
      return NextResponse.redirect(
        new URL(
          '/unauthorized?msg=' +
            encodeURIComponent('Access denied: Instructor accounts do not have general administrative access.'),
          request.url
        )
      );
    }

    // D. Enforce authorized admin roles (SUPER_ADMIN, ADMIN, LMS_ADMIN, SALES_ADMIN)
    if (!isAuthorizedAdminRole(role)) {
      return NextResponse.redirect(
        new URL(
          '/unauthorized?msg=' +
            encodeURIComponent('Access denied: Administrator privileges required.'),
          request.url
        )
      );
    }

    // E. Canonicalize base /admin and /admin/dashboard to specific platform dashboards
    if (pathname === '/admin' || pathname === '/admin/dashboard') {
      if (role === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/super-admin', request.url));
      }
      if (isLmsValid) {
        return NextResponse.redirect(new URL('/lms/admin', request.url));
      }
      if (isSalesValid) {
        return NextResponse.redirect(new URL('/sales/dashboard', request.url));
      }
    }

    // F. Authorized admin visiting sub-routes (/admin/courses/builder, etc.) -> allow through
    return createSecureResponse(
      NextResponse.next({
        request: { headers: requestHeaders }
      })
    );
  }

  // -------------------------------------------------------------------------
  // 3. ADMIN API PROTECTION (/api/admin and /api/admin/*)
  // -------------------------------------------------------------------------
  if (pathname.startsWith('/api/admin')) {
    const adminSession = lmsSession || salesSession;
    if (!adminSession) {
      return NextResponse.json(
        { error: 'Authentication required. Please log into an administrator account.' },
        { status: 401 }
      );
    }

    if (!isAuthorizedAdminRole(adminSession.role)) {
      return NextResponse.json(
        { error: 'Access denied: Insufficient administrative privileges.' },
        { status: 403 }
      );
    }

    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  }

  // -------------------------------------------------------------------------
  // 4. SALES PLATFORM ROUTING & PROTECTION (/sales/*)
  // -------------------------------------------------------------------------
  const isSalesAuthRoute =
    pathname === '/sales/login' ||
    pathname === '/sales/register' ||
    pathname === '/sales/forgot-password' ||
    pathname.startsWith('/sales/reset-password');

  const isSalesProtectedRoute =
    pathname.startsWith('/sales/dashboard') ||
    pathname.startsWith('/sales/onboarding') ||
    pathname.startsWith('/sales/leads') ||
    pathname.startsWith('/sales/customers') ||
    pathname.startsWith('/sales/subscriptions') ||
    pathname.startsWith('/sales/settings') ||
    pathname.startsWith('/sales/website') ||
    pathname.startsWith('/sales/products') ||
    pathname.startsWith('/sales/orders') ||
    pathname.startsWith('/sales/marketing') ||
    pathname.startsWith('/sales/wallet') ||
    pathname.startsWith('/sales/analytics') ||
    pathname.startsWith('/sales/roles') ||
    pathname.startsWith('/sales/integrations');

  if (isSalesAuthRoute) {
    if (isSalesValid) {
      const callback = request.nextUrl.searchParams.get('callbackUrl');
      if (callback && callback.startsWith('/') && !callback.startsWith('//')) {
        return NextResponse.redirect(new URL(callback, request.url));
      }
      return NextResponse.redirect(new URL('/sales/dashboard', request.url));
    }
    return createSecureResponse(
      NextResponse.next({
        request: { headers: requestHeaders }
      })
    );
  }

  if (isSalesProtectedRoute) {
    if (!isSalesValid) {
      if (isLmsValid) {
        return NextResponse.redirect(
          new URL(
            '/sales/login?unauthorized=lms_user&msg=' +
              encodeURIComponent('Please create or log into your Sales account to access the Sales Platform.'),
            request.url
          )
        );
      }
      return NextResponse.redirect(
        new URL('/sales/login?callbackUrl=' + encodeURIComponent(pathname + search), request.url)
      );
    }
  }

  // -------------------------------------------------------------------------
  // 5. LMS PLATFORM ROUTING & PROTECTION (/lms/*, /learning/*, /dashboard/*, /student/*, /instructor/*, /learn/*)
  // -------------------------------------------------------------------------
  const isLmsAuthRoute =
    pathname === '/lms/login' ||
    pathname === '/lms/register' ||
    pathname === '/lms/forgot-password' ||
    pathname.startsWith('/lms/reset-password') ||
    pathname === '/learning/login' ||
    pathname === '/learning/register';

  const isLmsProtectedRoute =
    pathname.startsWith('/lms') ||
    pathname.startsWith('/learning/dashboard') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/learn');

  if (isLmsAuthRoute) {
    if (isLmsValid) {
      const callback = request.nextUrl.searchParams.get('callbackUrl');
      if (callback && callback.startsWith('/') && !callback.startsWith('//')) {
        if (!callback.startsWith('/admin') || isAuthorizedAdminRole(lmsSession?.role)) {
          return NextResponse.redirect(new URL(callback, request.url));
        }
      }
      return NextResponse.redirect(new URL('/lms/dashboard', request.url));
    }
    return createSecureResponse(
      NextResponse.next({
        request: { headers: requestHeaders }
      })
    );
  }

  if (isLmsProtectedRoute) {
    if (!isLmsValid) {
      if (isSalesValid) {
        return NextResponse.redirect(
          new URL(
            '/lms/login?unauthorized=sales_user&msg=' +
              encodeURIComponent('Please create or log into your LMS account to access the Learning Management System.'),
            request.url
          )
        );
      }
      return NextResponse.redirect(
        new URL('/lms/login?callbackUrl=' + encodeURIComponent(pathname + search), request.url)
      );
    }

    // Canonicalize legacy /dashboard and /student paths to isolated /lms/* routes
    if (pathname === '/dashboard/courses') {
      return NextResponse.redirect(new URL('/lms/my-courses', request.url));
    }
    if (pathname === '/dashboard/certificates') {
      return NextResponse.redirect(new URL('/lms/certificates', request.url));
    }
    if (pathname === '/dashboard/notifications') {
      return NextResponse.redirect(new URL('/lms/notifications', request.url));
    }
    if (pathname === '/dashboard/orders') {
      return NextResponse.redirect(new URL('/lms/orders', request.url));
    }
    if (pathname === '/dashboard/profile' || pathname === '/student/profile') {
      return NextResponse.redirect(new URL('/lms/profile', request.url));
    }
    if (pathname === '/dashboard/settings') {
      return NextResponse.redirect(new URL('/lms/settings', request.url));
    }
    if (pathname === '/dashboard/wishlist') {
      return NextResponse.redirect(new URL('/lms/wishlist', request.url));
    }
    if (pathname === '/dashboard/reviews') {
      return NextResponse.redirect(new URL('/lms/reviews', request.url));
    }
    if (pathname === '/dashboard/explore') {
      return NextResponse.redirect(new URL('/lms/courses', request.url));
    }
    if (
      pathname === '/dashboard' ||
      pathname === '/learning/dashboard' ||
      pathname === '/student' ||
      pathname === '/student/dashboard'
    ) {
      return NextResponse.redirect(new URL('/lms/dashboard', request.url));
    }
  }

  // -------------------------------------------------------------------------
  // 6. SUPER ADMIN CONTROL CENTER (/super-admin/*)
  // -------------------------------------------------------------------------
  if (pathname.startsWith('/super-admin')) {
    if (pathname === '/super-admin/login') {
      if (lmsSession && lmsSession.role === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/super-admin', request.url));
      }
      return createSecureResponse(
        NextResponse.next({
          request: { headers: requestHeaders }
        })
      );
    }

    if (!lmsSession || lmsSession.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(
        new URL('/super-admin/login?callbackUrl=' + encodeURIComponent(pathname + search), request.url)
      );
    }
  }

  return createSecureResponse(
    NextResponse.next({
      request: { headers: requestHeaders }
    })
  );
}

function createSecureResponse(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return response;
}

export const config = {
  matcher: [
    '/login',
    '/admin',
    '/admin/:path*',
    '/api/admin/:path*',
    '/sales/:path*',
    '/lms/:path*',
    '/learning/:path*',
    '/super-admin/:path*',
    '/instructor/:path*',
    '/dashboard/:path*',
    '/student/:path*',
    '/learn/:path*'
  ]
};
