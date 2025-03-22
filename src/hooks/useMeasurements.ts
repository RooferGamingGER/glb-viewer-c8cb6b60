
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

  // PV Module visibility and selection management
  const togglePVModulesVisibility = useCallback((id: string) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => {
        if (m.id === id) {
          return {
            ...m,
            modulesVisible: m.modulesVisible === undefined ? true : !m.modulesVisible
          };
        }
        return m;
      });
      
      // Update visual state
      updateVisualState(updatedMeasurements, allLabelsVisible);
      
      return updatedMeasurements;
    });
  }, [setMeasurements, updateVisualState, allLabelsVisible]);
  
  // Function to toggle detailed module view
  const toggleDetailedModules = useCallback((id: string) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => {
        if (m.id === id && m.pvModuleInfo) {
          return {
            ...m,
            pvModuleInfo: {
              ...m.pvModuleInfo,
              showDetailedModules: m.pvModuleInfo.showDetailedModules === undefined 
                ? true 
                : !m.pvModuleInfo.showDetailedModules
            }
          };
        }
        return m;
      });
      
      // Update visual state
      updateVisualState(updatedMeasurements, allLabelsVisible);
      
      return updatedMeasurements;
    });
  }, [setMeasurements, updateVisualState, allLabelsVisible]);
  
  // Function to select/deselect a PV module
  const toggleModuleSelection = useCallback((measurementId: string, moduleIndex: number) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => {
        if (m.id === measurementId) {
          // Initialize selectedModules array if it doesn't exist
          const currentSelectedModules = m.selectedModules || [];
          
          // Toggle selection: if already selected, remove it; otherwise add it
          let newSelectedModules;
          if (currentSelectedModules.includes(moduleIndex)) {
            newSelectedModules = currentSelectedModules.filter(index => index !== moduleIndex);
          } else {
            newSelectedModules = [...currentSelectedModules, moduleIndex];
          }
          
          return {
            ...m,
            selectedModules: newSelectedModules
          };
        }
        return m;
      });
      
      // Update visual state
      updateVisualState(updatedMeasurements, allLabelsVisible);
      
      return updatedMeasurements;
    });
  }, [setMeasurements, updateVisualState, allLabelsVisible]);
  
  // Function to select all modules in a measurement
  const selectAllModules = useCallback((measurementId: string) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => {
        if (m.id === measurementId && m.pvModuleInfo && m.pvModuleInfo.moduleCount > 0) {
          // Create an array with all module indices
          const allModuleIndices = Array.from({ length: m.pvModuleInfo.moduleCount }, (_, index) => index);
          
          return {
            ...m,
            selectedModules: allModuleIndices
          };
        }
        return m;
      });
      
      // Update visual state
      updateVisualState(updatedMeasurements, allLabelsVisible);
      
      return updatedMeasurements;
    });
  }, [setMeasurements, updateVisualState, allLabelsVisible]);
  
  // Function to deselect all modules in a measurement
  const deselectAllModules = useCallback((measurementId: string) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => {
        if (m.id === measurementId) {
          return {
            ...m,
            selectedModules: []
          };
        }
        return m;
      });
      
      // Update visual state
      updateVisualState(updatedMeasurements, allLabelsVisible);
      
      return updatedMeasurements;
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
    
    // PV Module specific actions
    togglePVModulesVisibility,
    toggleDetailedModules,
    toggleModuleSelection,
    selectAllModules,
    deselectAllModules,
    
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
