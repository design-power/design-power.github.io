import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UseVerdictStampAnimationOptions = {
  enabled?: boolean;
  delayMs?: number;
  triggerBandPercent?: number;
  animationDurationMs?: number;
};

type VerdictStampPhase = 'hidden' | 'queued' | 'playing' | 'done';

type UseVerdictStampAnimationResult<T extends Element> = {
  ref: (node: T | null) => void;
  stampStateClassName: string;
  isTriggered: boolean;
};

export function useVerdictStampAnimation<T extends Element = HTMLElement>({
  enabled = true,
  delayMs = 1000,
  triggerBandPercent = 0.1,
  animationDurationMs = 820,
}: UseVerdictStampAnimationOptions = {}): UseVerdictStampAnimationResult<T> {
  const [node, setNode] = useState<T | null>(null);
  const [phase, setPhase] = useState<VerdictStampPhase>('hidden');

  const hasTriggeredRef = useRef(false);
  const startTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);

  const ref = useCallback((target: T | null) => {
    setNode(target);
  }, []);

  useEffect(() => {
    return () => {
      if (startTimerRef.current !== null) {
        window.clearTimeout(startTimerRef.current);
      }

      if (finishTimerRef.current !== null) {
        window.clearTimeout(finishTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled || !node || hasTriggeredRef.current) {
      return;
    }

    if (typeof window === 'undefined') {
      hasTriggeredRef.current = true;
      setPhase('done');
      return;
    }

    const clampedBand = Math.min(Math.max(triggerBandPercent, 0.04), 0.8);
    const safeDelayMs = Math.max(delayMs, 0);
    const safeAnimationDurationMs = Math.max(animationDurationMs, 100);
    let frameId = 0;

    const onTriggered = () => {
      hasTriggeredRef.current = true;

      if (safeDelayMs > 0) {
        setPhase('queued');
        startTimerRef.current = window.setTimeout(() => {
          setPhase('playing');
        }, safeDelayMs);
      } else {
        setPhase('playing');
      }

      finishTimerRef.current = window.setTimeout(() => {
        setPhase('done');
      }, safeDelayMs + safeAnimationDurationMs);
    };

    const checkTrigger = () => {
      frameId = 0;

      if (!node || hasTriggeredRef.current) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
      const viewportCenterY = viewportOffsetTop + viewportHeight / 2;
      const halfBand = (viewportHeight * clampedBand) / 2;
      const bandTop = viewportCenterY - halfBand;
      const bandBottom = viewportCenterY + halfBand;
      const isInBand = rect.bottom >= bandTop && rect.top <= bandBottom;

      if (!isInBand) {
        return;
      }

      onTriggered();
    };

    const requestCheck = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(checkTrigger);
    };

    requestCheck();

    const viewport = window.visualViewport;
    window.addEventListener('scroll', requestCheck, { passive: true });
    window.addEventListener('resize', requestCheck);
    window.addEventListener('orientationchange', requestCheck);
    viewport?.addEventListener('scroll', requestCheck);
    viewport?.addEventListener('resize', requestCheck);

    return () => {
      window.removeEventListener('scroll', requestCheck);
      window.removeEventListener('resize', requestCheck);
      window.removeEventListener('orientationchange', requestCheck);
      viewport?.removeEventListener('scroll', requestCheck);
      viewport?.removeEventListener('resize', requestCheck);

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [animationDurationMs, delayMs, enabled, node, triggerBandPercent]);

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
    ref,
    stampStateClassName,
    isTriggered: phase !== 'hidden',
  };
}
