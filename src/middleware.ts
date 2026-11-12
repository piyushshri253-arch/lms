import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'morena-teach-saas-production-secure-jwt-key-2026'
);

const SALES_COOKIE = 'sales_session_token';
const LMS_COOKIE = 'lms_session_token';
const REVIEWER_COOKIE = 'reviewer_session_token';
const LEGACY_COOKIE = 'aadhyara_session_token';
const ACTIVITY_COOKIE = 'mt_last_activity';
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes = 900,000 ms

interface TokenPayload {
  id: string;
  email: string;
  platform?: 'SALES' | 'LMS' | 'MORENA_LMS' | string;
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
  const reviewerCookieVal = request.cookies.get(REVIEWER_COOKIE)?.value;

  const salesSession = await verifyToken(salesCookieVal);
  const lmsSession = await verifyToken(lmsCookieVal);
  const reviewerSession = await verifyToken(reviewerCookieVal);

  const isSalesValid = !!salesSession && salesSession.platform === 'SALES';
  const isLmsValid =
    !!lmsSession &&
    (lmsSession.platform === 'LMS' ||
      lmsSession.platform === 'MORENA_LMS' ||
      lmsSession.role === 'INSTRUCTOR' ||
      lmsSession.role === 'STUDENT' ||
      lmsSession.role === 'SUPER_ADMIN' ||
      !lmsSession.platform);
  const isReviewerValid =
    !!reviewerSession && (reviewerSession.role === 'REVIEWER' || isAuthorizedAdminRole(reviewerSession.role));

  const hasAnySession = isSalesValid || isLmsValid || isReviewerValid;
  const lastActivityCookie = request.cookies.get(ACTIVITY_COOKIE)?.value;
  const now = Date.now();
  let isIdleExpired = false;

  if (hasAnySession && lastActivityCookie) {
    const lastActivity = Number(lastActivityCookie);
    if (!isNaN(lastActivity) && lastActivity > 0) {
      if (now - lastActivity > IDLE_TIMEOUT_MS) {
        isIdleExpired = true;
      }
    }
  }

  // Enforce server-side 15-minute inactivity termination globally
  if (isIdleExpired) {
    if (pathname.startsWith('/api/')) {
      const apiRes = NextResponse.json(
        {
          error: 'You have been logged out due to inactivity. Please log in again.',
          code: 'SESSION_IDLE_TIMEOUT'
        },
        { status: 401 }
      );
      apiRes.cookies.delete(SALES_COOKIE);
      apiRes.cookies.delete(LMS_COOKIE);
      apiRes.cookies.delete(REVIEWER_COOKIE);
      apiRes.cookies.delete(LEGACY_COOKIE);
      apiRes.cookies.delete(ACTIVITY_COOKIE);
      return apiRes;
    }

    let targetLogin =
      '/login?reason=inactivity&error=' +
      encodeURIComponent('You have been logged out due to inactivity. Please log in again.');
    if (pathname.startsWith('/instructor')) {
      targetLogin =
        '/instructor/login?reason=inactivity&error=' +
        encodeURIComponent('You have been logged out due to inactivity. Please log in again.');
    } else if (pathname.startsWith('/reviewer') || pathname.startsWith('/auditor')) {
      targetLogin =
        '/reviewer/login?reason=inactivity&error=' +
        encodeURIComponent('You have been logged out due to inactivity. Please log in again.');
    } else if (pathname.startsWith('/admin')) {
      targetLogin =
        '/admin/login?reason=inactivity&error=' +
        encodeURIComponent('You have been logged out due to inactivity. Please log in again.');
    } else if (pathname.startsWith('/super-admin')) {
      targetLogin =
        '/super-admin/login?reason=inactivity&error=' +
        encodeURIComponent('You have been logged out due to inactivity. Please log in again.');
    } else if (pathname.startsWith('/seo')) {
      targetLogin =
        '/seo/login?reason=inactivity&error=' +
        encodeURIComponent('You have been logged out due to inactivity. Please log in again.');
    } else if (pathname.startsWith('/sales')) {
      targetLogin =
        '/sales/login?reason=inactivity&error=' +
        encodeURIComponent('You have been logged out due to inactivity. Please log in again.');
    }

    const redirectRes = NextResponse.redirect(new URL(targetLogin, request.url));
    redirectRes.cookies.delete(SALES_COOKIE);
    redirectRes.cookies.delete(LMS_COOKIE);
    redirectRes.cookies.delete(REVIEWER_COOKIE);
    redirectRes.cookies.delete(LEGACY_COOKIE);
    redirectRes.cookies.delete(ACTIVITY_COOKIE);
    redirectRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    redirectRes.headers.set('Pragma', 'no-cache');
    redirectRes.headers.set('Expires', '0');
    return redirectRes;
  }

  const shouldRefreshActivity =
    hasAnySession &&
    (!lastActivityCookie || now - Number(lastActivityCookie) > 10000);

