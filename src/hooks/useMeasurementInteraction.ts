import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Point } from '@/types/measurements';
import { useMeasurementPreview } from './useMeasurementPreview';
import { useAddPointIndicators } from './useAddPointIndicators';
import { usePointMovement } from './usePointMovement';
import { useMeasurementEvents } from './useMeasurementEvents';
import { usePointSnapping } from '@/contexts/PointSnappingContext';

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
  // Register scene with the point snapping context
  const { 
    clearSnapIndicator, 
    snapEnabled, 
    isSnapping, 
    snapTarget,
    registerScene 
  } = usePointSnapping();
  
  // Register scene when component mounts
  useEffect(() => {
    if (scene && enabled) {
      registerScene(scene);
    }
    return () => {
      // No need to explicitly unregister, the provider handles cleanup
    };
  }, [scene, enabled, registerScene]);

  // Hook for preview visualization
  const {
    previewPoint,
    setPreviewPoint,
    clearPreviewGroup,
    updatePreviewVisualization
  } = useMeasurementPreview(scene);

  // Hook for plus symbols for adding points
  const {
    addPointIndicatorsRef,
    clearAddPointIndicators,
    updateAddPointIndicators
  } = useAddPointIndicators(scene);

  // Hook for point snapping with enhanced functionality
  const {
    clearSnapIndicator,
    snapEnabled,
    isSnapping,
    snapTarget
  } = usePointSnapping(scene);

  // Hook for point movement
  const {
    movingPointInfo,
    setMovingPointInfo,
    startPointMovement,
    finishPointMovement,
    updateMovingPoint
  } = usePointMovement(scene, camera, handlers.updateMeasurementPoint);

  // Update preview display when the preview point changes
  useEffect(() => {
    updatePreviewVisualization(movingPointInfo, measurements);
  }, [previewPoint, movingPointInfo, measurements, updatePreviewVisualization]);

  // Update the plus symbols for area measurements in edit mode
  useEffect(() => {
    updateAddPointIndicators(editMeasurementId, measurements);
  }, [editMeasurementId, measurements, updateAddPointIndicators]);

  // Event handlers for interactions
  useMeasurementEvents(
    enabled,
    scene,
    camera,
    open,
    activeMode,
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
      addPointIndicatorsRef
    }
  );

  // Clean up when enabled status changes
  useEffect(() => {
    if (!enabled) {
      clearPreviewGroup();
      clearAddPointIndicators();
      clearSnapIndicator(true);
      setMovingPointInfo(null);
    }
  }, [enabled, clearPreviewGroup, clearAddPointIndicators, clearSnapIndicator, setMovingPointInfo]);

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
