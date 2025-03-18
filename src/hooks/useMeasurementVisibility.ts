
import { useCallback } from 'react';
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';

/**
 * Hook for managing visibility of measurement visualizations
 */
export const useMeasurementVisibility = (
  measurements: Measurement[],
  toggleMeasurementVisibility: (id: string) => void,
  toggleLabelVisibility: (id: string) => void,
  refs: {
    pointsRef: React.RefObject<THREE.Group>,
    linesRef: React.RefObject<THREE.Group>,
    measurementsRef: React.RefObject<THREE.Group>,
    labelsRef: React.RefObject<THREE.Group>,
    segmentLabelsRef: React.RefObject<THREE.Group>
  }
) => {
  // Enhanced function for toggling measurement visibility
  const handleToggleMeasurementVisibility = useCallback((id: string) => {
    // First update the state
    toggleMeasurementVisibility(id);
    
    // Get the measurement to determine its new visibility state
    const measurement = measurements.find(m => m.id === id);
    if (!measurement) return;
    
    // Determine the new visibility state (inverse of current)
    const newVisibility = measurement.visible === false;
    
    // Update visibility of all visual elements for this measurement
    
    // Update geometry visibility (including markers)
    if (refs.measurementsRef.current) {
      refs.measurementsRef.current.children.forEach(obj => {
        if (obj.userData && obj.userData.measurementId === id) {
          obj.visible = newVisibility;
          
          // For groups, update all children as well
          if (obj instanceof THREE.Group) {
            obj.children.forEach(child => {
              child.visible = newVisibility;
            });
          }
        }
      });
    }
    
    // Update main label visibility - always link to measurement visibility
    if (refs.labelsRef.current) {
      refs.labelsRef.current.children.forEach(label => {
        if (label.userData && label.userData.measurementId === id && !label.userData.isPreview) {
          label.visible = newVisibility; // Always show label when measurement is visible
        }
      });
    }
    
    // Update segment label visibility - always link to measurement visibility
    if (refs.segmentLabelsRef.current) {
      refs.segmentLabelsRef.current.children.forEach(label => {
        if (label.userData && label.userData.measurementId === id) {
          label.visible = newVisibility; // Always show label when measurement is visible
        }
      });
    }
    
    // Update points visibility
    if (refs.pointsRef.current) {
      refs.pointsRef.current.children.forEach(point => {
        if (point.userData && point.userData.measurementId === id) {
          point.visible = newVisibility;
        }
      });
    }
    
    // Update lines visibility
    if (refs.linesRef.current) {
      refs.linesRef.current.children.forEach(line => {
        if (line.userData && line.userData.measurementId === id) {
          line.visible = newVisibility;
        }
      });
    }
  }, [measurements, toggleMeasurementVisibility, refs]);

  // Function to toggle label visibility - no longer functional
  const handleToggleLabelVisibility = useCallback((id: string) => {
    // This function is now a no-op since labels are always visible
    console.log('Label visibility toggle is deprecated - labels are always visible');
  }, []);

  // Function to update all labels visibility - now ensures all labels are visible
  const updateAllLabelsVisibility = useCallback((visible: boolean) => {
    if (!refs.labelsRef.current || !refs.segmentLabelsRef.current) return;
    
    // Always ensure labels are visible for visible measurements
    refs.labelsRef.current.children.forEach(label => {
      if (label.userData && !label.userData.isPreview) {
        const measurementId = label.userData.measurementId;
        if (measurementId) {
          const measurement = measurements.find(m => m.id === measurementId);
          if (measurement && measurement.visible !== false) {
            label.visible = true; // Always visible
          }
        }
      }
    });
    
    // Always ensure segment labels are visible for visible measurements
    refs.segmentLabelsRef.current.children.forEach(label => {
      if (label.userData) {
        const measurementId = label.userData.measurementId;
        if (measurementId) {
          const measurement = measurements.find(m => m.id === measurementId);
          if (measurement && measurement.visible !== false) {
            label.visible = true; // Always visible
          }
        }
      }
    });
  }, [measurements, refs]);

  // Function to update measurement markers
  const updateMeasurementMarkers = useCallback(() => {
    if (!refs.measurementsRef.current) return;
    
    // Update visibility of all markers
    refs.measurementsRef.current.children.forEach(obj => {
      if (obj.userData && obj.userData.measurementId) {
        const measurementId = obj.userData.measurementId;
        const measurement = measurements.find(m => m.id === measurementId);
        if (measurement) {
          obj.visible = measurement.visible !== false;
          
          // For groups, update all children as well
          if (obj instanceof THREE.Group) {
            obj.children.forEach(child => {
              child.visible = measurement.visible !== false;
            });
          }
        }
      }
    });
  }, [measurements, refs]);

  return {
    handleToggleMeasurementVisibility,
    handleToggleLabelVisibility,
    updateAllLabelsVisibility,
    updateMeasurementMarkers
  };
};
