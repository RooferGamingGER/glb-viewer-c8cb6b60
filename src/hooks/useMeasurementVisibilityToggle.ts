
import { useCallback } from 'react';
import { Measurement } from '@/types/measurements';

/**
 * Hook for managing measurement visibility and ordering
 */
export const useMeasurementVisibilityToggle = (
  measurements: Measurement[],
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>,
  allMeasurementsVisible: boolean,
  setAllMeasurementsVisible: React.Dispatch<React.SetStateAction<boolean>>,
  allLabelsVisible: boolean,
  setAllLabelsVisible: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Toggle visibility for a single measurement
  const toggleMeasurementVisibility = useCallback((id: string) => {
    setMeasurements(prev => prev.map(m => 
      m.id === id ? { ...m, visible: m.visible === false ? true : false } : m
    ));
  }, [setMeasurements]);

  // Toggle label visibility for a single measurement
  const toggleLabelVisibility = useCallback((id: string) => {
    setMeasurements(prev => prev.map(m => 
      m.id === id ? { ...m, labelVisible: m.labelVisible === false ? true : false } : m
    ));
  }, [setMeasurements]);

  // Toggle visibility for all measurements
  const toggleAllMeasurementsVisibility = useCallback(() => {
    const newVisibility = !allMeasurementsVisible;
    setAllMeasurementsVisible(newVisibility);
    setMeasurements(prev => prev.map(m => ({ ...m, visible: newVisibility })));
  }, [allMeasurementsVisible, setAllMeasurementsVisible, setMeasurements]);

  // Toggle visibility for all labels - fixed to correctly toggle state
  const toggleAllLabelsVisibility = useCallback(() => {
    const newLabelVisibility = !allLabelsVisible;
    setAllLabelsVisible(newLabelVisibility);
    setMeasurements(prev => prev.map(m => ({ ...m, labelVisible: newLabelVisibility })));
  }, [allLabelsVisible, setAllLabelsVisible, setMeasurements]);

  // Move a measurement up in the list within its type category
  const moveMeasurementUp = useCallback((id: string) => {
    setMeasurements(prev => {
      // Find the current measurement and its index
      const index = prev.findIndex(m => m.id === id);
      if (index <= 0) return prev; // Already at the top or not found
      
      // Get the measurement to move and the one above it
      const currentMeasurement = prev[index];
      
      // Find the previous measurement of the same type
      let prevIndex = index - 1;
      while (prevIndex >= 0) {
        if (prev[prevIndex].type === currentMeasurement.type) {
          break;
        }
        prevIndex--;
      }
      
      // If we couldn't find a previous measurement of the same type, don't move
      if (prevIndex < 0) return prev;
      
      // Create a new array with the items swapped
      const newMeasurements = [...prev];
      newMeasurements[index] = prev[prevIndex];
      newMeasurements[prevIndex] = currentMeasurement;
      
      return newMeasurements;
    });
  }, [setMeasurements]);

  // Move a measurement down in the list within its type category
  const moveMeasurementDown = useCallback((id: string) => {
    setMeasurements(prev => {
      // Find the current measurement and its index
      const index = prev.findIndex(m => m.id === id);
      if (index === -1 || index >= prev.length - 1) return prev; // Not found or already at the bottom
      
      // Get the measurement to move
      const currentMeasurement = prev[index];
      
      // Find the next measurement of the same type
      let nextIndex = index + 1;
      while (nextIndex < prev.length) {
        if (prev[nextIndex].type === currentMeasurement.type) {
          break;
        }
        nextIndex++;
      }
      
      // If we couldn't find a next measurement of the same type, don't move
      if (nextIndex >= prev.length) return prev;
      
      // Create a new array with the items swapped
      const newMeasurements = [...prev];
      newMeasurements[index] = prev[nextIndex];
      newMeasurements[nextIndex] = currentMeasurement;
      
      return newMeasurements;
    });
  }, [setMeasurements]);

  return {
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility,
    moveMeasurementUp,
    moveMeasurementDown
  };
};
