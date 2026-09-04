import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, verifyPassword, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const result = passwordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    const user = await prisma.user.findUnique({
      where: { id: session.id }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMatch = await verifyPassword(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Current password does not match.' },
        { status: 400 }
      );
    }

    const newHashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: session.id },
      data: { password: newHashedPassword }
    });

    return NextResponse.json({ message: 'Password changed successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
