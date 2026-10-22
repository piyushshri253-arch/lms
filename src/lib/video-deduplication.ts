import { prisma } from './prisma';

/**
 * Whitelist of standard public dummy/sample placeholder videos (e.g. used during database seeding)
 * These generic demo videos are excluded from duplicate blocking so pre-seeded demo courses do not conflict.
 */
export const DUMMY_SAMPLE_VIDEOS = new Set([
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/bigbuckbunny.mp4',
  'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/bigbuckbunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/elephantsdream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/forbiggerblazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/wearegoingonbullrun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/whatcarcanyougetforagrand.mp4'
]);

/**
 * Checks whether a video URL is a dummy placeholder, local temporary preview, or empty string.
 */
export function isPlaceholderOrSampleVideo(url: string | null | undefined): boolean {
  if (!url) return true;
  const clean = url.trim().toLowerCase();
  if (!clean) return true;
  if (clean.startsWith('blob:') || clean.startsWith('data:') || clean === '#' || clean === 'about:blank') {
    return true;
  }
  if (DUMMY_SAMPLE_VIDEOS.has(clean)) {
    return true;
  }
  return false;
}

/**
 * Normalizes a video URL for consistent deduplication comparisons.
 */
export function normalizeVideoUrl(url: string | null | undefined): string {
  if (!url) return '';
  let clean = url.trim();
  // Strip trailing slash if present
  clean = clean.replace(/\/+$/, '');
  return clean;
}

export interface VideoUsageLocation {
  sectionTitle: string;
  lessonTitle: string;
  lessonId?: string;
}

export interface CrossCourseCollision {
  videoUrl: string;
  incomingLessonTitle: string;
  incomingSectionTitle: string;
  existingCourseId: string;
  existingCourseTitle: string;
  existingSectionTitle: string;
  existingLessonTitle: string;
  existingInstructorName?: string;
}

/**
 * Checks for duplicate video URLs WITHIN the same course payload (intra-course duplicate check).
 * Ensures an instructor doesn't assign the same video URL to multiple lectures in the same course.
 */
export function checkIntraPayloadVideoDuplicates(sections: any[]): {
  hasDuplicate: boolean;
  error?: string;
  duplicates: Array<{ url: string; lessons: VideoUsageLocation[] }>;
} {
  if (!Array.isArray(sections) || sections.length === 0) {
    return { hasDuplicate: false, duplicates: [] };
  }

  const urlMap = new Map<string, VideoUsageLocation[]>();

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];
    const secTitle = sec.title || `Module ${sIdx + 1}`;
    const lessons = Array.isArray(sec.lessons) ? sec.lessons : [];

    for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
      const les = lessons[lIdx];
      const rawUrl = les.videoUrl;
      if (isPlaceholderOrSampleVideo(rawUrl)) continue;

      const normUrl = normalizeVideoUrl(rawUrl).toLowerCase();
      const location: VideoUsageLocation = {
        sectionTitle: secTitle,
        lessonTitle: les.title || `Lecture ${lIdx + 1}`,
        lessonId: les.id
      };

      const existing = urlMap.get(normUrl) || [];
      existing.push(location);
      urlMap.set(normUrl, existing);
    }
  }

  const duplicates: Array<{ url: string; lessons: VideoUsageLocation[] }> = [];

  for (const [normUrl, locations] of urlMap.entries()) {
    if (locations.length > 1) {
      duplicates.push({ url: normUrl, lessons: locations });
    }
  }

  if (duplicates.length > 0) {
    const firstDup = duplicates[0];
    const lesList = firstDup.lessons
      .map((loc) => `"${loc.lessonTitle}" (${loc.sectionTitle})`)
      .join(' and ');

    return {
      hasDuplicate: true,
      error: `Duplicate Video in Course: The same video URL is assigned to multiple lectures: ${lesList}. Each lecture within the course must have its own unique video content.`,
      duplicates
    };
  }

  return { hasDuplicate: false, duplicates: [] };
}

/**
 * Queries the database to find any existing courses (excluding `excludeCourseId`)
 * that already use any of the provided video URLs.
 */
