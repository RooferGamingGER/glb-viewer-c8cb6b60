
import { useCallback, useState, useRef } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';
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

  // Create or update the visual indicator for snap points
  const updateSnapIndicator = useCallback((position: Point | null) => {
    if (!scene) return;

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
  }, [scene]);

  // Clean up indicator when no longer needed
  const clearSnapIndicator = useCallback(() => {
    if (snapIndicatorRef.current && scene) {
      scene.remove(snapIndicatorRef.current);
      snapIndicatorRef.current = null;
    }
    setIsSnapping(false);
    setSnapTarget(null);
  }, [scene]);

  // Find nearby points to snap to
  const findSnapPoint = useCallback((
    currentPoint: Point,
    measurements: Measurement[], 
    currentMeasurementId: string | null = null
  ): Point | null => {
    if (!measurements.length) return null;

    let closestPoint: Point | null = null;
    let minDistance = SNAP_THRESHOLD;

    // Check all measurements except the one being edited (if any)
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

    if (closestPoint) {
      setIsSnapping(true);
      setSnapTarget(closestPoint);
      updateSnapIndicator(closestPoint);
      return closestPoint;
    }

    // If no snap found, clear indicators
    clearSnapIndicator();
    return null;
  }, [clearSnapIndicator, updateSnapIndicator]);

  // Calculate distance between two points
  const calculateDistance = (p1: Point, p2: Point): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // Apply snap if within threshold
  const applySnap = useCallback((point: Point, measurements: Measurement[], currentMeasurementId: string | null = null): Point => {
    const snapPoint = findSnapPoint(point, measurements, currentMeasurementId);
    
    if (snapPoint) {
      // Brief toast notification to inform the user a snap occurred
      toast.info("Punkt eingerastet", { duration: 1000 });
      return snapPoint;
    }
    
    return point;
  }, [findSnapPoint]);

  return {
    isSnapping,
    snapTarget,
    applySnap,
    findSnapPoint,
    clearSnapIndicator,
    SNAP_THRESHOLD
  };
};
