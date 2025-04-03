
import React, { createContext, useState, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { Point, Measurement, MeasurementMode, Segment } from '@/types/measurements';
import { generateSegments, calculateDistance, calculateArea, calculateHeight } from '@/utils/measurementCalculations';

// Define the context props
interface MeasurementContextProps {
  measurements: Measurement[];
  currentPoints: Point[];
  activeMode: MeasurementMode;
  editMeasurementId: string | null;
  editingPointIndex: number | null;
  allLabelsVisible: boolean;
  calculatingMaterials: boolean;
  setCalculatingMaterials: (calculating: boolean) => void;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  addPoint: (point: Point) => void;
  undoLastPoint: () => void;
  clearCurrentPoints: () => void;
  finalizeMeasurement: () => Measurement | undefined;
  setMeasurements: (measurements: Measurement[]) => void;
  clearMeasurements: () => void;
  deleteMeasurement: (id: string) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  toggleAllMeasurementsVisibility: () => void;
  toggleAllLabelsVisibility: () => void;
  toggleEditMode: (id: string) => void;
  startPointEdit: (id: string, pointIndex: number) => void;
  updateMeasurementPoint: (id: string, index: number, point: Point) => void;
  cancelEditing: () => void;
  deletePoint: (id: string, pointIndex: number) => void;
  moveMeasurementUp: (id: string) => void;
  moveMeasurementDown: (id: string) => void;
  updateVisualState?: (measurements: Measurement[], labelsVisible: boolean) => void;
  setUpdateVisualState: (fn: (measurements: Measurement[], labelsVisible: boolean) => void) => void;
}

// Create the context with an undefined initial value
export const MeasurementContext = createContext<MeasurementContextProps | undefined>(undefined);

// Provider component that wraps parts of our app that need the context
export const MeasurementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none');
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const [allLabelsVisible, setAllLabelsVisible] = useState<boolean>(true);
  const [calculatingMaterials, setCalculatingMaterials] = useState<boolean>(false);
  const [updateVisualState, setUpdateVisualStateFn] = useState<((measurements: Measurement[], labelsVisible: boolean) => void) | undefined>(undefined);

  // Toggle which measurement tool is active
  const toggleMeasurementTool = useCallback((mode: MeasurementMode) => {
    // If the same mode is selected again, turn it off
    if (mode === activeMode) {
      setActiveMode('none');
    } else {
      setActiveMode(mode);
    }
    
    // Clear any current points or editing state
    setCurrentPoints([]);
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, [activeMode]);

  // Add a point to the current measurement
  const addPoint = useCallback((point: Point) => {
    setCurrentPoints(prev => [...prev, point]);
  }, []);

  // Undo the last point
  const undoLastPoint = useCallback(() => {
    setCurrentPoints(prev => {
      if (prev.length > 0) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);

  // Clear all current points
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
  }, []);

  // Finalize the current measurement
  const finalizeMeasurement = useCallback((): Measurement | undefined => {
    // Need at least 2 points for a measurement
    if (currentPoints.length < 2) {
      return undefined;
    }
    
    // Check if we have enough points based on the measurement type
    if (activeMode === 'area' && currentPoints.length < 3) {
      return undefined;
    }
    
    let value = 0;
    let label = '';
    let name = '';
    
    // Calculate the measurement value based on the type
    if (activeMode === 'length') {
      // For length, calculate distance between first and last point
      value = calculateDistance(currentPoints[0], currentPoints[currentPoints.length - 1]);
      label = `${value.toFixed(2)}m`;
      name = `Länge ${measurements.filter(m => m.type === 'length').length + 1}`;
    } else if (activeMode === 'height') {
      // For height, calculate vertical distance
      value = calculateHeight(currentPoints[0], currentPoints[currentPoints.length - 1]);
      label = `${value.toFixed(2)}m`;
      name = `Höhe ${measurements.filter(m => m.type === 'height').length + 1}`;
    } else if (activeMode === 'area') {
      // For area, calculate the polygon area
      value = calculateArea(currentPoints);
      label = `${value.toFixed(2)}m²`;
      name = `Fläche ${measurements.filter(m => m.type === 'area').length + 1}`;
    } else if (activeMode === 'solar') {
      // For solar, calculate the polygon area
      value = calculateArea(currentPoints);
      label = `${value.toFixed(2)}m²`;
      name = `PV-Anlage ${measurements.filter(m => m.type === 'solar').length + 1}`;
    } else if (activeMode === 'ridge' || activeMode === 'eave' || activeMode === 'verge') {
      // For roof elements, calculate the length
      value = calculateDistance(currentPoints[0], currentPoints[currentPoints.length - 1]);
      label = `${value.toFixed(2)}m`;
      
      // Set name based on type
      if (activeMode === 'ridge') {
        name = `First ${measurements.filter(m => m.type === 'ridge').length + 1}`;
      } else if (activeMode === 'eave') {
        name = `Traufe ${measurements.filter(m => m.type === 'eave').length + 1}`;
      } else {
        name = `Ortgang ${measurements.filter(m => m.type === 'verge').length + 1}`;
      }
    }
    
    // Generate segments between consecutive points
    const segments = generateSegments(currentPoints);
    
    // Create the new measurement
    const newMeasurement: Measurement = {
      id: nanoid(),
      type: activeMode,
      name,
      points: [...currentPoints],
      segments,
      value,
      label,
      visible: true,
      labelVisible: true
    };
    
    // Add to measurements list
    setMeasurements(prev => [...prev, newMeasurement]);
    
    // Clear current points
    setCurrentPoints([]);
    
    return newMeasurement;
  }, [activeMode, currentPoints, measurements]);

  // Clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);

  // Delete a specific measurement
  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  // Update a measurement with new data
  const updateMeasurement = useCallback((id: string, data: Partial<Measurement>) => {
    setMeasurements(prev => 
      prev.map(m => 
        m.id === id ? { ...m, ...data } : m
      )
    );
  }, []);

  // Toggle visibility of a measurement
  const toggleMeasurementVisibility = useCallback((id: string) => {
    setMeasurements(prev => 
      prev.map(m => 
        m.id === id ? { ...m, visible: !m.visible } : m
      )
    );
  }, []);

  // Toggle visibility of a measurement's label
  const toggleLabelVisibility = useCallback((id: string) => {
    setMeasurements(prev => 
      prev.map(m => 
        m.id === id ? { ...m, labelVisible: !m.labelVisible } : m
      )
    );
  }, []);

  // Toggle visibility of all measurements
  const toggleAllMeasurementsVisibility = useCallback(() => {
    const allVisible = measurements.every(m => m.visible);
    setMeasurements(prev => 
      prev.map(m => ({ ...m, visible: !allVisible }))
    );
  }, [measurements]);

  // Toggle visibility of all labels
  const toggleAllLabelsVisibility = useCallback(() => {
    setAllLabelsVisible(prev => !prev);
    setMeasurements(prev => 
      prev.map(m => ({ ...m, labelVisible: !allLabelsVisible }))
    );
  }, [allLabelsVisible]);

  // Toggle edit mode for a measurement
  const toggleEditMode = useCallback((id: string) => {
    if (editMeasurementId === id) {
      // Turn off edit mode
      setEditMeasurementId(null);
      setEditingPointIndex(null);
    } else {
      // Turn on edit mode for this measurement
      setEditMeasurementId(id);
      setEditingPointIndex(null);
      
      // Reset current points and active mode
      setCurrentPoints([]);
      setActiveMode('none');
    }
  }, [editMeasurementId]);

  // Start editing a specific point of a measurement
  const startPointEdit = useCallback((id: string, pointIndex: number) => {
    setEditMeasurementId(id);
    setEditingPointIndex(pointIndex);
  }, []);

  // Update a point of a measurement
  const updateMeasurementPoint = useCallback((id: string, index: number, point: Point) => {
    setMeasurements(prev => 
      prev.map(m => {
        if (m.id !== id) return m;
        
        // Create a new points array with the updated point
        const newPoints = [...m.points];
        newPoints[index] = point;
        
        // Recalculate segments and value based on measurement type
        const segments = generateSegments(newPoints);
        let value = 0;
        let label = '';
        
        if (m.type === 'length' || m.type === 'ridge' || m.type === 'eave' || m.type === 'verge') {
          value = calculateDistance(newPoints[0], newPoints[newPoints.length - 1]);
          label = `${value.toFixed(2)}m`;
        } else if (m.type === 'height') {
          value = calculateHeight(newPoints[0], newPoints[newPoints.length - 1]);
          label = `${value.toFixed(2)}m`;
        } else if (m.type === 'area' || m.type === 'solar') {
          value = calculateArea(newPoints);
          label = `${value.toFixed(2)}m²`;
        }
        
        return {
          ...m,
          points: newPoints,
          segments,
          value,
          label
        };
      })
    );
  }, []);

  // Cancel editing mode
  const cancelEditing = useCallback(() => {
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, []);

  // Delete a point from a measurement
  const deletePoint = useCallback((id: string, pointIndex: number) => {
    setMeasurements(prev => 
      prev.map(m => {
        if (m.id !== id) return m;
        
        // For area measurements, need at least 3 points
        if (m.type === 'area' && m.points.length <= 3) {
          return m;
        }
        
        // For linear measurements, need at least 2 points
        if ((m.type === 'length' || m.type === 'height') && m.points.length <= 2) {
          return m;
        }
        
        // Create a new points array without the deleted point
        const newPoints = [...m.points];
        newPoints.splice(pointIndex, 1);
        
        // Recalculate segments and value
        const segments = generateSegments(newPoints);
        let value = 0;
        let label = '';
        
        if (m.type === 'length' || m.type === 'ridge' || m.type === 'eave' || m.type === 'verge') {
          value = calculateDistance(newPoints[0], newPoints[newPoints.length - 1]);
          label = `${value.toFixed(2)}m`;
        } else if (m.type === 'height') {
          value = calculateHeight(newPoints[0], newPoints[newPoints.length - 1]);
          label = `${value.toFixed(2)}m`;
        } else if (m.type === 'area' || m.type === 'solar') {
          value = calculateArea(newPoints);
          label = `${value.toFixed(2)}m²`;
        }
        
        return {
          ...m,
          points: newPoints,
          segments,
          value,
          label
        };
      })
    );
  }, []);

  // Move a measurement up in the list
  const moveMeasurementUp = useCallback((id: string) => {
    setMeasurements(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index <= 0) return prev;
      
      const result = [...prev];
      const temp = result[index - 1];
      result[index - 1] = result[index];
      result[index] = temp;
      
      return result;
    });
  }, []);

  // Move a measurement down in the list
  const moveMeasurementDown = useCallback((id: string) => {
    setMeasurements(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index === -1 || index === prev.length - 1) return prev;
      
      const result = [...prev];
      const temp = result[index + 1];
      result[index + 1] = result[index];
      result[index] = temp;
      
      return result;
    });
  }, []);

  // Update the visual state function
  const setUpdateVisualState = useCallback((fn: (measurements: Measurement[], labelsVisible: boolean) => void) => {
    setUpdateVisualStateFn(() => fn);
  }, []);

  // Context value
  const value = {
    measurements,
    currentPoints,
    activeMode,
    editMeasurementId,
    editingPointIndex,
    allLabelsVisible,
    calculatingMaterials,
    setCalculatingMaterials,
    toggleMeasurementTool,
    addPoint,
    undoLastPoint,
    clearCurrentPoints,
    finalizeMeasurement,
    setMeasurements,
    clearMeasurements,
    deleteMeasurement,
    updateMeasurement,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility,
    toggleEditMode,
    startPointEdit,
    updateMeasurementPoint,
    cancelEditing,
    deletePoint,
    moveMeasurementUp,
    moveMeasurementDown,
    updateVisualState,
    setUpdateVisualState
  };

  return (
    <MeasurementContext.Provider value={value}>
      {children}
    </MeasurementContext.Provider>
  );
};
