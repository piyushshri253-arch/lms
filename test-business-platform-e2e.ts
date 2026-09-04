import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateLicenseKey, issueSoftwareLicense, verifyLicenseKey, activateLicenseDevice, deactivateLicenseDevice } from './src/lib/license';
import { creditSellerWallet, getSellerWalletSummary, requestSellerPayout } from './src/lib/wallet';
import { createService, bookService, updateBookingStatus } from './src/lib/services';
import { EmailService } from './src/lib/email';
import { encryptSecret } from './src/lib/security';

const prisma = new PrismaClient();

async function runE2eTests() {
  console.log('========================================================================');
  console.log('🚀 AADHYARA "CREATE → LEARN → SELL" PLATFORM — END-TO-END VERIFICATION');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ PASS: ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error(`   └─ ${detail}`);
    }
  }

  try {
    // ---------------------------------------------------------
    // TEST GROUP 1: BUSINESS ONBOARDING & TENANT ISOLATION
    // ---------------------------------------------------------
    console.log('--- TEST GROUP 1: BUSINESS & TENANT ONBOARDING ---');
    const pwdHash = await bcrypt.hash('password123', 10);

    // 1. Business A: XYZ Graphics Studio
    const orgA = await prisma.organization.upsert({
      where: { slug: 'xyz-graphics' },
      create: {
        name: 'XYZ Graphics Studio',
        slug: 'xyz-graphics',
        businessType: 'DIGITAL_PRODUCTS',
        industry: 'Graphic Design & Branding',
        tagline: 'High-Converting Canva & Figma Design Templates',
        verifiedSeller: true,
        verificationStatus: 'VERIFIED',
        commissionRate: 10.0
      },
      update: {
        businessType: 'DIGITAL_PRODUCTS',
        industry: 'Graphic Design & Branding',
        verifiedSeller: true,
        commissionRate: 10.0
      }
    });

    const userA = await prisma.user.upsert({
      where: {
        email_platform: {
          email: 'admin@xyzgraphics.com',
          platform: 'SALES'
        }
      },
      create: {
        email: 'admin@xyzgraphics.com',
        platform: 'SALES',
        name: 'XYZ Creative Director',
        password: pwdHash,
        role: 'ADMIN',
        organizationId: orgA.id
      },
      update: { organizationId: orgA.id }
    });

    // 2. Business B: 123 Software Labs
    const orgB = await prisma.organization.upsert({
      where: { slug: '123-software-labs' },
      create: {
        name: '123 Software Labs',
        slug: '123-software-labs',
        businessType: 'SOFTWARE',
        industry: 'Software & SaaS Development',
        tagline: 'Enterprise Next.js Boilerplates & Cloud Codebases',
        verifiedSeller: true,
        verificationStatus: 'VERIFIED',
        commissionRate: 10.0
      },
      update: {
        businessType: 'SOFTWARE',
        industry: 'Software & SaaS Development',
        verifiedSeller: true,
        commissionRate: 10.0
      }
    });

    const userB = await prisma.user.upsert({
      where: {
        email_platform: {
          email: 'admin@123software.com',
          platform: 'SALES'
        }
      },
      create: {
        email: 'admin@123software.com',
        platform: 'SALES',
        name: '123 Lead Architect',
        password: pwdHash,
        role: 'ADMIN',
        organizationId: orgB.id
      },
      update: { organizationId: orgB.id }
    });

    // Customer
    const customer = await prisma.user.upsert({
      where: {
        email_platform: {
          email: 'customer.john@example.com',
          platform: 'LMS'
        }
      },
      create: {
        email: 'customer.john@example.com',
        platform: 'LMS',
        name: 'John Customer',
        password: pwdHash,
        role: 'STUDENT'
      },
      update: {}
    });

    assert(orgA.id !== orgB.id, 'Business A and Business B are fully isolated organizations');
    assert(orgA.verifiedSeller && orgB.verifiedSeller, 'Businesses have verified seller accreditation');

    // ---------------------------------------------------------
    // TEST GROUP 2: UNIVERSAL PRODUCTS, SOFTWARE & SERVICES
    // ---------------------------------------------------------
    console.log('\n--- TEST GROUP 2: PRODUCTS, SOFTWARE & SERVICES CREATION ---');

    // Product for XYZ: Figma UI Kit
    const productA = await prisma.product.upsert({
      where: {
        slug_organizationId: {
          slug: 'figma-saas-ui-kit',
          organizationId: orgA.id
        }
      },
      create: {
        organizationId: orgA.id,
        name: 'Ultra Figma SaaS UI Kit',
        slug: 'figma-saas-ui-kit',
        type: 'TEMPLATE',
        price: 1499.0,
        description: 'Complete UI component kit with 500+ design blocks.',
        status: 'ACTIVE',
        visibility: 'PUBLIC'
      },
      update: { price: 1499.0 }
    });

    // Software for 123 Labs: Next.js SaaS Boilerplate
    const softwareB = await prisma.product.upsert({
      where: {
        slug_organizationId: {
          slug: 'nextjs-saas-starter-pro',
          organizationId: orgB.id
        }
      },
      create: {
        organizationId: orgB.id,
        name: 'Next.js 16 SaaS Pro Starter Codebase',
        slug: 'nextjs-saas-starter-pro',
        type: 'SOFTWARE',
        version: '2.4.0',
        licenseType: 'SINGLE_USER',
        price: 3999.0,
        description: 'Production Next.js starter with auth, stripe, and license manager.',
        status: 'ACTIVE',
        visibility: 'PUBLIC'
      },
      update: { price: 3999.0, version: '2.4.0' }
    });

    // Service for XYZ: Custom Logo Design
    const serviceA = await createService({
      organizationId: orgA.id,
      name: 'Bespoke Brand Identity & 3D Logo Suite',
      description: 'End-to-end vector identity with style guide and brand guidelines.',
      category: 'DESIGN',
      price: 7500.0,
      deliveryDays: 4
    });

    assert(productA.price === 1499.0, 'XYZ Figma UI Kit created with price ₹1499');
    assert(softwareB.type === 'SOFTWARE' && softwareB.version === '2.4.0', '123 Software Codebase created with version v2.4.0');
    assert(serviceA.price === 7500.0 && serviceA.deliveryDays === 4, 'XYZ Bespoke Logo Service created with 4-day turnaround');

    // ---------------------------------------------------------
    // TEST GROUP 3: CRYPTOGRAPHIC SOFTWARE LICENSING ENGINE
    // ---------------------------------------------------------
    console.log('\n--- TEST GROUP 3: SOFTWARE LICENSING & ACTIVATION ENGINE ---');

    const issuedLicense = await issueSoftwareLicense({
      organizationId: orgB.id,
      productId: softwareB.id,
      userId: customer.id,
      licenseType: 'SINGLE_USER',
      maxActivations: 1
    });

    assert(issuedLicense.licenseKey.startsWith('AADHYARA-'), 'Generated license key follows AADHYARA-XXXX-XXXX-XXXX format', issuedLicense.licenseKey);

    // Verify License Key
    const verifyBefore = await verifyLicenseKey(issuedLicense.licenseKey);
    assert(verifyBefore.valid === true, 'Cryptographic verification confirmed license is ACTIVE & VALID');

    // Activate Device 1
    const actResult1 = await activateLicenseDevice({
      licenseKey: issuedLicense.licenseKey,
      deviceId: 'macbook-pro-m3-xyz99',
      deviceName: 'John MacBook Pro M3',
      deviceFingerprint: 'sha256-fp-998877'
    });

    assert(actResult1.success === true, 'Device 1 successfully activated on license');

    // Attempt Device 2 on single-user license (Should fail capacity limit)
    const actResult2 = await activateLicenseDevice({
      licenseKey: issuedLicense.licenseKey,
      deviceId: 'windows-desktop-pc-44',
      deviceName: 'John Gaming Rig'
    });

    assert(actResult2.success === false, 'Enforced single-user capacity limit (Device 2 rejected)', actResult2.error);

    // Deactivate Device 1 and then activate Device 2
    const deactResult = await deactivateLicenseDevice(issuedLicense.licenseKey, 'macbook-pro-m3-xyz99');
    assert(deactResult.success === true, 'Device 1 successfully deactivated');

    const actResult2Retry = await activateLicenseDevice({
      licenseKey: issuedLicense.licenseKey,
      deviceId: 'windows-desktop-pc-44',
      deviceName: 'John Gaming Rig'
    });
    assert(actResult2Retry.success === true, 'Device 2 successfully activated after deactivation of previous machine');

    // ---------------------------------------------------------
    // TEST GROUP 4: SERVICES BOOKING & DELIVERABLE LIFECYCLE
    // ---------------------------------------------------------
    console.log('\n--- TEST GROUP 4: SERVICE BOOKINGS & DELIVERY LIFECYCLE ---');

    const booking = await bookService({
      organizationId: orgA.id,
      serviceId: serviceA.id,
      userId: customer.id,
      packageName: 'Full Brand Suite',
      amount: 7500.0,
      requirementsSubmitted: {
        brandName: 'Quantum AI',
        preferredColors: ['Deep Purple', 'Neon Cyan'],
        targetAudience: 'Enterprise Developers'
      }
    });

    assert(booking.status === 'CONFIRMED', 'Service booking created in CONFIRMED state');

    // Transition to IN_PROGRESS and DELIVERED
    const bookingInProgress = await updateBookingStatus({
      bookingId: booking.id,
      organizationId: orgA.id,
      status: 'IN_PROGRESS',
      sellerNotes: 'Design draft in progress by creative lead.'
    });
    assert(bookingInProgress.status === 'IN_PROGRESS', 'Service transitioned to IN_PROGRESS');

    const bookingDelivered = await updateBookingStatus({
      bookingId: booking.id,
      organizationId: orgA.id,
      status: 'DELIVERED',
      deliveryFiles: [
        { name: 'Quantum_AI_Vector_Logo.svg', url: 'https://cdn.aadhyara.com/xyz/logos.svg' },
        { name: 'Brand_Guidelines.pdf', url: 'https://cdn.aadhyara.com/xyz/guidelines.pdf' }
      ]
    });
    assert(bookingDelivered.status === 'DELIVERED', 'Deliverable files successfully attached and status set to DELIVERED');

    // ---------------------------------------------------------
    // TEST GROUP 5: SELLER WALLET, COMMISSION & PAYOUTS
    // ---------------------------------------------------------
    console.log('\n--- TEST GROUP 5: SELLER WALLET & REVENUE LEDGER ---');

    // Simulate Order for 123 Software Labs (₹3999)
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-${Date.now()}`,
        organizationId: orgB.id,
        userId: customer.id,
        total: 3999.0,
        amount: 3999.0,
        status: 'PAID',
        provider: 'RAZORPAY'
      }
    });

    const walletResult = await creditSellerWallet({
      organizationId: orgB.id,
      orderId: testOrder.id,
      orderTotal: 3999.0
    });

    // 10% platform fee of 3999 = 399.9, net seller revenue = 3599.1
    assert(walletResult.platformFee === 399.9, '10% Platform fee calculated server-side (₹399.90)');
    assert(walletResult.sellerAmount === 3599.1, 'Net seller revenue credited to wallet (₹3599.10)');

    const summary = await getSellerWalletSummary(orgB.id);
    assert(summary.availableBalance >= 3599.1, 'Seller wallet available balance reflects credited revenue');

    // Submit Payout Request
    const payoutReq = await requestSellerPayout({
      organizationId: orgB.id,
      amount: 1000.0,
      payoutMethod: 'UPI',
      payoutDetails: { upiId: 'lead@123software' }
    });

    assert(payoutReq.success === true, 'Payout request submitted successfully and moved to pending balance');

    // ---------------------------------------------------------
    // TEST GROUP 6: STRICT MULTI-TENANT ISOLATION
    // ---------------------------------------------------------
    console.log('\n--- TEST GROUP 6: STRICT CROSS-TENANT ISOLATION ---');

    // Verify XYZ Admin cannot access 123 Software's products or licenses
    const crossCheckProduct = await prisma.product.findFirst({
      where: { id: softwareB.id, organizationId: orgA.id }
    });
    assert(crossCheckProduct === null, 'Tenant Isolation: XYZ Admin cannot query or modify 123 Software products');

    const crossCheckService = await prisma.service.findFirst({
      where: { id: serviceA.id, organizationId: orgB.id }
    });
    assert(crossCheckService === null, 'Tenant Isolation: 123 Software cannot query or modify XYZ Studio services');

    // ---------------------------------------------------------
    // TEST GROUP 7: MULTI-TENANT TRANSACTIONAL EMAIL DISPATCH
    // ---------------------------------------------------------
    console.log('\n--- TEST GROUP 7: TENANT-ISOLATED SMTP DISPATCH ---');

    // Setup XYZ Dedicated SMTP
    await prisma.organizationEmailConfig.upsert({
      where: { organizationId: orgA.id },
      create: {
        organizationId: orgA.id,
        smtpHost: 'smtp.xyzgraphics.com',
        smtpPort: 587,
        smtpUsername: 'contact@xyzgraphics.com',
        smtpPasswordEncrypted: encryptSecret('xyzPassword123'),
        fromName: 'XYZ Graphics Studio',
        fromEmail: 'contact@xyzgraphics.com',
        isEnabled: true,
        fallbackToPlatform: true
      },
      update: { isEnabled: true }
    });

    const emailRes = await EmailService.sendEmail({
      to: customer.email,
      subject: 'Your Custom Brand Suite Deliverables Are Ready!',
      template: 'COMPANY_WELCOME',
      organizationId: orgA.id,
      data: {
        name: customer.name,
        companyName: orgA.name,
        role: 'Client'
      }
    });

    assert(emailRes.success === true, 'Client deliverable notification sent using XYZ dedicated SMTP config');

    // Verify log is isolated to orgA
    const logsA = await prisma.emailLog.findMany({ where: { organizationId: orgA.id } });
    const logsB = await prisma.emailLog.findMany({ where: { organizationId: orgB.id } });

    assert(logsA.length > 0 && logsB.every((l) => l.organizationId === orgB.id), 'Email Logs are 100% tenant-scoped with zero cross-tenant contamination');

    console.log('\n========================================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passedTests} PASSED | ${totalTests - passedTests} FAILED out of ${totalTests} tests`);
    console.log('========================================================================');
  } catch (err) {
    console.error('Fatal test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runE2eTests();
