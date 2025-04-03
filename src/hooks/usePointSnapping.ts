
import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';

// Snap tolerance in world units (e.g., meters)
const SNAP_TOLERANCE = 0.5;
// Snap tolerance with hysteresis for stability
const SNAP_HYSTERESIS_IN = 0.6;  // More generous to snap in
const SNAP_HYSTERESIS_OUT = 0.4; // Stricter to snap out

// Debounce time for clearing snap indicators (ms)
const CLEAR_INDICATOR_DEBOUNCE = 500;

/**
 * Enhanced hook for point snapping functionality with improved stability
 */
export const usePointSnapping = (scene: THREE.Scene | null) => {
  // Main state for snapping
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [isSnapping, setIsSnapping] = useState<boolean>(false);
  const [snapTarget, setSnapTarget] = useState<{
    point: Point;
    measurementId?: string;
    pointIndex?: number;
  } | null>(null);

  // Refs for internal state management
  const snapIndicatorRef = useRef<THREE.Mesh | null>(null);
  const clearSnapIndicatorTimerRef = useRef<number | null>(null);
  
  // Set snapping state
  const setSnapping = useCallback((
    isSnap: boolean,
    point?: Point,
    measurementId?: string,
    pointIndex?: number
  ) => {
    setIsSnapping(isSnap);
    
    if (isSnap && point) {
      setSnapTarget({
        point,
        measurementId,
        pointIndex
      });
      
      // Create or update snap indicator
      createSnapIndicator(point);
      
      // Clear any pending clear timer
      if (clearSnapIndicatorTimerRef.current !== null) {
        window.clearTimeout(clearSnapIndicatorTimerRef.current);
        clearSnapIndicatorTimerRef.current = null;
      }
    } else {
      setSnapTarget(null);
      
      // Schedule clearing the indicator with debounce
      if (clearSnapIndicatorTimerRef.current === null) {
        clearSnapIndicatorTimerRef.current = window.setTimeout(() => {
          clearSnapIndicator();
          clearSnapIndicatorTimerRef.current = null;
        }, CLEAR_INDICATOR_DEBOUNCE);
      }
    }
  }, []);
  
  // Clear snap indicator
  const clearSnapIndicator = useCallback(() => {
    if (snapIndicatorRef.current && scene) {
      scene.remove(snapIndicatorRef.current);
      snapIndicatorRef.current = null;
    }
  }, [scene]);
  
  // Create snap indicator
  const createSnapIndicator = useCallback((point: Point) => {
    if (!scene) return;
    
    // Clear existing indicator
    if (snapIndicatorRef.current) {
      scene.remove(snapIndicatorRef.current);
    }
    
    // Create a larger, more visible snap indicator
    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.position.set(point.x, point.y, point.z);
    indicator.userData = { isUI: true };
    
    scene.add(indicator);
    snapIndicatorRef.current = indicator;
    
    // Add a pulsing animation
    const pulseAnimation = () => {
      if (!snapIndicatorRef.current) return;
      
      const time = Date.now() * 0.002;
      const pulse = Math.sin(time) * 0.2 + 1.0;
      
      snapIndicatorRef.current.scale.set(pulse, pulse, pulse);
      requestAnimationFrame(pulseAnimation);
    };
    
    pulseAnimation();
  }, [scene]);
  
  // Check if a point should snap to any existing points
  const checkPointForSnapping = useCallback((
    testPoint: Point,
    measurements: Measurement[],
    currentMeasurementId?: string | null,
    currentPointIndex?: number | null
  ) => {
    if (!snapEnabled) return null;
    
    let closestPoint: Point | null = null;
    let closestDistance = isSnapping ? SNAP_HYSTERESIS_OUT : SNAP_HYSTERESIS_IN;
    let closestMeasurementId: string | undefined;
    let closestPointIndex: number | undefined;
    
    // Function to process a point
    const processPoint = (point: Point, measurementId: string, pointIndex: number) => {
      const distance = Math.sqrt(
        Math.pow(testPoint.x - point.x, 2) +
        Math.pow(testPoint.y - point.y, 2) +
        Math.pow(testPoint.z - point.z, 2)
      );
      
      // Skip the current point if we're editing
      if (
        currentMeasurementId === measurementId && 
        currentPointIndex === pointIndex
      ) {
        return;
      }
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
        closestMeasurementId = measurementId;
        closestPointIndex = pointIndex;
      }
    };
    
    // Check all measurements
    for (const measurement of measurements) {
      // Skip hidden measurements
      if (measurement.visible === false) continue;
      
      // Process each point in the measurement
      measurement.points.forEach((point, index) => {
        processPoint(point, measurement.id, index);
      });
    }
    
    if (closestPoint) {
      return {
        point: closestPoint,
        measurementId: closestMeasurementId,
        pointIndex: closestPointIndex
      };
    }
    
    return null;
  }, [snapEnabled, isSnapping]);
  
  // Clean up on unmount or when scene changes
  useEffect(() => {
    return () => {
      clearSnapIndicator();
      if (clearSnapIndicatorTimerRef.current !== null) {
        window.clearTimeout(clearSnapIndicatorTimerRef.current);
        clearSnapIndicatorTimerRef.current = null;
      }
    };
  }, [clearSnapIndicator]);
  
  return {
    snapEnabled,
    setSnapEnabled,
    isSnapping,
    snapTarget,
    setSnapping,
    checkPointForSnapping,
    clearSnapIndicator
  };
};
