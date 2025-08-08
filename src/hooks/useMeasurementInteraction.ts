
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
    updateMeasurementPoint: (id: string, index: number, point: Point) => void,
    toggleEditMode: (id: string) => void
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
      movingPointInfo,
      startPointEdit: handlers.startPointEdit,
      toggleEditMode: handlers.toggleEditMode
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
      clearSnapIndicator();
      setMovingPointInfo(null);
      
      // Ensure all PV module visualizations are cleared when disabling the tool
      if (refs.measurementsRef.current) {
        console.log("Cleaning up PV module visualizations on disable");
        refs.measurementsRef.current.children.forEach(child => {
          if (child.userData && child.userData.isPVModule) {
            console.log("Removing PV module visualization:", child.name || "unnamed");
            refs.measurementsRef.current?.remove(child);
          }
        });
      }
    }
  }, [enabled, clearPreviewGroup, clearAddPointIndicators, clearSnapIndicator, setMovingPointInfo, refs]);

  // Special handling for PV module visibility
  useEffect(() => {
    if (enabled && refs.measurementsRef.current) {
      // Ensure PV modules are visible when the measurement tool is enabled
      console.log("Updating PV module visibility when tool is enabled");
      
      const pvModules = refs.measurementsRef.current.children.filter(
        child => child.userData && (child.userData.isPVModule || child.userData.measurementType === 'pvmodule')
      );
      
      console.log(`Found ${pvModules.length} PV module visualizations to update`);
      
      pvModules.forEach(module => {
        // Find the corresponding measurement to check its visibility
        const measurement = measurements.find(m => m.id === module.userData.measurementId);
        if (measurement) {
          module.visible = measurement.visible !== false;
          console.log(`Setting PV module ${module.name || 'unnamed'} visibility to ${module.visible}`);
          
          // Enhance visibility with increased material opacity
          if (module instanceof THREE.Mesh && module.material instanceof THREE.MeshBasicMaterial) {
            module.material.opacity = 0.95; // Increased from 0.9 for better visibility
            module.material.color.set(0x0EA5E9); // Bright blue color
            module.material.transparent = true;
            module.material.side = THREE.DoubleSide; // Show both sides
            module.material.needsUpdate = true;
            
            // Raise position slightly to avoid z-fighting
            module.position.y += 0.01;
            
            console.log("Updated PV module material properties for better visibility:", {
              opacity: module.material.opacity,
              color: module.material.color.getHexString(),
              position: module.position
            });
          }
        }
      });
    }
  }, [enabled, measurements, refs.measurementsRef]);

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
