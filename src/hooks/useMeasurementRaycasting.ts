
import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';

/**
 * Hook for raycasting and add point indicators
 */
export const useMeasurementRaycasting = (
  scene: THREE.Scene | null,
  camera: THREE.Camera | null
) => {
  // References for raycaster and add point indicators
  const raycasterRef = useRef(new THREE.Raycaster());
  const addPointIndicatorsRef = useRef<THREE.Group | null>(null);
  const previewGroupRef = useRef<THREE.Group | null>(null);
  
  // Create a reusable raycaster
  const raycast = useCallback((event: MouseEvent) => {
    if (!scene || !camera) return null;
    
    // Convert mouse position to normalized device coordinates
    const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Set up the raycaster
    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    
    // Find intersections with scene objects (excluding UI elements)
    const intersects = raycaster.intersectObjects(scene.children, true)
      .filter(hit => !hit.object.userData.isUI);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const point: Point = {
        x: hit.point.x,
        y: hit.point.y,
        z: hit.point.z
      };
      
      return {
        point,
        object: hit.object,
        normal: hit.face?.normal
      };
    }
    
    return null;
  }, [scene, camera]);
  
  // Create preview group
  const createPreviewGroup = useCallback(() => {
    if (!scene) return null;
    
    // Clean up existing preview
    clearPreviewGroup();
    
    // Create a group to hold the preview
    const group = new THREE.Group();
    group.name = 'previewGroup';
    scene.add(group);
    
    previewGroupRef.current = group;
    
    return group;
  }, [scene]);
  
  // Clear preview group
  const clearPreviewGroup = useCallback(() => {
    if (previewGroupRef.current && scene) {
      scene.remove(previewGroupRef.current);
      previewGroupRef.current = null;
    }
  }, [scene]);
  
  // Create add point indicators
  const createAddPointIndicators = useCallback(() => {
    if (!scene) return;
    
    // Clean up existing indicators
    clearAddPointIndicators();
    
    // Create a group to hold the indicators
    const group = new THREE.Group();
    group.name = 'addPointIndicators';
    scene.add(group);
    
    addPointIndicatorsRef.current = group;
    
    return group;
  }, [scene]);
  
  // Clear add point indicators
  const clearAddPointIndicators = useCallback(() => {
    if (addPointIndicatorsRef.current && scene) {
      scene.remove(addPointIndicatorsRef.current);
      addPointIndicatorsRef.current = null;
    }
  }, [scene]);
  
  // Update add point indicators
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
    if (!measurement || measurement.type !== 'area') {
      clearAddPointIndicators();
      return;
    }
    
    // Create indicators if they don't exist
    if (!addPointIndicatorsRef.current) {
      createAddPointIndicators();
    }
    
    // Clear existing indicators
    if (addPointIndicatorsRef.current) {
      while (addPointIndicatorsRef.current.children.length > 0) {
        addPointIndicatorsRef.current.remove(addPointIndicatorsRef.current.children[0]);
      }
    }
    
    // Add indicators for each segment to allow adding points
    const points = measurement.points;
    if (points.length < 3) return;
    
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      // Calculate midpoint for the indicator
      const midpoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        z: (p1.z + p2.z) / 2
      };
      
      // Create a plus symbol indicator
      const plusGroup = createPlusSymbol(midpoint, 0.1, 0x00ff00);
      
      // Add metadata to identify it when clicked
      plusGroup.userData = {
        isAddPointIndicator: true,
        measurementId: editMeasurementId,
        segmentIndex: i,
        pointIndex: i + 1
      };
      
      addPointIndicatorsRef.current?.add(plusGroup);
    }
  }, [scene, clearAddPointIndicators, createAddPointIndicators]);
  
  // Helper to create a plus symbol
  const createPlusSymbol = (point: Point, size: number, color: number) => {
    const group = new THREE.Group();
    
    // Horizontal line
    const horizontalGeometry = new THREE.BoxGeometry(size, size / 5, size / 5);
    const material = new THREE.MeshBasicMaterial({ color });
    const horizontalLine = new THREE.Mesh(horizontalGeometry, material);
    
    // Vertical line
    const verticalGeometry = new THREE.BoxGeometry(size / 5, size, size / 5);
    const verticalLine = new THREE.Mesh(verticalGeometry, material);
    
    group.add(horizontalLine);
    group.add(verticalLine);
    
    group.position.set(point.x, point.y, point.z);
    
    return group;
  };
  
  return {
    raycast,
    addPointIndicatorsRef,
    clearAddPointIndicators,
    updateAddPointIndicators,
    previewGroupRef,
    createPreviewGroup,
    clearPreviewGroup
  };
};
