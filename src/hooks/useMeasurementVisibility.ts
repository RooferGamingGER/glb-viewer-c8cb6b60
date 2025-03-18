
import { useCallback } from 'react';
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';

/**
 * Hook for managing visibility of measurement visualizations
 */
export const useMeasurementVisibility = (
  measurements: Measurement[],
  toggleMeasurementVisibility: (id: string) => void,
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
    
    // Determine the new visibility state
    const isVisible = measurement.visible !== false;
    
    // Update visibility of all visual elements for this measurement
    
    // Update geometry visibility (including markers)
    if (refs.measurementsRef.current) {
      refs.measurementsRef.current.children.forEach(obj => {
        if (obj.userData && obj.userData.measurementId === id) {
          obj.visible = isVisible;
          
          // For groups, update all children as well
          if (obj instanceof THREE.Group) {
            obj.children.forEach(child => {
              child.visible = isVisible;
            });
          }
        }
      });
    }
    
    // Update main label visibility
    if (refs.labelsRef.current) {
      refs.labelsRef.current.children.forEach(label => {
        if (label.userData && label.userData.measurementId === id && !label.userData.isPreview) {
          label.visible = isVisible;
        }
      });
    }
    
    // Update segment label visibility
    if (refs.segmentLabelsRef.current) {
      refs.segmentLabelsRef.current.children.forEach(label => {
        if (label.userData && label.userData.measurementId === id) {
          label.visible = isVisible;
        }
      });
    }
    
    // Update points visibility
    if (refs.pointsRef.current) {
      refs.pointsRef.current.children.forEach(point => {
        if (point.userData && point.userData.measurementId === id) {
          point.visible = isVisible;
        }
      });
    }
    
    // Update lines visibility
    if (refs.linesRef.current) {
      refs.linesRef.current.children.forEach(line => {
        if (line.userData && line.userData.measurementId === id) {
          line.visible = isVisible;
        }
      });
    }
  }, [measurements, toggleMeasurementVisibility, refs]);

  // Helper function to update measurement markers
  const updateMeasurementMarkers = useCallback((showMarkers: boolean) => {
    if (!refs.measurementsRef.current) return;
    
    // Find all marker groups and set their visibility
    refs.measurementsRef.current.children.forEach(obj => {
      if (obj.userData && obj.userData.isMarker) {
        obj.visible = showMarkers;
        
        // For groups, update all children as well
        if (obj instanceof THREE.Group) {
          obj.children.forEach(child => {
            child.visible = showMarkers;
          });
        }
      }
    });
  }, [refs]);

  return {
    handleToggleMeasurementVisibility,
    updateMeasurementMarkers
  };
};
