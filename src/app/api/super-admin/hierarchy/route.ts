import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SETTING_ASSIGNMENTS_KEY = 'seo_team_assignments';

export async function GET() {
  try {
    await requireSuperAdmin();

    // 1. Fetch all LMS staff / personnel with their relevant relations
    const [allStaff, allCourses, settingsRow] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: {
            in: [
              'SUPER_ADMIN',
              'ADMIN',
              'LMS_ADMIN',
              'INSTRUCTOR',
              'TEACHER',
              'REVIEWER',
              'AUDITOR',
              'SEO_MANAGER',
              'SEO_SPECIALIST',
              'SEO'
            ]
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          customRole: true,
          avatar: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          coursesAuthored: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              price: true,
              _count: {
                select: {
                  enrollments: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.course.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          price: true,
          instructorId: true
        }
      }),
      prisma.platformSetting.findUnique({
        where: { key: SETTING_ASSIGNMENTS_KEY }
      }).catch(() => null)
    ]);

    // Parse SEO assignments
    let seoAssignments: any[] = [];
    if (settingsRow?.value) {
      try {
        seoAssignments = JSON.parse(settingsRow.value);
      } catch {
        seoAssignments = [];
      }
    }

    // Categorize Staff by Department
    const superAdmins = allStaff.filter((u) => u.role === 'SUPER_ADMIN');
    const adminDeans = allStaff.filter((u) => u.role === 'ADMIN' && (!u.customRole || !u.customRole.toLowerCase().includes('finance')));
    const financeStaff = allStaff.filter(
      (u) => u.role === 'ADMIN' && u.customRole && u.customRole.toLowerCase().includes('finance')
    );
    const seoManagers = allStaff.filter((u) => u.role === 'SEO_MANAGER');
    const seoSpecialists = allStaff.filter((u) => ['SEO_SPECIALIST', 'SEO'].includes(u.role));
    const auditors = allStaff.filter((u) => ['REVIEWER', 'AUDITOR'].includes(u.role));
    const instructors = allStaff.filter((u) => ['INSTRUCTOR', 'TEACHER'].includes(u.role));

    // Map rich personnel details with duties & reporting manager
    const mappedSpecialists = seoSpecialists.map((sp) => {
      const myAssignments = seoAssignments.filter((a) => {
        const idMatch = a.specialistId && a.specialistId.toLowerCase() === sp.id.toLowerCase();
        const emailMatch = a.specialistEmail && a.specialistEmail.toLowerCase() === sp.email.toLowerCase();
        const nameMatch = a.specialistName && a.specialistName.toLowerCase() === sp.name.toLowerCase();
        return idMatch || emailMatch || nameMatch;
      });

      return {
        id: sp.id,
        name: sp.name,
        email: sp.email,
        phone: sp.phone,
        role: sp.role,
        customRole: sp.customRole || 'SEO & Campaign Specialist',
        department: 'Growth & SEO Marketing',
        departmentKey: 'seo',
        reportsTo: seoManagers[0]?.name || 'SEO Lead Manager',
        reportsToRole: 'SEO_MANAGER',
        status: sp.status,
        avatar: sp.avatar,
        currentDuty: `${myAssignments.length} Courses Assigned for Ads & SEO`,
        assignedItemsCount: myAssignments.length,
        assignedDetails: myAssignments.map((a) => ({
          title: a.courseTitle,
          courseId: a.courseId,
          taskType: a.taskType || 'SEO_METADATA',
          status: a.status || 'IN_PROGRESS',
          progress: a.progress || 0
        }))
      };
    });

    const mappedSeoManagers = seoManagers.map((sm) => {
      const managedTeamCount = mappedSpecialists.length;
      return {
        id: sm.id,
        name: sm.name,
        email: sm.email,
        phone: sm.phone,
        role: sm.role,
        customRole: sm.customRole || 'Chief Growth & SEO Lead',
        department: 'Growth & SEO Marketing',
        departmentKey: 'seo',
        reportsTo: superAdmins[0]?.name || 'Super Admin Officer',
        reportsToRole: 'SUPER_ADMIN',
        status: sm.status,
        avatar: sm.avatar,
        currentDuty: `Managing SEO Strategy, Google/Meta Ads & Team of ${managedTeamCount} Specialists`,
        assignedItemsCount: managedTeamCount,
        teamMembers: mappedSpecialists
      };
    });

    const mappedFinance = financeStaff.map((fn) => ({
      id: fn.id,
      name: fn.name,
      email: fn.email,
      phone: fn.phone,
      role: fn.role,
      customRole: fn.customRole || 'Finance & Accounts Administrator',
      department: 'Finance & Accounts',
      departmentKey: 'finance',
      reportsTo: superAdmins[0]?.name || 'Super Admin Officer',
      reportsToRole: 'SUPER_ADMIN',
      status: fn.status,
      avatar: fn.avatar,
      currentDuty: '14 Accounts & Finance Hubs (Payouts, GST, TDS, Gateways, Refunds, Ledger)',
      assignedItemsCount: 14,
      assignedDetails: [
        { title: 'Instructor Payments & Payouts', status: 'ACTIVE' },
        { title: 'TDS & GST Compliance Ledgers', status: 'ACTIVE' },
        { title: 'Payment Gateway Fee Reconciliations', status: 'ACTIVE' },
        { title: 'Student Refunds & Reversals', status: 'ACTIVE' }
      ]
    }));

    const mappedAdmins = adminDeans.map((ad) => ({
      id: ad.id,
      name: ad.name,
      email: ad.email,
      phone: ad.phone,
      role: ad.role,
      customRole: ad.customRole || 'Academic Dean & Lead Manager',
      department: 'Academic Administration',
      departmentKey: 'admin',
      reportsTo: superAdmins[0]?.name || 'Super Admin Officer',
      reportsToRole: 'SUPER_ADMIN',
      status: ad.status,
      avatar: ad.avatar,
      currentDuty: `Platform Operations, Curriculum Oversight & Course Approvals (${allCourses.length} Total Courses)`,
      assignedItemsCount: allCourses.length
    }));

    const mappedAuditors = auditors.map((aud, idx) => ({
      id: aud.id,
      name: aud.name,
      email: aud.email,
      phone: aud.phone,
      role: aud.role,
      customRole: aud.customRole || (idx === 0 ? 'Lead Course Quality Auditor' : 'Curriculum QA Reviewer'),
      department: 'Curriculum Quality & QA',
      departmentKey: 'auditor',
      reportsTo: idx === 0 ? (superAdmins[0]?.name || 'Super Admin Officer') : (auditors[0]?.name || 'Lead Course Auditor'),
      reportsToRole: idx === 0 ? 'SUPER_ADMIN' : 'REVIEWER',
      status: aud.status,
      avatar: aud.avatar,
      currentDuty: 'Video Inspection, Syllabus Quality, Lesson Verification & Approvals',
      assignedItemsCount: allCourses.filter((c) => c.status === 'PUBLISHED').length
    }));

    const mappedInstructors = instructors.map((ins) => {
      const courses = ins.coursesAuthored || [];
      const publishedCount = courses.filter((c) => c.status === 'PUBLISHED').length;
      const totalLearners = courses.reduce((acc, c) => acc + (c._count?.enrollments || 0), 0);

      return {
        id: ins.id,
        name: ins.name,
        email: ins.email,
        phone: ins.phone,
        role: ins.role,
        customRole: ins.customRole || 'Faculty Instructor',
        department: 'Academic Faculty & Teaching',
        departmentKey: 'faculty',
        reportsTo: adminDeans[0]?.name || (superAdmins[0]?.name || 'Super Admin Officer'),
        reportsToRole: 'ADMIN',
        status: ins.status,
        avatar: ins.avatar,
        currentDuty: `${courses.length} Courses Created (${publishedCount} Live, ${totalLearners} Students Enrolled)`,
        assignedItemsCount: courses.length,
        assignedDetails: courses.map((c) => ({
          title: c.title,
          status: c.status,
          enrollments: c._count?.enrollments || 0,
          price: c.price
        }))
      };
    });

    const masterSuperAdmin = {
      id: superAdmins[0]?.id || 'master-super-admin',
      name: superAdmins[0]?.name || 'Super Admin Officer',
      email: superAdmins[0]?.email || 'superadmin@morenateach.com',
      role: 'SUPER_ADMIN',
      customRole: 'Chief Executive Administrator (LMS Master)',
      department: 'Executive Governance',
      departmentKey: 'executive',
      reportsTo: 'Platform Board & Ownership',
      reportsToRole: 'OWNER',
      status: 'ACTIVE',
      avatar: superAdmins[0]?.avatar,
      currentDuty: `Chief Governance across ${allStaff.length} Total LMS Staff, ${allCourses.length} Courses, and Financials`
    };

    // Department Summary Stats
    const summary = {
      totalStaff: allStaff.length,
      superAdmins: superAdmins.length,
      admins: adminDeans.length,
      financeStaff: financeStaff.length,
      seoManagers: seoManagers.length,
      seoSpecialists: seoSpecialists.length,
      totalSeoTeam: seoManagers.length + seoSpecialists.length,
      auditors: auditors.length,
      instructors: instructors.length,
      activeStaff: allStaff.filter((u) => u.status === 'ACTIVE').length
    };

    // Full Combined Roster for Table Search & Filtering
    const completeRoster = [
      masterSuperAdmin,
      ...mappedAdmins,
      ...mappedFinance,
      ...mappedSeoManagers,
      ...mappedSpecialists,
      ...mappedAuditors,
      ...mappedInstructors
    ];

    // Hierarchy Tree Structure
    const hierarchyTree = {
      root: masterSuperAdmin,
      departments: [
        {
          key: 'admin',
          name: 'Academic Administration & Deans',
          icon: 'admin_panel_settings',
          count: mappedAdmins.length,
          leads: mappedAdmins,
          members: []
        },
        {
          key: 'finance',
          name: 'Accounts & Financial Operations',
          icon: 'account_balance_wallet',
          count: mappedFinance.length,
          leads: mappedFinance,
          members: []
        },
        {
          key: 'seo',
          name: 'Growth & SEO Marketing',
          icon: 'trending_up',
          count: mappedSeoManagers.length + mappedSpecialists.length,
          leads: mappedSeoManagers,
          members: mappedSpecialists
        },
        {
          key: 'auditor',
          name: 'Curriculum Quality & QA Review',
          icon: 'verified',
          count: mappedAuditors.length,
          leads: mappedAuditors.slice(0, 1),
          members: mappedAuditors.slice(1)
        },
        {
          key: 'faculty',
          name: 'Faculty & Course Instructors',
          icon: 'school',
          count: mappedInstructors.length,
          leads: mappedInstructors.filter((i) => i.customRole.toLowerCase().includes('lead') || i.customRole.toLowerCase().includes('dean')),
          members: mappedInstructors
        }
      ]
    };

    return NextResponse.json({
      success: true,
      summary,
      hierarchyTree,
      completeRoster
    });
  } catch (error: any) {
    console.error('Error fetching LMS hierarchy:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch LMS hierarchy' },
      { status: 500 }
    );
  }
}
