
import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Point } from '@/types/measurements';
import { useMeasurementPreview } from './useMeasurementPreview';
import { useAddPointIndicators } from './useAddPointIndicators';
import { usePointMovement } from './usePointMovement';
import { useMeasurementEvents } from './useMeasurementEvents';
import { usePointSnapping } from './usePointSnapping';

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

  // Hook for point snapping
  const {
    clearSnapIndicator
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

  // Listen for snap setting changes
  useEffect(() => {
    const handleSnapSettingChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const snapEnabled = customEvent.detail?.enabled;
      
      // You could do something with the snap enabled state here if needed
      console.log("Snap setting changed:", snapEnabled);
    };
    
    document.addEventListener('snapSettingChanged', handleSnapSettingChange);
    
    return () => {
      document.removeEventListener('snapSettingChanged', handleSnapSettingChange);
    };
  }, []);

  // Clean up when enabled status changes
  useEffect(() => {
    if (!enabled) {
      clearPreviewGroup();
      clearAddPointIndicators();
      clearSnapIndicator();
      setMovingPointInfo(null);
    }
  }, [enabled, clearPreviewGroup, clearAddPointIndicators, clearSnapIndicator, setMovingPointInfo]);

  return {
    movingPointInfo,
    setMovingPointInfo,
    previewPoint,
    clearPreviewGroup,
    clearAddPointIndicators
  };
};
