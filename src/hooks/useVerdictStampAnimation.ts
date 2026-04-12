import { useCallback, useEffect, useRef, useState } from 'react';
import { useStampAnimation } from './useStampAnimation';

type UseVerdictStampAnimationOptions = {
  enabled?: boolean;
  delayMs?: number;
  baseTransform?: string;
  finalRotationDeg?: number;
  triggerBandPercent?: number;
};

type UseVerdictStampAnimationResult<T extends Element> = {
  ref: (node: T | null) => void;
  style?: ReturnType<typeof useStampAnimation>['style'];
  isTriggered: boolean;
};

export function useVerdictStampAnimation<T extends Element = HTMLElement>({
  enabled = true,
  delayMs = 1000,
  baseTransform = '',
  finalRotationDeg = 0,
  triggerBandPercent = 0.1,
}: UseVerdictStampAnimationOptions = {}): UseVerdictStampAnimationResult<T> {
  const [node, setNode] = useState<T | null>(null);
  const [isTriggered, setIsTriggered] = useState(false);
  const [isAnimationLocked, setIsAnimationLocked] = useState(false);
  const isTriggeredRef = useRef(false);

  const ref = useCallback((target: T | null) => {
    setNode(target);
  }, []);

  useEffect(() => {
    isTriggeredRef.current = isTriggered;
  }, [isTriggered]);

  useEffect(() => {
    if (!enabled || !node || isTriggeredRef.current) {
      return;
    }

    if (typeof window === 'undefined') {
      setIsTriggered(true);
      return;
    }

    const clampedBand = Math.min(Math.max(triggerBandPercent, 0.04), 0.8);
    let frameId = 0;

    const checkTrigger = () => {
      frameId = 0;

      if (!node || isTriggeredRef.current) {
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

      isTriggeredRef.current = true;
      setIsTriggered(true);
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
  }, [enabled, node, triggerBandPercent]);

  useEffect(() => {
    if (!enabled || !isTriggered || isAnimationLocked || typeof window === 'undefined') {
      return;
    }

    const lockDelayMs = Math.max(delayMs, 0) + 1200;
    const lockTimer = window.setTimeout(() => {
      setIsAnimationLocked(true);
    }, lockDelayMs);

    return () => {
      window.clearTimeout(lockTimer);
    };
  }, [delayMs, enabled, isAnimationLocked, isTriggered]);

  const stampAnimation = useStampAnimation({
    enabled: enabled && isTriggered && !isAnimationLocked,
    delayMs,
    baseTransform,
    finalRotationDeg,
  });

  return {
    ref,
    style: isAnimationLocked ? undefined : stampAnimation.style,
    isTriggered,
  };
}
