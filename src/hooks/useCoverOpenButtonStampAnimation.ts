import { useEffect, useMemo, useState } from 'react';

type UseCoverOpenButtonStampAnimationOptions = {
  enabled?: boolean;
  delayMs?: number;
  animationDurationMs?: number;
};

type CoverStampPhase = 'hidden' | 'playing' | 'done';

export function useCoverOpenButtonStampAnimation({
  enabled = true,
  delayMs = 2000,
  animationDurationMs = 820,
}: UseCoverOpenButtonStampAnimationOptions = {}) {
  const [phase, setPhase] = useState<CoverStampPhase>('hidden');

  useEffect(() => {
    if (!enabled) {
      setPhase('done');
      return;
    }

    if (typeof window === 'undefined') {
      setPhase('done');
      return;
    }

    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mediaQuery?.matches) {
      setPhase('done');
      return;
    }

    const safeDelayMs = Math.max(delayMs, 0);
    const safeAnimationDurationMs = Math.max(animationDurationMs, 100);

    setPhase('hidden');

    const startTimer = window.setTimeout(() => {
      setPhase('playing');
    }, safeDelayMs);

    const finishTimer = window.setTimeout(() => {
      setPhase('done');
    }, safeDelayMs + safeAnimationDurationMs);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(finishTimer);
    };
  }, [animationDurationMs, delayMs, enabled]);

  const stampStateClassName = useMemo(() => {
    if (phase === 'playing') {
      return 'is-stamp-playing';
    }

    if (phase === 'done') {
      return 'is-stamp-done';
    }

    return 'is-stamp-hidden';
  }, [phase]);

  return {
    stampStateClassName,
  };
}
