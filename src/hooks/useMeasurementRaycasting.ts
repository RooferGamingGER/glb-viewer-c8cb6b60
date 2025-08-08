
import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Point } from '@/hooks/useMeasurements';

/**
 * Hook mit Hilfs-Funktionen für Raycasting und geometrische Berechnungen
 */
export const useMeasurementRaycasting = () => {
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
          currentObj.name === "previewPoints" ||
          currentObj.name === "addPointIndicators"
        ) {
          return false;
        }
        // @ts-ignore - parent property exists on THREE.Object3D
        currentObj = currentObj.parent;
      }
      return true;
    });
  }, []);

  // Calculate mouse position in normalized device coordinates
  const calculateMousePosition = useCallback((
    event: MouseEvent | TouchEvent,
    canvasElement: HTMLCanvasElement
  ): THREE.Vector2 | null => {
    let clientX, clientY;
    
    if (event instanceof MouseEvent) {
      // For mouse events
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event instanceof TouchEvent) {
      // For touch events
      if (event.touches.length === 0) return null;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      return null;
    }
    
    // Calculate normalized device coordinates
    const canvasRect = canvasElement.getBoundingClientRect();
    const mouseX = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    const mouseY = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    
    return new THREE.Vector2(mouseX, mouseY);
  }, []);

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

  // Get point from intersection
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const lastTimeRef = useRef<number>(0);
  const lastPointRef = useRef<Point | null>(null);

  const getPointFromIntersection = useCallback((
    event: MouseEvent | TouchEvent, 
    camera: THREE.Camera,
    scene: THREE.Scene,
    canvasElement: HTMLCanvasElement
  ): Point | null => {
    const now = performance.now();
    const mousePosition = calculateMousePosition(event, canvasElement);
    if (!mousePosition) return null;
    
    // Simple throttle to ~60Hz
    if (now - lastTimeRef.current < 16 && lastPointRef.current) {
      return lastPointRef.current;
    }

    // Reuse a single raycaster instance
    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(mousePosition, camera);
    
    // Get intersections
    const intersects = raycaster.intersectObjects(scene.children, true);
    const validIntersects = filterMeasurementObjects(intersects);
    
    let result: Point | null = null;
    if (validIntersects.length > 0) {
      const intersect = validIntersects[0];
      result = {
        x: intersect.point.x,
        y: intersect.point.y,
        z: intersect.point.z
      };
    }
    
    lastTimeRef.current = now;
    lastPointRef.current = result;
    return result;
  }, [calculateMousePosition, filterMeasurementObjects]);

  return {
    filterMeasurementObjects,
    calculateMousePosition,
    findClosestPointOnLine,
    isPointNearLine,
    getPointFromIntersection
  };
};
