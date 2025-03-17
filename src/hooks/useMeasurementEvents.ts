
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
  // Track if we've recently handled a touch to prevent duplicates
  const lastTouchTimeRef = useRef<number>(0);
  // Touch event cooldown in milliseconds
  const TOUCH_COOLDOWN = 300;

  const { 
    calculateMousePosition, 
    filterMeasurementObjects,
    getPointFromIntersection 
  } = useMeasurementRaycasting();

  // Process user interaction (adds a point or edits existing point)
  const processInteraction = useCallback((event: MouseEvent | TouchEvent) => {
    // Ensure we're enabled and the sidebar is open
    if (!enabled || !open || !scene || !camera) return;
    
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
        
        // Check if this is an edit point or an edit point label
        if (userData.isEditPoint || userData.isEditPointLabel) {
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

  // Separate mouse event handler
  const handleMouseDown = useCallback((event: MouseEvent) => {
    // Only process left mouse button clicks (button 0) for measurement
    if (event.button !== 0) return;
    
    processInteraction(event);
  }, [processInteraction]);
  
  const handleMouseMove = useCallback((event: MouseEvent) => {
    handlePointerMove(event);
  }, [handlePointerMove]);

  // Specific touch event handlers with debouncing to prevent double-touches
  const handleTouchStart = useCallback((event: TouchEvent) => {
    // Skip handling this touch event if less than TOUCH_COOLDOWN ms have passed since the last one
    const now = Date.now();
    if (now - lastTouchTimeRef.current < TOUCH_COOLDOWN) {
      event.preventDefault();
      return;
    }
    
    // Update the touch count
    touchCountRef.current = event.touches.length;
    
    // Only handle single-touch events for measurements
    if (touchCountRef.current === 1) {
      // Record this touch time
      lastTouchTimeRef.current = now;
      
      // Process as a measurement interaction
      processInteraction(event);
    }
    
    // Prevent default to avoid emulated mouse events
    event.preventDefault();
  }, [processInteraction]);
  
  const handleTouchMove = useCallback((event: TouchEvent) => {
    touchCountRef.current = event.touches.length;
    
    // Skip measurement preview if using multitouch
    if (touchCountRef.current >= 2) return;
    
    handlePointerMove(event);
    event.preventDefault();
  }, [handlePointerMove]);
  
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    // Update touch count
    touchCountRef.current = event.touches.length;
    event.preventDefault();
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!enabled || !scene || !camera) return;
    
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;
    
    // Add mouse event listeners - NOT using 'pointerdown' to avoid conflict with touch
    canvasElement.addEventListener('mousedown', handleMouseDown);
    canvasElement.addEventListener('mousemove', handleMouseMove);
    
    // Add touch event listeners
    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    
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
