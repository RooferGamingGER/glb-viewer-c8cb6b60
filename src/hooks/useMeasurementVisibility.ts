
import { useCallback } from 'react';
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';

interface ThreeObjects {
  pointsRef: React.MutableRefObject<THREE.Group | null>;
  linesRef: React.MutableRefObject<THREE.Group | null>;
  measurementsRef: React.MutableRefObject<THREE.Group | null>;
  labelsRef: React.MutableRefObject<THREE.Group | null>;
  segmentLabelsRef: React.MutableRefObject<THREE.Group | null>;
  getAllGroups?: () => THREE.Group[];
}

export const useMeasurementVisibility = (
  measurements: Measurement[],
  toggleMeasurementVisibility: (id: string) => void,
  toggleLabelVisibility: (id: string) => void,
  threeObjects: ThreeObjects
) => {
  // Toggle visibility of a measurement on screen
  const handleToggleMeasurementVisibility = useCallback((id: string) => {
    toggleMeasurementVisibility(id);

    // Update visibility in Three.js objects
    updateMeasurementMarkers();
  }, [toggleMeasurementVisibility]);

  // Toggle label visibility
  const handleToggleLabelVisibility = useCallback((id: string) => {
    toggleLabelVisibility(id);

    // Update label visibility in Three.js
    updateLabelVisibility(id);
  }, [toggleLabelVisibility]);

  // Update all labels visibility
  const updateAllLabelsVisibility = useCallback((visible: boolean) => {
    if (!threeObjects.labelsRef.current || !threeObjects.segmentLabelsRef.current) return;
    
    const { labelsRef, segmentLabelsRef } = threeObjects;

    // Update all main labels
    labelsRef.current.children.forEach(label => {
      if (!label.userData || !label.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === label.userData.measurementId);
      if (measurement) {
        label.visible = visible && measurement.visible !== false;
      }
    });

    // Update all segment labels
    segmentLabelsRef.current.children.forEach(label => {
      if (!label.userData || !label.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === label.userData.measurementId);
      if (measurement) {
        label.visible = visible && measurement.visible !== false;
      }
    });
  }, [measurements, threeObjects]);

  // Update label visibility for a specific measurement
  const updateLabelVisibility = useCallback((id: string) => {
    if (!threeObjects.labelsRef.current || !threeObjects.segmentLabelsRef.current) return;
    
    const { labelsRef, segmentLabelsRef } = threeObjects;
    const measurement = measurements.find(m => m.id === id);
    
    if (!measurement) return;

    // Update main labels
    labelsRef.current.children.forEach(label => {
      if (label.userData && label.userData.measurementId === id) {
        label.visible = measurement.visible !== false && measurement.labelVisible !== false;
      }
    });

    // Update segment labels
    segmentLabelsRef.current.children.forEach(label => {
      if (label.userData && label.userData.measurementId === id) {
        label.visible = measurement.visible !== false && measurement.labelVisible !== false;
      }
    });
  }, [measurements, threeObjects]);

  // Update measurement markers visibility
  const updateMeasurementMarkers = useCallback(() => {
    if (!threeObjects.measurementsRef.current) return;
    
    const { measurementsRef } = threeObjects;

    // Update mesh visibilities for PV areas and other measurements
    measurementsRef.current.children.forEach(mesh => {
      if (!mesh.userData || !mesh.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === mesh.userData.measurementId);
      if (measurement) {
        mesh.visible = measurement.visible !== false;
        
        // For PV areas, set a more visible color
        if ((measurement.type === 'pvmodule' || measurement.type === 'solar') && mesh instanceof THREE.Mesh) {
          const material = mesh.material as THREE.MeshBasicMaterial;
          if (material) {
            // Set to a bright blue with increased opacity for better visibility
            material.color.set(0x0EA5E9); // using bright blue color
            material.opacity = 0.4;  // increasing opacity for better visibility
            material.needsUpdate = true;
          }
        }
      }
    });
  }, [measurements, threeObjects]);

  // Get all measurement groups for temporary hiding during screenshots
  const getMeasurementGroups = useCallback(() => {
    if (threeObjects.getAllGroups) {
      return threeObjects.getAllGroups();
    }
    
    return [
      threeObjects.pointsRef.current,
      threeObjects.linesRef.current,
      threeObjects.measurementsRef.current,
      threeObjects.labelsRef.current,
      threeObjects.segmentLabelsRef.current
    ].filter(Boolean) as THREE.Group[];
  }, [threeObjects]);

  return {
    handleToggleMeasurementVisibility,
    handleToggleLabelVisibility,
    updateAllLabelsVisibility,
    updateMeasurementMarkers,
    updateLabelVisibility,
    getMeasurementGroups
  };
};
