'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { env } from '@/lib/env';

const EVENTS: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
const WARNING_BEFORE_MS = 60_000;

interface UseIdleLogoutOptions {
  onLogout: () => void;
}

export function useIdleLogout({ onLogout }: UseIdleLogoutOptions) {
  const timeoutMs = env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES * 60 * 1000;
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs so callbacks always have latest values without re-creating timers
  const onLogoutRef = useRef(onLogout);
  const timeoutMsRef = useRef(timeoutMs);
  useEffect(() => {
    onLogoutRef.current = onLogout;
    timeoutMsRef.current = timeoutMs;
  });

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  // startTimers sets up timers without calling setState, safe to call in effect body
  const startTimers = useCallback(() => {
    clearTimers();
    const ms = timeoutMsRef.current;
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(60);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
    }, ms - WARNING_BEFORE_MS);
    logoutTimerRef.current = setTimeout(() => {
      onLogoutRef.current();
    }, ms);
  }, [clearTimers]);

  // reset is called from event handlers, not effect body, so setState is fine
  const reset = useCallback(() => {
    setShowWarning(false);
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    startTimers();

    let lastCall = 0;
    const handler = () => {
      const now = Date.now();
      if (now - lastCall > 1000) {
        lastCall = now;
        reset();
      }
    };

    for (const ev of EVENTS) {
      window.addEventListener(ev, handler, { passive: true });
    }

    return () => {
      for (const ev of EVENTS) {
        window.removeEventListener(ev, handler);
      }
      clearTimers();
    };
  }, [startTimers, reset, clearTimers]);

  return { showWarning, secondsLeft, resetTimer: reset };
}
