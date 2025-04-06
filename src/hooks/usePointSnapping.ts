
import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';

/**
 * Enhanced hook for point snapping with visual feedback and hysteresis
 */
export const usePointSnapping = (scene: THREE.Scene | null) => {
  // State for controlling snap behavior
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [isSnapping, setIsSnapping] = useState<boolean>(false);
  const [snapTarget, setSnapTarget] = useState<{
    point: Point,
    measurementId?: string,
    pointIndex?: number
  } | null>(null);
  
  // Snap indicator reference
  const snapIndicatorRef = useRef<THREE.Object3D | null>(null);
  
  // Hysteresis values for stable snapping
  const SNAP_DISTANCE = 0.3; // Units in 3D space
  const SNAP_RELEASE_DISTANCE = 0.4; // Slightly larger to prevent oscillation
  
  // Set snapping state with target info
  const setSnapping = useCallback((
    isSnap: boolean,
    point?: Point, 
    measurementId?: string, 
    pointIndex?: number
  ) => {
    setIsSnapping(isSnap);
    
    if (isSnap && point) {
      setSnapTarget({ point, measurementId, pointIndex });
      // Show snap indicator
      showSnapIndicator(point);
    } else {
      setSnapTarget(null);
      // Hide snap indicator
      clearSnapIndicator();
    }
  }, []);
  
  // Show visual indicator at snap point
  const showSnapIndicator = useCallback((point: Point) => {
    if (!scene) return;
    
    // Remove existing indicator if present
    clearSnapIndicator();
    
    // Create new indicator
    const geometry = new THREE.SphereGeometry(0.05, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const sphere = new THREE.Mesh(geometry, material);
    
    sphere.position.set(point.x, point.y, point.z);
    sphere.name = 'snapIndicator';
    sphere.userData = { isSnapIndicator: true };
    
    scene.add(sphere);
    snapIndicatorRef.current = sphere;
    
    // Add a pulse effect
    const startTime = Date.now();
    const animate = () => {
      if (!snapIndicatorRef.current) return;
      
      const elapsedTime = (Date.now() - startTime) / 1000;
      const scale = 1 + 0.2 * Math.sin(elapsedTime * 5);
      
      snapIndicatorRef.current.scale.set(scale, scale, scale);
      
      if (snapIndicatorRef.current) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [scene]);
  
  // Clear snap indicator
  const clearSnapIndicator = useCallback(() => {
    if (!scene || !snapIndicatorRef.current) return;
    
    scene.remove(snapIndicatorRef.current);
    snapIndicatorRef.current = null;
  }, [scene]);
  
  // Check if a point should snap to any existing points
  const checkPointForSnapping = useCallback((
    testPoint: Point, 
    measurements: Measurement[], 
    currentMeasurementId?: string
  ) => {
    if (!snapEnabled) {
      setSnapping(false);
      return false;
    }
    
    // Calculate snapping threshold based on current state
    const threshold = isSnapping ? SNAP_RELEASE_DISTANCE : SNAP_DISTANCE;
    
    // Find closest point to snap to
    let closestPoint: Point | null = null;
    let closestDistance = threshold;
    let closestMeasurementId: string | undefined;
    let closestPointIndex: number | undefined;
    
    // Check all measurements
    for (const measurement of measurements) {
      // Skip current measurement if specified
      if (currentMeasurementId && measurement.id === currentMeasurementId) continue;
      
      // Check each point in the measurement
      if (measurement.points) {
        for (let i = 0; i < measurement.points.length; i++) {
          const point = measurement.points[i];
          const distance = calculateDistance(testPoint, point);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = point;
            closestMeasurementId = measurement.id;
            closestPointIndex = i;
          }
        }
      }
    }
    
    // If we found a close point, enable snapping
    if (closestPoint) {
      setSnapping(true, closestPoint, closestMeasurementId, closestPointIndex);
      return true;
    }
    
    // No close points found, disable snapping
    setSnapping(false);
    return false;
  }, [snapEnabled, isSnapping, setSnapping, SNAP_DISTANCE, SNAP_RELEASE_DISTANCE]);
  
  // Find but don't apply snap point - just returns it or null
  const findSnapPoint = useCallback((
    testPoint: Point,
    measurements: Measurement[],
    currentMeasurementId?: string
  ): Point | null => {
    if (!snapEnabled) return null;
    
    // Calculate snapping threshold
    const threshold = isSnapping ? SNAP_RELEASE_DISTANCE : SNAP_DISTANCE;
    
    // Find closest point to snap to
    let closestPoint: Point | null = null;
    let closestDistance = threshold;
    
    // Check all measurements
    for (const measurement of measurements) {
      // Skip current measurement if specified
      if (currentMeasurementId && measurement.id === currentMeasurementId) continue;
      
      // Check each point in the measurement
      if (measurement.points) {
        for (let i = 0; i < measurement.points.length; i++) {
          const point = measurement.points[i];
          const distance = calculateDistance(testPoint, point);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = point;
          }
        }
      }
    }
    
    return closestPoint;
  }, [snapEnabled, isSnapping, SNAP_DISTANCE, SNAP_RELEASE_DISTANCE]);
  
  // Apply snapping to a point
  const applySnap = useCallback((
    point: Point,
    measurements: Measurement[],
    currentMeasurementId?: string
  ): Point => {
    // If snapping is disabled, return original point
    if (!snapEnabled) return point;
    
    // Find snap point
    const snapPoint = findSnapPoint(point, measurements, currentMeasurementId);
    
    // Return snap point if found, otherwise original point
    return snapPoint || point;
  }, [snapEnabled, findSnapPoint]);
  
  // Helper function to calculate distance between points
  const calculateDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  };
  
  return {
    snapEnabled,
    setSnapEnabled,
    isSnapping,
    snapTarget,
    setSnapping,
    checkPointForSnapping,
    clearSnapIndicator,
    findSnapPoint,
    applySnap
  };
};
