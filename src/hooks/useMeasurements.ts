
import { useMeasurementCore } from './useMeasurementCore';
import { useMeasurementEditing } from './useMeasurementEditing';
import { useMeasurementVisibilityToggle } from './useMeasurementVisibilityToggle';
import { useMeasurementToolToggle } from './useMeasurementToolToggle';
import { calculateSegmentLength } from '@/utils/measurementCalculations';
import { extractRoofEdgeMeasurements, calculatePVMaterials } from '@/utils/pvCalculations';
import { MeasurementMode, Point, Measurement, Segment, PVMaterials } from '@/types/measurements';
import { useCallback, useRef, useState } from 'react';
import { smartToast } from '@/utils/smartToast';
import { devLog, devError } from '@/utils/consoleCleanup';

/**
 * Main measurements hook that composes functionality from specialized hooks
 */
export const useMeasurements = () => {
  // Add a state to track calculation status
  const [calculatingMaterials, setCalculatingMaterials] = useState(false);
  
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

  // Calculate PV materials for a measurement with improved error handling
  const calculatePVMaterialsForMeasurement = useCallback((measurementId: string, inverterDistance: number = 10): PVMaterials | undefined => {
    devLog('Starting PV materials calculation for measurement:', measurementId);
    setCalculatingMaterials(true);
    
    try {
      // Find the measurement
      const measurement = measurements.find(m => m.id === measurementId);
      if (!measurement) {
        devError('Cannot calculate PV materials: measurement not found', { measurementId });
        smartToast.error('Fehler: Messung nicht gefunden');
        setCalculatingMaterials(false);
        return undefined;
      }
      
      // Check if pvModuleInfo exists
      if (!measurement.pvModuleInfo) {
        devError('Cannot calculate PV materials: pvModuleInfo not found', { measurementId });
        smartToast.error('Fehler: PV-Modul-Informationen fehlen');
        setCalculatingMaterials(false);
        return undefined;
      }
      
      // Check if pvModuleSpec exists
      if (!measurement.pvModuleInfo.pvModuleSpec) {
        devError('Cannot calculate PV materials: pvModuleSpec is missing', { measurementId, pvInfo: measurement.pvModuleInfo });
        smartToast.error('Fehler: PV-Modul-Spezifikation fehlt');
        setCalculatingMaterials(false);
        return undefined;
      }
      
      devLog('PV module info before calculation:', measurement.pvModuleInfo);
      
      // Calculate materials with detailed error handling
      let materials: PVMaterials | undefined;
      try {
        materials = calculatePVMaterials(measurement.pvModuleInfo, inverterDistance);
        devLog('Raw calculation result:', materials);
      } catch (calcError) {
        devError('Error in calculatePVMaterials function:', calcError);
        smartToast.error('Fehler bei der Materialberechnung');
        setCalculatingMaterials(false);
        return undefined;
      }
      
      if (!materials) {
        devError('PV materials calculation returned undefined');
        smartToast.error('Materialberechnung fehlgeschlagen');
        setCalculatingMaterials(false);
        return undefined;
      }
      
      devLog('Successfully calculated PV materials:', materials);
      
      // Update the measurement with the calculated materials
      const updatedMeasurement = {
        ...measurement,
        pvModuleInfo: {
          ...measurement.pvModuleInfo,
          pvMaterials: materials
        }
      };
      
      // Update the measurement in the measurements array
      const updatedMeasurements = measurements.map(m => 
        m.id === measurementId ? updatedMeasurement : m
      );
      
      // Update state and trigger visual update
      devLog('Updating measurements with new PV materials');
      setMeasurements(updatedMeasurements);
      updateVisualState(updatedMeasurements, allLabelsVisible);
      
      // Show success toast
      smartToast.success('Materialliste erfolgreich berechnet');
      
      setCalculatingMaterials(false);
      return materials;
    } catch (error) {
      devError('Unexpected error in calculatePVMaterialsForMeasurement:', error);
      smartToast.error('Unerwarteter Fehler bei der Berechnung');
      setCalculatingMaterials(false);
      return undefined;
    }
  }, [measurements, setMeasurements, updateVisualState, allLabelsVisible]);

  // Add function to find and link shared segments
  const findAndLinkSharedSegments = useCallback((updatedMeasurements: Measurement[]) => {
    // Create a deep copy to avoid mutation issues
    const measurementsCopy = JSON.parse(JSON.stringify(updatedMeasurements)) as Measurement[];
    
    // Collect segments from area measurements only
    const areaMeasurements = measurementsCopy.filter(m => m.type === 'area' || m.type === 'solar');
    
    // Process each area measurement
    for (let i = 0; i < areaMeasurements.length; i++) {
      const measurement1 = areaMeasurements[i];
      if (!measurement1.segments) continue;
      
      // Compare with all other area measurements
      for (let j = i + 1; j < areaMeasurements.length; j++) {
        const measurement2 = areaMeasurements[j];
        if (!measurement2.segments) continue;
        
        // Compare segments between the two measurements
        for (let si = 0; si < measurement1.segments.length; si++) {
          const segment1 = measurement1.segments[si];
          
          for (let sj = 0; sj < measurement2.segments.length; sj++) {
            const segment2 = measurement2.segments[sj];
            
            // Check if the segments share the same points (in any order)
            const isShared = areSegmentsShared(segment1, segment2);
            
            if (isShared) {
              // Mark both segments as shared
              segment1.shared = true;
              segment2.shared = true;
              
              // Set one as original, the other as reference
              segment1.isOriginal = true;
              segment2.isOriginal = false;
              
              // Link them to each other
              segment1.sharedWithSegmentId = segment2.id;
              segment2.sharedWithSegmentId = segment1.id;
              
              // If one has a type and the other doesn't, or if they have different types,
              // the one with the type becomes the original, or the first one by default
              if ((segment1.type && !segment2.type) || 
                  (segment1.type !== segment2.type && segment1.type)) {
                segment1.isOriginal = true;
                segment2.isOriginal = false;
                
                // Transfer the type if needed
                if (segment1.type && !segment2.type) {
                  segment2.type = segment1.type;
                }
              } else if ((!segment1.type && segment2.type) || 
                         (segment1.type !== segment2.type && segment2.type)) {
                segment1.isOriginal = false;
                segment2.isOriginal = true;
                
                // Transfer the type if needed
                if (!segment1.type && segment2.type) {
                  segment1.type = segment2.type;
                }
              }
            }
          }
        }
      }
    }
    
    // Update the original measurements array with the modified measurements
    return measurementsCopy;
  }, []);
  
  // Helper function to check if two segments share the same points
  const areSegmentsShared = useCallback((segment1: Segment, segment2: Segment): boolean => {
    // Check points in both directions
    const matchForward = 
      arePointsEqual(segment1.points[0], segment2.points[0]) && 
      arePointsEqual(segment1.points[1], segment2.points[1]);
    
    const matchReverse = 
      arePointsEqual(segment1.points[0], segment2.points[1]) && 
      arePointsEqual(segment1.points[1], segment2.points[0]);
    
    // A small distance threshold for floating point comparison
    return matchForward || matchReverse;
  }, []);
  
  // Helper function to compare points with a small tolerance
  const arePointsEqual = useCallback((p1: Point, p2: Point, tolerance: number = 0.01): boolean => {
    const distanceSquared = 
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2);
    
    return distanceSquared < tolerance * tolerance;
  }, []);

  // Wrapper for updateMeasurement that also handles shared segments
  const updateMeasurementWithSharing = useCallback((
    measurementId: string, 
    data: Partial<Measurement>
  ) => {
    // First, update the measurement normally
    const updatedMeasurements = measurements.map(m => 
      m.id === measurementId ? { ...m, ...data } : m
    );
    
    // Then, find and link shared segments
    const measurementsWithLinkedSegments = findAndLinkSharedSegments(updatedMeasurements);
    
    // Update the state with the new measurements
    setMeasurements(measurementsWithLinkedSegments);
    
    // Trigger visual update
    updateVisualState(measurementsWithLinkedSegments, allLabelsVisible);
    
    return measurementsWithLinkedSegments;
  }, [measurements, setMeasurements, updateVisualState, allLabelsVisible, findAndLinkSharedSegments]);
  
  // Update segment with shared properties propagation
  const updateSegmentWithSharing = useCallback((
    measurementId: string,
    segmentId: string,
    segmentData: Partial<Segment>
  ) => {
    // First, find the measurement and segment
    const measurementIndex = measurements.findIndex(m => m.id === measurementId);
    if (measurementIndex === -1) return;
    
    const measurement = measurements[measurementIndex];
    if (!measurement.segments) return;
    
    const segmentIndex = measurement.segments.findIndex(s => s.id === segmentId);
    if (segmentIndex === -1) return;
    
    const segment = measurement.segments[segmentIndex];
    
    // Create a copy of measurements array
    const updatedMeasurements = [...measurements];
    
    // Create a copy of the segments array
    const updatedSegments = [...measurement.segments];
    
    // Update the specific segment
    updatedSegments[segmentIndex] = {
      ...segment,
      ...segmentData
    };
    
    // Update the measurement with the new segments
    updatedMeasurements[measurementIndex] = {
      ...measurement,
      segments: updatedSegments
    };
    
    // Check if this segment is shared with another segment
    if (segment.shared && segment.sharedWithSegmentId) {
      // Find the other segment
      for (let i = 0; i < updatedMeasurements.length; i++) {
        if (!updatedMeasurements[i].segments) continue;
        
        const otherSegmentIndex = updatedMeasurements[i].segments.findIndex(
          s => s.id === segment.sharedWithSegmentId
        );
        
        if (otherSegmentIndex !== -1) {
          // Update the other segment with the same changes
          updatedMeasurements[i].segments[otherSegmentIndex] = {
            ...updatedMeasurements[i].segments[otherSegmentIndex],
            ...segmentData
          };
          
          // Show a notification about the shared update
          smartToast.guidance('Änderung wurde auf geteilte Kante übertragen');
          break;
        }
      }
    }
    
    // Update measurements with shared segment links
    const finalMeasurements = findAndLinkSharedSegments(updatedMeasurements);
    
    // Save the updated measurements and trigger a visual update
    setMeasurements(finalMeasurements);
    updateVisualState(finalMeasurements, allLabelsVisible);
  }, [measurements, setMeasurements, updateVisualState, allLabelsVisible, findAndLinkSharedSegments]);
  
  // Enhance the initial finalization to detect shared segments
  const finalizeWithSharedSegments = useCallback(() => {
    // First, call the original finalize
    const newMeasurement = finalizeMeasurement();
    
    // Check if newMeasurement exists before proceeding
    if (newMeasurement) {
      // After creating a new measurement, check for shared segments
      const measurementsWithSharedSegments = findAndLinkSharedSegments([...measurements, newMeasurement]);
      
      // Update the measurements with linked segments
      setMeasurements(measurementsWithSharedSegments);
      updateVisualState(measurementsWithSharedSegments, allLabelsVisible);
    }
    
    return newMeasurement;
  }, [finalizeMeasurement, measurements, setMeasurements, updateVisualState, allLabelsVisible, findAndLinkSharedSegments]);
  
  // Implement a getNearestPointIndex function with the correct signature
  const getNearestPointIndex = useCallback((points: Point[], point: Point, threshold: number = Infinity): number => {
    let nearestIndex = -1;
    let minDistance = Infinity;
    
    for (let i = 0; i < points.length; i++) {
      const distance = Math.sqrt(
        Math.pow(points[i].x - point.x, 2) + 
        Math.pow(points[i].y - point.y, 2) + 
        Math.pow(points[i].z - point.z, 2)
      );
      
      if (distance < minDistance && distance <= threshold) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    return nearestIndex;
  }, []);
  
  // Export all functionality and state from the composed hooks, adding our new functions
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
    calculatingMaterials,
    
    // Actions
    addPoint,
    toggleMeasurementTool,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement: finalizeWithSharedSegments,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility,
    toggleEditMode,
    updateMeasurement: updateMeasurementWithSharing,
    updateSegment: updateSegmentWithSharing,
    deleteMeasurement,
    deletePoint,
    undoLastPoint,
    startPointEdit,
    updateMeasurementPoint,
    cancelEditing,
    moveMeasurementUp,
    moveMeasurementDown,
    getRoofEdgeInfo,
    calculatePVMaterialsForMeasurement,
    findAndLinkSharedSegments,
    
    // Visual state update function - expose this so it can be replaced
    setUpdateVisualState: (fn: typeof updateVisualState) => {
      visualStateUpdaterRef.current = fn;
    },
    
    // Utilities
    getNearestPointIndex,
    calculateSegmentLength,

    // Import measurements from external source (e.g., GLB metadata)
    importMeasurements: (list: Measurement[], append: boolean = false, linkShared: boolean = true) => {
      const baseList = append ? [...measurements, ...list] : list;
      const processed = linkShared ? findAndLinkSharedSegments(baseList) : baseList;
      setMeasurements(processed);
      updateVisualState(processed, allLabelsVisible);
    }
  };
};

// Re-export types
export type { MeasurementMode, Point, Measurement, Segment, PVMaterials } from '@/types/measurements';
