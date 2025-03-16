
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!enabled || !scene || !camera) return;
    
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;
    
    const handleClick = (event: MouseEvent) => {
      if (!enabled || !open) return;
      
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const canvasRect = canvasElement.getBoundingClientRect();
      const mouseX = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
      const mouseY = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
      
      // Create raycaster
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(mouseX, mouseY);
      
      // Set raycaster from camera and mouse position
      raycaster.setFromCamera(mouse, camera);
      
      // Handle moving point case
      if (movingPointInfo) {
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        const validIntersects = filterMeasurementObjects(intersects);
        
        if (validIntersects.length > 0) {
          const intersect = validIntersects[0];
          const point = {
            x: intersect.point.x,
            y: intersect.point.y,
            z: intersect.point.z
          };
          
          handlers.updateMeasurementPoint(
            movingPointInfo.measurementId, 
            movingPointInfo.pointIndex, 
            point
          );
          
          setMovingPointInfo(null);
          toast.success(`Punkt ${movingPointInfo.pointIndex + 1} wurde verschoben`);
          return;
        }
      }
      
      // Check for edit point interactions
      if (editMeasurementId && refs.editPointsRef.current) {
        const editPointIntersects = raycaster.intersectObjects(refs.editPointsRef.current.children, false);
        
        if (editPointIntersects.length > 0) {
          const intersect = editPointIntersects[0];
          const userData = intersect.object.userData;
          
          if (userData.isEditPoint) {
            handlers.startPointEdit(userData.measurementId, userData.pointIndex);
            toast.info(`Messpunkt ${userData.pointIndex + 1} wird bearbeitet. Klicken Sie an eine neue Position.`);
            return;
          }
        }
      }
      
      // Check for clicks on measurement points in area measurements
      const allSceneIntersects = raycaster.intersectObjects(scene.children, true);
      for (const intersect of allSceneIntersects) {
        if (
          intersect.object.userData && 
          intersect.object.userData.isAreaPoint
        ) {
          const userData = intersect.object.userData;
          
          setMovingPointInfo({
            measurementId: userData.measurementId,
            pointIndex: userData.pointIndex
          });
          
          toast.info(`Punkt ${userData.pointIndex + 1} wird verschoben. Klicken Sie an die neue Position.`);
          return;
        }
      }
      
      // Check for segment label interactions
      if (refs.segmentLabelsRef.current) {
        const labelIntersects = raycaster.intersectObjects(refs.segmentLabelsRef.current.children, false);
        
        if (labelIntersects.length > 0) {
          const intersect = labelIntersects[0];
          const userData = intersect.object.userData;
          
          if (userData.measurementId && userData.startPointIndex !== undefined) {
            const measurement = measurements.find(m => m.id === userData.measurementId);
            if (measurement) {
              toast.info(`Klicken Sie auf Punkt ${userData.startPointIndex + 1} oder ${userData.endPointIndex + 1}, um das Segment zu verschieben.`);
            }
            return;
          }
        }
      }
      
      // General intersections for adding points
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
        
        // Handle adding new measurement points
        if (activeMode !== 'none') {
          const currentCount = currentPoints.length;
          
          handlers.addPoint(point);
          
          if (activeMode === 'length' || activeMode === 'height') {
            if (currentCount === 0) {
              toast.info(`Ersten Punkt für ${activeMode === 'length' ? 'Längen' : 'Höhen'}messung gesetzt`);
            } else if (currentCount === 1) {
              toast.info(`Zweiten Punkt für ${activeMode === 'length' ? 'Längen' : 'Höhen'}messung gesetzt`);
              toast.success(`${activeMode === 'length' ? 'Längen' : 'Höhen'}messung abgeschlossen`);
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
    
    // Helper function to filter out measurement objects from intersections
    function filterMeasurementObjects(intersects: THREE.Intersection[]) {
      return intersects.filter(intersect => {
        let currentObj = intersect.object;
        while (currentObj) {
          if (
            currentObj.name === "measurementPoints" || 
            currentObj.name === "measurementLines" ||
            currentObj.name === "measurementLabels" ||
            currentObj.name === "editPoints" ||
            currentObj.name === "textLabels" ||
            currentObj.name === "segmentLabels"
          ) {
            return false;
          }
          // @ts-ignore - parent property exists on THREE.Object3D
          currentObj = currentObj.parent;
        }
        return true;
      });
    }
    
    // Add click event listener
    canvasElement.addEventListener('click', handleClick);
    
    // Cleanup function
    return () => {
      canvasElement.removeEventListener('click', handleClick);
    };
  }, [
    enabled, scene, camera, open, measurements, currentPoints, activeMode, 
    editMeasurementId, editingPointIndex, movingPointInfo,
    handlers.addPoint, handlers.startPointEdit, handlers.updateMeasurementPoint,
    refs.editPointsRef, refs.segmentLabelsRef
  ]);

  return {
    movingPointInfo,
    setMovingPointInfo
  };
};
