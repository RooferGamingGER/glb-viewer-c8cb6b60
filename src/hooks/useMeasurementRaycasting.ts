
import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';

/**
 * Enhanced hook for raycasting and point indicators in 3D measurements
 */
export const useMeasurementRaycasting = (scene?: THREE.Scene | null, camera?: THREE.Camera | null) => {
  // Reference to the add point indicators group
  const addPointIndicatorsRef = useRef<THREE.Group>(new THREE.Group());
  
  // Preview group reference
  const previewGroupRef = useRef<THREE.Group | null>(null);
  
  // Calculate mouse position from event
  const calculateMousePosition = useCallback((event: MouseEvent | TouchEvent, canvasElement: HTMLCanvasElement) => {
    const canvas = canvasElement;
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      // Handle touch events
      if (event.touches.length === 0) return null;
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }
    
    // Calculate normalized device coordinates (-1 to +1)
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    return new THREE.Vector2(x, y);
  }, []);
  
  // Get a 3D point from mouse intersection
  const getPointFromIntersection = useCallback((
    event: MouseEvent | TouchEvent, 
    camera: THREE.Camera, 
    scene: THREE.Scene,
    canvasElement: HTMLCanvasElement
  ): Point | null => {
    if (!camera || !scene) return null;
    
    const mousePosition = calculateMousePosition(event, canvasElement);
    if (!mousePosition) return null;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePosition, camera);
    
    // Intersect with all objects in the scene that should be measured
    const intersects = raycaster.intersectObjects(
      filterMeasurementObjects(scene.children), 
      true
    );
    
    if (intersects.length > 0) {
      const intersect = intersects[0];
      return {
        x: intersect.point.x,
        y: intersect.point.y,
        z: intersect.point.z
      };
    }
    
    return null;
  }, [calculateMousePosition]);
  
  // Filter objects that can be measured
  const filterMeasurementObjects = useCallback((objects: THREE.Object3D[]) => {
    return objects.filter(object => {
      // Skip invisible objects
      if (!object.visible) return false;
      
      // Skip objects marked as non-measurable
      if (object.userData && object.userData.nonMeasurable) return false;
      
      // Skip UI objects and helpers
      if (
        object.name.includes('helper') || 
        object.name.includes('indicator') || 
        object.name.includes('label') ||
        object.name.includes('UI') ||
        object.name.includes('grid')
      ) return false;
      
      return true;
    });
  }, []);
  
  // Main raycast function
  const raycast = useCallback((event: MouseEvent) => {
    if (!scene || !camera) {
      throw new Error('Scene or camera is not available');
    }
    
    const canvas = event.target as HTMLCanvasElement;
    const mousePosition = calculateMousePosition(event, canvas);
    
    if (!mousePosition) {
      throw new Error('Could not calculate mouse position');
    }
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mousePosition, camera);
    
    const intersects = raycaster.intersectObjects(
      filterMeasurementObjects(scene.children), 
      true
    );
    
    if (intersects.length > 0) {
      const intersection = intersects[0];
      return {
        point: {
          x: intersection.point.x,
          y: intersection.point.y,
          z: intersection.point.z
        },
        object: intersection.object,
        normal: intersection.face?.normal || new THREE.Vector3(0, 1, 0)
      };
    }
    
    throw new Error('No intersection found');
  }, [scene, camera, calculateMousePosition, filterMeasurementObjects]);
  
  // Clear add point indicators
  const clearAddPointIndicators = useCallback(() => {
    if (addPointIndicatorsRef.current) {
      while (addPointIndicatorsRef.current.children.length > 0) {
        const child = addPointIndicatorsRef.current.children[0];
        addPointIndicatorsRef.current.remove(child);
      }
    }
  }, []);
  
  // Create preview group if it doesn't exist
  const createPreviewGroup = useCallback(() => {
    if (!scene) return;
    
    // Clear existing preview group if it exists
    if (previewGroupRef.current) {
      clearPreviewGroup();
    }
    
    // Create a new group
    previewGroupRef.current = new THREE.Group();
    previewGroupRef.current.name = 'previewGroup';
    scene.add(previewGroupRef.current);
    
    return previewGroupRef.current;
  }, [scene]);
  
  // Clear preview group
  const clearPreviewGroup = useCallback(() => {
    if (!scene || !previewGroupRef.current) return;
    
    // Remove all children
    while (previewGroupRef.current.children.length > 0) {
      const child = previewGroupRef.current.children[0];
      previewGroupRef.current.remove(child);
    }
    
    // Remove the group itself
    scene.remove(previewGroupRef.current);
    previewGroupRef.current = null;
  }, [scene]);
  
  // Update add point indicators for area measurements
  const updateAddPointIndicators = useCallback((
    editMeasurementId: string | null, 
    measurements: Measurement[]
  ) => {
    if (!scene || !editMeasurementId) {
      clearAddPointIndicators();
      return;
    }
    
    // Find the measurement being edited
    const measurement = measurements.find(m => m.id === editMeasurementId);
    if (!measurement || !measurement.points || measurement.points.length < 3) {
      clearAddPointIndicators();
      return;
    }
    
    // Only show add point indicators for area-like measurements
    if (!['area', 'solar', 'skylight', 'chimney'].includes(measurement.type)) {
      clearAddPointIndicators();
      return;
    }
    
    // Clear existing indicators
    clearAddPointIndicators();
    
    // Make sure the indicators group is in the scene
    if (!scene.getObjectByName('addPointIndicators')) {
      addPointIndicatorsRef.current.name = 'addPointIndicators';
      scene.add(addPointIndicatorsRef.current);
    }
    
    // Add a plus sign at the midpoint of each segment
    for (let i = 0; i < measurement.points.length; i++) {
      const startPoint = measurement.points[i];
      const endPoint = measurement.points[(i + 1) % measurement.points.length];
      
      // Calculate midpoint
      const midpoint = {
        x: (startPoint.x + endPoint.x) / 2,
        y: (startPoint.y + endPoint.y) / 2,
        z: (startPoint.z + endPoint.z) / 2
      };
      
      // Create plus sign indicator using LineSegments
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      
      // Horizontal line
      const hGeometry = new THREE.BufferGeometry();
      const hVertices = new Float32Array([
        midpoint.x - 0.1, midpoint.y, midpoint.z,
        midpoint.x + 0.1, midpoint.y, midpoint.z
      ]);
      hGeometry.setAttribute('position', new THREE.BufferAttribute(hVertices, 3));
      const horizontalLine = new THREE.Line(hGeometry, material);
      
      // Vertical line
      const vGeometry = new THREE.BufferGeometry();
      const vVertices = new Float32Array([
        midpoint.x, midpoint.y - 0.1, midpoint.z,
        midpoint.x, midpoint.y + 0.1, midpoint.z
      ]);
      vGeometry.setAttribute('position', new THREE.BufferAttribute(vVertices, 3));
      const verticalLine = new THREE.Line(vGeometry, material);
      
      // Group for the plus sign
      const plusGroup = new THREE.Group();
      plusGroup.add(horizontalLine);
      plusGroup.add(verticalLine);
      
      // Store metadata in userData
      plusGroup.userData = {
        isAddPointIndicator: true,
        measurementId: measurement.id,
        segmentIndex: i,
        midpoint: midpoint
      };
      
      // Add to indicators
      addPointIndicatorsRef.current.add(plusGroup);
    }
  }, [scene, clearAddPointIndicators]);
  
  return {
    raycast,
    addPointIndicatorsRef,
    clearAddPointIndicators,
    updateAddPointIndicators,
    clearPreviewGroup,
    createPreviewGroup,
    calculateMousePosition,
    filterMeasurementObjects,
    getPointFromIntersection
  };
};
