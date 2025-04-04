import React, { createContext, useState, useCallback, useContext } from 'react';
import { nanoid } from 'nanoid';
import {
  MeasurementMode,
  Point,
  Measurement,
  Segment
} from '@/types/measurements';
import { calculateArea, generateSegments } from '@/utils/measurementCalculations';

// Define the context type
interface MeasurementContextType {
  measurements: Measurement[];
  currentPoints: Point[];
  activeMode: MeasurementMode;
  editMeasurementId: string | null;
  editingPointIndex: number | null;
  allMeasurementsVisible: boolean;
  allLabelsVisible: boolean;
  
  addPoint: (point: Point) => void;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  clearMeasurements: () => void;
  clearCurrentPoints: () => void;
  finalizeMeasurement: () => Measurement | undefined;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  toggleAllMeasurementsVisibility: () => void;
  toggleAllLabelsVisibility: () => void;
  toggleEditMode: (id: string) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  updateSegment: (measurementId: string, segmentId: string, segmentData: Partial<Segment>) => void;
  deleteMeasurement: (id: string) => void;
  deletePoint: (measurementId: string, pointIndex: number) => void;
  undoLastPoint: () => void;
  startPointEdit: (measurementId: string, pointIndex: number) => void;
  updateMeasurementPoint: (point: Point) => void;
  cancelEditing: () => void;
  moveMeasurementUp: (id: string) => void;
  moveMeasurementDown: (id: string) => void;
  
  setUpdateVisualState: (fn: (updatedMeasurements: Measurement[], labelVisibility: boolean) => void) => void;
}

// Create the context with a default value
const MeasurementContext = createContext<MeasurementContextType | undefined>(undefined);

// Hook for using the MeasurementContext
export const useMeasurementContext = () => {
  const context = useContext(MeasurementContext);
  if (!context) {
    throw new Error("useMeasurementContext must be used within a MeasurementProvider");
  }
  return context;
};

