import { useState, useEffect, useCallback, useMemo } from 'react';
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
    segmentLabelsRef: React.RefObject<THREE.Group>,
    previewLinesRef: React.RefObject<THREE.Group>,
    previewPointsRef: React.RefObject<THREE.Group>,
    addPointIndicatorsRef: React.RefObject<THREE.Group>
    // ... any other refs
  },
  handlers: {
    handleFinalizeMeasurement: () => void,
    handleUndoLastPoint: () => void,
    handleCancelEditing: () => void,
    addPoint: (point: Point) => void,
    selectedModuleIndex: number | null,
    selectedMeasurementId: string | null,
    handleSelectModule: (measurementId: string, moduleIndex: number) => void,
    currentPoints: Point[],
    activeMode: string,
    editMeasurementId: string | null,
    editingPointIndex: number | null,
    updateMeasurementPoint: (measurementId: string, pointIndex: number, point: Point) => void,
    handleDeletePoint: (measurementId: string, pointIndex: number) => void
  }
) => {
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const [mousePosition, setMousePosition] = useState(new THREE.Vector2());
  
  // Use the point snapping context
  const { snapEnabled, snapPoint, findPotentialSnapPoints } = usePointSnapping();
  
  // Create composite hooks for different aspects of measurement interaction
  const measurementPreview = useMeasurementPreview(refs.previewPointsRef, refs.previewLinesRef);
  const addPointIndicators = useAddPointIndicators(refs.addPointIndicatorsRef);
  const pointMovement = usePointMovement();
  
  // State for tracking if point movement is active
  const [isMovingPoint, setIsMovingPoint] = useState(false);
  
  // Handle module interaction (selection)
  const handleModuleInteraction = useCallback((event: MouseEvent | TouchEvent) => {
    if (!scene || !camera || !refs.measurementsRef.current || !enabled) return;
    
    let clientX, clientY;
    
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event instanceof TouchEvent) {
      if (event.changedTouches.length === 0) return;
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      return;
    }
    
    // Convert coordinates to normalized device coordinates
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    
    // Find intersections with PV modules specifically
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Look for PV module objects in intersections
    const moduleIntersect = intersects.find(intersect => {
      let obj = intersect.object;
      let userData = obj.userData;
      
      // Check if this is a PV module or part of a PV module
      return userData && (userData.isPVModule || userData.isPVModulePanel || userData.isPVModuleCell);
    });
    
    if (moduleIntersect) {
      // Find the parent module
      let moduleObj = moduleIntersect.object;
      while (moduleObj && (!moduleObj.userData || !moduleObj.userData.isPVModule)) {
        moduleObj = moduleObj.parent as THREE.Object3D;
      }
      
      if (moduleObj && moduleObj.userData && 
          moduleObj.userData.measurementId && 
          moduleObj.userData.moduleIndex !== undefined) {
        
        // Call the selection handler
        handlers.handleSelectModule(
          moduleObj.userData.measurementId,
          moduleObj.userData.moduleIndex
        );
        
        return true; // Indicate that we handled a module interaction
      }
    }
    
    return false; // No module interaction occurred
  }, [scene, camera, refs.measurementsRef, raycaster, handlers.handleSelectModule, enabled]);
  
  // Initialize all necessary groups in the scene
  const initializeGroups = useCallback((scene: THREE.Scene) => {
    refs.pointsRef.current = new THREE.Group();
    refs.pointsRef.current.name = "measurementPoints";
    scene.add(refs.pointsRef.current);

    refs.linesRef.current = new THREE.Group();
    refs.linesRef.current.name = "measurementLines";
    scene.add(refs.linesRef.current);
    
    refs.areaLinesRef.current = new THREE.Group();
    refs.areaLinesRef.current.name = "areaLines";
    scene.add(refs.areaLinesRef.current);
    
    refs.areasRef.current = new THREE.Group();
    refs.areasRef.current.name = "measurementAreas";
    scene.add(refs.areasRef.current);

    refs.measurementsRef.current = new THREE.Group();
    refs.measurementsRef.current.name = "measurements";
    scene.add(refs.measurementsRef.current);

    refs.editPointsRef.current = new THREE.Group();
    refs.editPointsRef.current.name = "editPoints";
    scene.add(refs.editPointsRef.current);
    
    refs.pointLabelsRef.current = new THREE.Group();
    refs.pointLabelsRef.current.name = "pointLabels";
    scene.add(refs.pointLabelsRef.current);

    refs.labelsRef.current = new THREE.Group();
    refs.labelsRef.current.name = "textLabels";
    scene.add(refs.labelsRef.current);
    
    refs.segmentLabelsRef.current = new THREE.Group();
    refs.segmentLabelsRef.current.name = "segmentLabels";
    scene.add(refs.segmentLabelsRef.current);

    refs.rulerRef.current = new THREE.Group();
    refs.rulerRef.current.name = "ruler";
    scene.add(refs.rulerRef.current);

    refs.previewLinesRef.current = new THREE.Group();
    refs.previewLinesRef.current.name = "previewLines";
    scene.add(refs.previewLinesRef.current);

    refs.previewPointsRef.current = new THREE.Group();
    refs.previewPointsRef.current.name = "previewPoints";
    scene.add(refs.previewPointsRef.current);

    refs.addPointIndicatorsRef.current = new THREE.Group();
    refs.addPointIndicatorsRef.current.name = "addPointIndicators";
    scene.add(refs.addPointIndicatorsRef.current);
  }, [refs]);
  
  // Update measurements visualizations
  const updateMeasurements = useCallback((measurements) => {
    if (!refs.measurementsRef.current) return;
    
    // Clear existing measurements
    while (refs.measurementsRef.current.children.length > 0) {
      refs.measurementsRef.current.remove(refs.measurementsRef.current.children[0]);
    }
  }, [refs]);
  
  // Handle mouse down event on canvas
  const handleCanvasClick = useCallback((event: MouseEvent | TouchEvent) => {
    if (!enabled || !scene || !camera) return;
    
    let clientX, clientY;
    
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event instanceof TouchEvent) {
      if (event.touches.length === 0) return;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      return;
    }
    
    // Calculate mouse position in normalized device coordinates
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    
    // Raycast to find intersections
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Filter out measurement objects
    const validIntersects = intersects.filter(intersect => {
      let currentObj = intersect.object;
      while (currentObj) {
        if (
          currentObj.name === "measurementPoints" || 
          currentObj.name === "measurementLines" ||
          currentObj.name === "measurementLabels" ||
          currentObj.name === "editPoints" ||
          currentObj.name === "textLabels" ||
          currentObj.name === "segmentLabels" ||
          currentObj.name === "previewPoints" ||
          currentObj.name === "addPointIndicators"
        ) {
          return false;
        }
        currentObj = currentObj.parent as THREE.Object3D;
      }
      return true;
    });
    
    if (validIntersects.length > 0) {
      const intersect = validIntersects[0];
      
      // Get the point
      let point = {
        x: intersect.point.x,
        y: intersect.point.y,
        z: intersect.point.z
      };
      
      // Apply snapping if enabled
      if (snapEnabled && snapPoint) {
        point = snapPoint;
      }
      
      // If we're editing a point, update it
      if (handlers.editMeasurementId && handlers.editingPointIndex !== null) {
        handlers.updateMeasurementPoint(handlers.editMeasurementId, handlers.editingPointIndex, point);
      } else {
        // Otherwise, add a new point
        handlers.addPoint(point);
      }
    }
  }, [
    camera, 
    scene, 
    refs, 
    raycaster, 
    handlers.addPoint, 
    handlers.activeMode, 
    snapEnabled,
    snapPoint,
    handlers.editMeasurementId,
    handlers.currentPoints,
    handlers.editingPointIndex,
    handlers.updateMeasurementPoint
  ]);
  
  // Handle mouse move on canvas
  const handleCanvasMouseMove = useCallback((event: MouseEvent) => {
    if (!enabled || !scene || !camera) return;
    
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const newMousePosition = new THREE.Vector2(x, y);
    setMousePosition(newMousePosition);
    
    raycaster.setFromCamera(newMousePosition, camera);
    
    // Find intersections
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Filter out measurement objects
    const validIntersects = intersects.filter(intersect => {
      let currentObj = intersect.object;
      while (currentObj) {
        if (
          currentObj.name === "measurementPoints" || 
          currentObj.name === "measurementLines" ||
          currentObj.name === "measurementLabels" ||
          currentObj.name === "editPoints" ||
          currentObj.name === "textLabels" ||
          currentObj.name === "segmentLabels" ||
          currentObj.name === "previewPoints" ||
          currentObj.name === "addPointIndicators"
        ) {
          return false;
        }
        currentObj = currentObj.parent as THREE.Object3D;
      }
      return true;
    });
    
    if (validIntersects.length > 0) {
      const intersect = validIntersects[0];
      
      // Get the point
      let point = {
        x: intersect.point.x,
        y: intersect.point.y,
        z: intersect.point.z
      };
      
      // Apply snapping if enabled
      if (snapEnabled) {
        const potentialSnapPoints = findPotentialSnapPoints();
        if (potentialSnapPoints) {
          const snap = potentialSnapPoints.find(snapPoint => {
            const distance = new THREE.Vector3(snapPoint.x, snapPoint.y, snapPoint.z).distanceTo(intersect.point);
            return distance < 0.1; // Snap threshold
          });
          
          if (snap) {
            point = snap;
          }
        }
      }
      
      // Set the preview point
      measurementPreview.setPreviewPoint(point);
      
      // If we're moving a point, update it
      if (handlers.editMeasurementId && handlers.editingPointIndex !== null) {
        pointMovement.updateMovingPoint(handlers.editMeasurementId, handlers.editingPointIndex, point);
      }
    }
  }, [
    camera, 
    scene, 
    measurementPreview, 
    raycaster,
    mousePosition,
    setMousePosition,
    handlers.activeMode, 
    handlers.currentPoints,
    handlers.editMeasurementId,
    handlers.editingPointIndex,
    snapEnabled,
    snapPoint,
    findPotentialSnapPoints,
    isMovingPoint,
    pointMovement,
    addPointIndicators
  ]);
  
  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handlers.handleFinalizeMeasurement();
    } else if (event.key === 'Escape') {
      handlers.handleCancelEditing();
    } else if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
      handlers.handleUndoLastPoint();
    }
  }, [handlers.handleFinalizeMeasurement, handlers.handleUndoLastPoint, handlers.handleCancelEditing]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up any resources, event listeners, etc.
      measurementPreview.clearPreview();
      addPointIndicators.clearIndicators();
    };
  }, [measurementPreview, addPointIndicators]);
  
  return {
    initializeGroups,
    updateMeasurements,
    handleCanvasClick,
    handleCanvasMouseMove,
    handleModuleInteraction,
    handleKeyDown
  };
};
