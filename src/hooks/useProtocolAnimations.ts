import { useInViewAnimation } from './useInViewAnimation';
import { useScrollStaggerReveal } from './useScrollStaggerReveal';
import { useVerdictStampAnimation } from './useVerdictStampAnimation';

const DRESS_PALETTE_TONES = ['tone-1', 'tone-2', 'tone-3', 'tone-4', 'tone-5'] as const;

export function useProtocolAnimations() {
  const groomNameAnimation = useInViewAnimation<HTMLDivElement>({
    threshold: 0.35,
    rootMargin: '0px 0px -8% 0px',
    once: true,
  });

  const brideNameAnimation = useInViewAnimation<HTMLDivElement>({
    threshold: 0.45,
    rootMargin: '0px 0px -10% 0px',
    once: true,
  });

  const singleDayAnimation = useInViewAnimation<HTMLDivElement>({
    threshold: 0.35,
    rootMargin: '0px 0px -10% 0px',
    once: true,
  });

  const singleMonthAnimation = useInViewAnimation<HTMLDivElement>({
    threshold: 0.45,
    rootMargin: '0px 0px -10% 0px',
    once: true,
  });

  const addressAnimation = useInViewAnimation<HTMLDivElement>({
    threshold: 0.35,
    rootMargin: '0px 0px -10% 0px',
    once: true,
  });

  const answerDayAnimation = useInViewAnimation<HTMLDivElement>({
    threshold: 0.35,
    rootMargin: '0px 0px -10% 0px',
    once: true,
  });

  const answerMonthAnimation = useInViewAnimation<HTMLDivElement>({
    threshold: 0.45,
    rootMargin: '0px 0px -10% 0px',
    once: true,
  });

  const timelineRingsAnimation = useInViewAnimation<HTMLImageElement>({
    threshold: 0.35,
    rootMargin: '0px 0px -20% 0px',
    once: true,
  });

  const dressPaletteReveal = useScrollStaggerReveal<HTMLDivElement>({
    totalItems: DRESS_PALETTE_TONES.length,
    startViewportRatio: 0.92,
    endViewportRatio: 0.5,
    once: true,
  });

  const verdictStampAnimation = useVerdictStampAnimation<HTMLElement>({
    delayMs: 1000,
    triggerBandPercent: 0.1,
    animationDurationMs: 820,
  });

  return {
    groomNameAnimation,
    brideNameAnimation,
    singleDayAnimation,
    singleMonthAnimation,
    addressAnimation,
    answerDayAnimation,
    answerMonthAnimation,
    timelineRingsAnimation,
    dressPaletteReveal,
    verdictStampAnimation,
    dressPaletteTones: DRESS_PALETTE_TONES,
  };
}
