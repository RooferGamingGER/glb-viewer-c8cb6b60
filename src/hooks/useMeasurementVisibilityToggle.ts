
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
  setAllLabelsVisible: React.Dispatch<React.SetStateAction<boolean>>,
  updateVisualState?: (measurements: Measurement[], allLabelsVisible: boolean) => void
) => {
  // Toggle visibility for a single measurement
  const toggleMeasurementVisibility = useCallback((id: string) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => 
        m.id === id ? { ...m, visible: m.visible === false ? true : false } : m
      );
      
      // Update visual state if the callback is provided
      if (updateVisualState) {
        updateVisualState(updatedMeasurements, allLabelsVisible);
      }
      
      return updatedMeasurements;
    });
  }, [setMeasurements, allLabelsVisible, updateVisualState]);

  // Toggle label visibility for a single measurement
  const toggleLabelVisibility = useCallback((id: string) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m =>
        m.id === id ? { ...m, labelVisible: m.labelVisible === false ? true : false } : m
      );

      // Derive global label state from individual measurements
      const allVisible = updatedMeasurements.every(m => m.labelVisible !== false);
      setAllLabelsVisible(allVisible);

      if (updateVisualState) {
        updateVisualState(updatedMeasurements, allVisible);
      }

      return updatedMeasurements;
    });
  }, [setMeasurements, setAllLabelsVisible, updateVisualState]);

  // Toggle visibility for all measurements
  const toggleAllMeasurementsVisibility = useCallback(() => {
    const newVisibility = !allMeasurementsVisible;
    setAllMeasurementsVisible(newVisibility);
    
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => ({ ...m, visible: newVisibility }));
      
      // Update visual state if the callback is provided
      if (updateVisualState) {
        updateVisualState(updatedMeasurements, allLabelsVisible);
      }
      
      return updatedMeasurements;
    });
  }, [allMeasurementsVisible, setAllMeasurementsVisible, setMeasurements, allLabelsVisible, updateVisualState]);

  // Toggle visibility for all labels
  const toggleAllLabelsVisibility = useCallback(() => {
    const newVisibility = !allLabelsVisible;
    setAllLabelsVisible(newVisibility);

    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => ({ ...m, labelVisible: newVisibility }));

      if (updateVisualState) {
        updateVisualState(updatedMeasurements, newVisibility);
      }

      return updatedMeasurements;
    });
  }, [allLabelsVisible, setAllLabelsVisible, setMeasurements, updateVisualState]);

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
    toggleLabelVisibility, // Keep for backward compatibility
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility, // Keep for backward compatibility
    moveMeasurementUp,
    moveMeasurementDown
  };
};
