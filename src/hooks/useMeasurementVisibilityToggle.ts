
import { useCallback } from 'react';
import { Measurement } from '@/types/measurements';

/**
 * Hook for managing measurement visibility
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

  // Toggle visibility for all labels
  const toggleAllLabelsVisibility = useCallback(() => {
    const newLabelVisibility = !allLabelsVisible;
    setAllLabelsVisible(newLabelVisibility);
    setMeasurements(prev => prev.map(m => ({ ...m, labelVisible: newLabelVisibility })));
  }, [allLabelsVisible, setAllLabelsVisible, setMeasurements]);

  return {
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility
  };
};
