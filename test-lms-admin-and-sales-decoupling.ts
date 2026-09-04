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

async function verifyLmsAdminAndSalesDecoupling() {
  console.log('========================================================================');
  console.log('🚀 TESTING LMS ADMIN & SALES PLATFORM DECOUPLING');
  console.log('========================================================================\n');

  console.log('--- TEST GROUP 1: LMS Admin Route Constants ---');
  assert(LMS_ROUTES.ADMIN === '/lms/admin', 'LMS_ROUTES.ADMIN is /lms/admin');
  assert(LMS_ROUTES.ADMIN_COURSES === '/lms/admin/courses', 'LMS_ROUTES.ADMIN_COURSES is /lms/admin/courses');
  assert(LMS_ROUTES.ADMIN_STUDENTS === '/lms/admin/students', 'LMS_ROUTES.ADMIN_STUDENTS is /lms/admin/students');

  console.log('\n--- TEST GROUP 2: Dedicated LMS Admin Page & Content ---');
  const lmsAdminPath = path.join(__dirname, 'src/app/lms/admin/page.tsx');
  assert(fs.existsSync(lmsAdminPath), 'src/app/lms/admin/page.tsx exists');
  const lmsAdminContent = fs.readFileSync(lmsAdminPath, 'utf8');
  assert(lmsAdminContent.includes('LMS Academy Command Center'), 'LMS Admin page has LMS Academy Command Center title');
  assert(lmsAdminContent.includes('Enrolled Students'), 'LMS Admin page tracks Enrolled Students');
  assert(!lmsAdminContent.includes('LeadsFunnelCard'), 'LMS Admin page does NOT include Sales LeadsFunnelCard');

  console.log('\n--- TEST GROUP 3: Sales Sidebar Audit (Zero /admin/* links) ---');
  const salesSidebarPath = path.join(__dirname, 'src/components/sales/SalesSidebar.tsx');
  const salesSidebarContent = fs.readFileSync(salesSidebarPath, 'utf8');
  assert(!salesSidebarContent.includes("href: '/admin/products'"), 'SalesSidebar does not link to /admin/products');
  assert(!salesSidebarContent.includes("href: '/admin/orders'"), 'SalesSidebar does not link to /admin/orders');
  assert(!salesSidebarContent.includes("href: '/admin/wallet'"), 'SalesSidebar does not link to /admin/wallet');
  assert(!salesSidebarContent.includes("href: '/admin/website'"), 'SalesSidebar does not link to /admin/website');
  assert(salesSidebarContent.includes("href: '/sales/products'"), 'SalesSidebar links to /sales/products');
  assert(salesSidebarContent.includes("href: '/sales/orders'"), 'SalesSidebar links to /sales/orders');
  assert(salesSidebarContent.includes("href: '/sales/wallet'"), 'SalesSidebar links to /sales/wallet');
  assert(salesSidebarContent.includes("href: '/sales/website'"), 'SalesSidebar links to /sales/website');

  console.log('\n--- TEST GROUP 4: Dedicated /sales/* Subpages ---');
  const salesSubpages = [
    'src/app/sales/products/page.tsx',
    'src/app/sales/orders/page.tsx',
    'src/app/sales/wallet/page.tsx',
    'src/app/sales/subscriptions/page.tsx',
    'src/app/sales/coupons/page.tsx',
    'src/app/sales/customers/page.tsx',
    'src/app/sales/leads/page.tsx',
    'src/app/sales/marketing/page.tsx',
    'src/app/sales/analytics/page.tsx',
    'src/app/sales/website/builder/page.tsx',
    'src/app/sales/settings/page.tsx'
  ];

  for (const page of salesSubpages) {
    assert(fs.existsSync(path.join(__dirname, page)), `Dedicated sales page exists: ${page}`);
  }

  console.log('\n--- TEST GROUP 5: LMS Auth Redirects to /lms/admin ---');
  const loginRouteContent = fs.readFileSync(path.join(__dirname, 'src/app/api/lms/auth/login/route.ts'), 'utf8');
  assert(loginRouteContent.includes("redirectUrl = '/lms/admin'"), 'LMS login redirects ADMIN / LMS_ADMIN to /lms/admin');

  console.log('\n========================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (${passed}/${passed + failed})`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

verifyLmsAdminAndSalesDecoupling().catch(console.error);
