import { prisma } from './prisma';

export interface PlanEntitlements {
  planName: string;
  maxStudents: number; // -1 for unlimited
  maxCourses: number; // -1 for unlimited
  maxInstructors: number; // -1 for unlimited
  maxStorageGB: number;
  customDomainEnabled: boolean;
  customBrandingEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  certificatesEnabled: boolean;
  apiAccessEnabled: boolean;
}

export const DEFAULT_PLAN_ENTITLEMENTS: { [key: string]: PlanEntitlements } = {
  STARTER: {
    planName: 'STARTER',
    maxStudents: 500,
    maxCourses: 20,
    maxInstructors: 5,
    maxStorageGB: 50,
    customDomainEnabled: true,
    customBrandingEnabled: true,
    advancedAnalyticsEnabled: false,
    certificatesEnabled: true,
    apiAccessEnabled: false
  },
  GROWTH: {
    planName: 'GROWTH',
    maxStudents: 5000,
    maxCourses: -1, // unlimited
    maxInstructors: 25,
    maxStorageGB: 250,
    customDomainEnabled: true,
    customBrandingEnabled: true,
    advancedAnalyticsEnabled: true,
    certificatesEnabled: true,
    apiAccessEnabled: true
  },
  PROFESSIONAL: {
    planName: 'PROFESSIONAL',
    maxStudents: 5000,
    maxCourses: -1,
    maxInstructors: 25,
    maxStorageGB: 250,
    customDomainEnabled: true,
    customBrandingEnabled: true,
    advancedAnalyticsEnabled: true,
    certificatesEnabled: true,
    apiAccessEnabled: true
  },
  BUSINESS: {
    planName: 'BUSINESS',
    maxStudents: 25000,
    maxCourses: -1,
    maxInstructors: 100,
    maxStorageGB: 1000,
    customDomainEnabled: true,
    customBrandingEnabled: true,
    advancedAnalyticsEnabled: true,
    certificatesEnabled: true,
    apiAccessEnabled: true
  },
  ENTERPRISE: {
    planName: 'ENTERPRISE',
    maxStudents: -1,
    maxCourses: -1,
    maxInstructors: -1,
    maxStorageGB: 5000,
    customDomainEnabled: true,
    customBrandingEnabled: true,
    advancedAnalyticsEnabled: true,
    certificatesEnabled: true,
    apiAccessEnabled: true
  }
};

export async function getOrganizationEntitlements(organizationId: string): Promise<PlanEntitlements> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true }
  });

  const planKey = (org?.plan || 'STARTER').toUpperCase();
  return DEFAULT_PLAN_ENTITLEMENTS[planKey] || DEFAULT_PLAN_ENTITLEMENTS.STARTER;
}

export async function checkStudentCapacity(organizationId: string): Promise<{ canAdd: boolean; current: number; max: number }> {
  const entitlements = await getOrganizationEntitlements(organizationId);
  const currentStudents = await prisma.user.count({
    where: { organizationId, role: 'STUDENT' }
  });

  if (entitlements.maxStudents === -1) {
    return { canAdd: true, current: currentStudents, max: -1 };
  }

  return {
    canAdd: currentStudents < entitlements.maxStudents,
    current: currentStudents,
    max: entitlements.maxStudents
  };
}

export async function checkCourseCapacity(organizationId: string): Promise<{ canAdd: boolean; current: number; max: number }> {
  const entitlements = await getOrganizationEntitlements(organizationId);
  const currentCourses = await prisma.course.count({
    where: { organizationId }
  });

  if (entitlements.maxCourses === -1) {
    return { canAdd: true, current: currentCourses, max: -1 };
  }

  return {
    canAdd: currentCourses < entitlements.maxCourses,
    current: currentCourses,
    max: entitlements.maxCourses
  };
}

export async function checkStorageCapacity(
  organizationId: string,
  incomingBytes: number = 0
): Promise<{ canUpload: boolean; currentGB: number; maxGB: number; usagePercent: number }> {
  const entitlements = await getOrganizationEntitlements(organizationId);
  const media = await prisma.mediaAsset.findMany({
    where: { organizationId },
    select: { sizeBytes: true }
  });

  const currentTotalBytes = media.reduce((sum, m) => sum + (m.sizeBytes || 0), 0);
  const projectedBytes = currentTotalBytes + incomingBytes;
  const currentGB = Number((currentTotalBytes / (1024 * 1024 * 1024)).toFixed(2));
  const projectedGB = Number((projectedBytes / (1024 * 1024 * 1024)).toFixed(2));
  const maxGB = entitlements.maxStorageGB;
  const usagePercent = Number(((currentGB / maxGB) * 100).toFixed(1));

  return {
    canUpload: projectedGB <= maxGB,
    currentGB,
    maxGB,
    usagePercent
  };
}
