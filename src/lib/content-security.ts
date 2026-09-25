import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface CourseContentSecurityPolicy {
  courseId: string;
  signedUrlEnabled: boolean;
  signedUrlsEnabled: boolean;
  signedUrlExpiryMinutes: number;
  tokenExpiryMinutes: number;
  allowVideoDownload: boolean;
  allowPdfDownload: boolean;
  allowResourceDownload: boolean;
  dynamicWatermarkEnabled: boolean;
  preventRightClick: boolean;
  disableRightClick: boolean;
  disablePictureInPicture: boolean;
  requireActiveEnrollment: boolean;
  enforceEnrollmentValidation: boolean;
  enforceDomainRefererLock: boolean;
  allowedDomains: string[];
  updatedBy?: string;
  updatedAt: string;
}

export const DEFAULT_CONTENT_SECURITY_POLICY = (
  courseId: string,
  isPaidCourse = true
): CourseContentSecurityPolicy => ({
  courseId,
  signedUrlEnabled: true,
  signedUrlsEnabled: true,
  signedUrlExpiryMinutes: 120,
  tokenExpiryMinutes: 120,
  allowVideoDownload: false,
  allowPdfDownload: !isPaidCourse,
  allowResourceDownload: true,
  dynamicWatermarkEnabled: true,
  preventRightClick: true,
  disableRightClick: true,
  disablePictureInPicture: true,
  requireActiveEnrollment: true,
  enforceEnrollmentValidation: true,
  enforceDomainRefererLock: true,
  allowedDomains: [],
  updatedAt: new Date().toISOString()
});

export async function getCourseSecurityPolicy(
  courseId: string,
  isPaidCourse = true
): Promise<CourseContentSecurityPolicy> {
  const key = `content_security_${courseId}`;
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (row?.value) {
      const parsed = JSON.parse(row.value);
      const base = DEFAULT_CONTENT_SECURITY_POLICY(courseId, isPaidCourse);
      const signedEnabled =
        parsed.signedUrlEnabled ?? parsed.signedUrlsEnabled ?? base.signedUrlEnabled;
      const expiryMins =
        Number(parsed.signedUrlExpiryMinutes ?? parsed.tokenExpiryMinutes) ||
        base.signedUrlExpiryMinutes;
      return {
        ...base,
        ...parsed,
        courseId,
        signedUrlEnabled: signedEnabled,
        signedUrlsEnabled: signedEnabled,
        signedUrlExpiryMinutes: expiryMins,
        tokenExpiryMinutes: expiryMins
      };
    }
  } catch {}
  return DEFAULT_CONTENT_SECURITY_POLICY(courseId, isPaidCourse);
}

export async function saveCourseSecurityPolicy(
  courseId: string,
  partial: Partial<CourseContentSecurityPolicy>,
  updatedByOrIsPaid?: string | boolean
): Promise<CourseContentSecurityPolicy> {
  const key = `content_security_${courseId}`;
  const isPaid = typeof updatedByOrIsPaid === 'boolean' ? updatedByOrIsPaid : true;
  const current = await getCourseSecurityPolicy(courseId, isPaid);
  const signedEnabled =
    partial.signedUrlEnabled ?? partial.signedUrlsEnabled ?? current.signedUrlEnabled;
  const expiryMins =
    Number(partial.signedUrlExpiryMinutes ?? partial.tokenExpiryMinutes) ||
    current.signedUrlExpiryMinutes;

  const merged: CourseContentSecurityPolicy = {
    ...current,
    ...partial,
    courseId,
    signedUrlEnabled: signedEnabled,
    signedUrlsEnabled: signedEnabled,
    signedUrlExpiryMinutes: expiryMins,
    tokenExpiryMinutes: expiryMins,
    updatedBy: typeof updatedByOrIsPaid === 'string' ? updatedByOrIsPaid : current.updatedBy,
    updatedAt: new Date().toISOString()
  };

  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(merged) },
    create: { key, value: JSON.stringify(merged) }
  });
  return merged;
}

