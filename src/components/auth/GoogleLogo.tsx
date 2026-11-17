import React from 'react';

export function GoogleLogo({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.97z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

export function mapGoogleOAuthError(
  errorCode: string,
  portal: 'INSTRUCTOR' | 'STUDENT' = 'STUDENT'
): { code: string; message: string } {
  const roleLabel = portal === 'INSTRUCTOR' ? 'instructor ' : '';
  const errorMap: Record<string, { code: string; message: string }> = {
    NOT_CONFIGURED: {
      code: 'GOOGLE_NOT_CONFIGURED',
      message:
        'Google Sign-In is not configured yet on this server. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable Google OAuth.'
    },
    CANCELLED: {
      code: 'GOOGLE_CANCELLED',
      message: 'Google sign-in was cancelled. You can continue with Google or use your email.'
    },
    UNVERIFIED_EMAIL: {
      code: 'GOOGLE_UNVERIFIED',
      message: 'Please select a verified Google / Gmail account.'
    },
    PENDING_AUDITOR: {
      code: 'PENDING_AUDITOR_ONBOARDING',
      message:
        'Your Instructor application, qualifications & resume are currently under Auditor Review & Interview. Once the Auditor completes your onboarding, you will receive an email with a Login button to sign in.'
    },
    SUSPENDED: {
      code: 'ACCOUNT_SUSPENDED',
      message: `Your ${roleLabel}account has been suspended. Please contact platform support.`
    },
    INACTIVE: {
      code: 'ACCOUNT_INACTIVE',
      message: `Your ${roleLabel}account is currently inactive. Please contact administration.`
    }
  };

  return (
    errorMap[errorCode] || {
      code: 'GOOGLE_AUTH_FAILED',
      message: 'Google authentication could not be completed. Please try again.'
    }
  );
}
