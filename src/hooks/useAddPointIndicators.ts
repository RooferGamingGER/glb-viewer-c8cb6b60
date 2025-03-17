
import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';

/**
 * Hook zur Verwaltung der Hinzufüge-Indikatoren (Plus-Symbole) für Flächenmessungen
 */
export const useAddPointIndicators = (scene: THREE.Scene | null) => {
  const addPointIndicatorsRef = useRef<THREE.Group | null>(null);
  
  // Initialize indicators group
  useEffect(() => {
    if (!scene) return;
    
    if (!addPointIndicatorsRef.current) {
      addPointIndicatorsRef.current = new THREE.Group();
      addPointIndicatorsRef.current.name = "addPointIndicators";
      scene.add(addPointIndicatorsRef.current);
    }
    
    return () => {
      if (addPointIndicatorsRef.current && scene) {
        clearAddPointIndicators();
        scene.remove(addPointIndicatorsRef.current);
        addPointIndicatorsRef.current = null;
      }
    };
  }, [scene]);

  // Function to clear add point indicators
  const clearAddPointIndicators = useCallback(() => {
    if (!addPointIndicatorsRef.current) return;
    
    while (addPointIndicatorsRef.current.children.length > 0) {
      const child = addPointIndicatorsRef.current.children[0];
      
      // Dispose of geometries and materials
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
      
      addPointIndicatorsRef.current.remove(child);
    }
  }, []);

  // Update add point indicators for area measurements
  const updateAddPointIndicators = useCallback((
    editMeasurementId: string | null,
    measurements: any[]
  ) => {
    if (!addPointIndicatorsRef.current || !editMeasurementId) {
      clearAddPointIndicators();
      return;
    }
    
    clearAddPointIndicators();
    
    // Only show add point indicators for area measurements being edited
    const measurement = measurements.find(m => m.id === editMeasurementId && m.type === 'area');
    if (!measurement) return;
    
    const points = measurement.points;
    if (points.length < 3) return;
    
    // Create plus sign indicators at the midpoint of each line segment
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      // Create midpoint
      const midpoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        z: (p1.z + p2.z) / 2
      };
      
      // Create plus sign using lines
      const plusSize = 0.05;
      
      // Horizontal line of plus
      const horizontalPoints = [
        new THREE.Vector3(midpoint.x - plusSize, midpoint.y, midpoint.z),
        new THREE.Vector3(midpoint.x + plusSize, midpoint.y, midpoint.z)
      ];
      
      const horizontalGeometry = new THREE.BufferGeometry().setFromPoints(horizontalPoints);
      const plusMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 3 });
      const horizontalLine = new THREE.Line(horizontalGeometry, plusMaterial);
      
      // Vertical line of plus
      const verticalPoints = [
        new THREE.Vector3(midpoint.x, midpoint.y - plusSize, midpoint.z),
        new THREE.Vector3(midpoint.x, midpoint.y + plusSize, midpoint.z)
      ];
      
      const verticalGeometry = new THREE.BufferGeometry().setFromPoints(verticalPoints);
      const verticalLine = new THREE.Line(verticalGeometry, plusMaterial);
      
      // Create a detection sphere (invisible but slightly larger for easier clicking)
      const sphereGeometry = new THREE.SphereGeometry(plusSize * 1.5, 8, 8);
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        opacity: 0.0,
        transparent: true
      });
      
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(midpoint.x, midpoint.y, midpoint.z);
      
      // Add user data for identification on click
      sphere.userData = {
        isAddPointIndicator: true,
        measurementId: measurement.id,
        segmentIndex: i,
        midpoint: midpoint
      };
      
      // Create a group for this indicator
      const indicatorGroup = new THREE.Group();
      indicatorGroup.add(horizontalLine);
      indicatorGroup.add(verticalLine);
      indicatorGroup.add(sphere);
      
      addPointIndicatorsRef.current.add(indicatorGroup);
    }
  }, [clearAddPointIndicators]);

  return {
    addPointIndicatorsRef,
    clearAddPointIndicators,
    updateAddPointIndicators
  };
};
