
import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { toast } from 'sonner';
import { Point } from '@/hooks/useMeasurements';
import { useMeasurementRaycasting } from './useMeasurementRaycasting';

/**
 * Hook zur Verwaltung der Punktbewegung
 */
export const usePointMovement = (
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  updateMeasurementPoint: (id: string, index: number, point: Point) => void
) => {
  const [movingPointInfo, setMovingPointInfo] = useState<{
    measurementId: string;
    pointIndex: number;
  } | null>(null);
  
  const { getPointFromIntersection } = useMeasurementRaycasting();

  // Funktion zum Starten der Punktbewegung
  const startPointMovement = useCallback((
    measurementId: string,
    pointIndex: number,
    initialPoint: Point
  ) => {
    setMovingPointInfo({
      measurementId,
      pointIndex
    });
    
    toast.info(`Punkt ${pointIndex + 1} wird verschoben. Klicken Sie an die neue Position.`);
    
    return initialPoint;
  }, []);

  // Funktion zum Beenden der Punktbewegung
  const finishPointMovement = useCallback((newPoint: Point | null) => {
    if (!movingPointInfo || !newPoint) {
      setMovingPointInfo(null);
      return false;
    }
    
    // Update the point position with the new point
    updateMeasurementPoint(
      movingPointInfo.measurementId, 
      movingPointInfo.pointIndex, 
      newPoint
    );
    
    // Reset movement state
    const completedInfo = { ...movingPointInfo };
    setMovingPointInfo(null);
    
    toast.success(`Punkt ${completedInfo.pointIndex + 1} wurde verschoben`);
    return true;
  }, [movingPointInfo, updateMeasurementPoint]);

  // Funktion zum Aktualisieren des Punkts während der Bewegung
  const updateMovingPoint = useCallback((
    event: MouseEvent | TouchEvent,
    canvasElement: HTMLCanvasElement
  ): Point | null => {
    if (!movingPointInfo || !scene || !camera) return null;
    
    return getPointFromIntersection(event, camera, scene, canvasElement);
  }, [movingPointInfo, scene, camera, getPointFromIntersection]);

  return {
    movingPointInfo,
    setMovingPointInfo,
    startPointMovement,
    finishPointMovement,
    updateMovingPoint
  };
};
