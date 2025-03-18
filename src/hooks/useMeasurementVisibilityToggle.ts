
import { useCallback } from 'react';
import { Measurement } from '@/types/measurements';

/**
 * Hook for managing measurement visibility
 */
export const useMeasurementVisibilityToggle = (
  measurements: Measurement[],
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>,
  allMeasurementsVisible: boolean,
  setAllMeasurementsVisible: React.Dispatch<React.SetStateAction<boolean>>
) => {
  // Toggle visibility for a single measurement
  const toggleMeasurementVisibility = useCallback((id: string) => {
    setMeasurements(prev => prev.map(m => 
      m.id === id ? { ...m, visible: m.visible === false ? true : false } : m
    ));
  }, [setMeasurements]);

  // Toggle visibility for all measurements
  const toggleAllMeasurementsVisibility = useCallback(() => {
    setAllMeasurementsVisible(prev => !prev);
    setMeasurements(prev => prev.map(m => ({ ...m, visible: !allMeasurementsVisible })));
  }, [allMeasurementsVisible, setAllMeasurementsVisible, setMeasurements]);

  return {
    toggleMeasurementVisibility,
    toggleAllMeasurementsVisibility
  };
};
