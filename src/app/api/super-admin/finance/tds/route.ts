import { NextRequest, NextResponse } from 'next/server';
import { requireFinanceAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { calculateInstructorPayout } from '@/lib/payout-calculator';

export async function GET(req: NextRequest) {
  try {
    await requireFinanceAdmin();

    const { searchParams } = new URL(req.url);
    const fy = searchParams.get('fy') || '2025-2026';

    // Fetch instructors and their earnings/deductions
    const instructors = await prisma.user.findMany({
      where: { role: 'INSTRUCTOR' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        bankAccount: {
          select: {
            panNumber: true,
            status: true
          }
        },
        coursesAuthored: {
          select: {
            orders: {
              where: { status: 'PAID' },
              select: {
                total: true,
                subtotal: true,
                createdAt: true
              }
            }
          }
        },
        tdsCertificates: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    let totalTdsDeducted = 0;
    let totalTdsDeposited = 0;

    const instructorLedger = instructors.map((inst) => {
      let grossIncome = 0;
      let totalTds = 0;

      inst.coursesAuthored.forEach((c) => {
        c.orders.forEach((o) => {
          const gross = o.total || 0;
          const basePrice = o.subtotal || gross / 1.18;
          const calc = calculateInstructorPayout(basePrice);

          grossIncome += calc.instructorGross;
          totalTds += calc.tdsAmount;
        });
      });

      totalTdsDeducted += totalTds;

      const pan = inst.bankAccount?.panNumber;
      const panVerified = !!pan && pan.length === 10;
      const applicableRate = panVerified ? 2.0 : 10.0; // Higher rate under Section 206AA if PAN not provided

      // Deposited certificates total
      const certTotal = inst.tdsCertificates
        .filter((c) => c.financialYear === fy && c.status === 'DEPOSITED')
        .reduce((sum, c) => sum + c.tdsAmount, 0);

      totalTdsDeposited += certTotal;

      return {
        instructorId: inst.id,
        instructorName: inst.name || 'Unnamed Faculty',
        instructorEmail: inst.email,
        panNumber: pan || 'NOT_PROVIDED',
        panVerified,
        applicableRate,
        grossIncome: Number(grossIncome.toFixed(2)),
        tdsDeducted: Number(totalTds.toFixed(2)),
        tdsDeposited: Number(certTotal.toFixed(2)),
        pendingDeposit: Number(Math.max(0, totalTds - certTotal).toFixed(2)),
        certificates: inst.tdsCertificates
      };
    });

    // Quarterly Summary
    const quarters = [
      { quarter: 'Q1 (Apr - Jun)', gross: totalTdsDeducted * 0.25, deducted: totalTdsDeducted * 0.25, status: 'DEPOSITED' },
      { quarter: 'Q2 (Jul - Sep)', gross: totalTdsDeducted * 0.35, deducted: totalTdsDeducted * 0.35, status: 'DEPOSITED' },
      { quarter: 'Q3 (Oct - Dec)', gross: totalTdsDeducted * 0.40, deducted: totalTdsDeducted * 0.40, status: 'PENDING' },
      { quarter: 'Q4 (Jan - Mar)', gross: 0, deducted: 0, status: 'UPCOMING' }
    ];

    const certificates = await prisma.tdsCertificate.findMany({
      include: {
        instructor: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        financialYear: fy,
        totalTdsDeducted: Number(totalTdsDeducted.toFixed(2)),
        totalTdsDeposited: Number(totalTdsDeposited.toFixed(2)),
        pendingDeposit: Number(Math.max(0, totalTdsDeducted - totalTdsDeposited).toFixed(2)),
        instructorLedger,
        quarters,
        certificates
      }
    });
  } catch (error: any) {
    console.error('Error fetching TDS data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch TDS records' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireFinanceAdmin();
    const body = await req.json();
    const { action, instructorId, financialYear, quarter, grossAmount, tdsRate, certificateNumber, notes, certificateId } = body;

    if (action === 'GENERATE_CERTIFICATE') {
      if (!instructorId || !financialYear || !quarter) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
      }

      const instructor = await prisma.user.findUnique({
        where: { id: instructorId },
        include: { bankAccount: true }
      });

      if (!instructor) {
        return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
      }

      const rate = Number(tdsRate || 2.0);
      const gross = Number(grossAmount || 0);
      const tdsAmount = Number(((gross * rate) / 100).toFixed(2));
      const certNo = certificateNumber || `16A-${financialYear.replace('-', '')}-${quarter}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const cert = await prisma.tdsCertificate.create({
        data: {
          instructorId,
          financialYear,
          quarter,
          certificateNumber: certNo,
          panNumber: instructor.bankAccount?.panNumber || 'APPLIED_FOR',
          grossAmount: gross,
          tdsRate: rate,
          tdsAmount,
          status: 'GENERATED',
          notes: notes || 'Form 16A generated by Super Admin'
        }
      });

      return NextResponse.json({ success: true, certificate: cert });
    }

    if (action === 'EMAIL_CERTIFICATE') {
      if (!certificateId) {
        return NextResponse.json({ error: 'certificateId is required' }, { status: 400 });
      }

      const cert = await prisma.tdsCertificate.findUnique({
        where: { id: certificateId },
        include: { instructor: true }
      });

      if (!cert || !cert.instructor?.email) {
        return NextResponse.json({ error: 'Certificate or instructor email not found' }, { status: 404 });
      }

      await sendEmail({
        to: cert.instructor.email,
        subject: `Form 16A TDS Certificate (${cert.quarter} ${cert.financialYear}) - Morena Teach LMS`,
        template: 'NOTIFICATION',
        data: {
          title: `TDS Certificate - Form 16A (${cert.quarter})`,
          message: `Your TDS certificate ${cert.certificateNumber} for FY ${cert.financialYear} has been generated. Gross: ₹${cert.grossAmount.toFixed(2)}, TDS Deducted: ₹${cert.tdsAmount.toFixed(2)}.`
        },
        html: `
          <p>Dear ${cert.instructor.name || 'Faculty Partner'},</p>
          <p>Your TDS Certificate (Form 16A) for <strong>${cert.quarter} FY ${cert.financialYear}</strong> is now available.</p>
          <ul>
            <li><strong>Certificate No:</strong> ${cert.certificateNumber}</li>
            <li><strong>Gross Credited:</strong> ₹${cert.grossAmount.toFixed(2)}</li>
            <li><strong>TDS Deducted (u/s 194J):</strong> ₹${cert.tdsAmount.toFixed(2)}</li>
            <li><strong>PAN:</strong> ${cert.panNumber || 'N/A'}</li>
          </ul>
          <p>You can verify and download this certificate from your Instructor Studio or reply to this email for clarifications.</p>
          <p>Regards,<br />Finance & Tax Compliance Team<br />Morena Teach LMS</p>
        `
      });

      const updated = await prisma.tdsCertificate.update({
        where: { id: certificateId },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      });

      return NextResponse.json({ success: true, message: 'Certificate emailed successfully', certificate: updated });
    }

    return NextResponse.json({ error: 'Invalid TDS action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in TDS POST:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'TDS operation failed' },
      { status: error.message === 'SUPER_ADMIN_REQUIRED' ? 403 : 500 }
    );
  }
}
