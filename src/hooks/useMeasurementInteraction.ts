
import { useEffect, useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { toast } from 'sonner';
import { Point } from '@/hooks/useMeasurements';

/**
 * Custom hook to handle user interactions with measurements
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
  const [movingPointInfo, setMovingPointInfo] = useState<{
    measurementId: string;
    pointIndex: number;
  } | null>(null);

  // Preview point during movement
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const previewRef = useRef<THREE.Group | null>(null);

  // Initialize preview group
  useEffect(() => {
    if (!scene) return;
    
    if (!previewRef.current) {
      previewRef.current = new THREE.Group();
      previewRef.current.name = "previewPoints";
      scene.add(previewRef.current);
    }
    
    return () => {
      if (previewRef.current && scene) {
        clearPreviewGroup();
        scene.remove(previewRef.current);
        previewRef.current = null;
      }
    };
  }, [scene]);

  // Function to clear the preview group
  const clearPreviewGroup = useCallback(() => {
    if (!previewRef.current) return;
    
    while (previewRef.current.children.length > 0) {
      const child = previewRef.current.children[0];
      
      // Dispose of geometries and materials - Fixed TypeScript errors
      if ('geometry' in child) {
        const meshChild = child as THREE.Mesh;
        if (meshChild.geometry) {
          meshChild.geometry.dispose();
        }
      }
      
      if ('material' in child) {
        const meshChild = child as THREE.Mesh;
        if (meshChild.material) {
          if (Array.isArray(meshChild.material)) {
            meshChild.material.forEach(mat => mat.dispose());
          } else {
            meshChild.material.dispose();
          }
        }
      }
      
      previewRef.current.remove(child);
    }
  }, []);

  // Update preview point visualization
  useEffect(() => {
    if (!previewRef.current || !previewPoint || !movingPointInfo) {
      clearPreviewGroup();
      return;
    }
    
    // Clear existing previews
    clearPreviewGroup();
    
    // Create preview sphere
    const sphereGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff00ff,
      opacity: 0.7,
      transparent: true
    });
    
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(previewPoint.x, previewPoint.y, previewPoint.z);
    previewRef.current.add(sphere);
    
    // Add directional line from original point to preview
    const measurement = measurements.find(m => m.id === movingPointInfo.measurementId);
    if (measurement) {
      const originalPoint = measurement.points[movingPointInfo.pointIndex];
      
      const linePoints = [
        new THREE.Vector3(originalPoint.x, originalPoint.y, originalPoint.z),
        new THREE.Vector3(previewPoint.x, previewPoint.y, previewPoint.z)
      ];
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMaterial = new THREE.LineDashedMaterial({ 
        color: 0xff00ff,
        dashSize: 0.1,
        gapSize: 0.05,
      });
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.computeLineDistances();
      previewRef.current.add(line);
    }
  }, [previewPoint, movingPointInfo, measurements, clearPreviewGroup]);

  // Track the raycaster and mouse position for hover effects
  const updatePreviewPoint = useCallback((event: MouseEvent | TouchEvent) => {
    if (!movingPointInfo || !scene || !camera) return;
    
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;
    
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
    const canvasRect = canvasElement.getBoundingClientRect();
    const mouseX = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    const mouseY = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    
    // Create raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(mouseX, mouseY);
    
    // Set raycaster from camera and mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Get intersections
    const intersects = raycaster.intersectObjects(scene.children, true);
    const validIntersects = filterMeasurementObjects(intersects);
    
    if (validIntersects.length > 0) {
      const intersect = validIntersects[0];
      setPreviewPoint({
        x: intersect.point.x,
        y: intersect.point.y,
        z: intersect.point.z
      });
    }
  }, [movingPointInfo, scene, camera]);

  // Helper function to filter out measurement objects from intersections
  const filterMeasurementObjects = useCallback((intersects: THREE.Intersection[]) => {
    return intersects.filter(intersect => {
      let currentObj = intersect.object;
      while (currentObj) {
        if (
          currentObj.name === "measurementPoints" || 
          currentObj.name === "measurementLines" ||
          currentObj.name === "measurementLabels" ||
          currentObj.name === "editPoints" ||
          currentObj.name === "textLabels" ||
          currentObj.name === "segmentLabels" ||
          currentObj.name === "previewPoints"
        ) {
          return false;
        }
        // @ts-ignore - parent property exists on THREE.Object3D
        currentObj = currentObj.parent;
      }
      return true;
    });
  }, []);

  useEffect(() => {
    if (!enabled || !scene || !camera) return;
    
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;
    
    // Mouse and touch event handlers
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      // Ensure we're enabled and the sidebar is open
      if (!enabled || !open) return;
      
      let clientX, clientY;
      
      if (event instanceof MouseEvent) {
        // For mouse events
        clientX = event.clientX;
        clientY = event.clientY;
      } else if (event instanceof TouchEvent) {
        // For touch events
        if (event.touches.length === 0) return;
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
        
        // Prevent scrolling when interacting with the canvas
        event.preventDefault();
      } else {
        return;
      }
      
      // Calculate mouse position in normalized device coordinates
      const canvasRect = canvasElement.getBoundingClientRect();
      const mouseX = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
      const mouseY = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
      
      // Create raycaster
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(mouseX, mouseY);
      
      // Set raycaster from camera and mouse position
      raycaster.setFromCamera(mouse, camera);
      
      // Handle moving point case
      if (movingPointInfo && previewPoint) {
        // Update the point position with the preview point
        handlers.updateMeasurementPoint(
          movingPointInfo.measurementId, 
          movingPointInfo.pointIndex, 
          previewPoint
        );
        
        // Reset movement state
        setMovingPointInfo(null);
        setPreviewPoint(null);
        
        // Clear preview visuals
        clearPreviewGroup();
        
        toast.success(`Punkt ${movingPointInfo.pointIndex + 1} wurde verschoben`);
        return;
      }
      
      // Check for edit point interactions - only when in edit mode
      if (editMeasurementId && refs.editPointsRef.current) {
        const editPointIntersects = raycaster.intersectObjects(refs.editPointsRef.current.children, true);
        
        if (editPointIntersects.length > 0) {
          const intersect = editPointIntersects[0];
          const userData = intersect.object.userData;
          
          if (userData.isEditPoint) {
            setMovingPointInfo({
              measurementId: userData.measurementId,
              pointIndex: userData.pointIndex
            });
            
            // Initialize preview point at the current position
            const measurement = measurements.find(m => m.id === userData.measurementId);
            if (measurement) {
              const point = measurement.points[userData.pointIndex];
              setPreviewPoint(point);
            }
            
            toast.info(`Punkt ${userData.pointIndex + 1} wird verschoben. Klicken Sie an die neue Position.`);
            return;
          }
        }
      }
      
      // Check for clicks on measurement points but only if we're in edit mode
      // Otherwise, let the regular point placement logic handle it
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
              // Start movement mode
              setMovingPointInfo({
                measurementId: userData.measurementId,
                pointIndex: userData.pointIndex
              });
              
              // Initialize preview point at the current position
              const measurement = measurements.find(m => m.id === userData.measurementId);
              if (measurement) {
                const point = measurement.points[userData.pointIndex];
                setPreviewPoint(point);
              }
              
              toast.info(`Punkt ${userData.pointIndex + 1} wird verschoben. Klicken Sie an die neue Position.`);
              return;
            }
          }
        }
      }
      
      // General intersections for adding points - should work regardless of whether edit mode is active
      if (activeMode !== 'none') {
        const intersects = raycaster.intersectObjects(scene.children, true);
        const validIntersects = filterMeasurementObjects(intersects);
        
        if (validIntersects.length > 0) {
          const intersect = validIntersects[0];
          const point = {
            x: intersect.point.x,
            y: intersect.point.y,
            z: intersect.point.z
          };
          
          // Handle editing case
          if (editMeasurementId !== null && editingPointIndex !== null) {
            handlers.addPoint(point);
            toast.success(`Messpunkt ${editingPointIndex + 1} wurde aktualisiert.`);
            return;
          }
          
          // Handle adding new measurement points (should work even if other measurements exist)
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
    };
    
    // Handle mouse/touch move for preview
    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      if (movingPointInfo) {
        updatePreviewPoint(event);
      }
    };
    
    // Add event listeners
    canvasElement.addEventListener('mousedown', handlePointerDown);
    canvasElement.addEventListener('mousemove', handlePointerMove);
    canvasElement.addEventListener('touchstart', handlePointerDown);
    canvasElement.addEventListener('touchmove', handlePointerMove);
    
    // Cleanup function
    return () => {
      canvasElement.removeEventListener('mousedown', handlePointerDown);
      canvasElement.removeEventListener('mousemove', handlePointerMove);
      canvasElement.removeEventListener('touchstart', handlePointerDown);
      canvasElement.removeEventListener('touchmove', handlePointerMove);
    };
  }, [
    enabled, scene, camera, open, measurements, currentPoints, activeMode,
    editMeasurementId, editingPointIndex, movingPointInfo, previewPoint,
    handlers.addPoint, handlers.startPointEdit, handlers.updateMeasurementPoint,
    updatePreviewPoint, filterMeasurementObjects, clearPreviewGroup,
    refs.editPointsRef, refs.segmentLabelsRef
  ]);

  return {
    movingPointInfo,
    setMovingPointInfo,
    previewPoint,
    clearPreviewGroup
  };
};
