
import { useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Point } from '@/hooks/useMeasurements';
import { createPointPool } from '@/utils/threeObjectPool';

/**
 * Hook zur Verwaltung der Vorschau beim Verschieben von Messpunkten
 * mit verbesserter Performance durch Objektpooling
 */
export const useMeasurementPreview = (scene: THREE.Scene | null) => {
  const previewRef = useRef<THREE.Group | null>(null);
  
  // Create a dedicated object pool for preview points
  const previewPointPool = useRef<ReturnType<typeof createPointPool> | null>(null);
  
  // Active preview objects reference
  const activePreviewObjects = useRef<THREE.Object3D[]>([]);
  
  // Initialize preview group and object pool
  useEffect(() => {
    if (!scene) return;
    
    if (!previewRef.current) {
      previewRef.current = new THREE.Group();
      previewRef.current.name = "previewPoints";
      scene.add(previewRef.current);
    }
    
    if (!previewPointPool.current) {
      previewPointPool.current = createPointPool(0xff00ff, 0.06);
    }
    
    return () => {
      if (previewRef.current && scene) {
        clearPreviewGroup();
        scene.remove(previewRef.current);
        previewRef.current = null;
      }
      
      // Dispose object pool
      if (previewPointPool.current) {
        previewPointPool.current.clear(true);
        previewPointPool.current = null;
      }
    };
  }, [scene]);

  // Function to clear the preview group
  const clearPreviewGroup = useCallback(() => {
    if (!previewRef.current || !previewPointPool.current) return;
    
    // Return all active objects to pool
    activePreviewObjects.current.forEach(obj => {
      previewRef.current?.remove(obj);
      previewPointPool.current?.release(obj as any);
    });
    
    // Clear active objects array
    activePreviewObjects.current = [];
  }, []);

  // Update preview point visualization
  const updatePreviewVisualization = useCallback((
    movingPointInfo: { measurementId: string; pointIndex: number; originalPoint?: Point } | null,
    measurements: any[],
    previewPoint?: Point | null
  ) => {
    if (!previewRef.current || !previewPointPool.current || !movingPointInfo || !previewPoint) {
      clearPreviewGroup();
      return;
    }
    
    // Clear existing previews
    clearPreviewGroup();
    
    // Create preview sphere
    const sphere = previewPointPool.current.get();
    sphere.position.set(previewPoint.x, previewPoint.y, previewPoint.z);
    previewRef.current.add(sphere);
    activePreviewObjects.current.push(sphere);
    
    // Add directional line from original point to preview if we have the original point
    const measurement = measurements.find(m => m.id === movingPointInfo.measurementId);
    const originalPoint = movingPointInfo.originalPoint || 
                         (measurement && measurement.points[movingPointInfo.pointIndex]);
    
    if (originalPoint && measurement) {
      // Create a line
      const material = new THREE.LineBasicMaterial({ 
        color: 0xff00ff,
        opacity: 0.7,
        transparent: true
      });
      
      const points = [
        new THREE.Vector3(originalPoint.x, originalPoint.y, originalPoint.z),
        new THREE.Vector3(previewPoint.x, previewPoint.y, previewPoint.z)
      ];
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      
      previewRef.current.add(line);
      activePreviewObjects.current.push(line);
    }
  }, [clearPreviewGroup]);

  return {
    updatePreviewVisualization,
    clearPreviewGroup,
    previewRef
  };
};
