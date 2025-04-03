
import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Point } from '@/types/measurements';
import { useMeasurementPreview } from './useMeasurementPreview';
import { useAddPointIndicators } from './useAddPointIndicators';
import { usePointMovement } from './usePointMovement';
import { useMeasurementEvents } from './useMeasurementEvents';
import { usePointSnapping } from './usePointSnapping';
import { useMeasurementRaycasting } from './useMeasurementRaycasting';

/**
 * Main hook for measurement interactions - combines all other specialized hooks
 */
export const useMeasurementInteraction = (
  enabled: boolean,
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  open: boolean,
  refs: {
    pointsRef: React.RefObject<THREE.Group>,
    linesRef: React.RefObject<THREE.Group>,
    measurementsRef: React.RefObject<THREE.Group>,
    editPointsRef: React.RefObject<THREE.Group>,
    labelsRef: React.RefObject<THREE.Group>,
    segmentLabelsRef: React.RefObject<THREE.Group>
  },
  measurements: any[],
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
  // State for preview point
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);

  // Use the enhanced raycasting hook which includes preview functionality
  const {
    raycast,
    addPointIndicatorsRef,
    clearAddPointIndicators,
    updateAddPointIndicators,
    clearPreviewGroup,
    createPreviewGroup
  } = useMeasurementRaycasting(scene, camera);

  // Hook for point snapping with enhanced functionality
  const {
    snapEnabled,
    setSnapEnabled,
    isSnapping,
    snapTarget,
    setSnapping,
    checkPointForSnapping,
    clearSnapIndicator
  } = usePointSnapping(scene);

  // Hook for point movement
  const {
    movingPointInfo,
    setMovingPointInfo,
    startPointMovement,
    updateMovingPoint,
    finishPointMovement
  } = usePointMovement(scene, camera, handlers.updateMeasurementPoint);

  // Update the plus symbols for area measurements in edit mode
  useEffect(() => {
    updateAddPointIndicators(editMeasurementId, measurements);
  }, [editMeasurementId, measurements, updateAddPointIndicators]);

  // Clean up visual indicators when enabled status changes
  useEffect(() => {
    if (!enabled) {
      if (clearPreviewGroup) clearPreviewGroup();
      clearAddPointIndicators();
      clearSnapIndicator();
      setMovingPointInfo(null);
    }
  }, [enabled, clearPreviewGroup, clearAddPointIndicators, clearSnapIndicator, setMovingPointInfo]);

  // Event handlers for measurement interactions
  useMeasurementEvents(
    enabled,
    scene,
    camera,
    open,
    activeMode as any,
    editMeasurementId,
    editingPointIndex,
    measurements,
    currentPoints,
    {
      addPoint: handlers.addPoint,
      updateMovingPoint,
      finishPointMovement,
      startPointMovement,
      setPreviewPoint,
      movingPointInfo
    },
    {
      editPointsRef: refs.editPointsRef,
      addPointIndicatorsRef: addPointIndicatorsRef as React.RefObject<THREE.Group>
    }
  );

  return {
    movingPointInfo,
    setMovingPointInfo,
    previewPoint,
    clearPreviewGroup,
    clearAddPointIndicators,
    isSnapping,
    snapTarget,
    snapEnabled
  };
};
