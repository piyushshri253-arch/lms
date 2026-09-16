/**
 * Granular Admin Permission Definitions & Authorization Utilities
 * Follows the Morena Teach LMS RBAC specification.
 */

export const ADMIN_PERMISSIONS = {
  // 1. Student Management Permissions
  STUDENT_VIEW: 'student.view',
  STUDENT_CREATE: 'student.create',
  STUDENT_EDIT: 'student.edit',
  STUDENT_DELETE: 'student.delete',
  STUDENT_IMPORT: 'student.import',
  STUDENT_EXPORT: 'student.export',

  // 2. Course Management Permissions
  COURSE_VIEW: 'course.view',
  COURSE_CREATE: 'course.create',
  COURSE_EDIT: 'course.edit',
  COURSE_PUBLISH: 'course.publish', // Distinct from edit: only approved admins can publish live
  COURSE_DELETE: 'course.delete',
  COURSE_ARCHIVE: 'course.archive',

  // 3. Content Management Permissions
  CONTENT_VIEW: 'content.view',
  CONTENT_CREATE: 'content.create',
  CONTENT_EDIT: 'content.edit',
  CONTENT_DELETE: 'content.delete',
  CONTENT_UPLOAD: 'content.upload',

  // 4. Enrollment Permissions
  ENROLLMENT_VIEW: 'enrollment.view',
  ENROLLMENT_CREATE: 'enrollment.create',
  ENROLLMENT_EDIT: 'enrollment.edit',
  ENROLLMENT_CANCEL: 'enrollment.cancel',

  // 5. Payment & Finance Permissions
  PAYMENT_VIEW: 'payment.view',
  PAYMENT_EXPORT: 'payment.export',
  PAYMENT_REFUND: 'payment.refund', // Distinct high-security permission for initiating refunds

  // 6. Certificate Permissions
  CERTIFICATE_VIEW: 'certificate.view',
  CERTIFICATE_ISSUE: 'certificate.issue',
  CERTIFICATE_REVOKE: 'certificate.revoke',
  CERTIFICATE_EXPORT: 'certificate.export',

  // 7. Coupons & Promotions
  COUPON_VIEW: 'coupon.view',
  COUPON_CREATE: 'coupon.create',
  COUPON_EDIT: 'coupon.edit',
  COUPON_DELETE: 'coupon.delete',

  // 8. Reports Permissions
  REPORT_STUDENT: 'report.student',
  REPORT_COURSE: 'report.course',
  REPORT_ENROLLMENT: 'report.enrollment',
  REPORT_PAYMENT: 'report.payment',
  REPORT_LEARNING: 'report.learning',
  REPORT_CERTIFICATE: 'report.certificate',

  // 9. Notification Permissions
  NOTIFICATION_VIEW: 'notification.view',
  NOTIFICATION_SEND: 'notification.send',

  // 10. Settings Permissions
  SETTING_VIEW: 'setting.view',
  SETTING_EDIT: 'setting.edit'
} as const;

export type AdminPermissionKey = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export interface AdminUserLike {
  id?: string;
  role?: string;
  permissions?: string[] | string;
  organizationId?: string | null;
  organizationMemberships?: Array<{
    organizationId: string;
    role?: string;
    permissions?: string[] | string;
  }>;
}

/**
 * Normalizes user permissions into a clean string array.
 */
export function extractUserPermissions(user?: AdminUserLike | null): string[] {
  if (!user) return [];

  // Super Admins possess all permissions by default
  if (user.role === 'SUPER_ADMIN') {
    return Object.values(ADMIN_PERMISSIONS);
  }

  let perms: string[] = [];

  if (Array.isArray(user.permissions)) {
    perms = [...user.permissions];
  } else if (typeof user.permissions === 'string') {
    try {
      const parsed = JSON.parse(user.permissions);
      if (Array.isArray(parsed)) perms = parsed;
    } catch {
      perms = [];
    }
  }

  // Full default fallback for regular full ADMIN
  if (user.role === 'ADMIN' && perms.length === 0) {
    return Object.values(ADMIN_PERMISSIONS);
  }

  return perms;
}

export const ADMIN_ROLE_PRESETS = {
  COURSE_ADMIN: {
    name: 'Course Admin',
    description: 'Manages courses, instructors, students, and enrollments',
    permissions: [
      ADMIN_PERMISSIONS.COURSE_VIEW,
      ADMIN_PERMISSIONS.COURSE_CREATE,
      ADMIN_PERMISSIONS.COURSE_EDIT,
      ADMIN_PERMISSIONS.COURSE_PUBLISH,
      ADMIN_PERMISSIONS.CONTENT_VIEW,
      ADMIN_PERMISSIONS.CONTENT_CREATE,
      ADMIN_PERMISSIONS.CONTENT_UPLOAD,
      ADMIN_PERMISSIONS.STUDENT_VIEW,
      ADMIN_PERMISSIONS.STUDENT_CREATE,
      ADMIN_PERMISSIONS.STUDENT_EDIT,
      ADMIN_PERMISSIONS.ENROLLMENT_VIEW,
      ADMIN_PERMISSIONS.ENROLLMENT_CREATE,
      ADMIN_PERMISSIONS.REPORT_COURSE,
      ADMIN_PERMISSIONS.REPORT_STUDENT
    ]
  },
  PAYMENT_ADMIN: {
    name: 'Payment Admin',
    description: 'Manages payments, orders, refunds, and financial reporting',
    permissions: [
      ADMIN_PERMISSIONS.PAYMENT_VIEW,
      ADMIN_PERMISSIONS.PAYMENT_EXPORT,
      ADMIN_PERMISSIONS.PAYMENT_REFUND,
      ADMIN_PERMISSIONS.REPORT_PAYMENT,
      ADMIN_PERMISSIONS.COUPON_VIEW,
      ADMIN_PERMISSIONS.COUPON_CREATE
    ]
  },
  FULL_ADMIN: {
    name: 'Full Admin',
    description: 'Universal operations access across all modules',
    permissions: Object.values(ADMIN_PERMISSIONS)
  }
};

/**
 * Checks whether an admin possesses a specific permission key.
 * Super Admin has universal access.
 * Admin access is strictly permission-based.
 */
export function hasAdminPermission(
  user: AdminUserLike | null | undefined,
  permissionKey: AdminPermissionKey | string
): boolean {
  if (!user) return false;
  // Super Admin has universal authority across all modules
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Admin access is permission-based
  const perms = extractUserPermissions(user);
  return perms.includes(permissionKey);
}

/**
 * Checks whether an admin possesses AT LEAST ONE of the specified permission keys.
 * Useful for conditionally rendering parent sidebar navigation groups.
 */
export function hasAnyAdminPermission(
  user: AdminUserLike | null | undefined,
  permissionKeys: Array<AdminPermissionKey | string>
): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  const perms = extractUserPermissions(user);
  return permissionKeys.some((k) => perms.includes(k));
}

/**
 * Single-Company LMS: universal scope without facility segregation.
 */
export function hasFacilityScope(): boolean {
  return true;
}
