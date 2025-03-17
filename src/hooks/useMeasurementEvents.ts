
import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { toast } from 'sonner';
import { Point } from '@/hooks/useMeasurements';
import { useMeasurementRaycasting } from './useMeasurementRaycasting';

/**
 * Hook für Ereignisbehandlung bei Messinteraktionen
 */
export const useMeasurementEvents = (
  enabled: boolean,
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  open: boolean,
  activeMode: string,
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  measurements: any[],
  currentPoints: Point[],
  handlers: {
    addPoint: (point: Point) => void,
    updateMovingPoint: (event: MouseEvent | TouchEvent, canvasElement: HTMLCanvasElement) => Point | null,
    finishPointMovement: (newPoint: Point | null) => boolean,
    startPointMovement: (measurementId: string, pointIndex: number, initialPoint: Point) => Point,
    setPreviewPoint: (point: Point | null) => void,
    movingPointInfo: { measurementId: string; pointIndex: number } | null
  },
  refs: {
    editPointsRef: React.RefObject<THREE.Group>,
    addPointIndicatorsRef: React.RefObject<THREE.Group>
  }
) => {
  // Track multitouch state for mobile
  const touchCountRef = useRef<number>(0);

  const { 
    calculateMousePosition, 
    filterMeasurementObjects,
    getPointFromIntersection 
  } = useMeasurementRaycasting();

  // Generic pointer event processing
  const handlePointerDown = useCallback((event: MouseEvent | TouchEvent) => {
    // Ensure we're enabled and the sidebar is open
    if (!enabled || !open || !scene || !camera) return;
    
    // Skip if using multitouch
    if (event instanceof TouchEvent && event.touches.length >= 2) return;
    
    const canvasElement = event.target as HTMLCanvasElement;
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) return;
    
    // Handle moving point case - finish the movement
    if (handlers.movingPointInfo) {
      const newPoint = handlers.updateMovingPoint(event, canvasElement);
      handlers.finishPointMovement(newPoint);
      return;
    }
    
    // Calculate mouse position in normalized device coordinates
    const mousePosition = calculateMousePosition(event, canvasElement);
    if (!mousePosition) return;
    
    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePosition, camera);
    
    // Check if we clicked on an add point indicator (plus sign)
    if (refs.addPointIndicatorsRef.current && editMeasurementId) {
      const addPointIntersects = raycaster.intersectObjects(refs.addPointIndicatorsRef.current.children, true);
      
      for (const intersect of addPointIntersects) {
        if (intersect.object.userData && intersect.object.userData.isAddPointIndicator) {
          const userData = intersect.object.userData;
          
          // Only allow adding points to area measurements
          const measurement = measurements.find(m => m.id === userData.measurementId && m.type === 'area');
          if (measurement) {
            // Create custom event to add a point at the segment's midpoint
            const addPointEvent = new CustomEvent('areaPointAdded', {
              detail: {
                measurementId: userData.measurementId,
                updatedMeasurement: {
                  ...measurement,
                  points: [
                    ...measurement.points.slice(0, userData.segmentIndex + 1),
                    userData.midpoint,
                    ...measurement.points.slice(userData.segmentIndex + 1)
                  ]
                }
              }
            });
            document.dispatchEvent(addPointEvent);
            
            toast.success(`Punkt zu Flächenmessung hinzugefügt`);
            return;
          }
        }
      }
    }
    
    // Check for edit point interactions - only when in edit mode
    if (editMeasurementId && refs.editPointsRef.current) {
      const editPointIntersects = raycaster.intersectObjects(refs.editPointsRef.current.children, true);
      
      if (editPointIntersects.length > 0) {
        const intersect = editPointIntersects[0];
        const userData = intersect.object.userData;
        
        if (userData.isEditPoint) {
          const measurement = measurements.find(m => m.id === userData.measurementId);
          if (measurement) {
            const point = measurement.points[userData.pointIndex];
            const initialPoint = handlers.startPointMovement(
              userData.measurementId,
              userData.pointIndex,
              point
            );
            handlers.setPreviewPoint(initialPoint);
            return;
          }
        }
      }
    }
    
    // Check for clicks on measurement points but only if we're in edit mode
    if (editMeasurementId) {
      const allSceneIntersects = raycaster.intersectObjects(scene.children, true);
      for (const intersect of allSceneIntersects) {
        if (
          intersect.object.userData && 
          (intersect.object.userData.isAreaPoint || 
          intersect.object.userData.isMeasurementPoint)
        ) {
          const userData = intersect.object.userData;
          
          // Only allow moving points of the measurement being edited
          if (userData.measurementId === editMeasurementId) {
            const measurement = measurements.find(m => m.id === userData.measurementId);
            if (measurement) {
              const point = measurement.points[userData.pointIndex];
              const initialPoint = handlers.startPointMovement(
                userData.measurementId,
                userData.pointIndex,
                point
              );
              handlers.setPreviewPoint(initialPoint);
              return;
            }
          }
        }
      }
    }
    
    // General intersections for adding points - should work regardless of whether edit mode is active
    if (activeMode !== 'none') {
      const point = getPointFromIntersection(event, camera, scene, canvasElement);
      
      if (point) {
        // Handle editing case
        if (editMeasurementId !== null && editingPointIndex !== null) {
          handlers.addPoint(point);
          toast.success(`Messpunkt ${editingPointIndex + 1} wurde aktualisiert.`);
          return;
        }
        
        // Handle adding new measurement points
        const currentCount = currentPoints.length;
        
        handlers.addPoint(point);
        
        if (activeMode === 'length') {
          if (currentCount === 0) {
            toast.info("Ersten Punkt für Längenmessung gesetzt");
          }
        } else if (activeMode === 'height') {
          if (currentCount === 0) {
            toast.info("Ersten Punkt für Höhenmessung gesetzt");
          }
        } else if (activeMode === 'area') {
          if (currentCount === 0) {
            toast.info("Ersten Punkt für Flächenmessung gesetzt");
          } else {
            toast.info(`Punkt ${currentCount + 1} für Flächenmessung gesetzt`);
          }
        }
      }
    }
  }, [
    enabled, open, scene, camera, activeMode, editMeasurementId, editingPointIndex,
    measurements, currentPoints, handlers, refs, calculateMousePosition,
    filterMeasurementObjects, getPointFromIntersection
  ]);

  // Update preview point when moving
  const handlePointerMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!handlers.movingPointInfo || !scene || !camera) return;
    
    const canvasElement = event.target as HTMLCanvasElement;
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) return;
    
    const newPoint = handlers.updateMovingPoint(event, canvasElement);
    if (newPoint) {
      handlers.setPreviewPoint(newPoint);
    }
  }, [handlers, scene, camera]);

  // Track touch events for multitouch detection
  const handleTouchStart = useCallback((event: TouchEvent) => {
    touchCountRef.current = event.touches.length;
    
    // Skip measurement interactions if using multitouch (2 or more fingers)
    if (touchCountRef.current >= 2) return;
    
    // Single touch - process as normal click for measurements
    handlePointerDown(event);
  }, [handlePointerDown]);
  
  const handleTouchMove = useCallback((event: TouchEvent) => {
    touchCountRef.current = event.touches.length;
    
    // Skip measurement preview if using multitouch
    if (touchCountRef.current >= 2) return;
    
    handlePointerMove(event);
  }, [handlePointerMove]);
  
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    // Update touch count
    touchCountRef.current = event.touches.length;
  }, []);
  
  // Mouse event handlers
  const handleMouseDown = useCallback((event: MouseEvent) => {
    // Only process left mouse button clicks (button 0) for measurement
    if (event.button !== 0) return;
    
    handlePointerDown(event);
  }, [handlePointerDown]);
  
  const handleMouseMove = useCallback((event: MouseEvent) => {
    handlePointerMove(event);
  }, [handlePointerMove]);

  // Setup event listeners
  useEffect(() => {
    if (!enabled || !scene || !camera) return;
    
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;
    
    // Add event listeners
    canvasElement.addEventListener('mousedown', handleMouseDown);
    canvasElement.addEventListener('mousemove', handleMouseMove);
    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasElement.addEventListener('touchend', handleTouchEnd);
    
    // Cleanup function
    return () => {
      canvasElement.removeEventListener('mousedown', handleMouseDown);
      canvasElement.removeEventListener('mousemove', handleMouseMove);
      canvasElement.removeEventListener('touchstart', handleTouchStart);
      canvasElement.removeEventListener('touchmove', handleTouchMove);
      canvasElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    enabled, scene, camera, 
    handleMouseDown, handleMouseMove, 
    handleTouchStart, handleTouchMove, handleTouchEnd
  ]);

  return {
    touchCountRef
  };
};
