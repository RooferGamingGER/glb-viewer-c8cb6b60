
import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Point } from '@/types/measurements';
import { useMeasurementPreview } from './useMeasurementPreview';
import { useAddPointIndicators } from './useAddPointIndicators';
import { usePointMovement } from './usePointMovement';
import { useMeasurementEvents } from './useMeasurementEvents';
import { usePointSnapping } from '@/contexts/PointSnappingContext';
import { useThreeJs } from '@/contexts/ThreeJsContext';

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
  // Erweiterte State-Verwaltung (konsolidiert von useMeasurementInteractionManager)
  const [movingPointInfo, setMovingPointInfo] = useState<{
    measurementId: string;
    pointIndex: number;
    originalPoint: Point;
  } | null>(null);

  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [lastTouchPosition, setLastTouchPosition] = useState<{x: number, y: number} | null>(null);

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

  // Get direct access to ThreeJs context
  const { clearGroup } = useThreeJs();

  // Create and manage preview visualization group
  const previewGroupRef = React.useRef<THREE.Group | null>(null);
  const addPointIndicatorsRef = React.useRef<THREE.Group | null>(null);

  // Set up preview groups in scene
  useEffect(() => {
    if (!scene || !enabled) return;
    
    // Create preview group if it doesn't exist
    if (!previewGroupRef.current) {
      previewGroupRef.current = new THREE.Group();
      previewGroupRef.current.name = "previewGroup";
      scene.add(previewGroupRef.current);
    }
    
    // Create add point indicators group if it doesn't exist
    if (!addPointIndicatorsRef.current) {
      addPointIndicatorsRef.current = new THREE.Group();
      addPointIndicatorsRef.current.name = "addPointIndicators";
      scene.add(addPointIndicatorsRef.current);
    }
    
    return () => {
      // Clean up preview group when unmounting
      if (previewGroupRef.current) {
        scene.remove(previewGroupRef.current);
        previewGroupRef.current = null;
      }
      
      // Clean up add point indicators
      if (addPointIndicatorsRef.current) {
        scene.remove(addPointIndicatorsRef.current);
        addPointIndicatorsRef.current = null;
      }
    };
  }, [scene, enabled]);

  // Hook for preview visualization
  const {
    updatePreviewVisualization
  } = useMeasurementPreview(scene);

  // Hook for plus symbols for adding points
  const {
    updateAddPointIndicators
  } = useAddPointIndicators(scene);

  // Hook for point movement
  const {
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

  // Clear preview group
  const clearPreviewGroup = useCallback(() => {
    if (previewGroupRef.current) {
      clearGroup(previewGroupRef.current);
    }
  }, [clearGroup]);

  // Clear add point indicators
  const clearAddPointIndicators = useCallback(() => {
    if (addPointIndicatorsRef.current) {
      clearGroup(addPointIndicatorsRef.current);
    }
  }, [clearGroup]);
  
  // Handle touch interactions with debouncing for better touch experience
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStartTime(Date.now());
      setLastTouchPosition({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      });
    }
  }, []);
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime;
    
    // Short tap detection (less than 250ms) with minimal movement
    if (touchDuration < 250 && lastTouchPosition) {
      // Process as a tap/click
    }
    
    setLastTouchPosition(null);
  }, [touchStartTime, lastTouchPosition]);

  // Clean up when enabled status changes
  useEffect(() => {
    if (!enabled) {
      clearPreviewGroup();
      clearAddPointIndicators();
      clearSnapIndicator();
      setMovingPointInfo(null);
      
      // Ensure all PV module visualizations are cleared when disabling the tool
      if (refs.measurementsRef.current) {
        refs.measurementsRef.current.children.forEach(child => {
          if (child.userData && child.userData.isPVModule) {
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
      
      const pvModules = refs.measurementsRef.current.children.filter(
        child => child.userData && (child.userData.isPVModule || child.userData.measurementType === 'pvmodule')
      );
      
      pvModules.forEach(module => {
        // Find the corresponding measurement to check its visibility
        const measurement = measurements.find(m => m.id === module.userData.measurementId);
        if (measurement) {
          module.visible = measurement.visible !== false;
          
          // Enhance visibility with increased material opacity
          if (module instanceof THREE.Mesh && module.material instanceof THREE.MeshBasicMaterial) {
            module.material.opacity = 0.95; // Increased from 0.9 for better visibility
            module.material.color.set(0x0EA5E9); // Bright blue color
            module.material.transparent = true;
            module.material.side = THREE.DoubleSide; // Show both sides
            module.material.needsUpdate = true;
            
            // Raise position slightly to avoid z-fighting
            module.position.y += 0.01;
          }
        }
      });
    }
  }, [enabled, measurements, refs.measurementsRef]);

  return {
    movingPointInfo,
    setMovingPointInfo,
    previewPoint,
    setPreviewPoint,
    clearPreviewGroup,
    clearAddPointIndicators,
    addPointIndicatorsRef,
    startPointMovement,
    updateMovingPoint,
    finishPointMovement,
    isSnapping,
    snapTarget,
    snapEnabled,
    // Touch handlers
    handleTouchStart,
    handleTouchEnd,
    touchStartTime,
    lastTouchPosition
  };
};
