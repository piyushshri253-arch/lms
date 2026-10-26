export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export type CourseCategory =
  | 'Engineering'
  | 'Design'
  | 'Data Science'
  | 'Business'
  | 'Marketing'
  | 'Mobile Dev';

export type CourseLevel = 'All Levels' | 'ALL_LEVELS' | 'Beginner' | 'BEGINNER' | 'Intermediate' | 'INTERMEDIATE' | 'Expert' | 'EXPERT';

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  durationSeconds?: number;
  type: 'video' | 'reading' | 'quiz';
  completed: boolean;
  locked?: boolean;
  isFree?: boolean;
  videoUrl?: string | null;
  description?: string | null;
}

export interface CourseSection {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  lessons: Lesson[];
}

export interface CourseModule {
  id: string;
  title: string;
  moduleNumber: number;
  lessons: Lesson[];
}

export interface Instructor {
  id: string;
  name: string;
  title?: string;
  avatar: string;
  bio?: string;
  rating?: number;
  studentsCount?: number;
  coursesCount?: number;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  category: CourseCategory | string;
  categoryId?: string;
  level: CourseLevel | string;
  rating: number;
  reviewsCount: number;
  studentsCount: number;
  price: number;
  originalPrice?: number;
  bestseller?: boolean;
  isNew?: boolean;
  thumbnail: string;
  instructor: Instructor;
  durationHours: number;
  language: string;
  subtitles: string[];
  whatYouWillLearn: string[];
  modules: CourseModule[];
  progress?: number;
  completedLessons?: number;
  totalLessons?: number;
  lastAccessedLessonId?: string;
  isEnrolled?: boolean;
  isWishlisted?: boolean;
  status?: string;
  parentCourseId?: string | null;
  versionNumber?: number;
  versionLabel?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface VideoLibraryItem {
  id: string;
  title: string;
  courseTitle: string;
  moduleName: string;
  duration: string;
  thumbnail: string;
  views: number;
  dateAdded: string;
}

export interface MarketingCampaign {
  id: string;
  type: 'discount' | 'banner' | 'announcement';
  title: string;
  code?: string;
  discountPercent?: number;
  targetAudience: string;
  expiryDate: string;
  status: 'active' | 'scheduled' | 'draft' | 'expired';
  bannerText?: string;
  impressions?: number;
  conversions?: number;
}

export interface SystemAlertItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: 'high' | 'info' | 'warning';
}

export interface CoursePerformanceItem {
  id: string;
  courseName: string;
  category: string;
  totalRevenue: number;
  enrollment: number;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  type: 'live_qa' | 'peer_review' | 'workshop';
  dateMonth: string;
  dateDay: string;
  timeRange: string;
  instructor: string;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultLanguage: string;
  twoFactorAuth: boolean;
  sessionTimeoutMinutes: number;
  stripeActive: boolean;
  stripePublishableKey: string;
  paypalActive: boolean;
  maintenanceMode: boolean;
}