export async function findCrossCourseVideoCollisions(
  videoEntries: Array<{ url: string; sectionTitle: string; lessonTitle: string }>,
  excludeCourseId?: string
): Promise<CrossCourseCollision[]> {
  if (!videoEntries || videoEntries.length === 0) {
    return [];
  }

  // Filter out placeholder and empty URLs
  const candidateEntries = videoEntries.filter((e) => !isPlaceholderOrSampleVideo(e.url));
  if (candidateEntries.length === 0) {
    return [];
  }

  // Map normalized URLs to their incoming entry locations
  const urlToIncomingMap = new Map<string, { sectionTitle: string; lessonTitle: string; originalUrl: string }>();
  for (const item of candidateEntries) {
    const norm = normalizeVideoUrl(item.url);
    urlToIncomingMap.set(norm.toLowerCase(), {
      sectionTitle: item.sectionTitle,
      lessonTitle: item.lessonTitle,
      originalUrl: item.url
    });
  }

  const searchUrls = Array.from(new Set(candidateEntries.map((e) => normalizeVideoUrl(e.url))));

  // Search DB for any lesson using these URLs in another course
  const matchingLessons = await prisma.lesson.findMany({
    where: {
      videoUrl: { in: searchUrls },
      ...(excludeCourseId
        ? {
            section: {
              courseId: { not: excludeCourseId }
            }
          }
        : {})
    },
    select: {
      id: true,
      title: true,
      videoUrl: true,
      section: {
        select: {
          id: true,
          title: true,
          courseId: true,
          course: {
            select: {
              id: true,
              title: true,
              instructor: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  const collisions: CrossCourseCollision[] = [];

  for (const match of matchingLessons) {
    if (!match.videoUrl) continue;
    const norm = normalizeVideoUrl(match.videoUrl).toLowerCase();
    const incoming = urlToIncomingMap.get(norm);

    if (incoming) {
      collisions.push({
        videoUrl: match.videoUrl,
        incomingLessonTitle: incoming.lessonTitle,
        incomingSectionTitle: incoming.sectionTitle,
        existingCourseId: match.section.course.id,
        existingCourseTitle: match.section.course.title,
        existingSectionTitle: match.section.title,
        existingLessonTitle: match.title,
        existingInstructorName: match.section.course.instructor?.name || 'Instructor'
      });
    }
  }

  return collisions;
}

/**
 * Validates course sections/lessons for both:
 * 1. Intra-course duplicate videos (multiple lectures in same course having identical video)
 * 2. Cross-course duplicate videos (reusing videos from other existing courses)
 *
 * @param sections Curriculum sections containing lessons
 * @param excludeCourseId Optional ID of course being edited (to allow retaining existing videos on the same course)
 */
export async function validateVideoUniquenessForCourse(
  sections: any[],
  excludeCourseId?: string
): Promise<{
  isValid: boolean;
  error?: string;
  collisions: CrossCourseCollision[];
  intraDuplicates: Array<{ url: string; lessons: VideoUsageLocation[] }>;
}> {
  // 1. Check intra-course duplicates
  const intraCheck = checkIntraPayloadVideoDuplicates(sections);
  if (intraCheck.hasDuplicate) {
    return {
      isValid: false,
      error: intraCheck.error,
      collisions: [],
      intraDuplicates: intraCheck.duplicates
    };
  }

  // 2. Extract non-empty candidate video URLs
  const videoEntries: Array<{ url: string; sectionTitle: string; lessonTitle: string }> = [];

  if (Array.isArray(sections)) {
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const sec = sections[sIdx];
      const secTitle = sec.title || `Module ${sIdx + 1}`;
      const lessons = Array.isArray(sec.lessons) ? sec.lessons : [];

      for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
        const les = lessons[lIdx];
        if (les.videoUrl && typeof les.videoUrl === 'string' && les.videoUrl.trim()) {
          videoEntries.push({
            url: les.videoUrl,
            sectionTitle: secTitle,
            lessonTitle: les.title || `Lecture ${lIdx + 1}`
          });
        }
      }
    }
  }

  if (videoEntries.length === 0) {
    return {
      isValid: true,
      collisions: [],
      intraDuplicates: []
    };
  }

  // 3. Find cross-course collisions
  const collisions = await findCrossCourseVideoCollisions(videoEntries, excludeCourseId);

  if (collisions.length > 0) {
    const firstCol = collisions[0];
    const errorMsg = `Duplicate Video Detected: The video assigned to "${firstCol.incomingLessonTitle}" (${firstCol.incomingSectionTitle}) is already in use in course "${firstCol.existingCourseTitle}" (Module: "${firstCol.existingSectionTitle}", Lecture: "${firstCol.existingLessonTitle}"). Reusing videos across courses is strictly prohibited. Each course must have unique video content.`;

    return {
      isValid: false,
      error: errorMsg,
      collisions,
      intraDuplicates: []
    };
  }

  return {
    isValid: true,
    collisions: [],
    intraDuplicates: []
  };
}
