import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword, getCurrentUser } from '@/lib/auth';

const SETTING_ASSIGNMENTS_KEY = 'seo_team_assignments';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch all SEO users from User table
    let specialists = await prisma.user.findMany({
      where: {
        role: {
          in: ['SEO_SPECIALIST', 'SEO_MANAGER', 'SEO']
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        customRole: true,
        status: true,
        avatar: true,
        createdAt: true,
        lastLoginAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // 2. If fewer than 3 team members exist, seed standard specialists for realistic testing
    if (specialists.length < 3) {
      const defaultPw = await hashPassword('password123');
      const seedMembers = [
        {
          name: 'Aman Sharma',
          email: 'aman.ads@morenateach.com',
          role: 'SEO_SPECIALIST',
          customRole: 'Google Ads & PPC Specialist',
          phone: '+91 98765 43210'
        },
        {
          name: 'Neha Patel',
          email: 'neha.meta@morenateach.com',
          role: 'SEO_SPECIALIST',
          customRole: 'Meta Ads & Creative Specialist',
          phone: '+91 98765 43211'
        }
      ];

      for (const sm of seedMembers) {
        const exists = await prisma.user.findFirst({ where: { email: sm.email } });
        if (!exists) {
          await prisma.user.create({
            data: {
              name: sm.name,
              email: sm.email,
              password: defaultPw,
              role: sm.role,
              customRole: sm.customRole,
              phone: sm.phone,
              status: 'ACTIVE',
              emailVerified: true
            }
          });
        }
      }

      // Re-fetch specialists
      specialists = await prisma.user.findMany({
        where: {
          role: {
            in: ['SEO_SPECIALIST', 'SEO_MANAGER', 'SEO']
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          customRole: true,
          status: true,
          avatar: true,
          createdAt: true,
          lastLoginAt: true
        },
        orderBy: { createdAt: 'asc' }
      });
    }

    // 3. Read assignments to attach stats
    let assignments: any[] = [];
    try {
      const row = await prisma.platformSetting.findUnique({
        where: { key: SETTING_ASSIGNMENTS_KEY }
      });
      if (row?.value) {
        assignments = JSON.parse(row.value);
      }
    } catch {}

    const teamWithStats = specialists.map((member) => {
      const memberTasks = assignments.filter((a) => a.specialistId === member.id || a.specialistEmail === member.email);
      const completed = memberTasks.filter((a) => a.status === 'COMPLETED');
      const inProgress = memberTasks.filter((a) => a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED');
      const adsTasks = memberTasks.filter((a) => a.taskType === 'GOOGLE_ADS' || a.taskType === 'META_ADS');
      
      const avgProgress = memberTasks.length > 0
        ? Math.round(memberTasks.reduce((acc, curr) => acc + (curr.progress || 0), 0) / memberTasks.length)
        : 0;

      return {
        ...member,
        assignedTasksCount: memberTasks.length,
        completedTasksCount: completed.length,
        inProgressTasksCount: inProgress.length,
        runningAdsCount: adsTasks.length,
        avgProgress
      };
    });

    return NextResponse.json({ success: true, team: teamWithStats });
  } catch (err: any) {
    console.error('[SEO Team GET Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, customRole, phone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email address (Login ID) is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return NextResponse.json(
        { error: `A user with email "${normalizedEmail}" already exists. Please choose a different Login ID.` },
        { status: 409 }
      );
    }

    const rawPassword = password?.trim() || 'password123';
    const hashedPassword = await hashPassword(rawPassword);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'SEO_SPECIALIST',
        customRole: customRole?.trim() || 'SEO Executive',
        phone: phone?.trim() || null,
        status: 'ACTIVE',
        emailVerified: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customRole: true,
        phone: true,
        status: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      rawPassword,
      message: `Account created successfully for ${newUser.name} with Login ID: ${newUser.email}`
    });
  } catch (err: any) {
    console.error('[SEO Team POST Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Protect primary SEO manager from deletion
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (target.email === 'seo@morenateach.com') {
      return NextResponse.json({ error: 'Cannot delete the primary root SEO Administrator account.' }, { status: 403 });
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: `User ${target.name} removed successfully.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, name, phone, customRole, currentPassword, newPassword } = body;

    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && email) {
      user = await prisma.user.findFirst({ where: { email: email.toLowerCase().trim() } });
    }
    if (!user) {
      return NextResponse.json({ error: 'Specialist account not found in database.' }, { status: 404 });
    }

    // Password Update validation
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
      }
      if (currentPassword) {
        const isMatch = await verifyPassword(currentPassword, user.password);
        if (!isMatch) {
          return NextResponse.json({ error: 'Current password does not match.' }, { status: 400 });
        }
      }
      const newHashed = await hashPassword(newPassword.trim());
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHashed }
      });
    }

    const updateData: any = {};
    if (name && typeof name === 'string' && name.trim().length >= 2) {
      updateData.name = name.trim();
    }
    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }
    if (customRole && typeof customRole === 'string' && customRole.trim()) {
      updateData.customRole = customRole.trim();
    }

    let updatedUser: any = user;
    if (Object.keys(updateData).length > 0) {
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          customRole: true,
          status: true,
          avatar: true,
          createdAt: true
        } as any
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Specialist settings updated successfully! ✓',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: (updatedUser as any).phone || null,
        role: updatedUser.role,
        customRole: updatedUser.customRole || null
      }
    });
  } catch (err: any) {
    console.error('[SEO Team PUT Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to update settings.' }, { status: 500 });
  }
}
