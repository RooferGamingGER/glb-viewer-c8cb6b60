
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * Custom hook to manage Three.js object groups in the scene
 */
export const useThreeObjects = (scene: THREE.Scene | null, enabled: boolean) => {
  const pointsRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);
  const measurementsRef = useRef<THREE.Group | null>(null);
  const editPointsRef = useRef<THREE.Group | null>(null);
  const labelsRef = useRef<THREE.Group | null>(null);
  const segmentLabelsRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!scene || !enabled) return;

    // Create groups for various measurement elements if they don't exist
    if (!pointsRef.current) {
      pointsRef.current = new THREE.Group();
      pointsRef.current.name = "measurementPoints";
      scene.add(pointsRef.current);
    }

    if (!linesRef.current) {
      linesRef.current = new THREE.Group();
      linesRef.current.name = "measurementLines";
      scene.add(linesRef.current);
    }
    
    if (!measurementsRef.current) {
      measurementsRef.current = new THREE.Group();
      measurementsRef.current.name = "measurementLabels";
      scene.add(measurementsRef.current);
    }

    if (!editPointsRef.current) {
      editPointsRef.current = new THREE.Group();
      editPointsRef.current.name = "editPoints";
      scene.add(editPointsRef.current);
    }
    
    if (!labelsRef.current) {
      labelsRef.current = new THREE.Group();
      labelsRef.current.name = "textLabels";
      scene.add(labelsRef.current);
    }

    if (!segmentLabelsRef.current) {
      segmentLabelsRef.current = new THREE.Group();
      segmentLabelsRef.current.name = "segmentLabels";
      scene.add(segmentLabelsRef.current);
    }

    // Clean up function
    return () => {
      // Properly dispose of all Three.js objects to prevent memory leaks
      const disposeGroup = (group: THREE.Group | null) => {
        if (!group || !scene) return;
        
        // Remove all children with proper disposal
        while (group.children.length > 0) {
          const object = group.children[0];
          
          // Dispose of geometries and materials if they exist
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
          
          // Remove from parent
          group.remove(object);
        }
        
        // Remove the group from the scene
        scene.remove(group);
      };

      // Dispose of all groups
      disposeGroup(pointsRef.current);
      disposeGroup(linesRef.current);
      disposeGroup(measurementsRef.current);
      disposeGroup(editPointsRef.current);
      disposeGroup(labelsRef.current);
      disposeGroup(segmentLabelsRef.current);
      
      // Reset refs
      pointsRef.current = null;
      linesRef.current = null;
      measurementsRef.current = null;
      editPointsRef.current = null;
      labelsRef.current = null;
      segmentLabelsRef.current = null;
    };
  }, [scene, enabled]);

  return {
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    getAllGroups: () => {
      return [
        pointsRef.current,
        linesRef.current,
        measurementsRef.current,
        editPointsRef.current,
        labelsRef.current,
        segmentLabelsRef.current
      ].filter(Boolean) as THREE.Group[];
    }
  };
};
