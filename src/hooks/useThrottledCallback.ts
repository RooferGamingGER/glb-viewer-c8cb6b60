
import { useCallback, useRef } from 'react';

/**
 * Hook that returns a throttled version of the callback
 * @param callback The function to throttle
 * @param delay The delay in ms
 * @returns Throttled function
 */
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  const lastCallTimeRef = useRef(0);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTimeRef.current;
      
      // Store the latest arguments
      lastArgsRef.current = args;
      
      // If we haven't exceeded the delay, schedule a call
      if (timeSinceLastCall < delay) {
        // Clear any existing timeout
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }
        
        // Schedule a new call when the delay expires
        timeoutIdRef.current = setTimeout(() => {
          lastCallTimeRef.current = Date.now();
          if (lastArgsRef.current) {
            callback(...lastArgsRef.current);
          }
          timeoutIdRef.current = null;
        }, delay - timeSinceLastCall);
        
        return;
      }
      
      // It's been longer than the delay, execute immediately
      lastCallTimeRef.current = now;
      callback(...args);
    },
    [callback, delay]
  );
};
