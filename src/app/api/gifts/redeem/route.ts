import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { redeemGiftCourse } from '@/lib/commerce';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { redemptionCode } = body;

    if (!redemptionCode || !redemptionCode.trim()) {
      return NextResponse.json({ error: 'Redemption code is required' }, { status: 400 });
    }

    const result = await redeemGiftCourse(redemptionCode, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Gift redemption failed' }, { status: 400 });
    }

    await createAuditLog({
      organizationId: user.organizationId,
      actorId: user.id,
      actorEmail: user.email,
      action: 'GIFT_COURSE_REDEEMED',
      entity: 'GiftCourse',
      entityId: redemptionCode,
      description: `Student "${user.name}" redeemed gift code "${redemptionCode}" for course access.`,
      req: request
    });

    return NextResponse.json({
      success: true,
      message: 'Gift course redeemed successfully! Access granted.',
      courseId: result.courseId,
      redirectUrl: '/student/dashboard'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
