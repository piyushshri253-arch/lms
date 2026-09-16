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
  // 1. GENERAL / ENTRY ACCESS & DEDICATED ADMIN LOGIN
  // -------------------------------------------------------------------------
  if (pathname === '/login') {
    return createSecureResponse(
      NextResponse.next({
        request: { headers: requestHeaders }
      })
    );
  }

  // Dedicated Admin Login Page (/admin/login)
  if (pathname === '/admin/login') {
    const adminSession = lmsSession || salesSession;
    const isAuth = isLmsValid || isSalesValid;
    // If already logged in as authorized admin, redirect directly to /admin dashboard
    if (isAuth && adminSession && isAuthorizedAdminRole(adminSession.role)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    // Otherwise allow unauthenticated access to /admin/login
    return createSecureResponse(
      NextResponse.next({
        request: { headers: requestHeaders }
      })
    );
  }

  // Dedicated Instructor Login Page (/instructor/login)
  if (pathname === '/instructor/login') {
    if (isLmsValid && lmsSession && (lmsSession.role === 'INSTRUCTOR' || isAuthorizedAdminRole(lmsSession.role))) {
      return NextResponse.redirect(new URL('/instructor', request.url));
    }
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

    // A. Unauthenticated visitor: immediately redirect to /admin/login with callbackUrl
    if (!isAuth || !adminSession) {
      const callback = encodeURIComponent(pathname + (search || ''));
      return NextResponse.redirect(new URL(`/admin/login?callbackUrl=${callback}`, request.url));
    }

    const role = adminSession.role;

    // B. Student account: forbid admin access and redirect to admin login with notice
    if (role === 'STUDENT') {
      return NextResponse.redirect(
        new URL(
          '/admin/login?error=' +
            encodeURIComponent('Access denied: Student accounts cannot access the administrative portal.'),
          request.url
        )
      );
    }

    // C. Enforce authorized admin roles (SUPER_ADMIN, ADMIN, LMS_ADMIN, SALES_ADMIN, INSTRUCTOR)
    if (!isAuthorizedAdminRole(role) && role !== 'INSTRUCTOR') {
      return NextResponse.redirect(
        new URL(
          '/admin/login?error=' +
            encodeURIComponent('Access denied: Administrator privileges required.'),
          request.url
        )
      );
    }

    // D. Authorized admin visiting /admin or sub-routes -> allow through directly
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
    (pathname.startsWith('/student') && !pathname.startsWith('/student/cart')) ||
    (pathname.startsWith('/user') && !pathname.startsWith('/user/public')) ||
    (pathname.startsWith('/instructor') && pathname !== '/instructor/login') ||
    pathname.startsWith('/learn');

  if (isLmsAuthRoute) {
    if (isLmsValid) {
      const callback = request.nextUrl.searchParams.get('callbackUrl');
      if (callback && callback.startsWith('/') && !callback.startsWith('//')) {
        if (!callback.startsWith('/admin') || isAuthorizedAdminRole(lmsSession?.role)) {
          return NextResponse.redirect(new URL(callback, request.url));
        }
      }
      const targetUrl = lmsSession?.role === 'STUDENT' ? '/student/learning' : '/lms/dashboard';
      return NextResponse.redirect(new URL(targetUrl, request.url));
    }
    return createSecureResponse(
      NextResponse.next({
        request: { headers: requestHeaders }
      })
    );
  }

  if (isLmsProtectedRoute) {
    if (!isLmsValid) {
      if (pathname.startsWith('/instructor')) {
        return NextResponse.redirect(
          new URL('/instructor/login?callbackUrl=' + encodeURIComponent(pathname + search), request.url)
        );
      }
      if (isSalesValid) {
        return NextResponse.redirect(
          new URL(
            '/login?unauthorized=sales_user&msg=' +
              encodeURIComponent('Please create or log into your account to access the Learning Management System.'),
            request.url
          )
        );
      }
      return NextResponse.redirect(
        new URL('/login?callbackUrl=' + encodeURIComponent(pathname + search), request.url)
      );
    }

    // Role boundary: /instructor/* requires INSTRUCTOR, ADMIN, or SUPER_ADMIN
    if (pathname.startsWith('/instructor')) {
      const lmsRole = lmsSession?.role;
      const canAccessInstructor =
        lmsRole === 'INSTRUCTOR' ||
        lmsRole === 'ADMIN' ||
        lmsRole === 'LMS_ADMIN' ||
        lmsRole === 'SUPER_ADMIN';

      if (!canAccessInstructor) {
        return NextResponse.redirect(
          new URL(
            '/instructor/login?error=' +
              encodeURIComponent('Access denied: Only instructor accounts can access the Instructor Studio.'),
            request.url
          )
        );
      }
    }

    // Canonicalize legacy /dashboard and /student paths to designated student learning routes
    if (pathname === '/dashboard/courses') {
      return NextResponse.redirect(new URL('/student/learning', request.url));
    }
    if (pathname === '/dashboard/certificates') {
      return NextResponse.redirect(new URL('/student/learning?tab=certificates', request.url));
    }
    if (pathname === '/dashboard/notifications') {
      return NextResponse.redirect(new URL('/student/learning?tab=notifications', request.url));
    }
    if (pathname === '/dashboard/orders') {
      return NextResponse.redirect(new URL('/student/orders', request.url));
    }
    if (pathname === '/dashboard/profile' || pathname === '/student/profile') {
      return NextResponse.redirect(new URL('/user/public', request.url));
    }
    if (pathname === '/dashboard/settings') {
      return NextResponse.redirect(new URL('/user/edit-account', request.url));
    }
    if (pathname === '/dashboard/wishlist') {
      return NextResponse.redirect(new URL('/student/wishlist', request.url));
    }
    if (pathname === '/dashboard/reviews') {
      return NextResponse.redirect(new URL('/student/learning', request.url));
    }
    if (pathname === '/dashboard/explore') {
      return NextResponse.redirect(new URL('/courses', request.url));
    }
    if (
      pathname === '/dashboard' ||
      pathname === '/learning/dashboard' ||
      pathname === '/student' ||
      pathname === '/student/dashboard'
    ) {
      return NextResponse.redirect(new URL('/student/learning', request.url));
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