export const MeasurementProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // State variables
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none');
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const [allMeasurementsVisible, setAllMeasurementsVisible] = useState<boolean>(true);
  const [allLabelsVisible, setAllLabelsVisible] = useState<boolean>(true);

  // Function to add a point to the current measurement
  const addPoint = useCallback((point: Point) => {
    setCurrentPoints(prev => [...prev, point]);
  }, []);

  // Function to toggle the active measurement tool
  const toggleMeasurementTool = useCallback((mode: MeasurementMode) => {
    setActiveMode(mode);
    setCurrentPoints([]);
  }, []);

  // Function to clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);

  // Function to clear the current points
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
  }, []);

  // Function to finalize the current measurement
  const finalizeMeasurement = useCallback(() => {
    if (currentPoints.length === 0) return;

    let measurementValue = 0;
    let segments: Segment[] = [];

    // Check if we have a stored alignment edge
    let alignmentEdge = null;
    try {
      const storedEdge = sessionStorage.getItem('pvAlignmentEdge');
      if (storedEdge) {
        alignmentEdge = JSON.parse(storedEdge);
        // Clear it after use
        sessionStorage.removeItem('pvAlignmentEdge');
      }
    } catch (error) {
      console.error('Error parsing stored alignment edge:', error);
    }

    // Different calculations based on measurement type
    if (activeMode === 'length' && currentPoints.length >= 2) {
      measurementValue = Math.sqrt(
        Math.pow(currentPoints[1].x - currentPoints[0].x, 2) +
        Math.pow(currentPoints[1].y - currentPoints[0].y, 2) +
        Math.pow(currentPoints[1].z - currentPoints[0].z, 2)
      );

      const newMeasurement: Measurement = {
        id: nanoid(),
        type: activeMode,
        points: [...currentPoints],
        value: measurementValue
      };

      setMeasurements(prev => [...prev, newMeasurement]);
    } 
    else if (activeMode === 'height' && currentPoints.length >= 2) {
      measurementValue = Math.abs(currentPoints[1].y - currentPoints[0].y);

      const newMeasurement: Measurement = {
        id: nanoid(),
        type: activeMode,
        points: [...currentPoints],
        value: measurementValue
      };

      setMeasurements(prev => [...prev, newMeasurement]);
    } 
    else if ((activeMode === 'area' || activeMode === 'solar' || activeMode === 'skylight' || activeMode === 'chimney') && currentPoints.length >= 3) {
      // Calculate area value
      measurementValue = calculateArea(currentPoints);
      
      // Generate segments for the area's outline
      segments = generateSegments(currentPoints);
      
      // For solar measurements, add PV module information
      let pvModuleInfo = undefined;
      if (activeMode === 'solar') {
        // Get standard module spec
        const moduleSpec = {
          width: 1.7, // meters
          height: 1.0, // meters
          power: 380, // watts
          name: "Standardmodul 380W"
        };
        
        // Calculate approximate module count based on area
        const moduleArea = moduleSpec.width * moduleSpec.height;
        const availableArea = measurementValue * 0.9; // 90% of roof area assuming some margin
        
        const estimatedModuleCount = Math.floor(availableArea / moduleArea);
        
        // Simple layout: try to approximate sqrt for a square-ish layout
        let modulesX = Math.floor(Math.sqrt(estimatedModuleCount));
        let modulesY = Math.floor(estimatedModuleCount / modulesX);
        
        if (modulesX * modulesY < estimatedModuleCount && modulesY > 0) {
          modulesX += 1;
        }
        
        pvModuleInfo = {
          moduleCount: modulesX * modulesY,
          modulesX,
          modulesY,
          orientation: 'landscape',
          spacing: 0.02, // 2cm between modules
          pvModuleSpec: moduleSpec,
          // Add alignment edge if available
          alignmentEdge: alignmentEdge
        };
        
        console.log("Created PV module information:", pvModuleInfo);
      }
      
      // Create the new measurement
      const newMeasurement: Measurement = {
        id: nanoid(),
        type: activeMode,
        points: [...currentPoints],
        value: measurementValue,
        segments,
        pvModuleInfo
      };
      
      setMeasurements(prev => [...prev, newMeasurement]);
    }
    else if ((activeMode === 'vent' || activeMode === 'hook' || activeMode === 'other') && currentPoints.length >= 1) {
      // Point-based measurements just need a single point
      const newMeasurement: Measurement = {
        id: nanoid(),
        type: activeMode,
        points: [...currentPoints],
        value: 0 // No specific value for point-based elements
      };
      
      setMeasurements(prev => [...prev, newMeasurement]);
    }

    // Clear current points after finalizing
    setCurrentPoints([]);

    return undefined;
  }, [currentPoints, activeMode, setMeasurements, calculateArea, generateSegments]);

  // Function to toggle the visibility of a measurement
  const toggleMeasurementVisibility = useCallback((id: string) => {
    setMeasurements(prev =>
      prev.map(m =>
        m.id === id ? { ...m, visible: m.visible === false } : m
      )
    );
  }, []);

  // Function to toggle the visibility of a label
  const toggleLabelVisibility = useCallback((id: string) => {
    setMeasurements(prev =>
      prev.map(m =>
        m.id === id ? { ...m, labelVisible: m.labelVisible === false } : m
      )
    );
  }, []);

  // Function to toggle the visibility of all measurements
  const toggleAllMeasurementsVisibility = useCallback(() => {
    setAllMeasurementsVisible(prev => !prev);
    setMeasurements(prev =>
      prev.map(m => ({ ...m, visible: !allMeasurementsVisible }))
    );
  }, [allMeasurementsVisible]);

  // Function to toggle the visibility of all labels
  const toggleAllLabelsVisibility = useCallback(() => {
    setAllLabelsVisible(prev => !prev);
    setMeasurements(prev =>
      prev.map(m => ({ ...m, labelVisible: !allLabelsVisible }))
    );
  }, [allLabelsVisible]);

  // Function to toggle edit mode for a measurement
  const toggleEditMode = useCallback((id: string) => {
    setEditMeasurementId(id);
  }, []);

  // Function to update a measurement
  const updateMeasurement = useCallback((id: string, data: Partial<Measurement>) => {
    setMeasurements(prev =>
      prev.map(m => (m.id === id ? { ...m, ...data } : m))
    );
  }, []);

  // Function to update a segment
  const updateSegment = useCallback((measurementId: string, segmentId: string, segmentData: Partial<Segment>) => {
    setMeasurements(prev =>
      prev.map(m => {
        if (m.id === measurementId && m.segments) {
          return {
            ...m,
            segments: m.segments.map(s => (s.id === segmentId ? { ...s, ...segmentData } : s))
          };
        }
        return m;
      })
    );
  }, []);

  // Function to delete a measurement
  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  // Function to delete a point from a measurement
  const deletePoint = useCallback((measurementId: string, pointIndex: number) => {
    setMeasurements(prev =>
      prev.map(m => {
        if (m.id === measurementId) {
          const updatedPoints = [...m.points];
          updatedPoints.splice(pointIndex, 1);
          return { ...m, points: updatedPoints };
        }
        return m;
      })
    );
  }, []);

  // Function to undo the last added point
  const undoLastPoint = useCallback(() => {
    setCurrentPoints(prev => prev.slice(0, -1));
  }, []);

  // Function to start editing a point
  const startPointEdit = useCallback((measurementId: string, pointIndex: number) => {
    setEditMeasurementId(measurementId);
    setEditingPointIndex(pointIndex);
  }, []);

  // Function to update a measurement point
  const updateMeasurementPoint = useCallback((point: Point) => {
    if (editMeasurementId && editingPointIndex !== null) {
      setMeasurements(prev =>
        prev.map(m => {
          if (m.id === editMeasurementId) {
            const updatedPoints = [...m.points];
            updatedPoints[editingPointIndex] = point;
            return { ...m, points: updatedPoints };
          }
          return m;
        })
      );
      setEditMeasurementId(null);
      setEditingPointIndex(null);
    }
  }, [editMeasurementId, editingPointIndex]);

  // Function to cancel editing
  const cancelEditing = useCallback(() => {
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, []);

  const moveMeasurementUp = useCallback((id: string) => {
    setMeasurements(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index <= 0) return prev; // Already at the top or not found

      const newMeasurements = [...prev];
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[index - 1];
      newMeasurements[index - 1] = temp;

      return newMeasurements;
    });
  }, []);

  const moveMeasurementDown = useCallback((id: string) => {
    setMeasurements(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index < 0 || index >= prev.length - 1) return prev; // Not found or already at the bottom

      const newMeasurements = [...prev];
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[index + 1];
      newMeasurements[index + 1] = temp;

      return newMeasurements;
    });
  }, []);
  
  const setUpdateVisualState = useCallback((fn: (updatedMeasurements: Measurement[], labelVisibility: boolean) => void) => {
    // This function is intentionally left empty.
    // The actual implementation will be provided by the MeasurementTools component.
  }, []);

  return (
    <MeasurementContext.Provider value={{
      measurements,
      currentPoints,
      activeMode,
      editMeasurementId,
      editingPointIndex,
      allMeasurementsVisible,
      allLabelsVisible,
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
      updateSegment,
      deleteMeasurement,
      deletePoint,
      undoLastPoint,
      startPointEdit,
      updateMeasurementPoint,
      cancelEditing,
      moveMeasurementUp,
      moveMeasurementDown,
      setUpdateVisualState
    }}>
      {children}
    </MeasurementContext.Provider>
  );
};
