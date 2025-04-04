import { useCallback } from 'react';
import { Measurement } from '@/types/measurements';
import * as THREE from 'three';

/**
 * Hook for managing visibility of measurements and their labels
 */
export const useVisibilityManager = (
  measurements: Measurement[],
  toggleMeasurementVisibility: (id: string) => void,
  toggleLabelVisibility: (id: string) => void,
  allLabelsVisible: boolean
) => {
  // Define the updateLabelVisibility function first
  const updateLabelVisibility = useCallback((measurement: Measurement, labelsRef: THREE.Group | null, segmentLabelsRef: THREE.Group | null) => {
    if (!labelsRef || !segmentLabelsRef) return;
    
    // Update all labels related to this measurement
    labelsRef.children.forEach(label => {
      if (label.userData && label.userData.measurementId === measurement.id) {
        label.visible = measurement.visible !== false && measurement.labelVisible !== false;
      }
    });
    
    // Update segment labels if applicable
    segmentLabelsRef.children.forEach(label => {
      if (label.userData && label.userData.measurementId === measurement.id) {
        label.visible = measurement.visible !== false && measurement.labelVisible !== false;
      }
    });
  }, []);

  // Define the updateMeasurementMarkers function before using it
  const updateMeasurementMarkers = useCallback((measurementsRef: THREE.Group | null) => {
    if (!measurementsRef) return;
    
    measurements.forEach(measurement => {
      // Find the corresponding visual representation
      const meshGroup = measurementsRef.children.find(
        child => child.userData && child.userData.measurementId === measurement.id
      );
      
      if (meshGroup) {
        // Update visibility
        meshGroup.visible = measurement.visible !== false;
        
        // For special handling of PV modules, loop through children
        if (measurement.type === 'solar' || measurement.type === 'pvmodule') {
          meshGroup.children.forEach(child => {
            // Keep all PV module objects visible within the group
            if (child.userData && child.userData.isPVModule) {
              child.visible = true;
            }
          });
        }
      }
    });
  }, [measurements]);

  // Now we can use the functions above
  const handleToggleMeasurementVisibility = useCallback((id: string, measurementsRef: THREE.Group | null, labelsRef: THREE.Group | null, segmentLabelsRef: THREE.Group | null) => {
    toggleMeasurementVisibility(id);
    
    // Find measurement to update visuals
    const measurement = measurements.find(m => m.id === id);
    if (measurement) {
      // Update markers visibility
      updateMeasurementMarkers(measurementsRef);
      
      // Update label visibility
      updateLabelVisibility(measurement, labelsRef, segmentLabelsRef);
    }
  }, [measurements, toggleMeasurementVisibility, updateMeasurementMarkers, updateLabelVisibility]);

  const handleToggleLabelVisibility = useCallback((id: string, labelsRef: THREE.Group | null, segmentLabelsRef: THREE.Group | null) => {
    toggleLabelVisibility(id);
    
    // Find measurement to update visuals
    const measurement = measurements.find(m => m.id === id);
    if (measurement) {
      // Update label visibility
      updateLabelVisibility(measurement, labelsRef, segmentLabelsRef);
    }
  }, [measurements, toggleLabelVisibility, updateLabelVisibility]);

  const updateAllLabelsVisibility = useCallback((visible: boolean, labelsRef: THREE.Group | null, segmentLabelsRef: THREE.Group | null) => {
    if (!labelsRef || !segmentLabelsRef) return;
    
    // Process all measurements
    measurements.forEach(measurement => {
      // Skip measurements that are explicitly hidden
      if (measurement.visible === false) return;
      
      // Update main labels
      labelsRef.children.forEach(label => {
        if (label.userData && label.userData.measurementId === measurement.id) {
          label.visible = visible;
        }
      });
      
      // Update segment labels
      segmentLabelsRef.children.forEach(label => {
        if (label.userData && label.userData.measurementId === measurement.id) {
          label.visible = visible;
        }
      });
    });
  }, [measurements]);

  // Function to get all measurement groups for export
  const getMeasurementGroups = useCallback((measurementsRef: THREE.Group | null) => {
    if (!measurementsRef) return [];
    
    const groups: THREE.Group[] = [];
    
    // Find all measurement groups
    measurementsRef.children.forEach(child => {
      if (child instanceof THREE.Group && child.userData && child.userData.measurementId) {
        groups.push(child as THREE.Group);
      }
    });
    
    return groups;
  }, []);

  // Make sure we return all the needed functions
  return {
    handleToggleMeasurementVisibility,
    handleToggleLabelVisibility,
    updateAllLabelsVisibility,
    updateMeasurementMarkers,
    getMeasurementGroups
  };
};
