import { useState, useEffect } from 'react';

export function useAnimatedCounter(targetValue: number, durationMs: number = 800): number {
  const [displayValue, setDisplayValue] = useState(targetValue);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const diff = targetValue - startValue;

    if (diff === 0) return;

    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * easedProgress;

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, [targetValue, durationMs]);

  return displayValue;
}
