import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getCurrentUser,
  getReviewerCurrentUser,
  requireTenantRole,
  validateTenantOwnership,
  handleAuthError
} from '@/lib/auth';
import {
  getCourseVersionState,
  saveCourseVersionState,
  classifyCourseChanges,
  applyMinorUpdateToLiveCourse,
  discardDraftVersion,
  StagedCourseSnapshot,
  getStudentEnrolledVersion
} from '@/lib/course-versioning';
import { getCourseSecurityPolicy } from '@/lib/content-security';
import { createNotification } from '@/lib/notification';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const reviewerUser = await getReviewerCurrentUser();
    const defaultUser = await getCurrentUser();
    const currentUser = reviewerUser || defaultUser;

    const course = await prisma.course.findFirst({
      where: {
        OR: [
          { slug: slug },
          { id: slug }
        ]
      },
      include: {
        category: true,
        instructor: true,
        sections: {
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                quiz: {
                  include: {
                    questions: true
                  }
                }
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        reviews: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const courseQuizzes = await prisma.quiz.findMany({
      where: {
        lesson: {
          section: {
            courseId: course.id
          }
        }
      },
      include: { questions: true }
    });

    const isPrivilegedViewer = Boolean(
      currentUser &&
        (currentUser.id === course.instructorId ||
          ['SUPER_ADMIN', 'ADMIN', 'LMS_ADMIN', 'SALES_ADMIN', 'REVIEWER', 'AUDITOR'].includes(currentUser.role))
    );

    // Tenant Isolation Check for Draft / In-Review / Approved (Unpublished) Courses
    if (course.status !== 'PUBLISHED') {
      if (!currentUser) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
      if (!isPrivilegedViewer && !validateTenantOwnership(course.organizationId, currentUser)) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }
    }

    let isEnrolled = false;
    let completedLessonIds: string[] = [];

    let userCertificate: any = null;
    if (currentUser) {
      const [enrollment, entitlement] = await Promise.all([
        prisma.enrollment.findFirst({
          where: {
            userId: currentUser.id,
            courseId: course.id
          }
        }),
        prisma.entitlement.findFirst({
          where: {
            userId: currentUser.id,
            courseId: course.id,
            status: 'ACTIVE'
          }
        })
      ]);

      let isEnrollmentValid =
        (!!enrollment && (enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED')) ||
        (!!entitlement && (!entitlement.expiresAt || new Date() < new Date(entitlement.expiresAt)));
      if (
        isEnrollmentValid &&
        enrollment &&
        (course as any).accessType === 'LIMITED_DAYS' &&
        (course as any).accessDays
      ) {
        const expiryDate = new Date(enrollment.enrolledAt);
        expiryDate.setDate(expiryDate.getDate() + Number((course as any).accessDays));
        if (new Date() > expiryDate) {
          isEnrollmentValid = false;
        }
      }

      isEnrolled =
        isEnrollmentValid ||
        isPrivilegedViewer ||
        currentUser.role === 'SUPER_ADMIN' ||
        (currentUser.role === 'ADMIN' && validateTenantOwnership(course.organizationId, currentUser)) ||
        course.instructorId === currentUser.id;

      if (isEnrolled) {
        const progress = await prisma.lessonProgress.findMany({
          where: {
            userId: currentUser.id,
            completed: true,
            lesson: {
              section: {
                courseId: course.id
              }
            }
          },
          select: { lessonId: true }
        });
        completedLessonIds = progress.map((p) => p.lessonId);

        const existingCert = await prisma.certificate.findUnique({
          where: {
            userId_courseId: {
              userId: currentUser.id,
              courseId: course.id
            }
          }
        });

        if (existingCert) {
          userCertificate = {
            id: existingCert.id,
            certificateNumber: existingCert.certificateNumber,
            issuedAt: existingCert.issuedAt?.toISOString(),
            status: existingCert.status,
            url: `/certificate/${existingCert.certificateNumber}`
          };
        }
      }
    }

    const securityPolicy = await getCourseSecurityPolicy(course.id);

    const avgRating =
      course.reviews.length > 0
        ? Number((course.reviews.reduce((acc, r) => acc + r.rating, 0) / course.reviews.length).toFixed(1))
        : 5.0;

    let whatYouWillLearn: string[] = [];
    let requirements: string[] = [];
    let targetAudience: string[] = [];

    try { whatYouWillLearn = JSON.parse(course.whatYouWillLearn); } catch { whatYouWillLearn = []; }
    try { requirements = JSON.parse((course as any).requirements || '[]'); } catch { requirements = []; }
    try { targetAudience = JSON.parse((course as any).targetAudience || '[]'); } catch { targetAudience = []; }

    const versionState = await getCourseVersionState(course.id);
    if (course.parentCourseId && (!versionState.originalSectionIds || versionState.originalSectionIds.length === 0)) {
      const parentVerState = await getCourseVersionState(course.parentCourseId);
      if (parentVerState.originalSectionIds && parentVerState.originalSectionIds.length > 0) {
        versionState.originalSectionIds = parentVerState.originalSectionIds;
        versionState.originalLessonIds = parentVerState.originalLessonIds;
        await saveCourseVersionState(course.id, {
          originalSectionIds: parentVerState.originalSectionIds,
          originalLessonIds: parentVerState.originalLessonIds
        });
      } else {
        const parentCourse = await prisma.course.findUnique({
          where: { id: course.parentCourseId },
          include: { sections: { include: { lessons: true }, orderBy: { order: 'asc' } } }
        });
        if (parentCourse) {
          const origSecIds: string[] = [];
          const origLesIds: string[] = [];
          parentCourse.sections.forEach((pSec) => {
            const matchSec = course.sections.find((s) => s.title === pSec.title && s.order === pSec.order) || course.sections.find((s) => s.order === pSec.order);
            if (matchSec) {
              origSecIds.push(matchSec.id);
              pSec.lessons.forEach((pLes) => {
                const matchLes = matchSec.lessons.find((l) => l.title === pLes.title && l.order === pLes.order) || matchSec.lessons.find((l) => l.order === pLes.order);
                if (matchLes) origLesIds.push(matchLes.id);
              });
            }
          });
          if (origSecIds.length > 0) {
            versionState.originalSectionIds = origSecIds;
            versionState.originalLessonIds = origLesIds;
            await saveCourseVersionState(course.id, {
              originalSectionIds: origSecIds,
              originalLessonIds: origLesIds
            });
          }
        }
      }
    }
    const liveVersionNumber = versionState.liveVersionNumber || 1;
    let studentEnrolledVersion: number | null = null;
    let hasNewerVersion = false;
    const allowedLessonIds = new Set<string>();

    if (currentUser && isEnrolled && !isPrivilegedViewer) {
      studentEnrolledVersion = await getStudentEnrolledVersion(currentUser.id, course.id);
      if (studentEnrolledVersion !== null && studentEnrolledVersion < liveVersionNumber) {
        hasNewerVersion = true;
        const targetHistory = versionState.history?.find((h) => h.versionNumber === studentEnrolledVersion);
        if (targetHistory?.lessonIds && targetHistory.lessonIds.length > 0) {
          targetHistory.lessonIds.forEach((id) => allowedLessonIds.add(id));
        } else {
          // If no explicit lessonIds recorded for student's version, allow lessons published in initial version
          const v1History = versionState.history?.find((h) => h.versionNumber === studentEnrolledVersion);
          const v1Cutoff = v1History?.publishedAt ? new Date(v1History.publishedAt).getTime() : Infinity;
          course.sections.forEach((s) => {
            s.lessons.forEach((l) => {
              if (new Date(l.createdAt).getTime() <= v1Cutoff) {
                allowedLessonIds.add(l.id);
              }
            });
          });
        }
      }
    }

    const formattedCourse = {
      id: course.id,
      slug: course.slug,
      organizationId: course.organizationId,
      title: course.title,
      subtitle: course.shortDescription || '',
      description: course.description,
      price: course.price,
      originalPrice: course.discountPrice || undefined,
      currency: (course as any).currency || 'INR',
      category: course.category.name,
      categoryId: course.categoryId,
      level: course.level,
      thumbnail: course.thumbnail && course.thumbnail.trim() ? course.thumbnail.trim() : null,
      banner: (course as any).banner && (course as any).banner.trim() ? (course as any).banner.trim() : null,
      rating: avgRating,
      reviewsCount: course._count.reviews || course.reviews.length || 0,
      studentsCount: course._count.enrollments || 0,
      durationHours: course.durationHours,
      language: course.language,
      subtitles: ['English', 'Hindi'],
      bestseller: course.bestseller,
      isNew: course.isNew,
      status: course.status,
      parentCourseId: (course as any).parentCourseId || null,
      versionNumber: (course as any).versionNumber || 1,
      versionLabel: (course as any).versionLabel || `v${(course as any).versionNumber || 1}.0`,
      accessType: (course as any).accessType || 'LIFETIME',
      accessDays: (course as any).accessDays || null,
      seoTitle: (course as any).seoTitle || null,
      seoDescription: (course as any).seoDescription || null,
      whatYouWillLearn,
      requirements,
      targetAudience,
      userVersionInfo: {
        enrolledVersion: studentEnrolledVersion,
        enrolledVersionLabel: studentEnrolledVersion ? `v${studentEnrolledVersion}.0` : null,
        liveVersion: liveVersionNumber,
        liveVersionLabel: versionState.liveVersionLabel || `v${liveVersionNumber}.0`,
        hasUpdateAvailable: hasNewerVersion,
        upgradePrice: course.price
      },
      instructor: {
        id: course.instructor.id,
        name: course.instructor.name,
        title: course.instructor.bio || 'Lead Instructor & Systems Architect',
        avatar: course.instructor.avatar && course.instructor.avatar.trim() ? course.instructor.avatar.trim() : null
      },
      sections: course.sections.map((sec, secIdx) => ({
        id: sec.id,
        title: sec.title,
        description: sec.description || '',
        order: sec.order,
        moduleNumber: secIdx + 1,
        lessons: sec.lessons.map((les) => {
          const isBelongsToStudentVersion = !hasNewerVersion || allowedLessonIds.has(les.id);
          const isVersionLocked = isEnrolled && !isPrivilegedViewer && hasNewerVersion && !isBelongsToStudentVersion;
          const isLocked = (!isEnrolled && !les.isFree) || isVersionLocked;
          const canSeeMediaUrls = isPrivilegedViewer || (!isLocked && !isVersionLocked);
          const rawVideo = les.videoUrl && !les.videoUrl.startsWith('blob:') ? les.videoUrl : null;
          let effectiveType = (les as any).type || 'VIDEO';

          // Intelligent type detection if default was VIDEO but other media was created
          if (effectiveType === 'VIDEO' && !rawVideo) {
            if ((les as any).quizData) {
              try {
                const q = typeof (les as any).quizData === 'string' ? JSON.parse((les as any).quizData) : (les as any).quizData;
                if (Array.isArray(q?.questions) && q.questions.length > 0) effectiveType = 'QUIZ';
              } catch {}
            }
            if (effectiveType === 'VIDEO' && (les as any).content && (les as any).content.trim().length > 0) {
              effectiveType = 'TEXT';
            } else if (effectiveType === 'VIDEO' && (les as any).pdfUrl) {
              effectiveType = 'PDF';
            }
          }

          return {
            id: les.id,
            title: les.title,
            description: les.description || '',
            duration: les.duration,
            durationSeconds: les.durationSeconds,
            type: effectiveType,
            content: canSeeMediaUrls ? (les as any).content || null : null,
            // If privileged (Instructor/Admin in Builder), return raw URLs so they can edit; for students, only return if unlocked
            videoUrl: isPrivilegedViewer
              ? rawVideo
              : canSeeMediaUrls && !securityPolicy.signedUrlEnabled
              ? rawVideo
              : canSeeMediaUrls
              ? rawVideo
              : null,
            pdfUrl: isPrivilegedViewer
              ? (les as any).pdfUrl || null
              : canSeeMediaUrls
              ? (les as any).pdfUrl || null
              : null,
            fileUrl: isPrivilegedViewer
              ? (les as any).fileUrl || null
              : canSeeMediaUrls && (securityPolicy.allowResourceDownload || (les as any).allowDownload)
              ? (les as any).fileUrl || null
              : null,
            allowDownload: Boolean((les as any).allowDownload && securityPolicy.allowResourceDownload),
            quizData: canSeeMediaUrls ? (les as any).quizData || null : null,
            subLessons: (() => {
              try {
                const parsed = JSON.parse((les as any).resources || '[]');
                return Array.isArray(parsed) ? parsed : parsed?.subLessons || [];
              } catch {
                return [];
              }
            })(),
            resourcesList: canSeeMediaUrls ? (() => {
              try {
                const parsed = JSON.parse((les as any).resources || '[]');
                return Array.isArray(parsed?.resourcesList) ? parsed.resourcesList : undefined;
              } catch {
                return undefined;
              }
            })() : null,
            videoFileName: (() => {
              try {
                const parsed = JSON.parse((les as any).resources || '[]');
                return (les as any).videoFileName || (!Array.isArray(parsed) && parsed?.videoFileName) || undefined;
              } catch {
                return undefined;
              }
            })(),
            resourceFileName: (() => {
              try {
                const parsed = JSON.parse((les as any).resources || '[]');
                return (les as any).resourceFileName || (!Array.isArray(parsed) && parsed?.resourceFileName) || undefined;
              } catch {
                return undefined;
              }
            })(),
            completed: completedLessonIds.includes(les.id),
            locked: isLocked,
            versionLocked: isVersionLocked,
            requiredVersion: isVersionLocked ? liveVersionNumber : undefined,
            requiredVersionLabel: isVersionLocked ? (versionState.liveVersionLabel || `v${liveVersionNumber}.0`) : undefined,
            isFree: les.isFree,
            isFinalAssignment: Boolean((les as any).isFinalAssignment || (effectiveType === 'QUIZ' && /final\s+assignment/i.test(les.title || ''))),
            isPublished: (les as any).isPublished ?? true,
            order: les.order
          };
        })
      })),
      quizzes: courseQuizzes,
      reviews: course.reviews.map((r) => ({
        id: r.id,
        user: {
          id: r.user.id,
          name: r.user.name,
          avatar: r.user.avatar
        },
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt.toISOString()
      }))
    };

    const { searchParams } = new URL(request.url);
    const wantStaged = searchParams.get('version') === 'staged';

    let finalFormattedCourse: any = {
      ...formattedCourse,
      isEnrolled: isEnrolled && !hasNewerVersion,
      hasEnrolledPreviousVersion: hasNewerVersion,
      securityPolicy,
      versionState
    };

    if (
      (course.status === 'PUBLISHED' || course.status === 'ARCHIVED' || course.status === 'INACTIVE') &&
      versionState.stagedSnapshot &&
      currentUser &&
      (currentUser.id === course.instructorId ||
        ['REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) &&
      (wantStaged || currentUser.id === course.instructorId)
    ) {
      const snap = versionState.stagedSnapshot;
      finalFormattedCourse = {
        ...finalFormattedCourse,
        title: snap.title ?? finalFormattedCourse.title,
        description: snap.description ?? finalFormattedCourse.description,
        subtitle: snap.shortDescription ?? finalFormattedCourse.subtitle,
        price: snap.price ?? finalFormattedCourse.price,
        originalPrice: snap.discountPrice ?? finalFormattedCourse.originalPrice,
        whatYouWillLearn: snap.whatYouWillLearn ?? finalFormattedCourse.whatYouWillLearn,
        requirements: snap.requirements ?? finalFormattedCourse.requirements,
        targetAudience: snap.targetAudience ?? finalFormattedCourse.targetAudience,
        sections: snap.sections ?? finalFormattedCourse.sections
      };
    }

    return NextResponse.json({
      course: finalFormattedCourse,
      versionState,
      isEnrolled: isEnrolled && !hasNewerVersion,
      hasEnrolledPreviousVersion: hasNewerVersion,
      completedLessonIds,
      certificate: userCertificate
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    let user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }

    if (user.role === 'STUDENT') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'INSTRUCTOR', platform: 'LMS' }
      }).catch(() => {});
      user = { ...user, role: 'INSTRUCTOR' };
    }

    if (!['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Access denied: Insufficient privileges to update courses.' },
        { status: 403 }
      );
    }
    
    let body: any = {};
    try {
      body = await request.json();
    } catch (err: any) {
      console.warn('PUT /api/courses/[slug] - Failed to parse request JSON:', err?.message);
      return NextResponse.json(
        { error: 'Payload too large or malformed. Please ensure large media files are uploaded via the media studio.' },
        { status: 413 }
      );
    }

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      },
      include: {
        sections: {
          include: { lessons: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Tenant Isolation Check
    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to modify courses outside your organization.' },
        { status: 403 }
      );
    }

    if (user.role === 'INSTRUCTOR' && course.instructorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only modify courses authored by your account.' },
        { status: 403 }
      );
    }

    // Resolve category if categoryId or category name is provided
    let categoryId = body.categoryId;
    if (!categoryId && body.category) {
      const cat = await prisma.category.findFirst({
        where: {
          organizationId: user.organizationId || null,
          OR: [{ name: body.category }, { slug: body.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') }]
        }
      });
      if (cat) {
        categoryId = cat.id;
      } else {
        const newCat = await prisma.category.create({
          data: {
            organizationId: user.organizationId || null,
            name: body.category.trim(),
            slug: `${body.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
          }
        });
        categoryId = newCat.id;
      }
    }

    // ============================================================================
    // PUBLISHED COURSE VERSION PROTECTION (Major vs Minor Change Separation)
    // ============================================================================
    const isSubmittingForReview = Boolean(
      body.submitForApproval ||
      body.submitVersionForReview ||
      body.status === 'IN_REVIEW'
    );

    if (course.status === 'PUBLISHED' && !body.forceDirectAdminOverride) {
      const classification = classifyCourseChanges(course, body);

      if (classification.hasMajorChanges) {
        // Any change set with major or uncertain changes MUST be staged into a draft snapshot.
        // The live published course remains completely untouched!
        const currentVer = await getCourseVersionState(course.id);
        const nextVerNum = currentVer.pendingVersionNumber || ((currentVer.liveVersionNumber || 1) + 1);
        const nextVerLabel = currentVer.pendingVersionLabel || `v${nextVerNum}.0`;

        const stagedSnapshot: StagedCourseSnapshot = {
          title: body.title !== undefined ? body.title.trim() : course.title,
          description: body.description !== undefined ? body.description : course.description,
          shortDescription: body.shortDescription !== undefined ? body.shortDescription : (course.shortDescription || ''),
          price: body.price !== undefined ? Number(body.price) : course.price,
          discountPrice: body.discountPrice !== undefined ? (body.discountPrice ? Number(body.discountPrice) : null) : course.discountPrice,
          currency: body.currency || course.currency,
          level: body.level || course.level,
          language: body.language || course.language,
          durationHours: body.durationHours !== undefined ? Number(body.durationHours) : course.durationHours,
          thumbnail: body.thumbnail !== undefined ? body.thumbnail : course.thumbnail,
          banner: body.banner !== undefined ? body.banner : (course.banner || ''),
          accessType: body.accessType || course.accessType,
          accessDays: body.accessDays !== undefined ? (body.accessDays ? Number(body.accessDays) : null) : course.accessDays,
          whatYouWillLearn: Array.isArray(body.whatYouWillLearn) ? body.whatYouWillLearn : undefined,
          requirements: Array.isArray(body.requirements) ? body.requirements : undefined,
          targetAudience: Array.isArray(body.targetAudience) ? body.targetAudience : undefined,
          seoTitle: body.seoTitle !== undefined ? body.seoTitle : (course.seoTitle || ''),
          seoDescription: body.seoDescription !== undefined ? body.seoDescription : (course.seoDescription || ''),
          sections: Array.isArray(body.sections)
            ? body.sections
            : course.sections.map((s) => ({
                id: s.id,
                title: s.title,
                description: s.description || '',
                order: s.order,
                lessons: s.lessons.map((l) => ({
                  id: l.id,
                  title: l.title,
                  description: l.description || '',
                  type: l.type,
                  content: l.content,
                  videoUrl: l.videoUrl,
                  pdfUrl: l.pdfUrl,
                  fileUrl: l.fileUrl,
                  quizData: l.quizData,
                  duration: l.duration,
                  durationSeconds: l.durationSeconds,
                  isFree: l.isFree,
                  isFinalAssignment: Boolean((l as any).isFinalAssignment || (l.type === 'QUIZ' && /final\s+assignment/i.test(l.title || ''))),
                  isPublished: l.isPublished,
                  order: l.order
                }))
              }))
        };

        const targetVersionStatus = isSubmittingForReview ? 'PENDING_REVIEW' : 'DRAFT_VERSION';

        const updatedVersionState = await saveCourseVersionState(course.id, {
          pendingVersionNumber: nextVerNum,
          pendingVersionLabel: nextVerLabel,
          status: targetVersionStatus,
          detectedChanges: [...classification.majorChanges, ...classification.minorChanges],
          stagedSnapshot,
          submittedAt: isSubmittingForReview ? new Date().toISOString() : currentVer.submittedAt,
          submittedBy: isSubmittingForReview ? user.name : (currentVer.submittedBy || user.name)
        });

        if (isSubmittingForReview) {
          const auditors = await prisma.user.findMany({
            where: {
              role: { in: ['REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'] },
              status: 'ACTIVE'
            },
            select: { id: true }
          });
          for (const aud of auditors) {
            if (aud.id !== user.id) {
              await createNotification({
                organizationId: course.organizationId,
                userId: aud.id,
                title: `🛡️ Course Updates (${nextVerLabel}) Submitted for Review`,
                message: `${user.name} submitted updates on published course "${course.title}" for review.`,
                type: 'COURSES',
                category: 'COURSES',
                link: `/reviewer/courses/${course.id}`
              });
            }
          }

          await prisma.auditLog.create({
            data: {
              organizationId: course.organizationId,
              adminId: user.id,
              adminEmail: user.email,
              action: 'SUBMIT_COURSE_UPDATES_FOR_REVIEW',
              entity: 'Course',
              entityId: course.id,
              description: `${user.role} "${user.name}" submitted course updates (${classification.majorChanges.map((m) => m.summary).join('; ') || 'curriculum edits'}) for Auditor review.`
            }
          });

          return NextResponse.json({
            success: true,
            isVersionDraft: true,
            status: 'PENDING_REVIEW',
            versionLabel: nextVerLabel,
            message: `Major updates for Version ${nextVerLabel} submitted to Course Auditor! The live published version remains accessible to students while review is pending.`,
            course: { ...course, ...stagedSnapshot },
            versionState: updatedVersionState
          });
        }

        // Saving draft version
        await prisma.auditLog.create({
          data: {
            organizationId: course.organizationId,
            adminId: user.id,
            adminEmail: user.email,
            action: 'SAVE_COURSE_VERSION_DRAFT',
            entity: 'Course',
            entityId: course.id,
            description: `${user.role} "${user.name}" saved draft Version ${nextVerLabel} without mutating the live course.`
          }
        });

        return NextResponse.json({
          success: true,
          isVersionDraft: true,
          status: 'DRAFT_VERSION',
          versionLabel: nextVerLabel,
          message: `Saved updates into Draft Version ${nextVerLabel}. The live published version remains active and untouched.`,
          course: { ...course, ...stagedSnapshot },
          versionState: updatedVersionState
        });
      } else {
        // Purely MINOR changes: Auto-publish immediately to the live course!
        const updatedLiveCourse = await applyMinorUpdateToLiveCourse(
          course.id,
          body,
          { id: user.id, name: user.name, role: user.role },
          classification.minorChanges
        );

        return NextResponse.json({
          success: true,
          isMinorUpdate: true,
          status: 'PUBLISHED',
          message: `Minor updates (typos/formatting/visual assets) automatically published live!`,
          course: updatedLiveCourse
        });
      }
    }

    let newSlug: string | undefined = undefined;
    if (body.slug && typeof body.slug === 'string' && body.slug.trim() && body.slug !== course.slug) {
      const cleanSlug = body.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (cleanSlug) {
        const existingWithSlug = await prisma.course.findFirst({
          where: {
            organizationId: course.organizationId,
            slug: cleanSlug,
            id: { not: course.id }
          }
        });
        if (!existingWithSlug) {
          newSlug = cleanSlug;
        }
      }
    }

    const isChildVersionDraft = Boolean(course.parentCourseId);
    let originalSecIdsSet = new Set<string>();
    let originalLesIdsSet = new Set<string>();

    if (isChildVersionDraft) {
      const vState = await getCourseVersionState(course.id);
      (vState.originalSectionIds || []).forEach((id) => originalSecIdsSet.add(id));
      (vState.originalLessonIds || []).forEach((id) => originalLesIdsSet.add(id));
    }

    const courseUpdateData = isChildVersionDraft
      ? {
          // Locked in child version draft: title, thumbnail, shortDescription, description, level, language, durationHours, category, seo
          price: body.price !== undefined ? Number(body.price) : undefined,
          discountPrice: body.discountPrice !== undefined ? (body.discountPrice ? Number(body.discountPrice) : null) : undefined,
          currency: body.currency !== undefined ? body.currency : undefined,
          status: body.status !== undefined ? body.status : undefined,
          reviewFeedback: body.status === 'IN_REVIEW' ? null : undefined,
          accessType: body.accessType !== undefined ? body.accessType : undefined,
          accessDays: body.accessDays !== undefined ? (body.accessDays ? Number(body.accessDays) : null) : undefined
        }
      : {
          title: body.title !== undefined ? body.title.trim() : undefined,
          slug: newSlug || undefined,
          description: body.description !== undefined ? body.description : undefined,
          shortDescription: body.shortDescription !== undefined ? body.shortDescription : undefined,
          price: body.price !== undefined ? Number(body.price) : undefined,
          discountPrice: body.discountPrice !== undefined ? (body.discountPrice ? Number(body.discountPrice) : null) : undefined,
          currency: body.currency !== undefined ? body.currency : undefined,
          thumbnail: body.thumbnail !== undefined ? body.thumbnail : undefined,
          banner: body.banner !== undefined ? body.banner : undefined,
          status: body.status !== undefined ? body.status : undefined,
          reviewFeedback: body.status === 'IN_REVIEW' ? null : undefined,
          level: body.level !== undefined ? body.level : undefined,
          language: body.language !== undefined ? body.language : undefined,
          durationHours: body.durationHours !== undefined ? Number(body.durationHours) : undefined,
          categoryId: categoryId || undefined,
          whatYouWillLearn: body.whatYouWillLearn ? JSON.stringify(body.whatYouWillLearn) : undefined,
          requirements: body.requirements ? JSON.stringify(body.requirements) : undefined,
          targetAudience: body.targetAudience ? JSON.stringify(body.targetAudience) : undefined,
          seoTitle: body.seoTitle !== undefined ? body.seoTitle : undefined,
          seoDescription: body.seoDescription !== undefined ? body.seoDescription : undefined,
          accessType: body.accessType !== undefined ? body.accessType : undefined,
          accessDays: body.accessDays !== undefined ? (body.accessDays ? Number(body.accessDays) : null) : undefined
        };

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: courseUpdateData
    });

    // Synchronize Curriculum Sections and Lessons if provided
    if (body.sections && Array.isArray(body.sections)) {
      const incomingSectionIds: string[] = [];

      for (let sIdx = 0; sIdx < body.sections.length; sIdx++) {
        const secData = body.sections[sIdx];
        let section = course.sections.find((s) => s.id === secData.id);

        if (section) {
          const isOrigSec = isChildVersionDraft && originalSecIdsSet.has(section.id);
          section = await prisma.courseSection.update({
            where: { id: section.id },
            data: {
              title: isOrigSec ? section.title : (secData.title || `Module ${sIdx + 1}`),
              description: isOrigSec ? section.description : (secData.description !== undefined ? secData.description : undefined),
              order: secData.order || sIdx + 1
            },
            include: { lessons: true }
          });
        } else {
          section = await prisma.courseSection.create({
            data: {
              courseId: course.id,
              title: secData.title || `Module ${sIdx + 1}`,
              description: secData.description || null,
              order: secData.order || sIdx + 1
            },
            include: { lessons: true }
          });
        }
        incomingSectionIds.push(section.id);

        if (secData.lessons && Array.isArray(secData.lessons)) {
          const incomingLessonIds: string[] = [];

          for (let lIdx = 0; lIdx < secData.lessons.length; lIdx++) {
            const lesData = secData.lessons[lIdx];
            const quizDataStr =
              typeof lesData.quizData === 'object' && lesData.quizData !== null
                ? JSON.stringify(lesData.quizData)
                : typeof lesData.quizData === 'string'
                ? lesData.quizData
                : null;

            const existingLesson = (section.lessons || []).find((l) => l.id === lesData.id);

            let existingResourcesObj: any = null;
            if (existingLesson?.resources) {
              try { existingResourcesObj = JSON.parse(existingLesson.resources); } catch {}
            }
            const subLessonsList = Array.isArray(lesData.subLessons)
              ? lesData.subLessons
              : (Array.isArray(existingResourcesObj) ? existingResourcesObj : existingResourcesObj?.subLessons || []);
            const videoFileName = lesData.videoFileName || (!Array.isArray(existingResourcesObj) && existingResourcesObj?.videoFileName) || undefined;
            const resourceFileName = lesData.resourceFileName || (!Array.isArray(existingResourcesObj) && existingResourcesObj?.resourceFileName) || undefined;

            const resourcesList = Array.isArray(lesData.resourcesList)
              ? lesData.resourcesList
              : (!Array.isArray(existingResourcesObj) && Array.isArray(existingResourcesObj?.resourcesList))
              ? existingResourcesObj.resourcesList
              : undefined;

            const subLessonsStr = JSON.stringify({
              subLessons: subLessonsList,
              videoFileName,
              resourceFileName,
              resourcesList
            });

            // Clean URLs: ignore blob URLs and ignore bulky data: URLs (prevent payload bloat)
            let cleanVideoUrl =
              lesData.videoUrl &&
              !lesData.videoUrl.startsWith('blob:') &&
              !lesData.videoUrl.startsWith('data:')
                ? lesData.videoUrl
                : null;

            // Preserve existing DB video if incoming payload didn't provide one, unless explicitly instructed to clear
            if (!cleanVideoUrl && existingLesson?.videoUrl && !lesData.clearVideo && !lesData.removeVideo) {
              cleanVideoUrl = existingLesson.videoUrl;
            }

            let cleanPdfUrl =
              lesData.pdfUrl &&
              !lesData.pdfUrl.startsWith('blob:') &&
              !lesData.pdfUrl.startsWith('data:')
                ? lesData.pdfUrl
                : null;
            if (!cleanPdfUrl && existingLesson?.pdfUrl && !lesData.clearPdf && !lesData.removePdf) {
              cleanPdfUrl = existingLesson.pdfUrl;
            }

            let cleanFileUrl =
              lesData.fileUrl &&
              !lesData.fileUrl.startsWith('blob:') &&
              !lesData.fileUrl.startsWith('data:')
                ? lesData.fileUrl
                : null;
            if (!cleanFileUrl && existingLesson?.fileUrl && !lesData.clearFile && !lesData.removeFile) {
              cleanFileUrl = existingLesson.fileUrl;
            }

            let lesType = lesData.type || 'VIDEO';
            if (!lesData.type) {
              if (quizDataStr) {
                try {
                  const q = JSON.parse(quizDataStr);
                  if (Array.isArray(q?.questions) && q.questions.length > 0) lesType = 'QUIZ';
                } catch {}
              } else if (cleanVideoUrl) {
                lesType = 'VIDEO';
              } else if (cleanPdfUrl) {
                lesType = 'PDF';
              } else if (lesData.content && lesData.content.trim().length > 0) {
                lesType = 'TEXT';
              }
            }

            if (existingLesson) {
              const isOrigLes = isChildVersionDraft && originalLesIdsSet.has(existingLesson.id);
              const updatedLesson = await prisma.lesson.update({
                where: { id: existingLesson.id },
                data: {
                  title: isOrigLes ? existingLesson.title : (lesData.title !== undefined ? lesData.title : existingLesson.title),
                  description: isOrigLes ? existingLesson.description : (lesData.description !== undefined ? lesData.description : undefined),
                  type: isOrigLes ? existingLesson.type : lesType,
                  content: isOrigLes ? existingLesson.content : (lesData.content !== undefined ? lesData.content : undefined),
                  videoUrl: isOrigLes ? existingLesson.videoUrl : (cleanVideoUrl !== undefined ? cleanVideoUrl : (lesData.clearVideo ? null : existingLesson.videoUrl)),
                  pdfUrl: isOrigLes ? existingLesson.pdfUrl : (cleanPdfUrl !== undefined ? cleanPdfUrl : undefined),
                  fileUrl: isOrigLes ? existingLesson.fileUrl : (cleanFileUrl !== undefined ? cleanFileUrl : undefined),
                  quizData: isOrigLes ? existingLesson.quizData : quizDataStr,
                  resources: isOrigLes ? existingLesson.resources : subLessonsStr,
                  duration: isOrigLes ? existingLesson.duration : (lesData.duration || existingLesson.duration || '10:00'),
                  durationSeconds: isOrigLes ? existingLesson.durationSeconds : (lesData.durationSeconds || existingLesson.durationSeconds || 600),
                  isFree: lesData.isFree !== undefined ? !!lesData.isFree : undefined,
                  isPublished: lesData.isPublished !== undefined ? lesData.isPublished : undefined,
                  order: lesData.order || lIdx + 1
                }
              });
              incomingLessonIds.push(updatedLesson.id);
            } else {
              const newLesson = await prisma.lesson.create({
                data: {
                  sectionId: section.id,
                  title: lesData.title !== undefined ? lesData.title : `Lesson ${lIdx + 1}`,
                  description: lesData.description || null,
                  type: lesType,
                  content: lesData.content || null,
                  videoUrl: cleanVideoUrl || null,
                  pdfUrl: cleanPdfUrl || null,
                  fileUrl: cleanFileUrl || null,
                  quizData: quizDataStr,
                  resources: subLessonsStr || '[]',
                  duration: lesData.duration || '10:00',
                  durationSeconds: lesData.durationSeconds || 600,
                  isFree: !!lesData.isFree,
                  isPublished: lesData.isPublished !== false,
                  order: lesData.order || lIdx + 1
                }
              });
              incomingLessonIds.push(newLesson.id);
            }
          }

          const lessonsToDelete = (section.lessons || []).filter(
            (l) => !incomingLessonIds.includes(l.id) && (!isChildVersionDraft || !originalLesIdsSet.has(l.id))
          );
          for (const lToDel of lessonsToDelete) {
            await prisma.lesson.delete({ where: { id: lToDel.id } }).catch(() => {});
          }
        }
      }

      const sectionsToDelete = course.sections.filter(
        (s) => !incomingSectionIds.includes(s.id) && (!isChildVersionDraft || !originalSecIdsSet.has(s.id))
      );
      for (const sToDel of sectionsToDelete) {
        await prisma.courseSection.delete({ where: { id: sToDel.id } }).catch(() => {});
      }
    }

    if (isChildVersionDraft && isSubmittingForReview) {
      const auditors = await prisma.user.findMany({
        where: {
          role: { in: ['REVIEWER', 'ADMIN', 'LMS_ADMIN', 'SUPER_ADMIN'] },
          status: 'ACTIVE'
        },
        select: { id: true }
      });
      for (const aud of auditors) {
        if (aud.id !== user.id) {
          await createNotification({
            organizationId: course.organizationId,
            userId: aud.id,
            title: `🛡️ Course Version (${course.versionLabel || 'v2.0'}) Submitted for Review`,
            message: `${user.name} submitted draft version ${course.versionLabel || 'v2.0'} of course "${course.title}".`,
            type: 'COURSES',
            category: 'COURSES',
            link: `/reviewer/courses/${course.id}`
          });
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        organizationId: course.organizationId,
        adminId: user.id,
        adminEmail: user.email,
        action: 'UPDATE_COURSE',
        entity: 'Course',
        entityId: course.id,
        description: `${user.role} updated course "${updated.title}" (Status: ${updated.status}).`
      }
    });

    const fullyUpdatedCourse = await prisma.course.findUnique({
      where: { id: course.id },
      include: {
        category: true,
        instructor: true,
        sections: {
          include: { lessons: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' }
        }
      }
    });

    return NextResponse.json({
      course: fullyUpdatedCourse || updated,
      message: 'Course updated successfully.'
    });
  } catch (err: any) {
    return handleAuthError(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await requireTenantRole(['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN']);

    const course = await prisma.course.findFirst({
      where: {
        OR: [{ slug }, { id: slug }]
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Tenant Isolation Check
    if (!validateTenantOwnership(course.organizationId, user)) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete courses outside your organization.' },
        { status: 403 }
      );
    }

    if (user.role === 'INSTRUCTOR') {
      if (course.instructorId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You can only delete courses authored by your account.' },
          { status: 403 }
        );
      }
      if (course.status === 'PUBLISHED' || course.status === 'APPROVED') {
        return NextResponse.json(
          { error: 'Action not allowed: Instructors cannot delete live published courses. Published courses can be deactivated instead.' },
          { status: 403 }
        );
      }
    }

    // Safely decouple/cleanup relations that don't cascade automatically
    await prisma.order.updateMany({
      where: { courseId: course.id },
      data: { courseId: null }
    }).catch(() => {});

    await prisma.certificate.deleteMany({
      where: { courseId: course.id }
    }).catch(() => {});

    await prisma.enrollment.deleteMany({
      where: { courseId: course.id }
    }).catch(() => {});

    await prisma.lessonProgress.deleteMany({
      where: { lesson: { section: { courseId: course.id } } }
    }).catch(() => {});

    await prisma.courseSection.deleteMany({
      where: { courseId: course.id }
    }).catch(() => {});

    await prisma.course.delete({
      where: { id: course.id }
    });

    await prisma.platformSetting.delete({
      where: { key: `course_version_${course.id}` }
    }).catch(() => {});

    // If this was a child draft version, also reset parent course's version state to LIVE_SYNCED
    if (course.parentCourseId) {
      await discardDraftVersion(course.parentCourseId, {
        id: user.id,
        name: user.name,
        role: user.role
      }).catch(() => {});
    }

    await prisma.auditLog.create({
      data: {
        organizationId: course.organizationId,
        adminId: user.id,
        adminEmail: user.email,
        action: 'DELETE_COURSE',
        entity: 'Course',
        entityId: course.id,
        description: `${user.role} deleted course "${course.title}".`
      }
    });

    return NextResponse.json({ message: 'Course deleted successfully.' });
  } catch (err: any) {
    return handleAuthError(err);
  }
}
