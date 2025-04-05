
import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { MeasurementMode, Point, Measurement } from '@/types/measurements';
import { useThrottledCallback } from '@/hooks/useThrottledCallback';
import { usePointSnapping } from '@/contexts/PointSnappingContext';

interface MeasurementEventHandlers {
  addPoint: (point: Point) => void;
  startPointMovement?: (measurementId: string, pointIndex: number, point: Point) => void;
  finishPointMovement?: (measurementId: string, pointIndex: number, point: Point) => void;
  updateMovingPoint?: (point: Point) => void;
  handleAddPointAtMidpoint?: (measurementId: string, segmentIndex: number, point: Point) => void;
}

export const useMeasurementEvents = (
  enabled: boolean,
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  activeMode: MeasurementMode,
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  measurements: Measurement[],
  currentPoints: Point[],
  handlers: MeasurementEventHandlers,
  movingPointInfo: { measurementId: string; pointIndex: number } | null,
  raycaster?: THREE.Raycaster
) => {
  // Create a raycaster if not provided
  const raycasterRef = useRef<THREE.Raycaster>(raycaster || new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  
  // Get snapping functionality
  const { snapEnabled, getSnapPoint } = usePointSnapping();

  // Cache edit points for performance
  const editPointsRef = useRef<THREE.Object3D[]>([]);
  const addPointIndicatorsRef = useRef<THREE.Object3D[]>([]);
  
  // Track if we're currently in a drag operation
  const isDraggingRef = useRef(false);
  
  // Track the last event timestamp to prevent double-clicks
  const lastClickTimeRef = useRef(0);
  
  // Update the edit points reference
  useEffect(() => {
    if (!scene || !enabled || !editMeasurementId) {
      editPointsRef.current = [];
      return;
    }
    
    // Find all edit points in the scene
    editPointsRef.current = [];
    scene.traverse((object) => {
      if (object.userData && 
          object.userData.isEditPoint && 
          object.userData.measurementId === editMeasurementId) {
        editPointsRef.current.push(object);
      }
    });
  }, [scene, enabled, editMeasurementId, measurements]);
  
  // Update the add point indicators reference
  useEffect(() => {
    if (!scene || !enabled || !editMeasurementId) {
      addPointIndicatorsRef.current = [];
      return;
    }
    
    // Find all add point indicators in the scene
    addPointIndicatorsRef.current = [];
    scene.traverse((object) => {
      if (object.userData && 
          object.userData.isAddPointIndicator && 
          object.userData.measurementId === editMeasurementId) {
        addPointIndicatorsRef.current.push(object);
      }
    });
  }, [scene, enabled, editMeasurementId, measurements]);

  // Handle mouse click
  const handleClick = useCallback((event: MouseEvent) => {
    if (!enabled || !scene || !camera) return;
    
    // Debounce clicks to prevent double-clicks
    const now = Date.now();
    if (now - lastClickTimeRef.current < 300) {
      return;
    }
    lastClickTimeRef.current = now;
    
    // Calculate mouse position in normalized device coordinates
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the raycaster
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    
    // Handle different modes
    if (movingPointInfo) {
      // We're in the middle of moving a point, so this click should finish the move
      handleFinishPointMovement(event);
    } else if (editMeasurementId) {
      // We're in edit mode, so check for interactions with edit points
      handleEditModeClick(event);
    } else if (activeMode !== 'none') {
      // We're adding a new measurement
      handleAddMeasurementPoint(event);
    }
  }, [enabled, scene, camera, activeMode, editMeasurementId, movingPointInfo]);

  // Handle mouse move
  const handleMouseMove = useThrottledCallback((event: MouseEvent) => {
    if (!enabled || !scene || !camera) return;
    
    // Calculate mouse position in normalized device coordinates
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the raycaster
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    
    // Handle point movement if we're moving a point
    if (movingPointInfo && handlers.updateMovingPoint) {
      const intersection = findModelIntersection(raycasterRef.current, scene);
      
      if (intersection) {
        // Check if snapping is enabled and find a snap point
        let finalPoint: Point;
        
        if (snapEnabled) {
          const snapPoint = getSnapPoint(intersection.point);
          finalPoint = snapPoint || {
            x: intersection.point.x,
            y: intersection.point.y,
            z: intersection.point.z
          };
        } else {
          finalPoint = {
            x: intersection.point.x,
            y: intersection.point.y,
            z: intersection.point.z
          };
        }
        
        handlers.updateMovingPoint(finalPoint);
      }
    }
  }, 16); // Throttle to ~60fps

  // Handle finishing a point movement
  const handleFinishPointMovement = useCallback((event: MouseEvent) => {
    if (!movingPointInfo || !handlers.finishPointMovement || !scene || !camera) return;
    
    const intersection = findModelIntersection(raycasterRef.current, scene);
    
    if (intersection) {
      // Check for snapping
      let finalPoint: Point;
      
      if (snapEnabled) {
        const snapPoint = getSnapPoint(intersection.point);
        finalPoint = snapPoint || {
          x: intersection.point.x,
          y: intersection.point.y,
          z: intersection.point.z
        };
      } else {
        finalPoint = {
          x: intersection.point.x,
          y: intersection.point.y,
          z: intersection.point.z
        };
      }
      
      handlers.finishPointMovement(
        movingPointInfo.measurementId,
        movingPointInfo.pointIndex,
        finalPoint
      );
    }
  }, [movingPointInfo, handlers.finishPointMovement, scene, camera, snapEnabled, getSnapPoint]);

  // Handle clicks in edit mode
  const handleEditModeClick = useCallback((event: MouseEvent) => {
    if (!editMeasurementId || !scene || !camera) return;
    
    // Check for intersections with edit points
    const intersects = raycasterRef.current.intersectObjects(editPointsRef.current, true);
    
    if (intersects.length > 0) {
      // Find the actual object with userData
      let targetObject = intersects[0].object;
      while (targetObject && !targetObject.userData?.isEditPoint) {
        targetObject = targetObject.parent!;
      }
      
      if (targetObject && handlers.startPointMovement) {
        const pointIndex = targetObject.userData.pointIndex;
        
        // Find the measurement
        const measurement = measurements.find(m => m.id === editMeasurementId);
        if (measurement && pointIndex >= 0 && pointIndex < measurement.points.length) {
          const point = measurement.points[pointIndex];
          handlers.startPointMovement(editMeasurementId, pointIndex, point);
          return;
        }
      }
    }
    
    // Check for intersections with add point indicators
    const addPointIntersects = raycasterRef.current.intersectObjects(addPointIndicatorsRef.current, true);
    
    if (addPointIntersects.length > 0) {
      // Find the actual object with userData
      let targetObject = addPointIntersects[0].object;
      while (targetObject && !targetObject.userData?.isAddPointIndicator) {
        targetObject = targetObject.parent!;
      }
      
      if (targetObject && handlers.handleAddPointAtMidpoint) {
        const segmentIndex = targetObject.userData.segmentIndex;
        const intersection = findModelIntersection(raycasterRef.current, scene);
        
        if (intersection) {
          const point = {
            x: intersection.point.x,
            y: intersection.point.y,
            z: intersection.point.z
          };
          
          handlers.handleAddPointAtMidpoint(editMeasurementId, segmentIndex, point);
          return;
        }
      }
    }
    
    // If no edit point was clicked, check for model intersection
    const intersection = findModelIntersection(raycasterRef.current, scene);
    
    if (intersection) {
      // No edit point or add point indicator was clicked
      // This could be used for additional functionality
    }
  }, [editMeasurementId, measurements, scene, camera, handlers]);

  // Handle adding a new measurement point
  const handleAddMeasurementPoint = useCallback((event: MouseEvent) => {
    if (activeMode === 'none' || !scene || !camera) return;
    
    const intersection = findModelIntersection(raycasterRef.current, scene);
    
    if (intersection) {
      // Check for snapping
      let finalPoint: Point;
      
      if (snapEnabled) {
        const snapPoint = getSnapPoint(intersection.point);
        finalPoint = snapPoint || {
          x: intersection.point.x,
          y: intersection.point.y,
          z: intersection.point.z
        };
      } else {
        finalPoint = {
          x: intersection.point.x,
          y: intersection.point.y,
          z: intersection.point.z
        };
      }
      
      handlers.addPoint(finalPoint);
    }
  }, [activeMode, scene, camera, handlers.addPoint, snapEnabled, getSnapPoint]);
  
  // Helper function to find model intersection
  const findModelIntersection = (raycaster: THREE.Raycaster, scene: THREE.Scene) => {
    // Get all meshes that represent the model (not measurement visuals)
    const modelMeshes: THREE.Object3D[] = [];
    scene.traverse(object => {
      // Skip objects that are part of the measurement system
      if (object.userData && (
        object.userData.isMeasurementVisual ||
        object.userData.isEditPoint ||
        object.userData.isAddPointIndicator ||
        object.userData.isLabel
      )) {
        return;
      }
      
      // Include meshes and other visible objects
      if ((object instanceof THREE.Mesh ||
           object instanceof THREE.Line) && 
          object.visible) {
        modelMeshes.push(object);
      }
    });
    
    const intersects = raycaster.intersectObjects(modelMeshes, true);
    return intersects.length > 0 ? intersects[0] : null;
  };

  // Set up event listeners
  useEffect(() => {
    if (!enabled || !scene || !camera) return;
    
    window.addEventListener('click', handleClick);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, scene, camera, handleClick, handleMouseMove]);

  return {
    raycaster: raycasterRef.current
  };
};
