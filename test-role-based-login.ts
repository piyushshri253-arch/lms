import { NextRequest } from 'next/server';
import { POST as lmsLoginHandler } from './src/app/api/lms/auth/login/route';
import { POST as lmsRegisterHandler } from './src/app/api/lms/auth/register/route';
import { middleware } from './src/middleware';
import { SignJWT } from 'jose';

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

function createJsonRequest(url: string, body: any, cookie?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (cookie) {
    headers['cookie'] = cookie;
  }
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🔐 AADHYARA LEARNING — ROLE-BASED LOGIN & RBAC TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error('   Details:', detail);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. STUDENT ACCOUNT (student@morenateach.com / student123)
  // -------------------------------------------------------------------------
  console.log('[1] Testing Student Account (student@morenateach.com)...');

  // A. Student portal -> ALLOW
  const studentViaStudentReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'student@morenateach.com',
    password: 'student123',
    requestedPortal: 'STUDENT'
  });
  const studentViaStudentRes = await lmsLoginHandler(studentViaStudentReq);
  const studentViaStudentJson = await studentViaStudentRes.json();
  assert(
    studentViaStudentRes.status === 200 && studentViaStudentJson.success === true,
    'Student login through Student portal succeeds with HTTP 200',
    studentViaStudentJson
  );
  assert(
    studentViaStudentJson.redirectUrl === '/lms/dashboard',
    `Student is redirected to /lms/dashboard (got: ${studentViaStudentJson.redirectUrl})`
  );
  assert(
    studentViaStudentJson.user?.role === 'STUDENT',
    `Session user has real database role STUDENT (got: ${studentViaStudentJson.user?.role})`
  );

  // B. Instructor portal -> DENY
  const studentViaInstructorReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'student@morenateach.com',
    password: 'student123',
    requestedPortal: 'INSTRUCTOR'
  });
  const studentViaInstructorRes = await lmsLoginHandler(studentViaInstructorReq);
  const studentViaInstructorJson = await studentViaInstructorRes.json();
  assert(
    studentViaInstructorRes.status === 403,
    'Student login through Instructor portal is rejected with HTTP 403',
    studentViaInstructorJson
  );
  assert(
    studentViaInstructorJson.error?.includes('This account is not registered as an Instructor. Please select the correct login type.'),
    `Correct error message returned: "${studentViaInstructorJson.error}"`
  );

  // C. LMS Admin portal -> DENY
  const studentViaAdminReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'student@morenateach.com',
    password: 'student123',
    requestedPortal: 'ADMIN'
  });
  const studentViaAdminRes = await lmsLoginHandler(studentViaAdminReq);
  const studentViaAdminJson = await studentViaAdminRes.json();
  assert(
    studentViaAdminRes.status === 403,
    'Student login through LMS Admin portal is rejected with HTTP 403',
    studentViaAdminJson
  );
  assert(
    studentViaAdminJson.error?.includes('This account does not have LMS Admin access.'),
    `Correct error message returned: "${studentViaAdminJson.error}"`
  );

  // -------------------------------------------------------------------------
  // 2. INSTRUCTOR ACCOUNT (instructor@morenateach.com / instructor123)
  // -------------------------------------------------------------------------
  console.log('\n[2] Testing Instructor Account (instructor@morenateach.com)...');

  // A. Instructor portal -> ALLOW
  const instructorViaInstructorReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'instructor@morenateach.com',
    password: 'instructor123',
    requestedPortal: 'INSTRUCTOR'
  });
  const instructorViaInstructorRes = await lmsLoginHandler(instructorViaInstructorReq);
  const instructorViaInstructorJson = await instructorViaInstructorRes.json();
  assert(
    instructorViaInstructorRes.status === 200 && instructorViaInstructorJson.success === true,
    'Instructor login through Instructor portal succeeds with HTTP 200',
    instructorViaInstructorJson
  );
  assert(
    instructorViaInstructorJson.redirectUrl === '/instructor/dashboard',
    `Instructor is redirected to /instructor/dashboard (got: ${instructorViaInstructorJson.redirectUrl})`
  );
  assert(
    instructorViaInstructorJson.user?.role === 'INSTRUCTOR',
    `Session user has real database role INSTRUCTOR (got: ${instructorViaInstructorJson.user?.role})`
  );

  // B. Student portal -> DENY
  const instructorViaStudentReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'instructor@morenateach.com',
    password: 'instructor123',
    requestedPortal: 'STUDENT'
  });
  const instructorViaStudentRes = await lmsLoginHandler(instructorViaStudentReq);
  const instructorViaStudentJson = await instructorViaStudentRes.json();
  assert(
    instructorViaStudentRes.status === 403,
    'Instructor login through Student portal is rejected with HTTP 403',
    instructorViaStudentJson
  );
  assert(
    instructorViaStudentJson.error?.includes('This account is not registered as a Student. Please select the correct login type.'),
    `Correct error message returned: "${instructorViaStudentJson.error}"`
  );

  // C. LMS Admin portal -> DENY
  const instructorViaAdminReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'instructor@morenateach.com',
    password: 'instructor123',
    requestedPortal: 'ADMIN'
  });
  const instructorViaAdminRes = await lmsLoginHandler(instructorViaAdminReq);
  const instructorViaAdminJson = await instructorViaAdminRes.json();
  assert(
    instructorViaAdminRes.status === 403,
    'Instructor login through LMS Admin portal is rejected with HTTP 403',
    instructorViaAdminJson
  );
  assert(
    instructorViaAdminJson.error?.includes('This account does not have LMS Admin access.'),
    `Correct error message returned: "${instructorViaAdminJson.error}"`
  );

  // -------------------------------------------------------------------------
  // 3. ADMIN ACCOUNT (admin@morenateach.com / admin123)
  // -------------------------------------------------------------------------
  console.log('\n[3] Testing Admin Account (admin@morenateach.com)...');

  // A. LMS Admin portal -> ALLOW
  const adminViaAdminReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'admin@morenateach.com',
    password: 'admin123',
    requestedPortal: 'ADMIN'
  });
  const adminViaAdminRes = await lmsLoginHandler(adminViaAdminReq);
  const adminViaAdminJson = await adminViaAdminRes.json();
  assert(
    adminViaAdminRes.status === 200 && adminViaAdminJson.success === true,
    'Admin login through LMS Admin portal succeeds with HTTP 200',
    adminViaAdminJson
  );
  assert(
    adminViaAdminJson.redirectUrl === '/lms/admin',
    `Admin is redirected to /lms/admin (got: ${adminViaAdminJson.redirectUrl})`
  );
  assert(
    adminViaAdminJson.user?.role === 'ADMIN',
    `Session user has real database role ADMIN (got: ${adminViaAdminJson.user?.role})`
  );

  // B. Student portal -> DENY
  const adminViaStudentReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'admin@morenateach.com',
    password: 'admin123',
    requestedPortal: 'STUDENT'
  });
  const adminViaStudentRes = await lmsLoginHandler(adminViaStudentReq);
  const adminViaStudentJson = await adminViaStudentRes.json();
  assert(
    adminViaStudentRes.status === 403,
    'Admin login through Student portal is rejected with HTTP 403',
    adminViaStudentJson
  );
  assert(
    adminViaStudentJson.error?.includes('This account is not registered as a Student. Please select the correct login type.'),
    `Correct error message returned: "${adminViaStudentJson.error}"`
  );

  // C. Instructor portal -> DENY
  const adminViaInstructorReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'admin@morenateach.com',
    password: 'admin123',
    requestedPortal: 'INSTRUCTOR'
  });
  const adminViaInstructorRes = await lmsLoginHandler(adminViaInstructorReq);
  const adminViaInstructorJson = await adminViaInstructorRes.json();
  assert(
    adminViaInstructorRes.status === 403,
    'Admin login through Instructor portal is rejected with HTTP 403',
    adminViaInstructorJson
  );
  assert(
    adminViaInstructorJson.error?.includes('This account is not registered as an Instructor. Please select the correct login type.'),
    `Correct error message returned: "${adminViaInstructorJson.error}"`
  );

  // -------------------------------------------------------------------------
  // 4. SUPER ADMIN ACCOUNT (superadmin@morenateach.com / superadmin123)
  // -------------------------------------------------------------------------
  console.log('\n[4] Testing Super Admin Account (superadmin@morenateach.com)...');

  // A. LMS Admin portal -> ALLOW
  const superAdminViaAdminReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'superadmin@morenateach.com',
    password: 'superadmin123',
    requestedPortal: 'ADMIN'
  });
  const superAdminViaAdminRes = await lmsLoginHandler(superAdminViaAdminReq);
  const superAdminViaAdminJson = await superAdminViaAdminRes.json();
  assert(
    superAdminViaAdminRes.status === 200 && superAdminViaAdminJson.success === true,
    'Super Admin login through LMS Admin portal succeeds with HTTP 200',
    superAdminViaAdminJson
  );
  assert(
    superAdminViaAdminJson.redirectUrl === '/super-admin',
    `Super Admin is redirected to /super-admin (got: ${superAdminViaAdminJson.redirectUrl})`
  );

  // B. Student portal -> DENY
  const superAdminViaStudentReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'superadmin@morenateach.com',
    password: 'superadmin123',
    requestedPortal: 'STUDENT'
  });
  const superAdminViaStudentRes = await lmsLoginHandler(superAdminViaStudentReq);
  const superAdminViaStudentJson = await superAdminViaStudentRes.json();
  assert(
    superAdminViaStudentRes.status === 403,
    'Super Admin login through Student portal is rejected with HTTP 403',
    superAdminViaStudentJson
  );

  // C. Instructor portal -> DENY
  const superAdminViaInstructorReq = createJsonRequest('http://localhost:3000/api/lms/auth/login', {
    email: 'superadmin@morenateach.com',
    password: 'superadmin123',
    requestedPortal: 'INSTRUCTOR'
  });
  const superAdminViaInstructorRes = await lmsLoginHandler(superAdminViaInstructorReq);
  const superAdminViaInstructorJson = await superAdminViaInstructorRes.json();
  assert(
    superAdminViaInstructorRes.status === 403,
    'Super Admin login through Instructor portal is rejected with HTTP 403',
    superAdminViaInstructorJson
  );

  // -------------------------------------------------------------------------
  // 5. DIRECT ROUTE ACCESS & MIDDLEWARE PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n[5] Testing Route Protection in Middleware...');

  const studentToken = await makeToken({
    id: 'student-id',
    email: 'student@morenateach.com',
    platform: 'LMS',
    role: 'STUDENT'
  });

  const instructorToken = await makeToken({
    id: 'instructor-id',
    email: 'instructor@morenateach.com',
    platform: 'LMS',
    role: 'INSTRUCTOR'
  });

  // A. Student visiting /instructor/dashboard -> DENY (307 to /unauthorized)
  const studentInstructorReq = new NextRequest('http://localhost:3000/instructor/dashboard', {
    headers: { cookie: `lms_session_token=${studentToken}` }
  });
  const studentInstructorRes = await middleware(studentInstructorReq);
  assert(
    studentInstructorRes.status === 307 && (studentInstructorRes.headers.get('location') || '').includes('/unauthorized'),
    'Student attempting to access /instructor/dashboard is redirected to /unauthorized'
  );

  // B. Instructor visiting /instructor/dashboard -> ALLOW (200)
  const instructorReq = new NextRequest('http://localhost:3000/instructor/dashboard', {
    headers: { cookie: `lms_session_token=${instructorToken}` }
  });
  const instructorRes = await middleware(instructorReq);
  assert(
    instructorRes.status === 200,
    'Instructor accessing /instructor/dashboard is allowed (HTTP 200 next)'
  );

  // C. Student visiting /admin/courses/builder -> DENY (307 to /unauthorized)
  const studentAdminReq = new NextRequest('http://localhost:3000/admin/courses/builder', {
    headers: { cookie: `lms_session_token=${studentToken}` }
  });
  const studentAdminRes = await middleware(studentAdminReq);
  assert(
    studentAdminRes.status === 307 && (studentAdminRes.headers.get('location') || '').includes('/unauthorized'),
    'Student attempting to access /admin/courses/builder is redirected to /unauthorized'
  );

  // -------------------------------------------------------------------------
  // 6. PUBLIC REGISTRATION SECURITY (Disallow Admin self-creation)
  // -------------------------------------------------------------------------
  console.log('\n[6] Testing Public Registration Security...');

  const regAdminReq = createJsonRequest('http://localhost:3000/api/lms/auth/register', {
    name: 'Malicious Actor',
    email: 'hacker@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'ADMIN'
  });
  const regAdminRes = await lmsRegisterHandler(regAdminReq);
  const regAdminJson = await regAdminRes.json();
  assert(
    regAdminRes.status === 403,
    'Attempting public registration with role: "ADMIN" is rejected with HTTP 403',
    regAdminJson
  );
  assert(
    regAdminJson.error?.includes('Administrator accounts cannot be self-registered'),
    `Correct error returned for unauthorized admin registration: "${regAdminJson.error}"`
  );

  console.log('\n================================================================');
  console.log(`Test Suite Complete: ${passed} passed, ${failed} failed.`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
