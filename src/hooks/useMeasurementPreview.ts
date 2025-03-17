
import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Point } from '@/hooks/useMeasurements';

/**
 * Hook zur Verwaltung der Vorschau beim Verschieben von Messpunkten
 */
export const useMeasurementPreview = (scene: THREE.Scene | null) => {
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
      
      previewRef.current.remove(child);
    }
  }, []);

  // Update preview point visualization
  const updatePreviewVisualization = useCallback((
    movingPointInfo: { measurementId: string; pointIndex: number } | null,
    measurements: any[]
  ) => {
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
  }, [previewPoint, clearPreviewGroup]);

  return {
    previewPoint,
    setPreviewPoint,
    previewRef,
    clearPreviewGroup,
    updatePreviewVisualization
  };
};

import { useEffect } from 'react';
