
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
      const plusSize = 0.1; // Increased size for better visibility
      const plusThickness = 0.02; // Add thickness to the plus sign
      
      // Create 3D plus sign using box geometries
      const horizontalGeometry = new THREE.BoxGeometry(plusSize * 2, plusThickness, plusThickness);
      const verticalGeometry = new THREE.BoxGeometry(plusThickness, plusSize * 2, plusThickness);
      
      // Much brighter green color for better visibility with glow effect
      const plusMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff44,
        emissive: 0x00ff44,
        emissiveIntensity: 1.0
      });
      
      const horizontalLine = new THREE.Mesh(horizontalGeometry, plusMaterial);
      horizontalLine.position.set(midpoint.x, midpoint.y, midpoint.z);
      
      const verticalLine = new THREE.Mesh(verticalGeometry, plusMaterial);
      verticalLine.position.set(midpoint.x, midpoint.y, midpoint.z);
      
      // Create a detection sphere (invisible but even larger for easier clicking)
      const sphereGeometry = new THREE.SphereGeometry(plusSize * 2, 16, 16);
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
      
      // Set high render order to ensure visibility
      indicatorGroup.renderOrder = 999;
      horizontalLine.renderOrder = 999;
      verticalLine.renderOrder = 999;
      
      addPointIndicatorsRef.current.add(indicatorGroup);
    }
  }, [clearAddPointIndicators]);

  return {
    addPointIndicatorsRef,
    clearAddPointIndicators,
    updateAddPointIndicators
  };
};
