import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import './handwriting-text.css';

type HandwritingTextProps = {
  text: string;
  className?: string;
  durationMs?: number;
  delayMs?: number;
  steps?: number;
  isActive?: boolean;
};

export function HandwritingText({
  text,
  className = '',
  durationMs = 1200,
  delayMs = 0,
  steps = 12,
  isActive = true,
}: HandwritingTextProps) {
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const previousRef = useRef({ text, isActive });
  const [targetWidth, setTargetWidth] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [isRevealComplete, setIsRevealComplete] = useState(false);

  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) {
      return;
    }

    const update = (): void => {
      setTargetWidth(element.scrollWidth);
    };

    update();

    if (typeof window.ResizeObserver === 'undefined') {
      return;
    }

    const observer = new window.ResizeObserver(() => {
      update();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [text, animationKey]);

  useEffect(() => {
    const previous = previousRef.current;
    const becameActive = !previous.isActive && isActive;
    const textChangedWhileActive = previous.text !== text && isActive;

    if (becameActive || textChangedWhileActive) {
      setIsRevealComplete(false);
      setAnimationKey((prev) => prev + 1);
    }

    if (!isActive) {
      setIsRevealComplete(false);
    }

    previousRef.current = { text, isActive };
  }, [isActive, text]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    setIsRevealComplete(false);
  }, [animationKey, isActive]);

  const style = {
    '--handwriting-duration': `${durationMs}ms`,
    '--handwriting-delay': `${delayMs}ms`,
    '--handwriting-steps': String(steps),
    '--handwriting-target-width': `${Math.max(targetWidth, text.length * 12)}px`,
  } as CSSProperties;

  return (
    <span className={`handwriting-text ${className}`.trim()} style={style}>
      <span
        key={animationKey}
        ref={measureRef}
        className={`handwriting-text__content ${
          isActive ? '' : 'handwriting-text__content--inactive'
        } ${isRevealComplete ? 'handwriting-text__content--complete' : ''}`.trim()}
        onAnimationEnd={(event) => {
          if (event.animationName !== 'handwriting-reveal') {
            return;
          }

          setIsRevealComplete(true);
        }}
      >
        {text}
      </span>
    </span>
  );
}
