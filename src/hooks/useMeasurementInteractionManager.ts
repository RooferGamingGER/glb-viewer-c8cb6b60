
import { useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';
import { useThreeJs } from '@/contexts/ThreeJsContext';

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
  // State for point movement
  const [movingPointInfo, setMovingPointInfo] = useState<{
    measurementId: string;
    pointIndex: number;
    originalPoint: Point;
  } | null>(null);

  // State for preview points
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  
  // Touch interaction state
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [lastTouchPosition, setLastTouchPosition] = useState<{x: number, y: number} | null>(null);

  // Get Three.js object references
  const { 
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    clearGroup
  } = useThreeJs();

  // Reference to the preview group
  const previewGroupRef = useRef<THREE.Group | null>(null);
  
  // Reference to add point indicators group
  const addPointIndicatorsRef = useRef<THREE.Group | null>(null);

  // Create and manage preview visualization group
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

  // Start point movement
  const startPointMovement = useCallback((measurementId: string, pointIndex: number, point: Point) => {
    setMovingPointInfo({
      measurementId,
      pointIndex,
      originalPoint: { ...point }
    });
  }, []);

  // Update moving point
  const updateMovingPoint = useCallback((newPoint: Point) => {
    if (!movingPointInfo) return;
    
    handlers.updateMeasurementPoint(
      movingPointInfo.measurementId,
      movingPointInfo.pointIndex,
      newPoint
    );
  }, [movingPointInfo, handlers]);

  // Finish point movement
  const finishPointMovement = useCallback(() => {
    setMovingPointInfo(null);
  }, []);
  
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
      // Implementation would depend on your raycasting logic
    }
    
    setLastTouchPosition(null);
  }, [touchStartTime, lastTouchPosition]);

  // Clean up when enabled status changes
  useEffect(() => {
    if (!enabled) {
      clearPreviewGroup();
      clearAddPointIndicators();
      setMovingPointInfo(null);
    }
  }, [enabled, clearPreviewGroup, clearAddPointIndicators]);

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
    // Touch handlers
    handleTouchStart,
    handleTouchEnd,
    touchStartTime,
    lastTouchPosition
  };
};

const useRef = <T,>(initialValue: T) => {
  const [ref] = useState<{ current: T }>({ current: initialValue });
  return ref;
};
