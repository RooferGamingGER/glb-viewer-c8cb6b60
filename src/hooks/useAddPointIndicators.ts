
import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';

/**
 * Hook zur Verwaltung der Hinzufüge-Indikatoren (grüne Kugeln) für Flächenmessungen
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
    
    // Create green sphere indicators at the midpoint of each line segment
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      // Create midpoint
      const midpoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        z: (p1.z + p2.z) / 2
      };
      
      // Visible green sphere indicator
      const indicatorSize = 0.04;
      const sphereGeometry = new THREE.SphereGeometry(indicatorSize, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00e676,
        depthTest: false
      });
      
      const indicator = new THREE.Mesh(sphereGeometry, sphereMaterial);
      indicator.position.set(midpoint.x, midpoint.y, midpoint.z);
      indicator.renderOrder = 999;
      
      // Invisible larger hit area for easier clicking
      const hitGeometry = new THREE.SphereGeometry(indicatorSize * 4, 16, 16);
      const hitMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        opacity: 0.0,
        transparent: true,
        depthTest: false
      });
      
      const hitSphere = new THREE.Mesh(hitGeometry, hitMaterial);
      hitSphere.position.set(midpoint.x, midpoint.y, midpoint.z);
      hitSphere.renderOrder = 998;
      
      // Add user data for identification on click
      hitSphere.userData = {
        isAddPointIndicator: true,
        measurementId: measurement.id,
        segmentIndex: i,
        midpoint: midpoint
      };
      
      indicator.userData = {
        isAddPointIndicator: true,
        measurementId: measurement.id,
        segmentIndex: i,
        midpoint: midpoint
      };
      
      addPointIndicatorsRef.current.add(indicator);
      addPointIndicatorsRef.current.add(hitSphere);
    }
  }, [clearAddPointIndicators]);

  return {
    addPointIndicatorsRef,
    clearAddPointIndicators,
    updateAddPointIndicators
  };
};
