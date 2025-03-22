
import { useMeasurementCore } from './useMeasurementCore';
import { useMeasurementEditing } from './useMeasurementEditing';
import { useMeasurementVisibilityToggle } from './useMeasurementVisibilityToggle';
import { useMeasurementToolToggle } from './useMeasurementToolToggle';
import { getNearestPointIndex, calculateSegmentLength } from '@/utils/measurementCalculations';
import { extractRoofEdgeMeasurements } from '@/utils/pvCalculations';
import { MeasurementMode, Point, Measurement, Segment } from '@/types/measurements';
import { useCallback, useRef } from 'react';

/**
 * Main measurements hook that composes functionality from specialized hooks
 */
export const useMeasurements = () => {
  // Core measurement state and functions
  const {
    measurements,
    setMeasurements,
    currentPoints,
    setCurrentPoints,
    activeMode,
    setActiveMode,
    allMeasurementsVisible,
    setAllMeasurementsVisible,
    allLabelsVisible,
    setAllLabelsVisible,
    editMeasurementId,
    setEditMeasurementId,
    editingPointIndex,
    setEditingPointIndex,
    addPoint,
    finalizeMeasurement,
    clearCurrentPoints,
    clearMeasurements,
    updateMeasurementPoint,
    undoLastPoint
  } = useMeasurementCore();
  
  // Use a ref to store the visual update function so it can be replaced
  const visualStateUpdaterRef = useRef<(updatedMeasurements: Measurement[], labelVisibility: boolean) => void>(
    (updatedMeasurements, labelVisibility) => {
      // Default implementation is a no-op
      // This will be replaced by the actual implementation in MeasurementTools
    }
  );
  
  // Wrapper function that calls the current ref value
  const updateVisualState = useCallback((updatedMeasurements: Measurement[], labelVisibility: boolean) => {
    visualStateUpdaterRef.current(updatedMeasurements, labelVisibility);
  }, []);
  
  // Editing functionality
  const {
    toggleEditMode,
    startPointEdit,
    updateMeasurement,
    deleteMeasurement,
    deletePoint,
    cancelEditing
  } = useMeasurementEditing(
    measurements,
    setMeasurements,
    editMeasurementId,
    setEditMeasurementId,
    setEditingPointIndex
  );
  
  // Visibility toggling with visual update callback
  const {
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility,
    moveMeasurementUp,
    moveMeasurementDown
  } = useMeasurementVisibilityToggle(
    measurements,
    setMeasurements,
    allMeasurementsVisible,
    setAllMeasurementsVisible,
    allLabelsVisible,
    setAllLabelsVisible,
    updateVisualState
  );
  
  // Tool toggling
  const {
    toggleMeasurementTool
  } = useMeasurementToolToggle(
    activeMode,
    setActiveMode,
    clearCurrentPoints,
    setEditMeasurementId,
    setEditingPointIndex,
    setMeasurements
  );
  
  // Get roof edge information from measurements with validation
  const getRoofEdgeInfo = useCallback(() => {
    return extractRoofEdgeMeasurements(measurements);
  }, [measurements]);

  // Toggle PV modules visibility for a specific measurement
  const togglePVModulesVisibility = useCallback((measurementId: string) => {
    setMeasurements(prevMeasurements => {
      const newMeasurements = prevMeasurements.map(m => {
        if (m.id === measurementId && m.type === 'solar') {
          return {
            ...m,
            pvModulesVisible: m.pvModulesVisible === undefined ? false : !m.pvModulesVisible
          };
        }
        return m;
      });
      
      // Update visual state
      updateVisualState(newMeasurements, allLabelsVisible);
      
      return newMeasurements;
    });
  }, [setMeasurements, updateVisualState, allLabelsVisible]);

  // Export all functionality and state from the composed hooks
  return {
    // State
    measurements,
    currentPoints,
    setCurrentPoints,
    activeMode,
    editMeasurementId,
    editingPointIndex,
    allMeasurementsVisible,
    allLabelsVisible,
    
    // Actions
    addPoint,
    toggleMeasurementTool,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility,
    toggleEditMode,
    updateMeasurement,
    deleteMeasurement,
    deletePoint,
    undoLastPoint,
    startPointEdit,
    updateMeasurementPoint,
    cancelEditing,
    moveMeasurementUp,
    moveMeasurementDown,
    getRoofEdgeInfo,
    togglePVModulesVisibility,
    
    // Visual state update function - expose this so it can be replaced
    setUpdateVisualState: (fn: typeof updateVisualState) => {
      visualStateUpdaterRef.current = fn;
    },
    
    // Utilities
    getNearestPointIndex,
    calculateSegmentLength
  };
};

// Re-export types
export type { MeasurementMode, Point, Measurement, Segment } from '@/types/measurements';
