import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    const status = searchParams.get('status') || 'ALL'; // ALL, ACTIVE, SUSPENDED
    const orgId = searchParams.get('orgId');
    const studentId = searchParams.get('id');

    if (studentId) {
      // Detailed Inspector for Single Student
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        include: {
          organization: {
            select: { id: true, name: true, slug: true, plan: true, logo: true }
          },
          enrollments: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  thumbnail: true,
                  price: true,
                  instructor: { select: { name: true } },
                  sections: {
                    select: {
                      id: true,
                      lessons: { select: { id: true, title: true } }
                    }
                  }
                }
              }
            }
          },
          lessonProgress: {
            include: {
              lesson: { select: { id: true, title: true, section: { select: { courseId: true } } } }
            }
          },
          orders: {
            include: { course: { select: { id: true, title: true } } },
            orderBy: { createdAt: 'desc' }
          },
          certificates: {
            include: { course: { select: { id: true, title: true } } }
          },
          reviews: {
            include: { course: { select: { id: true, title: true } } }
          },
          wishlist: {
            include: { course: { select: { id: true, title: true, price: true, thumbnail: true } } }
          },
          supportTickets: {
            orderBy: { createdAt: 'desc' }
          },
          notifications: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      return NextResponse.json({ student });
    }

    // List all students
    const where: any = { role: 'STUDENT' };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } }
      ];
    }
    if (status === 'ACTIVE') where.isSuspended = false;
    if (status === 'SUSPENDED') where.isSuspended = true;
    if (orgId && orgId !== 'ALL') where.organizationId = orgId;

    const [students, organizations] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          isSuspended: true,
          createdAt: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              logo: true
            }
          },
          enrollments: {
            select: {
              id: true,
              status: true,
              course: { select: { id: true, title: true } }
            }
          },
          certificates: { select: { id: true, certificateNumber: true } },
          orders: { select: { id: true, amount: true, status: true } },
          supportTickets: { select: { id: true, status: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.organization.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' }
      })
    ]);

    const formatted = students.map((s) => {
      const totalSpent = s.orders
        .filter((o) => o.status === 'SUCCESS')
        .reduce((sum, o) => sum + o.amount, 0);

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        avatar: s.avatar,
        isSuspended: s.isSuspended,
        organizationId: s.organizationId,
        organizationName: s.organization?.name || 'Platform (Direct)',
        organizationSlug: s.organization?.slug || '',
        organizationPlan: s.organization?.plan || 'STARTER',
        createdAt: s.createdAt.toISOString().split('T')[0],
        enrollmentCount: s.enrollments.length,
        certificateCount: s.certificates.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        openTicketsCount: s.supportTickets.filter((t) => t.status === 'OPEN').length
      };
    });

    return NextResponse.json({
      students: formatted,
      organizations
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const body = await request.json();
    const { id, name, email, isSuspended, newPassword } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const data: any = {};
    if (name) data.name = name.trim();
    if (email) data.email = email.trim();
    if (typeof isSuspended === 'boolean') data.isSuspended = isSuspended;
    if (newPassword && newPassword.length >= 6) {
      data.password = await bcrypt.hash(newPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, isSuspended: true }
    });

    // Write to audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'UPDATE_STUDENT',
        entity: 'User',
        entityId: id,
        description: `Updated student ${updated.name} (${updated.email}). Suspended: ${updated.isSuspended}.`
      }
    });

    return NextResponse.json({
      message: 'Student account updated successfully.',
      student: updated
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cascade deletions
    await prisma.ticketMessage.deleteMany({ where: { senderId: id } });
    await prisma.supportTicket.deleteMany({ where: { userId: id } });
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.note.deleteMany({ where: { userId: id } });
    await prisma.discussion.deleteMany({ where: { userId: id } });
    await prisma.review.deleteMany({ where: { userId: id } });
    await prisma.certificate.deleteMany({ where: { userId: id } });
    await prisma.wishlist.deleteMany({ where: { userId: id } });
    await prisma.lessonProgress.deleteMany({ where: { userId: id } });
    await prisma.enrollment.deleteMany({ where: { userId: id } });
    await prisma.order.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'DELETE_STUDENT',
        entity: 'User',
        entityId: id,
        description: `Permanently deleted student account ${user.name} (${user.email}).`
      }
    });

    return NextResponse.json({ message: `Student ${user.name} deleted successfully.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
