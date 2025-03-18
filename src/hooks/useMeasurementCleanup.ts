
import { useCallback } from 'react';
import * as THREE from 'three';

/**
 * Hook for cleaning up measurement visualizations
 */
export const useMeasurementCleanup = () => {
  // Function to clear all visualizations for a specific measurement
  const clearMeasurementVisuals = useCallback((
    measurementId: string,
    measurementsGroup: THREE.Group | null,
    labelsGroup: THREE.Group | null,
    segmentLabelsGroup: THREE.Group | null
  ) => {
    if (!measurementsGroup || !labelsGroup || !segmentLabelsGroup) return;
    
    // Remove and dispose measurement objects
    const measurementObjects = measurementsGroup.children.filter(obj => 
      obj.userData && obj.userData.measurementId === measurementId
    );
    
    measurementObjects.forEach(obj => {
      if ('geometry' in obj && (obj as THREE.Mesh).geometry) {
        ((obj as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
      }
      
      if ('material' in obj && (obj as THREE.Mesh).material) {
        if (Array.isArray((obj as THREE.Mesh).material)) {
          ((obj as THREE.Mesh).material as THREE.Material[]).forEach(mat => mat.dispose());
        } else {
          ((obj as THREE.Mesh).material as THREE.Material).dispose();
        }
      }
      
      measurementsGroup.remove(obj);
    });
    
    // Clear labels for this measurement
    clearMeasurementLabels(measurementId, labelsGroup, segmentLabelsGroup);
  }, []);

  // Function to clear labels for a specific measurement
  const clearMeasurementLabels = useCallback((
    measurementId: string,
    labelsGroup: THREE.Group | null,
    segmentLabelsGroup: THREE.Group | null
  ) => {
    if (!labelsGroup || !segmentLabelsGroup) return;
    
    // Helper to remove and dispose labels
    const removeLabels = (group: THREE.Group) => {
      const labels = group.children.filter(obj => 
        obj.userData && obj.userData.measurementId === measurementId
      );
      
      labels.forEach(label => {
        // Recursively dispose of all children if they exist
        if (label.children.length > 0) {
          label.children.forEach(child => {
            if ('geometry' in child) {
              const mesh = child as THREE.Mesh;
              if (mesh.geometry) mesh.geometry.dispose();
            }
            if ('material' in child) {
              const mesh = child as THREE.Mesh;
              if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach(m => m.dispose());
                } else {
                  mesh.material.dispose();
                }
              }
            }
          });
        }
        
        group.remove(label);
      });
    };
    
    // Remove labels from both groups
    removeLabels(labelsGroup);
    removeLabels(segmentLabelsGroup);
  }, []);

  return {
    clearMeasurementVisuals,
    clearMeasurementLabels
  };
};
