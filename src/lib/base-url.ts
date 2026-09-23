/**
 * Resolves the canonical public base URL for Morena Teach LMS.
 * Prioritizes configured production URLs over localhost to ensure
 * email action buttons, invitation links, and payment redirects always work.
 */
export function getBaseUrl(): string {
  // If NEXT_PUBLIC_APP_URL is explicitly set and has a real non-localhost domain
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (publicAppUrl && !publicAppUrl.includes('localhost') && !publicAppUrl.includes('127.0.0.1')) {
    return publicAppUrl.replace(/\/$/, '');
  }

  // Vercel deployment production domain
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '');
  }

  // Vercel deployment preview / git branch domain
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '');
  }

  // If local development explicitly requested via ALLOW_LOCALHOST_EMAILS
  if (process.env.ALLOW_LOCALHOST_EMAILS === 'true' && publicAppUrl) {
    return publicAppUrl.replace(/\/$/, '');
  }

  // Default to live production deployment
  return 'https://lms-phi-plum.vercel.app';
}
