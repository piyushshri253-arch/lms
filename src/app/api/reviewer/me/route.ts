import { NextResponse } from 'next/server';
import { getReviewerCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getReviewerCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        customRole: user.customRole || 'Course Reviewer',
        organizationId: user.organizationId,
        organizationName: user.organizationName
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
