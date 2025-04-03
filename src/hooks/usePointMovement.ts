
import { useCallback } from 'react';
import * as THREE from 'three';
import { Point } from '@/types/measurements';

/**
 * Hook for handling point movement operations
 */
export const usePointMovement = (
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  updateMeasurementPoint: (id: string, index: number, point: Point) => void
) => {
  // Start moving a point
  const startPointMovement = useCallback((
    measurementId: string,
    pointIndex: number,
    originalPoint: Point
  ) => {
    return {
      measurementId,
      pointIndex,
      originalPoint
    };
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
  }, [updateMeasurementPoint]);

  return {
    startPointMovement,
    updateMovingPoint,
    finishPointMovement
  };
};