export interface SignedMediaTokenPayload {
  userId: string;
  userEmail: string;
  userName?: string;
  courseId: string;
  lessonId: string;
  resourceType?: 'VIDEO' | 'PDF' | 'DOWNLOAD';
  mediaType?: 'VIDEO' | 'PDF' | 'DOWNLOAD';
  allowDownload: boolean;
  ttlMinutes?: number;
  exp?: number;
}

function getSigningSecret(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'morena-teach-lms-256bit-content-drm-secret-key-2026'
  );
}

/**
 * Generates an HMAC-SHA256 signed token bound to a specific student, course, lesson, and expiration time.
 */
export function createSignedMediaToken(payload: SignedMediaTokenPayload): {
  token: string;
  expiresAt: number;
} {
  const ttlMinutes = payload.ttlMinutes || 120;
  const expiresAtMs = payload.exp
    ? payload.exp * 1000
    : Date.now() + ttlMinutes * 60 * 1000;
  const expSec = Math.floor(expiresAtMs / 1000);

  const normalizedPayload = {
    ...payload,
    mediaType: payload.mediaType || payload.resourceType || 'VIDEO',
    exp: expSec
  };

  const dataB64 = Buffer.from(JSON.stringify(normalizedPayload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(dataB64)
    .digest('base64url');

  return {
    token: `${dataB64}.${signature}`,
    expiresAt: expiresAtMs
  };
}

/**
 * Verifies a student-specific signed media token.
 */
export function verifySignedMediaToken(
  token: string,
  expectedUserId?: string,
  expectedLessonId?: string
): { valid: boolean; payload?: SignedMediaTokenPayload; error?: string } {
  try {
    if (!token || !token.includes('.')) {
      return { valid: false, error: 'Malformed signed media token.' };
    }
    const [dataB64, sig] = token.split('.');
    const expectedSig = crypto
      .createHmac('sha256', getSigningSecret())
      .update(dataB64)
      .digest('base64url');

    if (sig !== expectedSig) {
      return { valid: false, error: 'Invalid cryptographic signature on media token.' };
    }

    const payload: SignedMediaTokenPayload = JSON.parse(
      Buffer.from(dataB64, 'base64url').toString('utf8')
    );

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return {
        valid: false,
        error: 'Signed media token has expired. Please refresh the course player.'
      };
    }

    if (expectedUserId && payload.userId !== expectedUserId) {
      return {
        valid: false,
        error: 'Access Denied: This signed stream URL is bound to another student account.'
      };
    }

    if (expectedLessonId && payload.lessonId !== expectedLessonId) {
      return {
        valid: false,
        error: 'Access Denied: Token lesson mismatch.'
      };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Token verification failed.' };
  }
}

/**
 * Appends student-specific signed parameters to a video/PDF/resource URL.
 */
export function buildStudentSignedMediaUrl(
  rawUrl: string | null | undefined,
  token: string,
  expiresAt: number,
  allowDownload: boolean,
  mediaType: 'VIDEO' | 'PDF' | 'DOWNLOAD' = 'VIDEO'
): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const trimmed = rawUrl.trim();

  // Do not alter YouTube/Vimeo embed origins other than fragment/query if safe
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('vimeo.com')) {
    return trimmed;
  }

  const [baseWithoutHash, existingHash] = trimmed.split('#');
  const sep = baseWithoutHash.includes('?') ? '&' : '?';
  const signedQuery = `${baseWithoutHash}${sep}st_token=${encodeURIComponent(
    token
  )}&exp=${Math.floor(expiresAt / 1000)}&dl=${allowDownload ? '1' : '0'}`;

  if (mediaType === 'PDF' && !allowDownload) {
    return `${signedQuery}#toolbar=0&navpanes=0&scrollbar=1`;
  }

  return existingHash ? `${signedQuery}#${existingHash}` : signedQuery;
}
