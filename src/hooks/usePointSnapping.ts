
import { useCallback, useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Point, Measurement, Segment } from '@/types/measurements';
import { toast } from 'sonner';

// Snapping threshold in meters (how close points need to be to snap)
const SNAP_THRESHOLD = 0.15;
// Visual indicator size
const INDICATOR_SIZE = 0.2;

export const usePointSnapping = (scene: THREE.Scene | null) => {
  // State to track if snapping is currently active
  const [isSnapping, setIsSnapping] = useState(false);
  // Store the point we're potentially snapping to
  const [snapTarget, setSnapTarget] = useState<Point | null>(null);
  // Reference to visual indicator for snapping
  const snapIndicatorRef = useRef<THREE.Mesh | null>(null);
  // Store whether snapping is enabled (user preference)
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);

  // Load snap preference from localStorage on init
  useEffect(() => {
    const savedSnap = localStorage.getItem('snapEnabled');
    if (savedSnap !== null) {
      setSnapEnabled(savedSnap === 'true');
    }
  }, []);

  // Listen for snap setting changes from other components
  useEffect(() => {
    const handleSnapSettingChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setSnapEnabled(customEvent.detail?.enabled ?? true);
    };
    
    document.addEventListener('snapSettingChanged', handleSnapSettingChange);
    
    return () => {
      document.removeEventListener('snapSettingChanged', handleSnapSettingChange);
    };
  }, []);

  // Create or update the visual indicator for snap points
  const updateSnapIndicator = useCallback((position: Point | null) => {
    if (!scene || !snapEnabled) {
      clearSnapIndicator();
      return;
    }

    // Remove existing indicator if it exists
    if (snapIndicatorRef.current) {
      scene.remove(snapIndicatorRef.current);
      snapIndicatorRef.current = null;
    }

    // If we have a position, create a new indicator
    if (position) {
      const geometry = new THREE.SphereGeometry(INDICATOR_SIZE, 16, 16);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true,
        opacity: 0.7,
        depthTest: false
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position.x, position.y, position.z);
      mesh.renderOrder = 999; // Ensure it renders on top
      
      // Add to scene and store reference
      scene.add(mesh);
      snapIndicatorRef.current = mesh;
    }
  }, [scene, snapEnabled]);

  // Clean up indicator when no longer needed
  const clearSnapIndicator = useCallback(() => {
    if (snapIndicatorRef.current && scene) {
      scene.remove(snapIndicatorRef.current);
      snapIndicatorRef.current = null;
    }
    setIsSnapping(false);
    setSnapTarget(null);
  }, [scene]);

  // Find nearby points and segments to snap to
  const findSnapPoint = useCallback((
    currentPoint: Point,
    measurements: Measurement[], 
    currentMeasurementId: string | null = null
  ): Point | null => {
    if (!measurements.length || !snapEnabled) return null;

    let closestPoint: Point | null = null;
    let minDistance = SNAP_THRESHOLD;

    // 1. First check for points to snap to
    for (const measurement of measurements) {
      // Skip hidden measurements
      if (measurement.visible === false) continue;
      
      // Skip the current measurement being edited if specified
      if (currentMeasurementId && measurement.id === currentMeasurementId) continue;

      // Check each point in the measurement
      for (const point of measurement.points) {
        const distance = calculateDistance(currentPoint, point);
        
        // If this point is closer than our threshold and closer than any previous point
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      }
    }

    // 2. Check for segment midpoints to snap to (good for adding points to a line)
    if (!closestPoint) {
      for (const measurement of measurements) {
        // Skip hidden measurements or current measurement
        if (measurement.visible === false) continue;
        if (currentMeasurementId && measurement.id === currentMeasurementId) continue;
        
        // Skip if measurement doesn't have segments
        if (!measurement.segments) continue;
        
        for (const segment of measurement.segments) {
          // Calculate midpoint of segment
          const midpoint = {
            x: (segment.points[0].x + segment.points[1].x) / 2,
            y: (segment.points[0].y + segment.points[1].y) / 2,
            z: (segment.points[0].z + segment.points[1].z) / 2
          };
          
          const distance = calculateDistance(currentPoint, midpoint);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestPoint = midpoint;
          }
        }
      }
    }

    // 3. If we found a snap point, update state and visual indicator
    if (closestPoint) {
      setIsSnapping(true);
      setSnapTarget(closestPoint);
      updateSnapIndicator(closestPoint);
      return closestPoint;
    }

    // If no snap found, clear indicators
    clearSnapIndicator();
    return null;
  }, [clearSnapIndicator, updateSnapIndicator, snapEnabled]);

  // Calculate distance between two points
  const calculateDistance = (p1: Point, p2: Point): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // Check if a point is near a line segment
  const isPointNearSegment = (point: Point, segment: Segment, threshold: number): boolean => {
    const [p1, p2] = segment.points;
    
    // Vector from p1 to p2
    const v = {
      x: p2.x - p1.x,
      y: p2.y - p1.y,
      z: p2.z - p1.z
    };
    
    // Vector from p1 to point
    const w = {
      x: point.x - p1.x,
      y: point.y - p1.y,
      z: point.z - p1.z
    };
    
    // Projection scalar
    const c1 = w.x * v.x + w.y * v.y + w.z * v.z;
    if (c1 <= 0) {
      // Point is before p1, so closest point is p1
      return calculateDistance(point, p1) <= threshold;
    }
    
    const c2 = v.x * v.x + v.y * v.y + v.z * v.z;
    if (c2 <= c1) {
      // Point is after p2, so closest point is p2
      return calculateDistance(point, p2) <= threshold;
    }
    
    // Point projects onto the segment, find the projection
    const b = c1 / c2;
    const projection = {
      x: p1.x + b * v.x,
      y: p1.y + b * v.y,
      z: p1.z + b * v.z
    };
    
    return calculateDistance(point, projection) <= threshold;
  };

  // Apply snap if within threshold
  const applySnap = useCallback((point: Point, measurements: Measurement[], currentMeasurementId: string | null = null): Point => {
    if (!snapEnabled) return point;
    
    const snapPoint = findSnapPoint(point, measurements, currentMeasurementId);
    
    if (snapPoint) {
      // Brief toast notification to inform the user a snap occurred
      toast.info("Punkt eingerastet", { duration: 1000 });
      return snapPoint;
    }
    
    return point;
  }, [findSnapPoint, snapEnabled]);

  // Set the snap enabled state and update localStorage
  const setSnapEnabledState = useCallback((enabled: boolean) => {
    setSnapEnabled(enabled);
    localStorage.setItem('snapEnabled', enabled ? 'true' : 'false');
    
    // Dispatch custom event so other components can react to the change
    document.dispatchEvent(new CustomEvent('snapSettingChanged', { 
      detail: { enabled } 
    }));
    
    // Clear any existing snap indicators if disabling
    if (!enabled) {
      clearSnapIndicator();
    }
  }, [clearSnapIndicator]);

  return {
    isSnapping,
    snapTarget,
    applySnap,
    findSnapPoint,
    clearSnapIndicator,
    SNAP_THRESHOLD,
    snapEnabled,
    setSnapEnabled: setSnapEnabledState
  };
};
