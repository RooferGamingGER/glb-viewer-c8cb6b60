
import { useCallback, useState } from 'react';
import * as THREE from 'three';
import { Point } from '@/types/measurements';

/**
 * Hook for handling point movement operations with improved state management
 */
export const usePointMovement = (
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  updateMeasurementPoint: (id: string, index: number, point: Point) => void
) => {
  // State for tracking the point currently being moved
  const [movingPointInfo, setMovingPointInfo] = useState<{
    measurementId: string;
    pointIndex: number;
    originalPoint: Point;
  } | null>(null);

  // Start moving a point
  const startPointMovement = useCallback((
    measurementId: string,
    pointIndex: number,
    originalPoint: Point
  ) => {
    const info = {
      measurementId,
      pointIndex,
      originalPoint
    };
    setMovingPointInfo(info);
    return info;
  }, []);

  // Update a moving point
  const updateMovingPoint = useCallback((
    measurementId: string,
    pointIndex: number,
    newPoint: Point
  ) => {
    updateMeasurementPoint(measurementId, pointIndex, newPoint);
  }, [updateMeasurementPoint]);

  // Finish moving a point
  const finishPointMovement = useCallback((
    measurementId: string,
    pointIndex: number,
    finalPoint: Point
  ) => {
    updateMeasurementPoint(measurementId, pointIndex, finalPoint);
    setMovingPointInfo(null);
  }, [updateMeasurementPoint]);

  return {
    movingPointInfo,
    setMovingPointInfo,
    startPointMovement,
    updateMovingPoint,
    finishPointMovement
  };
};
