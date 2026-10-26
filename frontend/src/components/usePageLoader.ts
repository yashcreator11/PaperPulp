// src/hooks/usePageLoader.ts
import { useCallback, useRef, useState } from "react";

/**
 * usePageLoader - returns { isLoading, show }.
 * show() will set loading true for at least minDuration ms.
 */
export const usePageLoader = (minDuration = 100) => {
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const show = useCallback(() => {
    clearTimer();
    setIsLoading(true);
    startRef.current = Date.now();

    // ensure loader will hide after at least minDuration
    timerRef.current = window.setTimeout(() => {
      setIsLoading(false);
      timerRef.current = null;
      startRef.current = null;
    }, minDuration);
  }, [minDuration]);

  const hide = useCallback(() => {
    // If we call hide manually, ensure minDuration
    const elapsed = startRef.current ? Date.now() - startRef.current : minDuration;
    const remaining = Math.max(0, minDuration - elapsed);
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setIsLoading(false);
      timerRef.current = null;
      startRef.current = null;
    }, remaining);
  }, [minDuration]);

  return { isLoading, show, hide };
};

export default usePageLoader;
