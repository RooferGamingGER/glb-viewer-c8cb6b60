
import { useMeasurementCore } from './useMeasurementCore';
import { useMeasurementEditing } from './useMeasurementEditing';
import { useMeasurementVisibilityToggle } from './useMeasurementVisibilityToggle';
import { useMeasurementToolToggle } from './useMeasurementToolToggle';
import { useRectangleEditor } from './useRectangleEditor';
import { getNearestPointIndex, calculateSegmentLength } from '@/utils/measurementCalculations';
import { MeasurementMode, Point, Measurement, Segment } from '@/types/measurements';

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
  
  // Rectangle editing functionality
  const {
    editingRectangleId,
    startRectangleEdit,
    updateRectanglePoints,
    finishRectangleEdit,
    cancelRectangleEdit
  } = useRectangleEditor(
    measurements,
    setMeasurements
  );
  
  // Visibility toggling
  const {
    toggleMeasurementVisibility,
    toggleAllMeasurementsVisibility
  } = useMeasurementVisibilityToggle(
    measurements,
    setMeasurements,
    allMeasurementsVisible,
    setAllMeasurementsVisible
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
    editingRectangleId,
    
    // Actions
    addPoint,
    toggleMeasurementTool,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement,
    toggleMeasurementVisibility,
    toggleAllMeasurementsVisibility,
    toggleEditMode,
    updateMeasurement,
    deleteMeasurement,
    deletePoint,
    undoLastPoint,
    startPointEdit,
    updateMeasurementPoint,
    cancelEditing,
    
    // Rectangle editing
    startRectangleEdit,
    updateRectanglePoints,
    finishRectangleEdit,
    cancelRectangleEdit,
    
    // Utilities
    getNearestPointIndex,
    calculateSegmentLength
  };
};

// Re-export types
export type { MeasurementMode, Point, Measurement, Segment } from '@/types/measurements';
