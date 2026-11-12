'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Clock, LogOut, CheckCircle2 } from 'lucide-react';

const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes = 900,000 ms
const WARNING_THRESHOLD_MS = 14 * 60 * 1000; // 14 minutes (60s countdown)
const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export function GlobalIdleSessionTracker() {
  const pathname = usePathname();
  const { currentUser, logout } = useApp();

  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const lastActiveRef = useRef<number>(Date.now());
  const lastHeartbeatRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const isAuthPublicPath = Boolean(
    pathname &&
      (pathname.includes('/login') ||
        pathname.includes('/signin') ||
        pathname.includes('/signup') ||
        pathname.includes('/register') ||
        pathname.includes('/forgot-password') ||
        pathname.includes('/reset-password') ||
        pathname.includes('/verify-email'))
  );

  const isLoginPage = Boolean(
    pathname && (pathname.includes('/login') || pathname.includes('/signin'))
  );

  // Check if current route is an authenticated dashboard or learning area
  const isProtectedPath =
    !isAuthPublicPath &&
    Boolean(
      pathname &&
        (pathname.startsWith('/instructor') ||
          pathname.startsWith('/reviewer') ||
          pathname.startsWith('/auditor') ||
          pathname.startsWith('/admin') ||
          pathname.startsWith('/super-admin') ||
          pathname.startsWith('/student') ||
          pathname.startsWith('/learning') ||
          pathname.startsWith('/dashboard') ||
          pathname.startsWith('/sales') ||
          pathname.startsWith('/seo') ||
          pathname.startsWith('/user') ||
          pathname.startsWith('/learn'))
    );

  // Determine appropriate login route for current dashboard
  const getLoginRedirectUrl = useCallback(() => {
    const reasonParam =
      'reason=inactivity&error=' +
      encodeURIComponent('You have been logged out due to inactivity. Please log in again.');
    if (pathname?.startsWith('/instructor')) {
      return `/instructor/login?${reasonParam}`;
    }
    if (pathname?.startsWith('/reviewer') || pathname?.startsWith('/auditor')) {
      return `/reviewer/login?${reasonParam}`;
    }
    if (pathname?.startsWith('/admin')) {
      return `/admin/login?${reasonParam}`;
    }
    if (pathname?.startsWith('/super-admin')) {
      return `/super-admin/login?${reasonParam}`;
    }
    if (pathname?.startsWith('/seo')) {
      return `/seo/login?${reasonParam}`;
    }
    if (pathname?.startsWith('/sales')) {
      return `/sales/login?${reasonParam}`;
    }
    return `/login?${reasonParam}`;
  }, [pathname]);

  // Execute clean session termination & redirect
  const performIdleLogout = useCallback(async () => {
    if (isLoggingOutRef.current || isAuthPublicPath) return;
    isLoggingOutRef.current = true;
    setWarningVisible(false);

    const now = Date.now();
    try {
      localStorage.setItem('mt_session_idle_logout', String(now));
      localStorage.removeItem('mt_last_activity_timestamp');
    } catch {}

    // Broadcast logout to all other open tabs immediately
    try {
      channelRef.current?.postMessage({ type: 'IDLE_LOGOUT', timestamp: now });
    } catch {}

    // Call server-side logout to destroy cookies & terminate session
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'inactivity' })
      });
    } catch {}

    try {
      await logout({ silent: true });
    } catch {}

    const targetUrl = getLoginRedirectUrl();

    // Prevent access through browser Back navigation by replacing history state
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', targetUrl);
      } catch {}
      window.location.replace(targetUrl);
    }
  }, [logout, getLoginRedirectUrl, isAuthPublicPath]);

  // Reset activity timestamp (called whenever user moves mouse, types, scrolls, clicks)
  const recordUserActivity = useCallback(() => {
    if (isLoggingOutRef.current || isAuthPublicPath) return;
    const now = Date.now();
    lastActiveRef.current = now;

    try {
      localStorage.setItem('mt_last_activity_timestamp', String(now));
    } catch {}

    // Hide warning immediately upon genuine user interaction
    setWarningVisible((prev) => (prev ? false : prev));

    // Notify other tabs that user is active
    try {
      channelRef.current?.postMessage({ type: 'ACTIVITY', timestamp: now });
    } catch {}

    // Send periodic background heartbeat to refresh server cookie
    if (now - lastHeartbeatRef.current > HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatRef.current = now;
      fetch('/api/auth/activity', { method: 'POST' }).catch(() => {});
    }
  }, [isAuthPublicPath]);

  // 1. Clean up idle logout flags on Login Pages (inline alert banner on login page already shows the message without toast popups)
  useEffect(() => {
    if (isLoginPage && typeof window !== 'undefined') {
      isLoggingOutRef.current = false;
      setWarningVisible(false);
      try {
        localStorage.removeItem('mt_session_idle_logout');
      } catch {}
    }
  }, [isLoginPage]);

  // 2. Prevent Back Navigation into protected dashboards (Bfcache handler)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && isProtectedPath) {
        // Page was restored from bfcache after Back button!
        fetch('/api/auth/me')
          .then((r) => r.json())
          .then((data) => {
            if (!data?.user) {
              const target = getLoginRedirectUrl();
              window.location.replace(target);
            }
          })
          .catch(() => {
            const target = getLoginRedirectUrl();
            window.location.replace(target);
          });
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [isProtectedPath, getLoginRedirectUrl]);

  // 3. Multi-Tab Synchronization (BroadcastChannel & Storage Event)
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('mt_auth_session_sync');
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (!event?.data) return;
        if (event.data.type === 'IDLE_LOGOUT') {
          if (isAuthPublicPath || isLoginPage) return;
          // Another tab logged out due to inactivity
          isLoggingOutRef.current = true;
          setWarningVisible(false);
          logout({ silent: true }).catch(() => {});
          const target = getLoginRedirectUrl();
          window.location.replace(target);
        } else if (event.data.type === 'ACTIVITY') {
          // Another tab reported activity
          const timestamp = Number(event.data.timestamp);
          if (timestamp > lastActiveRef.current) {
            lastActiveRef.current = timestamp;
            setWarningVisible(false);
          }
        }
      };
    } catch {}

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'mt_session_idle_logout' && e.newValue) {
        if (isAuthPublicPath || isLoginPage) return;
        isLoggingOutRef.current = true;
        setWarningVisible(false);
        logout({ silent: true }).catch(() => {});
        const target = getLoginRedirectUrl();
        window.location.replace(target);
      } else if (e.key === 'mt_last_activity_timestamp' && e.newValue) {
        const val = Number(e.newValue);
        if (val > lastActiveRef.current) {
          lastActiveRef.current = val;
          setWarningVisible(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      try {
        channelRef.current?.close();
      } catch {}
    };
  }, [logout, getLoginRedirectUrl, isAuthPublicPath, isLoginPage]);

  // 4. Activity Event Listeners (Mouse, Keyboard, Scroll, Touch)
  useEffect(() => {
    // Do NOT run idle timer on public auth routes or unauthenticated public pages
    if (isAuthPublicPath || (!currentUser && !isProtectedPath)) {
      setWarningVisible(false);
      return;
    }

    // Reset logging-out ref once user is actively authenticated on a dashboard
    isLoggingOutRef.current = false;

    // Initialize last active time
    const initialTime = Date.now();
    lastActiveRef.current = initialTime;
    try {
      const stored = Number(localStorage.getItem('mt_last_activity_timestamp'));
      if (!stored || initialTime - stored < IDLE_LIMIT_MS) {
        localStorage.setItem('mt_last_activity_timestamp', String(initialTime));
      }
    } catch {}

    // Throttled activity dispatcher
    let lastThrottledTime = 0;
    const handleUserInteraction = () => {
      const now = Date.now();
      if (now - lastThrottledTime > 1000) {
        lastThrottledTime = now;
        recordUserActivity();
      }
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'pointerdown',
      'wheel',
      'click'
    ];

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // Detect tab visibility change (e.g. user resumes laptop or switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        let lastTime = lastActiveRef.current;
        try {
          const stored = Number(localStorage.getItem('mt_last_activity_timestamp'));
          if (stored > 0) lastTime = stored;
        } catch {}

        if (now - lastTime >= IDLE_LIMIT_MS) {
          performIdleLogout();
        } else {
          handleUserInteraction();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // 5. Periodic Timer Check Loop (runs every 1 second)
    const interval = setInterval(() => {
      if (isLoggingOutRef.current) return;

      const now = Date.now();
      let lastTime = lastActiveRef.current;
      try {
        const stored = Number(localStorage.getItem('mt_last_activity_timestamp'));
        if (stored > 0 && stored > lastTime) {
          lastTime = stored;
          lastActiveRef.current = stored;
        }
      } catch {}

      const elapsed = now - lastTime;

      if (elapsed >= IDLE_LIMIT_MS) {
        performIdleLogout();
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        const remSecs = Math.max(1, Math.ceil((IDLE_LIMIT_MS - elapsed) / 1000));
        setSecondsRemaining(remSecs);
        setWarningVisible(true);
      } else {
        setWarningVisible(false);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [currentUser, isProtectedPath, isAuthPublicPath, recordUserActivity, performIdleLogout]);

  // Warning Modal / Floating Banner when 60s remain before 15-minute logout
  if (!warningVisible || !isProtectedPath || isAuthPublicPath) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      className="fixed inset-x-0 bottom-6 z-[99999] flex justify-center px-4 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none"
    >
      <div className="bg-slate-900/95 text-white backdrop-blur-md border border-amber-500/40 rounded-2xl shadow-2xl p-4 sm:p-5 max-w-lg w-full flex flex-col sm:flex-row items-center gap-4 pointer-events-auto">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
          <Clock className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-sm tracking-tight text-white">
              Inactivity Warning
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-extrabold border border-amber-500/30">
              {secondsRemaining}s remaining
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            You have been inactive. For your security, you will be logged out in{' '}
            <strong className="text-amber-400">{secondsRemaining} seconds</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={recordUserActivity}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Stay Logged In</span>
          </button>
          <button
            type="button"
            onClick={performIdleLogout}
            className="inline-flex items-center justify-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="Log Out Now"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default GlobalIdleSessionTracker;
