import { to, useSpring } from '@react-spring/web';
import { useEffect, useMemo, useRef, useState } from 'react';

type UseStampAnimationOptions = {
  enabled?: boolean;
  delayMs?: number;
  baseTransform?: string;
  finalRotationDeg?: number;
};

export function useStampAnimation({
  enabled = true,
  delayMs = 1000,
  baseTransform = '',
  finalRotationDeg = -19,
}: UseStampAnimationOptions = {}) {
  const preparedBaseTransform = useMemo(() => baseTransform.trim(), [baseTransform]);
  const initialRotationDeg = finalRotationDeg - 11;
  const impactRotationDeg = finalRotationDeg + 3;
  const [isFinalized, setIsFinalized] = useState(false);

  const hiddenState = useMemo(
    () => ({
      opacity: 0,
      y: -38,
      scale: 1.45,
      rotation: initialRotationDeg,
    }),
    [initialRotationDeg],
  );

  const finalTransform = useMemo(() => {
    const motionTransform = `translate3d(0px, 0px, 0) rotate(${finalRotationDeg}deg) scale(1)`;
    return preparedBaseTransform ? `${preparedBaseTransform} ${motionTransform}` : motionTransform;
  }, [finalRotationDeg, preparedBaseTransform]);

  const [spring, api] = useSpring(() => hiddenState);
  const apiRef = useRef(api);
  const hasPlayedRef = useRef(false);

  apiRef.current = api;

  useEffect(() => {
    const springApi = apiRef.current;

    if (!enabled) {
      return;
    }

    if (hasPlayedRef.current) {
      setIsFinalized(true);
      return;
    }

    setIsFinalized(false);

    let isCancelled = false;
    const timer = window.setTimeout(
      () => {
        void (async () => {
          if (isCancelled || hasPlayedRef.current) {
            return;
          }

          await springApi.start({
            opacity: 1,
            y: 2,
            scale: 0.94,
            rotation: impactRotationDeg,
            config: {
              tension: 760,
              friction: 24,
              mass: 0.7,
            },
          });

          if (isCancelled) {
            return;
          }

          await springApi.start({
            opacity: 1,
            y: 0,
            scale: 1,
            rotation: finalRotationDeg,
            config: {
              tension: 460,
              friction: 19,
              mass: 0.9,
            },
          });

          if (!isCancelled) {
            hasPlayedRef.current = true;
            setIsFinalized(true);
          }
        })();
      },
      Math.max(delayMs, 0),
    );

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
      springApi.stop();
    };
  }, [delayMs, enabled, finalRotationDeg, impactRotationDeg]);

  if (isFinalized) {
    return {
      style: {
        opacity: 1,
        transform: finalTransform,
      },
    };
  }

  return {
    style: {
      opacity: spring.opacity,
      transform: to([spring.y, spring.scale, spring.rotation], (y, scale, rotation) => {
        const motionTransform = `translate3d(0px, ${y}px, 0px) rotate(${rotation}deg) scale(${scale})`;
        return preparedBaseTransform
          ? `${preparedBaseTransform} ${motionTransform}`
          : motionTransform;
      }),
    },
  };
}
