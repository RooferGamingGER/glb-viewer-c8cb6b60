import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Point, Measurement, MeasurementMode } from '@/types/measurements';
import { usePointSnapping } from './usePointSnapping';
import { usePointMovement } from './usePointMovement';
import { useMeasurementRaycasting } from './useMeasurementRaycasting';

// Custom event for raycaster hits
interface RaycastHitEvent {
  point: Point;
  object: THREE.Object3D;
  normal?: THREE.Vector3;
}

// Throttle time in milliseconds for mouse move events
const MOUSE_MOVE_THROTTLE = 30;

/**
 * Hook for managing measurement interactions
 */
export const useMeasurementInteractionManager = (
  enabled: boolean,
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  measurements: Measurement[],
  currentPoints: Point[],
  activeMode: MeasurementMode,
  handlers: {
    addPoint: (point: Point) => void;
    startPointEdit: (id: string, index: number) => void;
    updateMeasurementPoint: (id: string, index: number, point: Point) => void;
  },
  editMeasurementId: string | null,
  editingPointIndex: number | null
) => {
  // State for tracking the point currently being moved
  const [movingPointInfo, setMovingPointInfo] = useState<{
    measurementId: string;
    pointIndex: number;
    originalPoint: Point;
  } | null>(null);
  
  // Last raycast hit point
  const [lastHitPoint, setLastHitPoint] = useState<Point | null>(null);
  
  // Time of last mouse move event for throttling
  const lastMoveTimeRef = useRef<number>(0);
  
  // Improved point snapping
  const {
    snapEnabled,
    isSnapping,
    snapTarget,
    setSnapping,
    checkPointForSnapping,
    clearSnapIndicator
  } = usePointSnapping(scene);
  
  // Point movement handling
  const {
    startPointMovement,
    updateMovingPoint,
    finishPointMovement
  } = usePointMovement(scene, camera, handlers.updateMeasurementPoint);
  
  // Raycasting for detecting point positions
  const {
    raycast,
    addPointIndicatorsRef,
    clearAddPointIndicators,
    updateAddPointIndicators
  } = useMeasurementRaycasting(scene, camera);
  
  // Handle mouse click events
  const handleClick = useCallback((event: MouseEvent) => {
    if (!enabled || !scene || !camera) return;
    
    // Use the snap target if snapping
    if (isSnapping && snapTarget) {
      if (editMeasurementId !== null && editingPointIndex !== null) {
        // Update existing point
        handlers.updateMeasurementPoint(
          editMeasurementId,
          editingPointIndex,
          snapTarget.point
        );
      } else if (activeMode !== 'none') {
        // Add new point
        handlers.addPoint(snapTarget.point);
      }
      return;
    }
    
    // Otherwise raycast to find the hit point
    const hit = raycast(event);
    if (hit) {
      if (editMeasurementId !== null && editingPointIndex !== null) {
        // Update existing point
        handlers.updateMeasurementPoint(
          editMeasurementId,
          editingPointIndex,
          hit.point
        );
      } else if (activeMode !== 'none') {
        // Add new point
        handlers.addPoint(hit.point);
      }
    }
  }, [
    enabled, scene, camera, isSnapping, snapTarget, 
    editMeasurementId, editingPointIndex, activeMode, 
    raycast, handlers
  ]);
  
  // Handle mouse move events with throttling
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!enabled || !scene || !camera) {
      if (isSnapping) setSnapping(false);
      return;
    }
    
    // Throttle mouse move events
    const now = Date.now();
    if (now - lastMoveTimeRef.current < MOUSE_MOVE_THROTTLE && !movingPointInfo) {
      return;
    }
    lastMoveTimeRef.current = now;
    
    // Raycast to find the current hit point
    const hit = raycast(event);
    if (!hit) {
      if (isSnapping) setSnapping(false);
      setLastHitPoint(null);
      return;
    }
    
    setLastHitPoint(hit.point);
    
    // Check for point snapping
    const snapResult = checkPointForSnapping(
      hit.point, 
      measurements,
      editMeasurementId,
      editingPointIndex
    );
    
    if (snapResult) {
      setSnapping(
        true, 
        snapResult.point, 
        snapResult.measurementId, 
        snapResult.pointIndex
      );
    } else {
      setSnapping(false);
    }
    
    // Update moving point if dragging
    if (movingPointInfo) {
      const pointToUse = isSnapping && snapTarget ? snapTarget.point : hit.point;
      updateMovingPoint(
        movingPointInfo.measurementId,
        movingPointInfo.pointIndex,
        pointToUse
      );
    }
  }, [
    enabled, scene, camera, isSnapping, setSnapping, snapTarget,
    movingPointInfo, editMeasurementId, editingPointIndex,
    raycast, checkPointForSnapping, measurements, updateMovingPoint
  ]);
  
  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;
    
    const throttledMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
    };
    
    window.addEventListener('click', handleClick);
    window.addEventListener('mousemove', throttledMouseMove);
    
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', throttledMouseMove);
    };
  }, [enabled, handleClick, handleMouseMove]);
  
  // Clean up when disabled
  useEffect(() => {
    if (!enabled) {
      clearSnapIndicator();
      clearAddPointIndicators();
    }
  }, [enabled, clearSnapIndicator, clearAddPointIndicators]);
  
  // Update add point indicators when editing changes
  useEffect(() => {
    updateAddPointIndicators(editMeasurementId, measurements);
  }, [editMeasurementId, measurements, updateAddPointIndicators]);
  
  return {
    movingPointInfo,
    setMovingPointInfo,
    isSnapping,
    snapTarget,
    snapEnabled,
    lastHitPoint,
    startPointMovement,
    finishPointMovement,
    clearAddPointIndicators,
    clearSnapIndicator
  };
};
