
import { useCallback } from 'react';
import { MeasurementMode } from '@/types/measurements';

/**
 * Hook for toggling between measurement tools
 */
export const useMeasurementToolToggle = (
  activeMode: MeasurementMode,
  setActiveMode: React.Dispatch<React.SetStateAction<MeasurementMode>>,
  clearCurrentPoints: () => void,
  setEditMeasurementId: React.Dispatch<React.SetStateAction<string | null>>,
  setEditingPointIndex: React.Dispatch<React.SetStateAction<number | null>>,
  setMeasurements: React.Dispatch<React.SetStateAction<any[]>>
) => {
  // Toggle measurement tool function
  const toggleMeasurementTool = useCallback((mode: MeasurementMode) => {
    if (activeMode === mode) {
      // If the same tool is clicked again, disable it by setting mode to 'none'
      setActiveMode('none');
      clearCurrentPoints();
      // Also clear edit mode
      setEditMeasurementId(null);
      setEditingPointIndex(null);
      setMeasurements(prev => prev.map(m => ({ ...m, editMode: false })));
    } else {
      // If a different tool is clicked, activate it
      setActiveMode(mode);
      clearCurrentPoints();
      // Clear edit mode
      setEditMeasurementId(null);
      setEditingPointIndex(null);
      setMeasurements(prev => prev.map(m => ({ ...m, editMode: false })));
    }
  }, [activeMode, clearCurrentPoints, setActiveMode, setEditMeasurementId, setEditingPointIndex, setMeasurements]);

  // Check if a specific mode is active
  const isModeActive = useCallback((mode: MeasurementMode) => {
    return activeMode === mode;
  }, [activeMode]);

  // Check if the active mode is an area-type mode
  const isAreaMode = useCallback(() => {
    return ['area', 'solar', 'skylight', 'chimney'].includes(activeMode);
  }, [activeMode]);

  // Check if the active mode is a point-type mode
  const isPointMode = useCallback(() => {
    return ['vent', 'hook', 'other'].includes(activeMode);
  }, [activeMode]);

  // Check if the active mode is a line-type mode
  const isLineMode = useCallback(() => {
    return ['length', 'height', 'gutter'].includes(activeMode);
  }, [activeMode]);

  return {
    toggleMeasurementTool,
    isModeActive,
    isAreaMode,
    isPointMode,
    isLineMode
  };
};
