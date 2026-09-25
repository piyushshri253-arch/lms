/**
 * Centralized Route Definitions for MORENA TEACH Learning (LMS)
 * 
 * Strict Rule: Every LMS user experience, link, button, redirect,
 * and navigation item MUST remain inside this /lms/* namespace.
 */

export const LMS_ROUTES = {
  // Core Dashboards & Overview
  DASHBOARD: '/lms/dashboard',
  PROGRESS: '/lms/progress',

  // LMS Academy Administration Portal
  ADMIN: '/lms/admin',
  ADMIN_COURSES: '/lms/admin/courses',
  ADMIN_STUDENTS: '/lms/admin/students',
  ADMIN_INSTRUCTORS: '/lms/admin/instructors',
  ADMIN_CERTIFICATES: '/lms/admin/certificates',
  ADMIN_QUIZZES: '/lms/admin/quizzes',
  ADMIN_ASSIGNMENTS: '/lms/admin/assignments',
  ADMIN_AI: '/lms/admin/ai',
  ADMIN_ANALYTICS: '/lms/admin/analytics',
  ADMIN_SETTINGS: '/lms/admin/settings',

  // Curricula & Courses
  MY_COURSES: '/lms/my-courses',
  COURSES: '/lms/courses',
  COURSE_DETAILS: (idOrSlug: string) => `/lms/courses/${idOrSlug}`,
  LEARN: (courseId: string, lessonId?: string) =>
    lessonId ? `/lms/learn/${courseId}/${lessonId}` : `/lms/learn/${courseId}`,

  // Assessments & Credentials
  CERTIFICATES: '/lms/certificates',
  CERTIFICATE_VIEW: (certNumber: string) => `/certificate/${certNumber}`,
  QUIZZES: '/lms/quizzes',
  ASSIGNMENTS: '/lms/assignments',

  // Learner Account & Preferences
  PROFILE: '/lms/profile',
  SETTINGS: '/lms/settings',
  NOTIFICATIONS: '/lms/notifications',
  WISHLIST: '/lms/wishlist',
  ORDERS: '/lms/orders',
  REVIEWS: '/lms/reviews',
  QUESTIONS: '/dashboard/questions',
  LMS_QUESTIONS: '/lms/questions',

  // Authentication & Access
  LOGIN: '/lms/login',
  REGISTER: '/lms/register',
  FORGOT_PASSWORD: '/lms/forgot-password',
  RESET_PASSWORD: (token: string) => `/lms/reset-password/${token}`,
  VERIFY_EMAIL: (email: string) => `/verify-email?email=${encodeURIComponent(email)}&platform=lms`,

  // Cross-Platform Gateway
  SWITCH_TO_SALES: '/sales/login',
  SALES_DASHBOARD: '/sales/dashboard'
} as const;

export type LmsRouteKey = keyof typeof LMS_ROUTES;
