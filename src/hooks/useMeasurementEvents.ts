
import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { toast } from 'sonner';
import { Point } from '@/types/measurements';
import { useMeasurementRaycasting } from './useMeasurementRaycasting';
import { usePointSnapping } from '@/contexts/PointSnappingContext';

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
    movingPointInfo: { measurementId: string; pointIndex: number } | null,
    startPointEdit: (id: string, index: number) => void,
    toggleEditMode: (id: string) => void,
    deletePoint: (measurementId: string, pointIndex: number) => void
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
  // Add throttle for mouse move events
  const lastMoveTimeRef = useRef<number>(0);
  const MOVE_THROTTLE = 30; // 30ms throttle for mouse move (about 33fps)
  // Space key held = rotate mode (skip point placement)
  const spaceHeldRef = useRef<boolean>(false);

  // Touch tap detection refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);
  const TAP_MAX_DURATION = 300; // ms
  const TAP_MAX_MOVEMENT = 12; // pixels

  // Double-tap detection refs
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number } | null>(null);
  
  // Long-press detection for touch to quickly activate point move
  const longPressTimerRef = useRef<number | null>(null);
  const LONG_PRESS_DURATION = 500; // ms

  const { 
    calculateMousePosition, 
    filterMeasurementObjects,
    getPointFromIntersection 
  } = useMeasurementRaycasting();
  
  // Use our improved snapping hook
  const {
    applySnap,
    findSnapPoint,
    clearSnapIndicator,
    snapEnabled
  } = usePointSnapping();

  // Process mouse movement for point snapping preview with throttling
  const handlePointerMoveForSnapping = useCallback((event: MouseEvent | TouchEvent) => {
    if (!enabled || !open || !scene || !camera || handlers.movingPointInfo || !snapEnabled) return;
    
    // Throttle mouse move events to prevent too many calculations
    const now = performance.now();
    if (now - lastMoveTimeRef.current < MOVE_THROTTLE) return;
    lastMoveTimeRef.current = now;
    
    // Skip snapping preview if we're not in a measurement mode
    if (activeMode === 'none' || !['length', 'height', 'area', 'solar', 'skylight', 'chimney'].includes(activeMode)) {
      clearSnapIndicator(true);
      return;
    }
    
    const canvasElement = event.target as HTMLCanvasElement;
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) return;
    
    // Get current mouse position as a 3D point
    const point = getPointFromIntersection(event, camera, scene, canvasElement);
    if (!point) {
      return; // Don't clear indicator immediately to avoid flickering
    }
    
    // Find snap point but don't apply it yet - just show indicator
    // Pass the current mouse position point for line visualization
    findSnapPoint(point, measurements, editMeasurementId, point);
  }, [enabled, open, scene, camera, activeMode, editMeasurementId, getPointFromIntersection, findSnapPoint, clearSnapIndicator, handlers.movingPointInfo, measurements, snapEnabled]);

  // Process user interaction (adds a point or edits existing point)
  const processInteraction = useCallback((event: MouseEvent | TouchEvent) => {
    // Ensure we're enabled and the sidebar is open
    if (!enabled || !open || !scene || !camera) return;
    // Space held = rotate mode, skip point placement
    if (spaceHeldRef.current) return;
    
    const canvasElement = (event.target as HTMLCanvasElement) || document.querySelector('canvas');
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) return;
    
    // Handle moving point case - finish the movement
    if (handlers.movingPointInfo) {
      const newPoint = handlers.updateMovingPoint(event, canvasElement);
      
      // Apply snapping when finishing point movement
      let finalPoint = newPoint;
      if (newPoint && snapEnabled) {
        finalPoint = applySnap(newPoint, measurements, handlers.movingPointInfo.measurementId);
      }
      
      handlers.finishPointMovement(finalPoint);
      clearSnapIndicator(true); // Clear immediately when placing a point
      return;
    }
    
    // Calculate mouse position in normalized device coordinates
    const mousePosition = calculateMousePosition(event, canvasElement);
    if (!mousePosition) return;
    
    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePosition, camera);
    
    // Check if we clicked on an add point indicator (plus sign)
    if (refs.addPointIndicatorsRef.current) {
      // Handle adding point indicators
      const addPointIntersects = raycaster.intersectObjects(refs.addPointIndicatorsRef.current.children, true);
      
      for (const intersect of addPointIntersects) {
        if (intersect.object.userData && intersect.object.userData.isAddPointIndicator) {
          const userData = intersect.object.userData;
          
          // Only allow adding points to area measurements
          const measurement = measurements.find(m => m.id === userData.measurementId && 
            (m.type === 'area' || m.type === 'solar' || m.type === 'skylight' || m.type === 'chimney'));
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
            
            toast.success(`Punkt zu Flächenmessung hinzugefügt`, { duration: 1500 });
            return;
          }
        }
      }
    }
    
    // Check for edit point interactions — only when no drawing tool is active
    if (activeMode === 'none' && refs.editPointsRef.current) {
      const editPointIntersects = raycaster.intersectObjects(refs.editPointsRef.current.children, true);
      
      if (editPointIntersects.length > 0) {
        const intersect = editPointIntersects[0];
        const userData = intersect.object.userData;
        
        if (userData.isEditPoint || userData.isEditPointLabel) {
          const measurement = measurements.find(m => m.id === userData.measurementId);
          if (measurement) {
            // Auto-enter edit mode if not already editing this measurement
            if (editMeasurementId !== userData.measurementId) {
              handlers.toggleEditMode(userData.measurementId);
            }
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
    
    // Check for clicks on PV modules — remove module on click with confirmation
    if (activeMode === 'none' || activeMode === 'solar') {
      const allIntersects = raycaster.intersectObjects(scene.children, true);
      for (const intersect of allIntersects) {
        const ud = intersect.object.userData;
        if (ud && (ud.isPVModule || ud.isPVModulePanel)) {
          const measurementId = ud.measurementId;
          const moduleIndex = ud.moduleIndex;
          const measurement = measurements.find(m => m.id === measurementId);
          if (measurement && measurement.pvModuleInfo && moduleIndex !== undefined) {
            // Show confirmation toast with action button
            toast(`Modul ${moduleIndex + 1} entfernen?`, {
              duration: 5000,
              action: {
                label: 'Entfernen',
                onClick: () => {
                  const removeEvent = new CustomEvent('pvModuleRemoved', {
                    detail: { measurementId, moduleIndex }
                  });
                  document.dispatchEvent(removeEvent);
                  toast.success(`Modul ${moduleIndex + 1} entfernt`, { duration: 1500 });
                }
              },
            });
            return;
          }
        }
      }
    }

    // Check for clicks on measurement points — only when no drawing tool is active
    if (activeMode === 'none') {
      const allSceneIntersects = raycaster.intersectObjects(scene.children, true);
      for (const intersect of allSceneIntersects) {
        if (
          intersect.object.userData && 
          (intersect.object.userData.isAreaPoint || 
          intersect.object.userData.isMeasurementPoint)
        ) {
          const userData = intersect.object.userData;
          const measurementId = userData.measurementId;
          
          if (measurementId) {
            const measurement = measurements.find(m => m.id === measurementId);
            if (measurement) {
              // Auto-enter edit mode if needed
              if (editMeasurementId !== measurementId) {
                handlers.toggleEditMode(measurementId);
              }
              const point = measurement.points[userData.pointIndex];
              const initialPoint = handlers.startPointMovement(
                measurementId,
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
    
    // General intersections for adding points
    if (activeMode !== 'none') {
      const point = getPointFromIntersection(event, camera, scene, canvasElement);
      
      if (point) {
        // Apply point snapping if enabled
        const finalPoint = snapEnabled ? applySnap(point, measurements, editMeasurementId) : point;
        
        // Handle editing case
        if (editMeasurementId !== null && editingPointIndex !== null) {
          handlers.addPoint(finalPoint);
          toast.success(`Messpunkt ${editingPointIndex + 1} wurde aktualisiert.`, { duration: 1500 });
          clearSnapIndicator(true); // Clear immediately when placing a point
          return;
        }
        
        // Handle adding new measurement points
        const currentCount = currentPoints.length;
        
        handlers.addPoint(finalPoint);
        clearSnapIndicator(true); // Clear immediately when placing a point
        
        if (activeMode === 'length') {
          if (currentCount === 0) {
            toast.info("Ersten Punkt für Längenmessung gesetzt", { duration: 1500 });
          }
        } else if (activeMode === 'height') {
          if (currentCount === 0) {
            toast.info("Ersten Punkt für Höhenmessung gesetzt", { duration: 1500 });
          }
        } else if (activeMode === 'area' || activeMode === 'solar' || activeMode === 'skylight' || activeMode === 'chimney') {
          if (currentCount === 0) {
            toast.info(`Ersten Punkt für ${activeMode === 'area' ? 'Flächenmessung' : 
                       activeMode === 'solar' ? 'Solarfläche' : 
                       activeMode === 'skylight' ? 'Dachfenster' : 'Schornstein'} gesetzt`, { duration: 1500 });
          } else {
            toast.info(`Punkt ${currentCount + 1} gesetzt`, { duration: 1500 });
          }
        }
      }
    }
  }, [
    enabled, open, scene, camera, activeMode, editMeasurementId, editingPointIndex,
    measurements, currentPoints, handlers, refs, calculateMousePosition,
    filterMeasurementObjects, getPointFromIntersection, applySnap, clearSnapIndicator, snapEnabled
  ]);

  // Update preview point when moving
  const handlePointerMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!handlers.movingPointInfo || !scene || !camera) {
      // If not moving a point, check for snapping
      handlePointerMoveForSnapping(event);
      return;
    }
    
    // Apply throttling to reduce frequency of updates
    const now = performance.now();
    if (now - lastMoveTimeRef.current < MOVE_THROTTLE) return;
    lastMoveTimeRef.current = now;
    
    const canvasElement = event.target as HTMLCanvasElement;
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) return;
    
    const newPoint = handlers.updateMovingPoint(event, canvasElement);
    if (newPoint) {
      // When moving an existing point, show snapping preview if enabled
      if (snapEnabled) {
        // Pass current point position for line visualization
        const snapPoint = findSnapPoint(newPoint, measurements, handlers.movingPointInfo.measurementId, newPoint);
        handlers.setPreviewPoint(snapPoint || newPoint);
      } else {
        handlers.setPreviewPoint(newPoint);
      }
    }
  }, [handlers, scene, camera, handlePointerMoveForSnapping, findSnapPoint, measurements, snapEnabled]);

  // Separate mouse event handler
  const handleMouseDown = useCallback((event: MouseEvent) => {
    // Only process left mouse button clicks (button 0) for measurement
    if (event.button !== 0) return;
    // Space held = rotate mode, skip point placement
    if (spaceHeldRef.current) return;
    
    processInteraction(event);
  }, [processInteraction]);
  
  const handleMouseMove = useCallback((event: MouseEvent) => {
    handlePointerMove(event);
  }, [handlePointerMove]);

  // Specific touch event handlers with proper tap detection
  const handleTouchStart = useCallback((event: TouchEvent) => {
    const now = Date.now();
    // Debounce successive touches
    if (now - lastTouchTimeRef.current < TOUCH_COOLDOWN) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    touchCountRef.current = event.touches.length;

    if (touchCountRef.current === 1) {
      const t = event.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: now };
      lastTouchPosRef.current = { x: t.clientX, y: t.clientY };
      lastTouchTimeRef.current = now;

      // Start long-press timer to directly activate point move
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      longPressTimerRef.current = window.setTimeout(() => {
        const pos = lastTouchPosRef.current || { x: t.clientX, y: t.clientY };
        const syntheticDblEvent = new MouseEvent('dblclick', { clientX: pos.x, clientY: pos.y });
        handleDoubleSelect(syntheticDblEvent as unknown as MouseEvent);
      }, LONG_PRESS_DURATION);
    }

    // Prevent default to avoid emulated mouse events and block OrbitControls
    event.preventDefault();
    event.stopPropagation();
  }, []);
  
  const handleTouchMove = useCallback((event: TouchEvent) => {
    touchCountRef.current = event.touches.length;

    if (touchCountRef.current === 1) {
      const t = event.touches[0];
      lastTouchPosRef.current = { x: t.clientX, y: t.clientY };

      // Cancel long-press if the finger moves too much
      const start = touchStartRef.current;
      if (start) {
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.hypot(dx, dy) > TAP_MAX_MOVEMENT && longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      handlePointerMove(event);
    } else {
      // Multi-touch: cancel long-press
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Skip measurement preview if using multitouch (allow 2-finger navigation)
    event.preventDefault();
    event.stopPropagation();
  }, [handlePointerMove]);
  
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    const start = touchStartRef.current;
    const last = lastTouchPosRef.current;
    touchCountRef.current = event.touches.length;

    // Always prevent to block OrbitControls from single-finger gestures
    event.preventDefault();
    event.stopPropagation();

    // Clear pending long-press when touch ends
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!start || !last) return;

    const duration = Date.now() - start.time;
    const dx = last.x - start.x;
    const dy = last.y - start.y;
    const distance = Math.hypot(dx, dy);

    // Only treat as tap if within thresholds
    const isTap = duration <= TAP_MAX_DURATION && distance <= TAP_MAX_MOVEMENT;

    const canvasElement = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvasElement) return;

    // If moving a point, finalize on touchend at last position
    if (handlers.movingPointInfo) {
      const syntheticEvent = new MouseEvent('click', { clientX: last.x, clientY: last.y });
      const newPoint = handlers.updateMovingPoint(syntheticEvent as unknown as MouseEvent, canvasElement);
      let finalPoint = newPoint;
      if (newPoint && snapEnabled) {
        finalPoint = applySnap(newPoint, measurements, handlers.movingPointInfo.measurementId);
      }
      handlers.finishPointMovement(finalPoint);
      clearSnapIndicator(true);

      touchStartRef.current = null;
      return;
    }

    if (isTap) {
      const now = Date.now();
      const lastTapTime = lastTapTimeRef.current;
      const lastTapPos = lastTapPosRef.current;
      const doubleTapTimeWindow = 300; // ms
      const doubleTapMoveTolerance = 16; // px

      // Check for double tap
      if (
        lastTapTime && now - lastTapTime < doubleTapTimeWindow &&
        lastTapPos && Math.hypot(last.x - lastTapPos.x, last.y - lastTapPos.y) <= doubleTapMoveTolerance
      ) {
        // Treat as double tap -> activate point editing
        const syntheticDblEvent = new MouseEvent('dblclick', { clientX: last.x, clientY: last.y });
        handleDoubleSelect(syntheticDblEvent as unknown as MouseEvent);
        // Reset
        lastTapTimeRef.current = 0;
        lastTapPosRef.current = null;
      } else {
        // Single tap -> normal interaction
        const syntheticEvent = new MouseEvent('click', { clientX: last.x, clientY: last.y });
        processInteraction(syntheticEvent as unknown as MouseEvent);
        // Store tap for possible double-tap
        lastTapTimeRef.current = now;
        lastTapPosRef.current = { x: last.x, y: last.y };
      }
    }

    touchStartRef.current = null;
  }, [applySnap, clearSnapIndicator, handlers, measurements, processInteraction, snapEnabled]);

  // Setup double-click selection to activate/edit points
  const handleDoubleSelect = useCallback((event: MouseEvent | TouchEvent) => {
    if (!enabled || !open || !scene || !camera) return;

    // Do not interfere while placing new points or moving one
    if (currentPoints.length > 0 || handlers.movingPointInfo) return;

    const canvasElement = (event.target as HTMLCanvasElement) || document.querySelector('canvas');
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) return;

    const mousePosition = calculateMousePosition(event, canvasElement);
    if (!mousePosition) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePosition, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    for (const intersect of intersects) {
      const ud = intersect.object.userData;
      if (!ud) continue;
      if (ud.isMeasurementPoint || ud.isAreaPoint) {
        const measurementId = ud.measurementId;
        const pointIndex = ud.pointIndex;
        if (!measurementId || pointIndex === undefined) continue;

        // Ensure correct measurement is in edit mode
        if (editMeasurementId !== measurementId) {
          handlers.toggleEditMode(measurementId);
        }
        handlers.startPointEdit(measurementId, pointIndex);

        // Immediately start moving the selected point
        const measurement = measurements.find(m => m.id === measurementId);
        if (measurement) {
          const point = measurement.points[pointIndex];
          const initialPoint = handlers.startPointMovement(measurementId, pointIndex, point);
          handlers.setPreviewPoint(initialPoint);
        }
        toast.info(`Punkt ${pointIndex + 1} aktiviert`, { duration: 1500 });
        return;
      }
    }
  }, [enabled, open, scene, camera, currentPoints.length, handlers, calculateMousePosition, editMeasurementId]);

  const handleDoubleClick = useCallback((event: MouseEvent) => {
    // Prevent default to avoid OrbitControls zooming on dblclick
    event.preventDefault();
    event.stopPropagation();
    handleDoubleSelect(event);
  }, [handleDoubleSelect]);

  // Setup event listeners
  useEffect(() => {
    if (!enabled || !scene || !camera) return;
    
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;

    // Disable right-click context menu
    const preventContext = (e: Event) => e.preventDefault();
    canvasElement.addEventListener('contextmenu', preventContext);

    // Space key: hold to rotate instead of placing points
    // Delete/Backspace: delete the currently active/moving point
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); spaceHeldRef.current = true; }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (handlers.movingPointInfo) {
          e.preventDefault();
          const { measurementId, pointIndex } = handlers.movingPointInfo;
          const measurement = measurements.find(m => m.id === measurementId);
          if (measurement && measurement.points.length > 3) {
            handlers.deletePoint(measurementId, pointIndex);
            toast.info(`Punkt ${pointIndex + 1} gelöscht`);
          } else if (measurement) {
            toast.warning('Mindestens 3 Punkte müssen erhalten bleiben');
          }
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') { spaceHeldRef.current = false; } };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    // Add mouse event listeners - NOT using 'pointerdown' to avoid conflict with touch
    canvasElement.addEventListener('mousedown', handleMouseDown);
    canvasElement.addEventListener('mousemove', handleMouseMove);
    canvasElement.addEventListener('dblclick', handleDoubleClick);
    
    // Add touch event listeners
    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Cleanup function
    return () => {
      canvasElement.removeEventListener('mousedown', handleMouseDown);
      canvasElement.removeEventListener('mousemove', handleMouseMove);
      canvasElement.removeEventListener('dblclick', handleDoubleClick);
      canvasElement.removeEventListener('touchstart', handleTouchStart);
      canvasElement.removeEventListener('touchmove', handleTouchMove);
      canvasElement.removeEventListener('touchend', handleTouchEnd);
      canvasElement.removeEventListener('contextmenu', preventContext);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      spaceHeldRef.current = false;
      clearSnapIndicator();
    };
  }, [
    enabled, scene, camera, 
    handleMouseDown, handleMouseMove, 
    handleTouchStart, handleTouchMove, handleTouchEnd,
    clearSnapIndicator
  ]);

  return {
    touchCountRef
  };
};