  // Clone headers and forward current pathname for Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // -------------------------------------------------------------------------
  // 1. GENERAL / ENTRY ACCESS (/login, /signup, /instructor/signup, /auditor/signup, /reviewer/signup, /verify-email, /forgot-password, /reset-password)
  // -------------------------------------------------------------------------
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/instructor/signup' ||
    pathname === '/auditor/signup' ||
    pathname === '/reviewer/signup' ||
    pathname === '/verify-email' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/reset-password')
  ) {
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
      const callback = request.nextUrl.searchParams.get('callbackUrl');
      const target =
        callback && callback.startsWith('/') && !callback.startsWith('//') && callback !== '/instructor/login'
          ? callback
          : '/instructor';
      return NextResponse.redirect(new URL(target, request.url));
    }
    return createSecureResponse(
      NextResponse.next({
        request: { headers: requestHeaders }
      })
    );
  }

  // Dedicated Reviewer Login Page (/reviewer/login)
  if (pathname === '/reviewer/login') {
    const activeReviewerSession =
      (isReviewerValid ? reviewerSession : null) ||
      (isLmsValid && lmsSession && (lmsSession.role === 'REVIEWER' || isAuthorizedAdminRole(lmsSession.role)) ? lmsSession : null);

    if (activeReviewerSession) {
      return NextResponse.redirect(new URL('/reviewer', request.url));
    }
    return createSecureResponse(
      NextResponse.next({
        request: { headers: requestHeaders }
      })
    );
  }

  // -------------------------------------------------------------------------
  // 1.5. REVIEWER ROUTE PROTECTION (/reviewer and /reviewer/*)
  // -------------------------------------------------------------------------
  if (pathname === '/reviewer' || pathname.startsWith('/reviewer/')) {
    const session =
      (isReviewerValid ? reviewerSession : null) ||
      (isLmsValid && lmsSession && (lmsSession.role === 'REVIEWER' || isAuthorizedAdminRole(lmsSession.role)) ? lmsSession : null) ||
      salesSession;
    const isAuth =
      isReviewerValid ||
      (isLmsValid && lmsSession && (lmsSession.role === 'REVIEWER' || isAuthorizedAdminRole(lmsSession.role))) ||
      isSalesValid;

    if (!isAuth || !session) {
      const callback = encodeURIComponent(pathname + (search || ''));
      return NextResponse.redirect(new URL(`/reviewer/login?callbackUrl=${callback}`, request.url));
    }

    const role = session.role;
    if (role !== 'REVIEWER' && !isAuthorizedAdminRole(role)) {
      return NextResponse.redirect(
        new URL(
          '/reviewer/login?error=' + encodeURIComponent('Access denied: Course Reviewer or Administrator privileges required.'),
          request.url
        )
      );
    }

    if (session.emailVerified === false) {
      return NextResponse.redirect(
        new URL(
          `/verify-email?email=${encodeURIComponent(session.email || '')}&role=REVIEWER`,
          request.url
        )
      );
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

    if (role === 'INSTRUCTOR') {
      return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
    }

    if (role === 'REVIEWER') {
      return NextResponse.redirect(new URL('/reviewer', request.url));
    }

    // C. Enforce authorized admin roles strictly (SUPER_ADMIN, ADMIN, LMS_ADMIN, SALES_ADMIN)
    if (!isAuthorizedAdminRole(role)) {
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
  // 3. ADMIN & SUPER-ADMIN API PROTECTION (/api/admin/* and /api/super-admin/*)
  // -------------------------------------------------------------------------
  if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/super-admin')) {
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
  // 3.2. INSTRUCTOR API PROTECTION (/api/instructor/*)
  // -------------------------------------------------------------------------
  if (pathname.startsWith('/api/instructor')) {
    if (!isLmsValid || !lmsSession) {
      return NextResponse.json(
        { error: 'Authentication required. Please log into your Instructor account.' },
        { status: 401 }
      );
    }

    if (lmsSession.emailVerified === false) {
      return NextResponse.json(
        { error: 'Email OTP verification required before accessing Instructor APIs.' },
        { status: 403 }
      );
    }

    if (lmsSession.role !== 'INSTRUCTOR' && !isAuthorizedAdminRole(lmsSession.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Instructor privileges required.' },
        { status: 403 }
      );
    }

    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  }

  // -------------------------------------------------------------------------
  // 3.5. REVIEWER API PROTECTION (/api/reviewer and /api/reviewer/*)
  // -------------------------------------------------------------------------
  if (pathname.startsWith('/api/reviewer')) {
    const activeReviewer =
      (isReviewerValid ? reviewerSession : null) ||
      (isLmsValid && lmsSession && (lmsSession.role === 'REVIEWER' || isAuthorizedAdminRole(lmsSession.role)) ? lmsSession : null) ||
      salesSession;

    if (!activeReviewer) {
      return NextResponse.json(
        { error: 'Authentication required. Please log into a Course Reviewer account.' },
        { status: 401 }
      );
    }

    if (activeReviewer.emailVerified === false) {
      return NextResponse.json(
        { error: 'Email OTP verification required before accessing Auditor APIs.' },
        { status: 403 }
      );
    }

    if (activeReviewer.role !== 'REVIEWER' && !isAuthorizedAdminRole(activeReviewer.role)) {
      return NextResponse.json(
        { error: 'Access denied: Course Reviewer or Administrator privileges required.' },
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
    // Allow Course Reviewers (Auditors) and Admins to access the Course Preview Sandbox directly
    if (
      pathname.startsWith('/instructor/courses/preview/') &&
      (isReviewerValid ||
        lmsSession?.role === 'REVIEWER' ||
        isAuthorizedAdminRole(lmsSession?.role) ||
        isAuthorizedAdminRole(salesSession?.role))
    ) {
      return createSecureResponse(
        NextResponse.next({
          request: { headers: requestHeaders }
        })
      );
    }

    const effectiveInstructorSession = lmsSession || reviewerSession;
    const isInstructorAuthValid =
      isLmsValid ||
      (isReviewerValid &&
        ['REVIEWER', 'AUDITOR', 'ADMIN', 'SUPER_ADMIN', 'INSTRUCTOR', 'TEACHER'].includes(reviewerSession?.role || ''));

    // Instructor Portal Protection (/instructor and /instructor/*)
    if (pathname.startsWith('/instructor')) {
      if (!isInstructorAuthValid || !effectiveInstructorSession) {
        return NextResponse.redirect(
          new URL('/instructor/login?callbackUrl=' + encodeURIComponent(pathname + search), request.url)
        );
      }

      if (effectiveInstructorSession.emailVerified === false) {
        return NextResponse.redirect(
          new URL(
            `/verify-email?email=${encodeURIComponent(effectiveInstructorSession.email || '')}&role=INSTRUCTOR`,
            request.url
          )
        );
      }

      const role = effectiveInstructorSession.role;
      const canAccessInstructor =
        role === 'INSTRUCTOR' ||
        role === 'TEACHER' ||
        role === 'REVIEWER' ||
        role === 'AUDITOR' ||
        role === 'ADMIN' ||
        role === 'LMS_ADMIN' ||
        role === 'SUPER_ADMIN';

      if (!canAccessInstructor) {
        return NextResponse.redirect(
          new URL(
            '/instructor/login?error=' +
              encodeURIComponent('Access denied: Only instructor accounts can access the Instructor Studio.'),
            request.url
          )
        );
      }
    } else if (!isLmsValid) {
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

    // Canonicalize legacy /dashboard and /student paths to designated student learning routes
    if (pathname === '/dashboard/courses' || pathname === '/lms/my-courses') {
      const lmsRole = lmsSession?.role;
      if (lmsRole === 'INSTRUCTOR') {
        return NextResponse.redirect(new URL('/instructor', request.url));
      }
      return NextResponse.redirect(new URL('/student/learning', request.url));
    }
    if (pathname === '/dashboard/certificates') {
      return NextResponse.redirect(new URL('/student/learning?tab=certificates', request.url));
    }
    if (pathname === '/dashboard/notifications') {
      const lmsRole = lmsSession?.role;
      if (lmsRole === 'INSTRUCTOR') {
        return NextResponse.redirect(new URL('/instructor', request.url));
      }
      if (lmsRole === 'REVIEWER') {
        return NextResponse.redirect(new URL('/reviewer', request.url));
      }
      if (lmsRole === 'ADMIN' || lmsRole === 'LMS_ADMIN') {
        return NextResponse.redirect(new URL('/admin/notifications', request.url));
      }
      if (lmsRole === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/super-admin/notifications', request.url));
      }
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
      const lmsRole = lmsSession?.role;
      if (lmsRole === 'INSTRUCTOR') {
        return NextResponse.redirect(new URL('/instructor/dashboard', request.url));
      }
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

  const isProtectedPath =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reviewer') ||
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/learning') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/sales') ||
    pathname.startsWith('/seo') ||
    pathname.startsWith('/user') ||
    pathname.startsWith('/learn');

  return createSecureResponse(
    NextResponse.next({
      request: { headers: requestHeaders }
    }),
    isProtectedPath,
    shouldRefreshActivity
  );
}

function createSecureResponse(
  response: NextResponse,
  isProtected = false,
  refreshActivity = false
): NextResponse {
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  if (isProtected) {
    // Prevent access to protected dashboard pages through browser Back navigation (anti-bfcache)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
  }

  if (refreshActivity) {
    response.cookies.set(ACTIVITY_COOKIE, String(Date.now()), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/login',
    '/admin',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/super-admin/:path*',
    '/api/instructor/:path*',
    '/reviewer',
    '/reviewer/:path*',
    '/api/reviewer/:path*',
    '/sales/:path*',
    '/lms/:path*',
    '/learning/:path*',
    '/super-admin/:path*',
    '/instructor',
    '/instructor/:path*',
    '/dashboard/:path*',
    '/student/:path*',
    '/learn/:path*',
    '/seo',
    '/seo/:path*',
    '/api/seo/:path*'
  ]
};
