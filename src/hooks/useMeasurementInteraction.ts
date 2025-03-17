
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
  
  // Track multitouch state for mobile
  const touchCountRef = useRef<number>(0);

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

  // Helper function to find the closest point on a line segment
  const findClosestPointOnLine = useCallback((
    point: THREE.Vector3,
    lineStart: THREE.Vector3,
    lineEnd: THREE.Vector3
  ): THREE.Vector3 => {
    // Create line direction vector
    const line = new THREE.Vector3().subVectors(lineEnd, lineStart);
    const lineLength = line.length();
    line.normalize();
    
    // Vector from line start to point
    const pointVector = new THREE.Vector3().subVectors(point, lineStart);
    
    // Project pointVector onto line
    const projection = pointVector.dot(line);
    
    // Clamp projection to line segment
    const clamped = Math.max(0, Math.min(projection, lineLength));
    
    // Get the point on the line
    return new THREE.Vector3().addVectors(
      lineStart, 
      new THREE.Vector3().copy(line).multiplyScalar(clamped)
    );
  }, []);

  // Check if a point is close to a line segment
  const isPointNearLine = useCallback((
    point: THREE.Vector3,
    lineStart: THREE.Vector3,
    lineEnd: THREE.Vector3,
    threshold: number = 0.1
  ): boolean => {
    const closestPoint = findClosestPointOnLine(point, lineStart, lineEnd);
    return point.distanceTo(closestPoint) <= threshold;
  }, [findClosestPointOnLine]);

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

  // Find intersection point with area measurement lines (for adding points to existing areas)
  const findIntersectionWithAreaLines = useCallback((
    raycaster: THREE.Raycaster, 
    scene: THREE.Scene,
    measurements: any[]
  ): { point: Point, measurementId: string, segmentIndex: number } | null => {
    // Only check area measurements that are visible
    const areaMeasurements = measurements.filter(m => 
      m.type === 'area' && m.visible !== false
    );

    if (areaMeasurements.length === 0) return null;

    // Get all valid intersections with the scene
    const intersects = raycaster.intersectObjects(scene.children, true);
    const validIntersects = filterMeasurementObjects(intersects);
    
    if (validIntersects.length === 0) return null;
    
    // Get the closest intersection point
    const intersectionPoint = new THREE.Vector3(
      validIntersects[0].point.x,
      validIntersects[0].point.y,
      validIntersects[0].point.z
    );
    
    // Check each area measurement for a close line segment
    for (const measurement of areaMeasurements) {
      const points = measurement.points;
      if (points.length < 3) continue;
      
      // Check each line segment
      for (let i = 0; i < points.length; i++) {
        const pointA = new THREE.Vector3(points[i].x, points[i].y, points[i].z);
        const pointB = new THREE.Vector3(
          points[(i + 1) % points.length].x,
          points[(i + 1) % points.length].y, 
          points[(i + 1) % points.length].z
        );
        
        // Check if the intersection point is close to this line segment
        if (isPointNearLine(intersectionPoint, pointA, pointB, 0.1)) {
          // Get the exact point on the line
          const pointOnLine = findClosestPointOnLine(intersectionPoint, pointA, pointB);
          
          return {
            point: {
              x: pointOnLine.x,
              y: pointOnLine.y,
              z: pointOnLine.z
            },
            measurementId: measurement.id,
            segmentIndex: i
          };
        }
      }
    }
    
    return null;
  }, [filterMeasurementObjects, isPointNearLine, findClosestPointOnLine]);

  useEffect(() => {
    if (!enabled || !scene || !camera) return;
    
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;
    
    // Track touch events for multitouch detection
    const handleTouchStart = (event: TouchEvent) => {
      touchCountRef.current = event.touches.length;
      
      // Skip measurement interactions if using multitouch (2 or more fingers)
      if (touchCountRef.current >= 2) return;
      
      // Single touch - process as normal click for measurements
      handlePointerDown(event);
    };
    
    const handleTouchMove = (event: TouchEvent) => {
      touchCountRef.current = event.touches.length;
      
      // Skip measurement preview if using multitouch
      if (touchCountRef.current >= 2) return;
      
      if (movingPointInfo) {
        updatePreviewPoint(event);
      }
    };
    
    const handleTouchEnd = (event: TouchEvent) => {
      // Update touch count
      touchCountRef.current = event.touches.length;
    };
    
    // Mouse event handlers (left click only for measurements)
    const handleMouseDown = (event: MouseEvent) => {
      // Only process left mouse button clicks (button 0) for measurement
      if (event.button !== 0) return;
      
      handlePointerDown(event);
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (movingPointInfo) {
        updatePreviewPoint(event);
      }
    };
    
    // Generic pointer event processing
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      // Ensure we're enabled and the sidebar is open
      if (!enabled || !open) return;
      
      // Skip if using multitouch
      if (event instanceof TouchEvent && event.touches.length >= 2) return;
      
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
      
      // Special case for adding points to existing area measurements
      if (activeMode === 'none') {
        // Check if we're clicking near an existing area measurement line
        const lineIntersection = findIntersectionWithAreaLines(raycaster, scene, measurements);
        
        if (lineIntersection) {
          const { point, measurementId, segmentIndex } = lineIntersection;
          
          // Get the measurement
          const measurement = measurements.find(m => m.id === measurementId);
          if (!measurement) return;
          
          // Create a new array of points with the new point inserted at the correct position
          const newPoints = [...measurement.points];
          newPoints.splice(segmentIndex + 1, 0, point);
          
          // Update the measurement with the new point
          const updatedMeasurement = {
            ...measurement,
            points: newPoints
          };
          
          // We'll use a custom event to notify about this change to avoid modifying too many hooks
          const pointAddedEvent = new CustomEvent('areaPointAdded', {
            detail: {
              measurementId,
              updatedMeasurement
            }
          });
          document.dispatchEvent(pointAddedEvent);
          
          toast.success(`Punkt hinzugefügt zu Flächenmessung`);
          return;
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
    
    // Add event listeners
    canvasElement.addEventListener('mousedown', handleMouseDown);
    canvasElement.addEventListener('mousemove', handleMouseMove);
    canvasElement.addEventListener('touchstart', handleTouchStart);
    canvasElement.addEventListener('touchmove', handleTouchMove);
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
    enabled, scene, camera, open, measurements, currentPoints, activeMode,
    editMeasurementId, editingPointIndex, movingPointInfo, previewPoint,
    handlers.addPoint, handlers.startPointEdit, handlers.updateMeasurementPoint,
    updatePreviewPoint, filterMeasurementObjects, clearPreviewGroup,
    refs.editPointsRef, refs.segmentLabelsRef, findIntersectionWithAreaLines
  ]);

  return {
    movingPointInfo,
    setMovingPointInfo,
    previewPoint,
    clearPreviewGroup
  };
};
