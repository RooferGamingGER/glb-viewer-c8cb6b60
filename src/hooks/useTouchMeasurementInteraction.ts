
import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Point } from '@/types/measurements';
import { useScreenOrientation } from './useScreenOrientation';

/**
 * Hook that provides optimized touch interactions for measurement tools
 */
export const useTouchMeasurementInteraction = (
  enabled: boolean,
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  handlers: {
    addPoint: (point: Point) => void,
    updateMovingPoint: (event: TouchEvent) => void,
    finishPointMovement: (point: Point | null) => void
  }
) => {
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const [lastTouchPosition, setLastTouchPosition] = useState<{x: number, y: number} | null>(null);
  const [isTouchMoving, setIsTouchMoving] = useState<boolean>(false);
  
  const { isTablet, isPhone } = useScreenOrientation();
  const isTouchDevice = isTablet || isPhone;
  
  // Constants for touch interaction
  const LONG_PRESS_DURATION = 500; // ms
  const TOUCH_MOVE_THRESHOLD = 10; // pixels

  // Handle touch start events
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || !isTouchDevice) return;
    
    // Prevent default to avoid scrolling/zooming while using the measurement tool
    e.preventDefault();
    
    if (e.touches.length === 1) {
      setTouchStartTime(Date.now());
      setLastTouchPosition({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
      setIsTouchMoving(false);
      
      // Start long press timer
      const timer = window.setTimeout(() => {
        // Execute long press action (e.g., show context menu)
        console.log('Long press detected');
      }, LONG_PRESS_DURATION);
      
      setLongPressTimer(timer);
    }
  }, [enabled, isTouchDevice]);
  
  // Handle touch move events
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !isTouchDevice || !lastTouchPosition) return;
    
    if (e.touches.length === 1) {
      const currentPosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
      
      // Calculate distance moved
      const distance = Math.sqrt(
        Math.pow(currentPosition.x - lastTouchPosition.x, 2) +
        Math.pow(currentPosition.y - lastTouchPosition.y, 2)
      );
      
      // If moved more than threshold, cancel long press and set as moving
      if (distance > TOUCH_MOVE_THRESHOLD) {
        if (longPressTimer !== null) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
        
        setIsTouchMoving(true);
        
        // If we're in point movement mode, update the point position
        if (handlers.updateMovingPoint) {
          handlers.updateMovingPoint(e);
        }
      }
      
      setLastTouchPosition(currentPosition);
    }
  }, [enabled, isTouchDevice, lastTouchPosition, longPressTimer, handlers, TOUCH_MOVE_THRESHOLD]);
  
  // Handle touch end events
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !isTouchDevice) return;
    
    // Clear long press timer if it exists
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Calculate touch duration
    const touchDuration = Date.now() - touchStartTime;
    
    // If it was a quick tap (not a long press or move)
    if (touchDuration < LONG_PRESS_DURATION && !isTouchMoving) {
      // Handle as a tap/click for point placement
      const canvasElement = canvasRef.current;
      if (!canvasElement || !scene || !camera) return;
      
      // Logic for point placement would go here
      // For now, we'll just log that a tap was detected
      console.log('Tap detected for measurement point placement');
    }
    
    // Reset touch state
    setLastTouchPosition(null);
    setIsTouchMoving(false);
  }, [enabled, isTouchDevice, touchStartTime, isTouchMoving, longPressTimer, canvasRef, scene, camera, handlers]);
  
  // Clean up
  useEffect(() => {
    return () => {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);
  
  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isTouchDevice,
    isTouchMoving,
    touchStartTime,
    lastTouchPosition
  };
};
