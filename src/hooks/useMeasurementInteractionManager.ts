
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';
import { useMeasurementRaycasting } from './useMeasurementRaycasting';
import { usePointSnapping } from './usePointSnapping';
import { usePointMovement } from './usePointMovement';

/**
 * Enhanced measurement interaction manager with improved point snapping
 */
export const useMeasurementInteractionManager = (
  enabled: boolean,
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  measurements: Measurement[],
  currentPoints: Point[],
  activeMode: string,
  handlers: {
    addPoint: (point: Point) => void,
    startPointEdit: (id: string, index: number) => void,
    updateMeasurementPoint: (id: string, index: number, point: Point) => void
  },
  editMeasurementId: string | null,
  editingPointIndex: number | null
) => {
  // Store last hit point for improved interaction
  const [lastHitPoint, setLastHitPoint] = useState<Point | null>(null);
  
  // State for preview point
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);

  // Use the enhanced raycasting hook with preview functionality
  const {
    raycast,
    addPointIndicatorsRef,
    clearAddPointIndicators,
    updateAddPointIndicators,
    clearPreviewGroup,
    createPreviewGroup,
    calculateMousePosition,
    filterMeasurementObjects,
    getPointFromIntersection
  } = useMeasurementRaycasting(scene, camera);

  // Hook for point snapping with enhanced functionality
  const {
    snapEnabled,
    setSnapEnabled,
    isSnapping,
    snapTarget,
    setSnapping,
    checkPointForSnapping,
    clearSnapIndicator,
    findSnapPoint,
    applySnap
  } = usePointSnapping(scene);

  // Hook for point movement with adapted interfaces
  const {
    movingPointInfo,
    setMovingPointInfo,
    startPointMovement: originalStartPointMovement,
    updateMovingPoint: originalUpdateMovingPoint,
    finishPointMovement: originalFinishPointMovement
  } = usePointMovement(scene, camera, handlers.updateMeasurementPoint);

  // Update the plus symbols for area measurements in edit mode
  useEffect(() => {
    if (enabled && scene) {
      updateAddPointIndicators(editMeasurementId, measurements);
    }
  }, [enabled, scene, editMeasurementId, measurements, updateAddPointIndicators]);

  // Wrapper functions to match expected interfaces
  const updateMovingPoint = useCallback((
    event: MouseEvent | TouchEvent, 
    canvasElement: HTMLCanvasElement
  ): Point | null => {
    if (!camera || !scene || !movingPointInfo) return null;
    
    const point = getPointFromIntersection(event, camera, scene, canvasElement);
    
    if (point) {
      // Update movement state
      originalUpdateMovingPoint(
        movingPointInfo.measurementId, 
        movingPointInfo.pointIndex, 
        point
      );
      
      // Record last hit point
      setLastHitPoint(point);
      
      return point;
    }
    
    return null;
  }, [camera, scene, movingPointInfo, originalUpdateMovingPoint, getPointFromIntersection]);

  const finishPointMovement = useCallback((
    newPoint: Point | null
  ): boolean => {
    if (!movingPointInfo || !newPoint) return false;
    
    originalFinishPointMovement(
      movingPointInfo.measurementId, 
      movingPointInfo.pointIndex, 
      newPoint
    );
    
    return true;
  }, [movingPointInfo, originalFinishPointMovement]);

  const startPointMovement = useCallback((
    measurementId: string, 
    pointIndex: number, 
    initialPoint: Point
  ): Point => {
    const info = originalStartPointMovement(measurementId, pointIndex, initialPoint);
    return initialPoint; // Return the point, not the info object
  }, [originalStartPointMovement]);

  // Clean up visual indicators when enabled status changes
  useEffect(() => {
    if (!enabled) {
      if (clearPreviewGroup) clearPreviewGroup();
      clearAddPointIndicators();
      clearSnapIndicator();
      setMovingPointInfo(null);
      setLastHitPoint(null);
      setPreviewPoint(null);
    }
  }, [enabled, clearPreviewGroup, clearAddPointIndicators, clearSnapIndicator, setMovingPointInfo]);

  return {
    movingPointInfo,
    setMovingPointInfo,
    previewPoint,
    setPreviewPoint,
    lastHitPoint,
    clearPreviewGroup,
    clearAddPointIndicators,
    isSnapping,
    snapTarget,
    snapEnabled,
    setSnapEnabled,
    updateMovingPoint,
    finishPointMovement,
    startPointMovement
  };
};
