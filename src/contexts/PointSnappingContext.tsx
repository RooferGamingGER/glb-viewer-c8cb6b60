import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';

interface PointSnappingContextType {
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  snapDistance: number;
  setSnapDistance: (distance: number) => void;
  isSnapping: boolean;
  snapTarget: Point | null;
  findSnapPoint: (
    point: Point,
    measurements: Measurement[],
    currentMeasurementId?: string | null,
    currentPosition?: Point
  ) => Point | null;
  applySnap: (
    point: Point,
    measurements: Measurement[],
    currentMeasurementId?: string | null
  ) => Point;
  clearSnapIndicator: (immediate?: boolean) => void;
  registerScene: (scene: THREE.Scene | null) => void;
}

const PointSnappingContext = createContext<PointSnappingContextType | undefined>(undefined);

export function usePointSnapping() {
  const context = useContext(PointSnappingContext);
  if (context === undefined) {
    throw new Error('usePointSnapping must be used within a PointSnappingProvider');
  }
  return context;
}

export const PointSnappingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State for snapping settings - DEFAULT TO DISABLED
  const [snapEnabled, setSnapEnabled] = useState<boolean>(false);
  const [snapDistance, setSnapDistance] = useState<number>(0.5); // In world units
  const [isSnapping, setIsSnapping] = useState<boolean>(false);
  const [snapTarget, setSnapTarget] = useState<Point | null>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  
  // Add hysteresis values for snap activation and deactivation
  const snapActivationDistance = snapDistance;
  const snapDeactivationDistance = snapDistance * 1.2; // 20% larger to prevent flicker
  
  // Add debounce timer ref
  const snapDebounceTimerRef = useRef<number | null>(null);
  
  // Reference to snap indicator object
  const snapIndicatorRef = useRef<THREE.Mesh | null>(null);
  const snapLineRef = useRef<THREE.Line | null>(null);
  const lastSnapPointRef = useRef<Point | null>(null);

  // Register scene function for components that have access to the scene
  const registerScene = useCallback((newScene: THREE.Scene | null) => {
    setScene(newScene);
  }, []);
  
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
    
    // Clean up existing line
    if (snapLineRef.current) {
      scene.remove(snapLineRef.current);
      if (snapLineRef.current.geometry) {
        snapLineRef.current.geometry.dispose();
      }
      if (snapLineRef.current.material) {
        if (Array.isArray(snapLineRef.current.material)) {
          snapLineRef.current.material.forEach(m => m.dispose());
        } else {
          snapLineRef.current.material.dispose();
        }
      }
      snapLineRef.current = null;
    }
    
    // Create new indicator (slightly larger for better visibility)
    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });
    
    snapIndicatorRef.current = new THREE.Mesh(geometry, material);
    snapIndicatorRef.current.visible = false;
    snapIndicatorRef.current.renderOrder = 999;
    scene.add(snapIndicatorRef.current);
    
    // Create line geometry for connection line
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.6,
      depthTest: false
    });
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    
    snapLineRef.current = new THREE.Line(lineGeometry, lineMaterial);
    snapLineRef.current.visible = false;
    snapLineRef.current.renderOrder = 998;
    scene.add(snapLineRef.current);
    
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
      
      if (snapLineRef.current) {
        scene.remove(snapLineRef.current);
        if (snapLineRef.current.geometry) {
          snapLineRef.current.geometry.dispose();
        }
        if (snapLineRef.current.material) {
          if (Array.isArray(snapLineRef.current.material)) {
            snapLineRef.current.material.forEach(m => m.dispose());
          } else {
            snapLineRef.current.material.dispose();
          }
        }
        snapLineRef.current = null;
      }
      
      // Clear any pending debounce timers
      if (snapDebounceTimerRef.current !== null) {
        window.clearTimeout(snapDebounceTimerRef.current);
        snapDebounceTimerRef.current = null;
      }
    };
  }, [scene]);
  
  // Clear snap indicator with debounce
  const clearSnapIndicator = useCallback((immediate = false) => {
    // If immediate is true, clear right away
    if (immediate) {
      if (snapIndicatorRef.current) {
        snapIndicatorRef.current.visible = false;
      }
      if (snapLineRef.current) {
        snapLineRef.current.visible = false;
      }
      setIsSnapping(false);
      setSnapTarget(null);
      lastSnapPointRef.current = null;
      
      // Clear any pending debounce timer
      if (snapDebounceTimerRef.current !== null) {
        window.clearTimeout(snapDebounceTimerRef.current);
        snapDebounceTimerRef.current = null;
      }
      
      return;
    }
    
    // Otherwise use debouncing to prevent flickering
    if (snapDebounceTimerRef.current !== null) {
      window.clearTimeout(snapDebounceTimerRef.current);
    }
    
    // Set a 150ms debounce timer
    snapDebounceTimerRef.current = window.setTimeout(() => {
      if (snapIndicatorRef.current) {
        snapIndicatorRef.current.visible = false;
      }
      if (snapLineRef.current) {
        snapLineRef.current.visible = false;
      }
      setIsSnapping(false);
      setSnapTarget(null);
      lastSnapPointRef.current = null;
      snapDebounceTimerRef.current = null;
    }, 150);
  }, []);
  
  // Find a point to snap to with hysteresis logic
  const findSnapPoint = useCallback((
    point: Point,
    measurements: Measurement[],
    currentMeasurementId: string | null = null,
    currentPosition?: Point // Current cursor position for visualizing line
  ): Point | null => {
    if (!snapEnabled) {
      clearSnapIndicator(true);
      return null;
    }
    
    // Cancel any pending clear operations since we're actively checking for snap points
    if (snapDebounceTimerRef.current !== null) {
      window.clearTimeout(snapDebounceTimerRef.current);
      snapDebounceTimerRef.current = null;
    }
    
    let closestPoint: Point | null = null;
    let closestDistanceSquared = Infinity;
    
    // Determine threshold based on current snap state - this is the hysteresis
    const thresholdDistanceSquared = isSnapping && lastSnapPointRef.current 
        ? snapDeactivationDistance * snapDeactivationDistance 
        : snapActivationDistance * snapActivationDistance;
    
    // Check if we're already snapping to a point
    // If so, check if we're still within the deactivation distance of that point
    if (isSnapping && lastSnapPointRef.current) {
      const currentSnapDistanceSquared = 
        Math.pow(lastSnapPointRef.current.x - point.x, 2) + 
        Math.pow(lastSnapPointRef.current.y - point.y, 2) + 
        Math.pow(lastSnapPointRef.current.z - point.z, 2);
      
      if (currentSnapDistanceSquared <= thresholdDistanceSquared) {
        // Still within the deactivation distance of the current snap point
        // Keep using the same snap point for stability
        closestPoint = lastSnapPointRef.current;
        closestDistanceSquared = currentSnapDistanceSquared;
      }
    }
    
    // Only search for a new closest point if we're not already snapping
    // or we've moved outside the threshold of the current snap point
    if (!closestPoint) {
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
          
          if (distanceSquared < thresholdDistanceSquared && distanceSquared < closestDistanceSquared) {
            closestDistanceSquared = distanceSquared;
            closestPoint = p;
          }
        }
      }
    }
    
    // Update snap indicator only if we have access to the scene
    if (closestPoint && scene) {
      if (snapIndicatorRef.current) {
        snapIndicatorRef.current.position.set(closestPoint.x, closestPoint.y, closestPoint.z);
        snapIndicatorRef.current.visible = true;
        
        // Add slight animation/pulse effect when snapping
        const material = snapIndicatorRef.current.material as THREE.MeshBasicMaterial;
        material.opacity = 0.8 + Math.sin(Date.now() * 0.008) * 0.2; // Subtle pulse between 0.6-1.0 opacity
      }
      
      // Update snap line if we have current cursor position
      if (snapLineRef.current && currentPosition) {
        const linePositions = snapLineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        
        linePositions.setXYZ(0, currentPosition.x, currentPosition.y, currentPosition.z);
        linePositions.setXYZ(1, closestPoint.x, closestPoint.y, closestPoint.z);
        linePositions.needsUpdate = true;
        
        snapLineRef.current.visible = true;
      } else if (snapLineRef.current) {
        snapLineRef.current.visible = false;
      }
      
      setIsSnapping(true);
      setSnapTarget(closestPoint);
      lastSnapPointRef.current = closestPoint;
    } else {
      clearSnapIndicator();
    }
    
    return closestPoint;
  }, [snapEnabled, snapActivationDistance, snapDeactivationDistance, isSnapping, clearSnapIndicator, scene]);
  
  // Apply snapping to a point
  const applySnap = useCallback((
    point: Point,
    measurements: Measurement[],
    currentMeasurementId: string | null = null
  ): Point => {
    if (!snapEnabled) return point;
    
    const snapPoint = findSnapPoint(point, measurements, currentMeasurementId, point);
    
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
      clearSnapIndicator(true);
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
  
  const value = {
    snapEnabled,
    setSnapEnabled,
    snapDistance,
    setSnapDistance,
    isSnapping,
    snapTarget,
    findSnapPoint,
    applySnap,
    clearSnapIndicator,
    registerScene
  };

  return (
    <PointSnappingContext.Provider value={value}>
      {children}
    </PointSnappingContext.Provider>
  );
};
