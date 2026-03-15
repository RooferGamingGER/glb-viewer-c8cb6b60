import { useCallback } from 'react';
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';
import { toast } from '@/components/ui/use-toast';

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
    
    // Show toast notification for important PV visibility changes
    const measurement = measurements.find(m => m.id === id);
    if (measurement && (measurement.type === 'pvmodule' || measurement.type === 'solar')) {
      const newState = measurement.visible === false ? 'visible' : 'hidden';
      // Use toast as a simple function call with the message string
      toast(`The PV module area is now ${newState}`);
    }
  }, [toggleMeasurementVisibility, measurements]);

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
        label.visible = visible && measurement.visible !== false && measurement.labelVisible !== false;
      }
    });

    // Update all segment labels
    segmentLabelsRef.current.children.forEach(label => {
      if (!label.userData || !label.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === label.userData.measurementId);
      if (measurement) {
        label.visible = visible && measurement.visible !== false && measurement.labelVisible !== false;
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

  // Update measurement markers visibility — only toggles .visible, no material resets
  const updateMeasurementMarkers = useCallback(() => {
    if (!threeObjects.measurementsRef.current) return;
    
    const { measurementsRef } = threeObjects;

    measurementsRef.current.children.forEach(mesh => {
      if (!mesh.userData || !mesh.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === mesh.userData.measurementId);
      if (measurement) {
        mesh.visible = measurement.visible !== false;
        
        // Also update children visibility
        mesh.children.forEach(child => {
          child.visible = measurement.visible !== false;
        });
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
