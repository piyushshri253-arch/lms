'use client';

import { useEffect, useRef } from 'react';

const SYNC_CHANNEL_NAME = 'morena_courses_sync';
const STORAGE_KEY = 'morena_courses_last_sync';
const CUSTOM_EVENT_NAME = 'morena_courses_sync_event';

/**
 * Notifies all open tabs, windows, and components that courses data has changed
 * (e.g. course created, saved draft, published live, status toggled, or auditor reviewed).
 */
export function notifyCoursesChanged() {
  if (typeof window === 'undefined') return;

  const timestamp = Date.now().toString();

  // 1. BroadcastChannel for instant cross-tab sync in modern browsers
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
      bc.postMessage({ type: 'COURSES_CHANGED', timestamp });
      bc.close();
    }
  } catch (err) {
    // ignore broadcast errors
  }

  // 2. LocalStorage event for cross-tab sync fallback
  try {
    localStorage.setItem(STORAGE_KEY, timestamp);
  } catch (err) {
    // ignore storage errors
  }

  // 3. CustomEvent for same-page components
  try {
    window.dispatchEvent(
      new CustomEvent(CUSTOM_EVENT_NAME, {
        detail: { timestamp }
      })
    );
  } catch (err) {
    // ignore custom event errors
  }
}

interface UseCoursesAutoRefreshOptions {
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * React hook to automatically keep courses data fresh across all tabs and status transitions:
 * - Silent background polling every 5s (only when browser tab is visible)
 * - Immediate refresh on window focus / tab visibility change
 * - Instant cross-tab real-time sync via BroadcastChannel & LocalStorage events
 */
export function useCoursesAutoRefresh(
  onRefresh: (silent?: boolean) => void | Promise<void>,
  options?: UseCoursesAutoRefreshOptions
) {
  const { intervalMs = 5000, enabled = true } = options || {};
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 1. Refresh immediately when user switches back to this browser tab or window gains focus
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        onRefreshRef.current(true);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 2. Periodic background polling every `intervalMs` (default 5s) while page is visible
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        onRefreshRef.current(true);
      }
    }, intervalMs);

    // 3. BroadcastChannel listener for instant cross-tab notification
    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
        bc.onmessage = (event) => {
          if (event.data?.type === 'COURSES_CHANGED') {
            onRefreshRef.current(true);
          }
        };
      }
    } catch {}

    // 4. LocalStorage & CustomEvent listeners
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        onRefreshRef.current(true);
      }
    };

    const handleCustomEvent = () => {
      onRefreshRef.current(true);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(timer);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);
    };
  }, [enabled, intervalMs]);
}
