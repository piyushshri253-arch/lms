import fs from 'fs';
import path from 'path';
import { LMS_ROUTES } from './src/lib/lms-routes';

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${description}`);
    failed++;
  }
}

async function runLmsRoutingVerification() {
  console.log('========================================================================');
  console.log('🚀 AADHYARA: LMS ROUTING ISOLATION & /lms/* NAMESPACE VERIFICATION');
  console.log('========================================================================\n');

  console.log('--- TEST GROUP 1: LMS_ROUTES Constants Audit ---');
  assert(LMS_ROUTES.DASHBOARD === '/lms/dashboard', 'LMS_ROUTES.DASHBOARD is /lms/dashboard');
  assert(LMS_ROUTES.MY_COURSES === '/lms/my-courses', 'LMS_ROUTES.MY_COURSES is /lms/my-courses');
  assert(LMS_ROUTES.COURSES === '/lms/courses', 'LMS_ROUTES.COURSES is /lms/courses');
  assert(LMS_ROUTES.CERTIFICATES === '/lms/certificates', 'LMS_ROUTES.CERTIFICATES is /lms/certificates');
  assert(LMS_ROUTES.QUIZZES === '/lms/quizzes', 'LMS_ROUTES.QUIZZES is /lms/quizzes');
  assert(LMS_ROUTES.ASSIGNMENTS === '/lms/assignments', 'LMS_ROUTES.ASSIGNMENTS is /lms/assignments');
  assert(LMS_ROUTES.PROGRESS === '/lms/progress', 'LMS_ROUTES.PROGRESS is /lms/progress');
  assert(LMS_ROUTES.PROFILE === '/lms/profile', 'LMS_ROUTES.PROFILE is /lms/profile');
  assert(LMS_ROUTES.SETTINGS === '/lms/settings', 'LMS_ROUTES.SETTINGS is /lms/settings');
  assert(LMS_ROUTES.NOTIFICATIONS === '/lms/notifications', 'LMS_ROUTES.NOTIFICATIONS is /lms/notifications');
  assert(LMS_ROUTES.ORDERS === '/lms/orders', 'LMS_ROUTES.ORDERS is /lms/orders');
  assert(LMS_ROUTES.WISHLIST === '/lms/wishlist', 'LMS_ROUTES.WISHLIST is /lms/wishlist');
  assert(LMS_ROUTES.REVIEWS === '/lms/reviews', 'LMS_ROUTES.REVIEWS is /lms/reviews');
  assert(LMS_ROUTES.LEARN('c-1') === '/lms/learn/c-1', 'LMS_ROUTES.LEARN returns /lms/learn/[id]');

  console.log('\n--- TEST GROUP 2: LMS Dashboard Source Code Audit ---');
  const lmsDashboardCode = fs.readFileSync(
    path.join(__dirname, 'src/app/lms/dashboard/page.tsx'),
    'utf8'
  );
  assert(
    !lmsDashboardCode.includes('href="/dashboard/courses"'),
    'Zero references to /dashboard/courses in /lms/dashboard'
  );
  assert(
    !lmsDashboardCode.includes('href="/dashboard/certificates"'),
    'Zero references to /dashboard/certificates in /lms/dashboard'
  );
  assert(
    !lmsDashboardCode.includes('href="/dashboard/assignments"'),
    'Zero references to /dashboard/assignments in /lms/dashboard'
  );
  assert(
    !lmsDashboardCode.includes('href="/dashboard"'),
    'Zero references to /dashboard in /lms/dashboard'
  );
  assert(
    lmsDashboardCode.includes('LMS_ROUTES.MY_COURSES'),
    'LMS Dashboard uses LMS_ROUTES.MY_COURSES for My Courses link'
  );
  assert(
    lmsDashboardCode.includes('LMS_ROUTES.LEARN('),
    'LMS Dashboard uses LMS_ROUTES.LEARN for Resume Lesson CTA'
  );

  console.log('\n--- TEST GROUP 3: Dedicated /lms/* Page Files Existence ---');
  const lmsFiles = [
    'src/app/lms/my-courses/page.tsx',
    'src/app/lms/courses/page.tsx',
    'src/app/lms/courses/[id]/page.tsx',
    'src/app/lms/certificates/page.tsx',
    'src/app/lms/quizzes/page.tsx',
    'src/app/lms/assignments/page.tsx',
    'src/app/lms/progress/page.tsx',
    'src/app/lms/profile/page.tsx',
    'src/app/lms/settings/page.tsx',
    'src/app/lms/notifications/page.tsx',
    'src/app/lms/orders/page.tsx',
    'src/app/lms/reviews/page.tsx',
    'src/app/lms/wishlist/page.tsx',
    'src/app/lms/learn/[id]/page.tsx'
  ];

  for (const file of lmsFiles) {
    const exists = fs.existsSync(path.join(__dirname, file));
    assert(exists, `Dedicated LMS route file exists: ${file}`);
  }

  console.log('\n--- TEST GROUP 4: StudentSidebar & AppHeader Audit ---');
  const sidebarCode = fs.readFileSync(
    path.join(__dirname, 'src/components/layout/StudentSidebar.tsx'),
    'utf8'
  );
  assert(
    sidebarCode.includes('LMS_ROUTES.MY_COURSES'),
    'StudentSidebar uses LMS_ROUTES.MY_COURSES'
  );
  assert(
    sidebarCode.includes('LMS_ROUTES.DASHBOARD'),
    'StudentSidebar uses LMS_ROUTES.DASHBOARD'
  );

  console.log('\n--- TEST GROUP 5: Middleware Route Normalization Audit ---');
  const middlewareCode = fs.readFileSync(
    path.join(__dirname, 'src/middleware.ts'),
    'utf8'
  );
  assert(
    middlewareCode.includes("pathname === '/dashboard/courses'") &&
      middlewareCode.includes("new URL('/lms/my-courses', request.url)"),
    'Middleware canonicalizes legacy /dashboard/courses -> /lms/my-courses'
  );
  assert(
    middlewareCode.includes("pathname === '/dashboard/certificates'") &&
      middlewareCode.includes("new URL('/lms/certificates', request.url)"),
    'Middleware canonicalizes legacy /dashboard/certificates -> /lms/certificates'
  );

  console.log('\n========================================================================');
  console.log(`📊 LMS ROUTING VERIFICATION: ${passed} PASSED, ${failed} FAILED (${passed}/${passed + failed})`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

runLmsRoutingVerification().catch(console.error);
