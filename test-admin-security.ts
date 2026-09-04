import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { middleware } from './src/middleware';
import { isAdminRole, handleAuthError, AuthError } from './src/lib/auth';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'aadhyara-saas-production-secure-jwt-key-2026'
);

async function makeToken(payload: any): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(JWT_SECRET);
}

async function runTests() {
  console.log('=====================================================');
  console.log('🛡️  RUNNING AADHYARA ADMIN SECURITY VALIDATION SUITE');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Role Verification (isAdminRole)
  // -------------------------------------------------------------
  console.log('[1] Testing isAdminRole RBAC logic...');
  assert(isAdminRole('SUPER_ADMIN') === true, 'SUPER_ADMIN is recognized as admin');
  assert(isAdminRole('ADMIN') === true, 'ADMIN is recognized as admin');
  assert(isAdminRole('LMS_ADMIN') === true, 'LMS_ADMIN is recognized as admin');
  assert(isAdminRole('SALES_ADMIN') === true, 'SALES_ADMIN is recognized as admin');
  assert(isAdminRole('INSTRUCTOR') === false, 'INSTRUCTOR is NOT recognized as admin');
  assert(isAdminRole('STUDENT') === false, 'STUDENT is NOT recognized as admin');
  assert(isAdminRole(undefined) === false, 'undefined is NOT recognized as admin');

  // -------------------------------------------------------------
  // Test 2: Error Handling (handleAuthError)
  // -------------------------------------------------------------
  console.log('\n[2] Testing handleAuthError HTTP status codes...');
  const res401AuthError = handleAuthError(new AuthError('Auth required', 401));
  assert(res401AuthError.status === 401, 'AuthError(401) returns HTTP 401');

  const res403AuthError = handleAuthError(new AuthError('Forbidden', 403));
  assert(res403AuthError.status === 403, 'AuthError(403) returns HTTP 403');

  const res401Msg = handleAuthError(new Error('UNAUTHORIZED'));
  assert(res401Msg.status === 401, 'Error("UNAUTHORIZED") returns HTTP 401');

  const res403Msg = handleAuthError(new Error('FORBIDDEN'));
  assert(res403Msg.status === 403, 'Error("FORBIDDEN") returns HTTP 403');

  const res403Perm = handleAuthError(new Error('INSUFFICIENT_PERMISSIONS'));
  assert(res403Perm.status === 403, 'Error("INSUFFICIENT_PERMISSIONS") returns HTTP 403');

  // -------------------------------------------------------------
  // Test 3: Middleware Edge Guards for /admin/*
  // -------------------------------------------------------------
  console.log('\n[3] Testing Middleware Edge route guards on /admin/courses/builder...');

  // Token fixtures
  const studentToken = await makeToken({
    id: 'student-1',
    email: 'student@test.com',
    platform: 'LMS',
    role: 'STUDENT'
  });

  const instructorToken = await makeToken({
    id: 'instructor-1',
    email: 'instructor@test.com',
    platform: 'LMS',
    role: 'INSTRUCTOR'
  });

  const adminToken = await makeToken({
    id: 'admin-1',
    email: 'admin@test.com',
    platform: 'LMS',
    role: 'ADMIN'
  });

  const superAdminToken = await makeToken({
    id: 'superadmin-1',
    email: 'superadmin@test.com',
    platform: 'LMS',
    role: 'SUPER_ADMIN'
  });

  // A. Unauthenticated request to /admin/courses/builder
  const unauthReq = new NextRequest('http://localhost:3000/admin/courses/builder');
  const unauthRes = await middleware(unauthReq);
  assert(
    unauthRes.status === 307,
    'Unauthenticated visitor to /admin/courses/builder receives 307 Redirect'
  );
  const unauthRedirectLocation = unauthRes.headers.get('location') || '';
  assert(
    unauthRedirectLocation.includes('/login?callbackUrl=%2Fadmin%2Fcourses%2Fbuilder'),
    `Unauthenticated redirect targets /login with callbackUrl (got: ${unauthRedirectLocation})`
  );

  // B. Student request to /admin/courses/builder
  const studentReq = new NextRequest('http://localhost:3000/admin/courses/builder', {
    headers: { cookie: `lms_session_token=${studentToken}` }
  });
  const studentRes = await middleware(studentReq);
  assert(
    studentRes.status === 307,
    'Student requesting /admin/courses/builder receives 307 Redirect'
  );
  const studentRedirectLocation = studentRes.headers.get('location') || '';
  assert(
    studentRedirectLocation.includes('/unauthorized'),
    `Student is redirected to /unauthorized (got: ${studentRedirectLocation})`
  );

  // C. Instructor request to /admin/courses/builder
  const instructorReq = new NextRequest('http://localhost:3000/admin/courses/builder?slug=react-101', {
    headers: { cookie: `lms_session_token=${instructorToken}` }
  });
  const instructorRes = await middleware(instructorReq);
  assert(
    instructorRes.status === 307,
    'Instructor requesting /admin/courses/builder receives 307 Redirect'
  );
  const instructorRedirectLocation = instructorRes.headers.get('location') || '';
  assert(
    instructorRedirectLocation.includes('/instructor/courses/builder?slug=react-101'),
    `Instructor is redirected to /instructor/courses/builder preserving query params (got: ${instructorRedirectLocation})`
  );

  // D. Instructor request to general /admin/website/builder (non-course admin route)
  const instructorGenReq = new NextRequest('http://localhost:3000/admin/website/builder', {
    headers: { cookie: `lms_session_token=${instructorToken}` }
  });
  const instructorGenRes = await middleware(instructorGenReq);
  assert(
    instructorGenRes.status === 307 && (instructorGenRes.headers.get('location') || '').includes('/unauthorized'),
    'Instructor accessing general admin route (/admin/website/builder) is denied and redirected to /unauthorized'
  );

  // E. Admin request to /admin/courses/builder
  const adminReq = new NextRequest('http://localhost:3000/admin/courses/builder', {
    headers: { cookie: `lms_session_token=${adminToken}` }
  });
  const adminRes = await middleware(adminReq);
  assert(
    adminRes.status === 200,
    'Authorized Admin accessing /admin/courses/builder is allowed through (status 200 next)'
  );

  // F. Super Admin request to /admin
  const superAdminReq = new NextRequest('http://localhost:3000/admin', {
    headers: { cookie: `lms_session_token=${superAdminToken}` }
  });
  const superAdminRes = await middleware(superAdminReq);
  assert(
    superAdminRes.status === 307 && (superAdminRes.headers.get('location') || '').includes('/super-admin'),
    'Super Admin accessing /admin is canonicalized to /super-admin'
  );

  // G. LMS Admin request to /admin
  const lmsAdminReq = new NextRequest('http://localhost:3000/admin', {
    headers: { cookie: `lms_session_token=${adminToken}` }
  });
  const lmsAdminRes = await middleware(lmsAdminReq);
  assert(
    lmsAdminRes.status === 307 && (lmsAdminRes.headers.get('location') || '').includes('/lms/admin'),
    'LMS Admin accessing /admin is canonicalized to /lms/admin'
  );

  // -------------------------------------------------------------
  // Test 4: Admin API Protection (/api/admin/*)
  // -------------------------------------------------------------
  console.log('\n[4] Testing Middleware Edge protection for /api/admin/*...');

  // Unauthenticated call to /api/admin/analytics
  const apiUnauthReq = new NextRequest('http://localhost:3000/api/admin/analytics');
  const apiUnauthRes = await middleware(apiUnauthReq);
  assert(
    apiUnauthRes.status === 401,
    'Unauthenticated call to /api/admin/analytics returns HTTP 401'
  );
  const apiUnauthJson = await apiUnauthRes.json();
  assert(
    apiUnauthJson.error?.includes('Authentication required'),
    `401 response contains authentication required message (got: ${apiUnauthJson.error})`
  );

  // Student call to /api/admin/analytics
  const apiStudentReq = new NextRequest('http://localhost:3000/api/admin/analytics', {
    headers: { cookie: `lms_session_token=${studentToken}` }
  });
  const apiStudentRes = await middleware(apiStudentReq);
  assert(
    apiStudentRes.status === 403,
    'Student call to /api/admin/analytics returns HTTP 403'
  );
  const apiStudentJson = await apiStudentRes.json();
  assert(
    apiStudentJson.error?.includes('Access denied'),
    `403 response contains access denied message (got: ${apiStudentJson.error})`
  );

  // Admin call to /api/admin/analytics
  const apiAdminReq = new NextRequest('http://localhost:3000/api/admin/analytics', {
    headers: { cookie: `lms_session_token=${adminToken}` }
  });
  const apiAdminRes = await middleware(apiAdminReq);
  assert(
    apiAdminRes.status === 200,
    'Admin call to /api/admin/analytics is allowed through (status 200 next)'
  );

  console.log('\n=====================================================');
  console.log(`Suite finished: ${passed} passed, ${failed} failed.`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
