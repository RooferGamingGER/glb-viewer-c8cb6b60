
import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';

// Configuration
const SNAP_THRESHOLD = 0.2; // Base threshold in meters
const SNAP_HYSTERESIS = 0.1; // Additional distance to maintain snapping once engaged
const SNAP_COLOR = '#00ff00'; // Bright green
const SNAP_PULSE_COLOR = '#4bff4b'; // Lighter green for pulsing effect
const SNAP_RADIUS = 0.15; // Size of the snap indicator
const INDICATOR_SCALE_FACTOR = 1.5; // How much larger the indicator is than the actual snap area
const INDICATOR_OPACITY = 0.7; // Opacity of the indicator

interface SnapState {
  isSnapping: boolean;
  snapTarget: {
    point: Point;
    measurementId?: string;
    pointIndex?: number;
  } | null;
}

/**
 * Enhanced hook for point snapping with hysteresis and improved visual feedback
 */
export const usePointSnapping = (scene: THREE.Scene | null) => {
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [snapState, setSnapState] = useState<SnapState>({
    isSnapping: false,
    snapTarget: null
  });
  
  // Use refs to avoid stale closures in event handlers
  const snapEnabledRef = useRef(snapEnabled);
  const snapStateRef = useRef(snapState);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const snapIndicatorRef = useRef<THREE.Group | null>(null);
  const pulseAnimationRef = useRef<number>(0);
  
  // Update refs when state changes
  useEffect(() => {
    snapEnabledRef.current = snapEnabled;
    snapStateRef.current = snapState;
  }, [snapEnabled, snapState]);

  // Create the snap indicator
  const createSnapIndicator = useCallback(() => {
    if (!scene) return;
    
    // Clean up any existing indicator first
    clearSnapIndicator();
    
    // Create a group to hold the indicator elements
    const group = new THREE.Group();
    group.name = 'snapIndicator';
    
    // Create a pulsing circle
    const ringGeometry = new THREE.RingGeometry(SNAP_RADIUS * 0.8, SNAP_RADIUS, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: SNAP_COLOR,
      transparent: true,
      opacity: INDICATOR_OPACITY,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    
    // Create a filled circle
    const circleGeometry = new THREE.CircleGeometry(SNAP_RADIUS * 0.7, 32);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: SNAP_PULSE_COLOR,
      transparent: true,
      opacity: INDICATOR_OPACITY * 0.7,
      side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    
    // Add to group and position correctly
    ring.rotation.x = -Math.PI / 2;
    circle.rotation.x = -Math.PI / 2;
    
    // Position slightly above the surface to avoid z-fighting
    ring.position.y = 0.01;
    circle.position.y = 0.01;
    
    group.add(ring);
    group.add(circle);
    group.visible = false;
    
    scene.add(group);
    snapIndicatorRef.current = group;
    
    return group;
  }, [scene]);

  // Update the snap indicator position and animation
  const updateSnapIndicator = useCallback((point: Point | null, isSnapping: boolean) => {
    if (!snapIndicatorRef.current || !point) {
      if (snapIndicatorRef.current) {
        snapIndicatorRef.current.visible = false;
      }
      return;
    }
    
    // Position the indicator
    snapIndicatorRef.current.position.set(point.x, point.y, point.z);
    snapIndicatorRef.current.visible = true;
    
    // Animate the indicator if snapping
    if (isSnapping) {
      // Get the circle element (second child)
      const circle = snapIndicatorRef.current.children[1] as THREE.Mesh;
      const ring = snapIndicatorRef.current.children[0] as THREE.Mesh;
      
      if (circle && circle.material) {
        // Pulsing opacity effect
        const circleMaterial = circle.material as THREE.MeshBasicMaterial;
        const ringMaterial = ring.material as THREE.MeshBasicMaterial;
        
        // Update pulse animation
        pulseAnimationRef.current = (pulseAnimationRef.current + 0.05) % (Math.PI * 2);
        const pulseValue = (Math.sin(pulseAnimationRef.current) + 1) / 2; // 0 to 1
        
        circleMaterial.opacity = INDICATOR_OPACITY * 0.5 + (pulseValue * INDICATOR_OPACITY * 0.5);
        ringMaterial.color.set(pulseValue > 0.7 ? SNAP_PULSE_COLOR : SNAP_COLOR);
        
        // Scale effect
        const scale = 1 + (pulseValue * 0.2);
        ring.scale.set(scale, scale, 1);
      }
    }
  }, []);

  // Clear the snap indicator from the scene
  const clearSnapIndicator = useCallback(() => {
    if (snapIndicatorRef.current && scene) {
      scene.remove(snapIndicatorRef.current);
      snapIndicatorRef.current = null;
    }
  }, [scene]);

  // Setup and cleanup
  useEffect(() => {
    if (!scene) return;
    
    // Create the snap indicator
    createSnapIndicator();
    
    // Setup animation loop for pulsing effect
    const animateIndicator = () => {
      if (snapStateRef.current.isSnapping && snapStateRef.current.snapTarget) {
        updateSnapIndicator(snapStateRef.current.snapTarget.point, true);
      }
      requestAnimationFrame(animateIndicator);
    };
    
    const animationId = requestAnimationFrame(animateIndicator);
    
    return () => {
      cancelAnimationFrame(animationId);
      clearSnapIndicator();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [scene, createSnapIndicator, updateSnapIndicator, clearSnapIndicator]);

  // Set snapping status with or without a point
  const setSnapping = useCallback((
    isSnapping: boolean, 
    point?: Point, 
    measurementId?: string, 
    pointIndex?: number
  ) => {
    // Cancel any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // If we're turning off snapping, debounce it to avoid flickering
    if (!isSnapping && snapStateRef.current.isSnapping) {
      debounceTimerRef.current = setTimeout(() => {
        setSnapState({
          isSnapping: false,
          snapTarget: null
        });
        updateSnapIndicator(null, false);
      }, 150); // Short delay to reduce flickering
      return;
    }
    
    // If we're turning on snapping or updating the target point
    if (isSnapping && point) {
      setSnapState({
        isSnapping,
        snapTarget: {
          point,
          measurementId,
          pointIndex
        }
      });
      updateSnapIndicator(point, true);
    }
  }, [updateSnapIndicator]);

  // Check if a point is within snap distance of any existing point
  const checkPointForSnapping = useCallback((
    point: Point,
    measurements: Measurement[],
    activeId?: string | null,
    excludePointIndex?: number
  ) => {
    if (!snapEnabledRef.current) return null;
    
    // Determine the effective threshold based on current state
    // If already snapping, use a larger threshold (hysteresis)
    const effectiveThreshold = snapStateRef.current.isSnapping 
      ? SNAP_THRESHOLD + SNAP_HYSTERESIS 
      : SNAP_THRESHOLD;
    
    let closestPoint: Point | null = null;
    let closestDistance = Infinity;
    let closestMeasurementId: string | undefined;
    let closestPointIndex: number | undefined;
    
    // Check all measurements
    for (const measurement of measurements) {
      // Skip the current measurement if we're editing and should exclude self
      if (activeId && measurement.id === activeId) {
        for (let i = 0; i < measurement.points.length; i++) {
          // Skip the point we're currently editing
          if (excludePointIndex !== undefined && i === excludePointIndex) continue;
          
          const p = measurement.points[i];
          const distance = calculateDistance(point, p);
          
          if (distance < effectiveThreshold && distance < closestDistance) {
            closestDistance = distance;
            closestPoint = p;
            closestMeasurementId = measurement.id;
            closestPointIndex = i;
          }
        }
      } else {
        // Check points in other measurements
        for (let i = 0; i < measurement.points.length; i++) {
          const p = measurement.points[i];
          const distance = calculateDistance(point, p);
          
          if (distance < effectiveThreshold && distance < closestDistance) {
            closestDistance = distance;
            closestPoint = p;
            closestMeasurementId = measurement.id;
            closestPointIndex = i;
          }
        }
      }
    }
    
    // If we found a point to snap to
    if (closestPoint) {
      return {
        point: closestPoint,
        measurementId: closestMeasurementId,
        pointIndex: closestPointIndex
      };
    }
    
    return null;
  }, []);

  // Calculate distance between points
  const calculateDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2)
    );
  };

  // Return the public API
  return {
    snapEnabled,
    setSnapEnabled,
    isSnapping: snapState.isSnapping,
    snapTarget: snapState.snapTarget,
    setSnapping,
    checkPointForSnapping,
    clearSnapIndicator,
    updateSnapIndicator
  };
};
