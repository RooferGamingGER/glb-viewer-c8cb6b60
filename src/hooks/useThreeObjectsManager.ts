
import { useCallback, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThreeJs } from '@/contexts/ThreeJsContext';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import { 
  createPointPool, 
  createLinePool, 
  createLabelPool,
  createAreaMeshPool,
  updateLabelText
} from '@/utils/threeObjectPool';

/**
 * Hook that provides simplified access to Three.js objects and management functions
 * with performance optimizations using object pooling
 */
export const useThreeObjectsManager = (scene: THREE.Scene | null, enabled: boolean) => {
  // Get Three.js context
  const {
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    initializeGroups,
    cleanupGroups,
    getAllGroups
  } = useThreeJs();
  
  const { isTablet, isPhone } = useScreenOrientation();
  
  // Optimized rendering mode for touch devices
  const [touchOptimized, setTouchOptimized] = useState(false);
  
  // Create object pools with memoization to avoid recreating on each render
  const objectPools = useMemo(() => ({
    points: createPointPool(0xff0000, 0.1),
    lines: createLinePool(0x0000ff, 2),
    labels: createLabelPool(),
    areaMeshes: createAreaMeshPool(0x00ff00, 0.5),
    editPoints: createPointPool(0xffcc00, 0.15)
  }), []);
  
  // Detect touch devices and apply optimized settings
  useEffect(() => {
    if (isTablet || isPhone) {
      setTouchOptimized(true);
    } else {
      setTouchOptimized(false);
    }
  }, [isTablet, isPhone]);

  // Initialize groups if scene is available
  const initialize = useCallback(() => {
    if (scene && enabled) {
      initializeGroups(scene);
      
      // Adjust visualization for touch devices
      if (touchOptimized && pointsRef.current) {
        // Larger points for easier touch interaction
        pointsRef.current.children.forEach(point => {
          if (point instanceof THREE.Mesh) {
            // Adjust point size for better touch targets
            const scale = isTablet ? 1.5 : 2.0; // Tablets need less large points than phones
            point.scale.set(scale, scale, scale);
          }
        });
      }
      
      // Also optimize labels for touch devices
      if (touchOptimized && labelsRef.current) {
        labelsRef.current.children.forEach(label => {
          if (label instanceof THREE.Sprite) {
            // Larger labels for touch devices
            const scale = isTablet ? 1.2 : 1.5;
            label.scale.multiplyScalar(scale);
          }
        });
      }
    }
  }, [scene, enabled, initializeGroups, touchOptimized, pointsRef, labelsRef, isTablet]);

  // Get a point object from the pool and add it to the scene
  const getPoint = useCallback((position: THREE.Vector3, color?: number) => {
    if (!scene || !pointsRef.current) return null;
    
    const point = objectPools.points.get();
    if (color !== undefined && point instanceof THREE.Mesh) {
      (point.material as THREE.MeshBasicMaterial).color.set(color);
    }
    point.position.copy(position);
    pointsRef.current.add(point);
    
    return point;
  }, [scene, pointsRef, objectPools.points]);
  
  // Get a line object from the pool and add it to the scene
  const getLine = useCallback((points: THREE.Vector3[], color?: number) => {
    if (!scene || !linesRef.current) return null;
    
    const line = objectPools.lines.get();
    if (color !== undefined && line instanceof THREE.Line) {
      (line.material as THREE.LineBasicMaterial).color.set(color);
    }
    
    // Update the line geometry with the new points
    const positions = new Float32Array(points.length * 3);
    points.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    });
    
    line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    linesRef.current.add(line);
    
    return line;
  }, [scene, linesRef, objectPools.lines]);
  
  // Get a label object from the pool and add it to the scene
  const getLabel = useCallback((position: THREE.Vector3, text: string) => {
    if (!scene || !labelsRef.current) return null;
    
    const label = objectPools.labels.get();
    label.position.copy(position);
    
    // Update the label text
    updateLabelText(label, text);
    
    labelsRef.current.add(label);
    return label;
  }, [scene, labelsRef, objectPools.labels]);
  
  // Get an area mesh object from the pool and add it to the scene
  const getAreaMesh = useCallback((points: THREE.Vector3[], color?: number, opacity?: number) => {
    if (!scene || !measurementsRef.current || points.length < 3) return null;
    
    const mesh = objectPools.areaMeshes.get();
    
    if (color !== undefined && mesh instanceof THREE.Mesh) {
      (mesh.material as THREE.MeshBasicMaterial).color.set(color);
    }
    
    if (opacity !== undefined && mesh instanceof THREE.Mesh) {
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
    
    // Create a shape from the points
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].z);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].z);
    }
    shape.closePath();
    
    // Create geometry from the shape
    const geometry = new THREE.ShapeGeometry(shape);
    
    // Rotate to correct plane
    geometry.rotateX(-Math.PI / 2);
    
    // Replace the mesh geometry
    mesh.geometry.dispose();
    mesh.geometry = geometry;
    
    measurementsRef.current.add(mesh);
    return mesh;
  }, [scene, measurementsRef, objectPools.areaMeshes]);
  
  // Release an object back to its pool
  const releaseObject = useCallback((object: THREE.Object3D) => {
    if (!object) return;
    
    // Remove from parent
    if (object.parent) {
      object.parent.remove(object);
    }
    
    // Determine which pool to return to
    if (object instanceof THREE.Mesh) {
      if (object.geometry instanceof THREE.SphereGeometry) {
        objectPools.points.release(object as any);
      } else {
        objectPools.areaMeshes.release(object as any);
      }
    } else if (object instanceof THREE.Line) {
      objectPools.lines.release(object as any);
    } else if (object instanceof THREE.Sprite) {
      objectPools.labels.release(object as any);
    }
  }, [objectPools]);

  // Cleanup function for components
  const cleanup = useCallback(() => {
    if (!enabled) {
      // Return all objects to pools before cleaning up groups
      if (pointsRef.current) {
        pointsRef.current.children.slice().forEach(releaseObject);
      }
      if (linesRef.current) {
        linesRef.current.children.slice().forEach(releaseObject);
      }
      if (labelsRef.current) {
        labelsRef.current.children.slice().forEach(releaseObject);
      }
      if (measurementsRef.current) {
        measurementsRef.current.children.slice().forEach(releaseObject);
      }
      if (editPointsRef.current) {
        editPointsRef.current.children.slice().forEach(releaseObject);
      }
      
      cleanupGroups();
    }
  }, [enabled, cleanupGroups, pointsRef, linesRef, labelsRef, measurementsRef, editPointsRef, releaseObject]);
  
  // Stats for debugging
  const getPoolStats = useCallback(() => {
    return {
      points: {
        poolSize: objectPools.points.size(),
        active: objectPools.points.activeCount()
      },
      lines: {
        poolSize: objectPools.lines.size(),
        active: objectPools.lines.activeCount()
      },
      labels: {
        poolSize: objectPools.labels.size(),
        active: objectPools.labels.activeCount()
      },
      areaMeshes: {
        poolSize: objectPools.areaMeshes.size(),
        active: objectPools.areaMeshes.activeCount()
      },
      editPoints: {
        poolSize: objectPools.editPoints.size(),
        active: objectPools.editPoints.activeCount()
      }
    };
  }, [objectPools]);

  return {
    // Group references
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    
    // Management functions
    initialize,
    cleanup,
    getAllGroups,
    
    // Object pool access
    getPoint,
    getLine,
    getLabel,
    getAreaMesh,
    releaseObject,
    getPoolStats,
    
    // Touch optimization flags
    touchOptimized,
    isTablet,
    isPhone
  };
};
