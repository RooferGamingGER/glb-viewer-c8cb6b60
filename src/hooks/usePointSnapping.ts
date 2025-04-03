
import { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';

/**
 * Hook for handling point snapping functionality
 */
export const usePointSnapping = (scene: THREE.Scene | null) => {
  // State for snapping settings
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [snapDistance, setSnapDistance] = useState<number>(0.5); // In world units
  const [isSnapping, setIsSnapping] = useState<boolean>(false);
  const [snapTarget, setSnapTarget] = useState<Point | null>(null);
  
  // Reference to snap indicator object
  const snapIndicatorRef = useRef<THREE.Mesh | null>(null);
  
  // Create snap indicator
  useEffect(() => {
    if (!scene) return;
    
    // Clean up existing indicator
    if (snapIndicatorRef.current) {
      scene.remove(snapIndicatorRef.current);
      if (snapIndicatorRef.current.geometry) {
        snapIndicatorRef.current.geometry.dispose();
      }
      if (snapIndicatorRef.current.material) {
        if (Array.isArray(snapIndicatorRef.current.material)) {
          snapIndicatorRef.current.material.forEach(m => m.dispose());
        } else {
          snapIndicatorRef.current.material.dispose();
        }
      }
      snapIndicatorRef.current = null;
    }
    
    // Create new indicator
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
      depthTest: false
    });
    
    snapIndicatorRef.current = new THREE.Mesh(geometry, material);
    snapIndicatorRef.current.visible = false;
    snapIndicatorRef.current.renderOrder = 999;
    scene.add(snapIndicatorRef.current);
    
    return () => {
      if (snapIndicatorRef.current) {
        scene.remove(snapIndicatorRef.current);
        if (snapIndicatorRef.current.geometry) {
          snapIndicatorRef.current.geometry.dispose();
        }
        if (snapIndicatorRef.current.material) {
          if (Array.isArray(snapIndicatorRef.current.material)) {
            snapIndicatorRef.current.material.forEach(m => m.dispose());
          } else {
            snapIndicatorRef.current.material.dispose();
          }
        }
        snapIndicatorRef.current = null;
      }
    };
  }, [scene]);
  
  // Clear snap indicator
  const clearSnapIndicator = useCallback(() => {
    if (snapIndicatorRef.current) {
      snapIndicatorRef.current.visible = false;
    }
    setIsSnapping(false);
    setSnapTarget(null);
  }, []);
  
  // Find a point to snap to
  const findSnapPoint = useCallback((
    point: Point,
    measurements: Measurement[],
    currentMeasurementId: string | null = null
  ): Point | null => {
    if (!snapEnabled) {
      clearSnapIndicator();
      return null;
    }
    
    let closestPoint: Point | null = null;
    let closestDistanceSquared = snapDistance * snapDistance;
    
    // Check all measurements
    for (const measurement of measurements) {
      // Skip the current measurement if in edit mode
      if (currentMeasurementId === measurement.id) continue;
      
      // Skip hidden measurements
      if (measurement.visible === false) continue;
      
      // Check all points in the measurement
      for (const p of measurement.points) {
        const distanceSquared = 
          Math.pow(p.x - point.x, 2) + 
          Math.pow(p.y - point.y, 2) + 
          Math.pow(p.z - point.z, 2);
        
        if (distanceSquared < closestDistanceSquared) {
          closestDistanceSquared = distanceSquared;
          closestPoint = p;
        }
      }
    }
    
    // Update snap indicator
    if (closestPoint && snapIndicatorRef.current) {
      snapIndicatorRef.current.position.set(closestPoint.x, closestPoint.y, closestPoint.z);
      snapIndicatorRef.current.visible = true;
      setIsSnapping(true);
      setSnapTarget(closestPoint);
    } else {
      clearSnapIndicator();
    }
    
    return closestPoint;
  }, [snapEnabled, snapDistance, clearSnapIndicator]);
  
  // Apply snapping to a point
  const applySnap = useCallback((
    point: Point,
    measurements: Measurement[],
    currentMeasurementId: string | null = null
  ): Point => {
    if (!snapEnabled) return point;
    
    const snapPoint = findSnapPoint(point, measurements, currentMeasurementId);
    
    if (snapPoint) {
      // Return the snap point
      return { ...snapPoint };
    }
    
    // If no snap point found, return the original point
    return point;
  }, [snapEnabled, findSnapPoint]);
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      clearSnapIndicator();
    };
  }, [clearSnapIndicator]);
  
  // Load snap enabled preference from localStorage
  useEffect(() => {
    const storedValue = localStorage.getItem('snapEnabled');
    if (storedValue !== null) {
      setSnapEnabled(storedValue === 'true');
    }
  }, []);
  
  // Save snap enabled preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('snapEnabled', snapEnabled.toString());
  }, [snapEnabled]);
  
  return {
    snapEnabled,
    setSnapEnabled,
    snapDistance,
    setSnapDistance,
    isSnapping,
    snapTarget,
    findSnapPoint,
    applySnap,
    clearSnapIndicator
  };
};
