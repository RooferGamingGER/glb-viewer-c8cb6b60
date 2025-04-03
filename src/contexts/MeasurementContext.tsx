
import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { 
  Point, 
  Measurement, 
  MeasurementMode,
  Segment
} from '@/types/measurements';
import { 
  calculateDistance, 
  calculateHeight, 
  calculateArea,
  generateSegments,
  findAndLinkSharedSegments as findSharedSegments
} from '@/utils/measurementCalculations';
import { formatMeasurement } from '@/constants/measurements';

interface MeasurementContextProps {
  // State
  measurements: Measurement[];
  currentPoints: Point[];
  activeMode: MeasurementMode;
  editMeasurementId: string | null;
  editingPointIndex: number | null;
  allMeasurementsVisible: boolean;
  allLabelsVisible: boolean;
  
  // Methods
  setMeasurements: (measurements: Measurement[]) => void;
  addPoint: (point: Point) => void;
  clearCurrentPoints: () => void;
  finalizeMeasurement: () => Measurement | undefined;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  toggleAllMeasurementsVisibility: () => void;
  toggleAllLabelsVisibility: () => void;
  toggleEditMode: (id: string) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  deleteMeasurement: (id: string) => void;
  deletePoint: (measurementId: string, pointIndex: number) => void;
  undoLastPoint: () => void;
  clearMeasurements: () => void;
  startPointEdit: (id: string, pointIndex: number) => void;
  cancelEditing: () => void;
  updateMeasurementPoint: (id: string, pointIndex: number, newPoint: Point) => void;
  moveMeasurementUp: (id: string) => void;
  moveMeasurementDown: (id: string) => void;
  findAndLinkSharedSegments: (measurements: Measurement[]) => Measurement[];
  updateVisualState?: (measurements: Measurement[], labelsVisible: boolean) => void;
  setUpdateVisualState: (fn: (measurements: Measurement[], labelsVisible: boolean) => void) => void;
}

export const MeasurementContext = createContext<MeasurementContextProps | null>(null);

interface MeasurementProviderProps {
  children: ReactNode;
}

export const MeasurementProvider: React.FC<MeasurementProviderProps> = ({ children }) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none');
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const [allMeasurementsVisible, setAllMeasurementsVisible] = useState<boolean>(true);
  const [allLabelsVisible, setAllLabelsVisible] = useState<boolean>(true);
  const [updateVisualStateFn, setUpdateVisualStateFn] = useState<
    ((measurements: Measurement[], labelsVisible: boolean) => void) | undefined
  >(undefined);

  // Add a point to the current measurement
  const addPoint = useCallback((point: Point) => {
    setCurrentPoints(prev => [...prev, point]);
  }, []);

  // Clear current points
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
  }, []);

  // Finalize the current measurement
  const finalizeMeasurement = useCallback(() => {
    if (currentPoints.length < 2) return undefined;

    let newMeasurement: Measurement | undefined;
    
    try {
      if (activeMode === 'length' && currentPoints.length >= 2) {
        const distance = calculateDistance(currentPoints[0], currentPoints[1]);
        newMeasurement = {
          id: nanoid(),
          type: 'length',
          points: [currentPoints[0], currentPoints[1]],
          value: distance,
          label: formatMeasurement(distance, 'length'),
          visible: true,
          labelVisible: true
        };
      } else if (activeMode === 'height' && currentPoints.length >= 2) {
        const height = calculateHeight(currentPoints[0], currentPoints[1]);
        newMeasurement = {
          id: nanoid(),
          type: 'height',
          points: [currentPoints[0], currentPoints[1]],
          value: height,
          label: formatMeasurement(height, 'height'),
          visible: true,
          labelVisible: true
        };
      } else if ((activeMode === 'area' || activeMode === 'solar' || 
                  activeMode === 'skylight' || activeMode === 'chimney' || 
                  activeMode === 'vent' || activeMode === 'hook' || 
                  activeMode === 'other' || activeMode === 'pvmodule' as unknown as MeasurementMode) && 
                  currentPoints.length >= 3) {
        const area = calculateArea(currentPoints);
        const segments = generateSegments(currentPoints);
        
        newMeasurement = {
          id: nanoid(),
          type: activeMode,
          points: [...currentPoints],
          value: area,
          segments,
          label: formatMeasurement(area, activeMode as 'area'),
          visible: true,
          labelVisible: true
        };
      }

      if (newMeasurement) {
        setMeasurements(prev => [...prev, newMeasurement as Measurement]);
        clearCurrentPoints();
      }
    } catch (error) {
      console.error('Error creating measurement:', error);
      toast.error('Fehler beim Erstellen der Messung');
    }

    return newMeasurement;
  }, [activeMode, currentPoints, clearCurrentPoints]);

  // Toggle which measurement tool is active
  const toggleMeasurementTool = useCallback((mode: MeasurementMode) => {
    if (activeMode === mode) {
      setActiveMode('none');
    } else {
      setActiveMode(mode);
    }
    clearCurrentPoints();
  }, [activeMode, clearCurrentPoints]);

  // Toggle visibility of a specific measurement
  const toggleMeasurementVisibility = useCallback((id: string) => {
    setMeasurements(prev => 
      prev.map(m => 
        m.id === id 
          ? { ...m, visible: m.visible === false ? true : false } 
          : m
      )
    );
  }, []);

  // Toggle label visibility of a specific measurement
  const toggleLabelVisibility = useCallback((id: string) => {
    setMeasurements(prev => 
      prev.map(m => 
        m.id === id 
          ? { ...m, labelVisible: m.labelVisible === false ? true : false } 
          : m
      )
    );
  }, []);

  // Toggle visibility of all measurements
  const toggleAllMeasurementsVisibility = useCallback(() => {
    setAllMeasurementsVisible(prev => !prev);
    setMeasurements(prev => 
      prev.map(m => ({ ...m, visible: !allMeasurementsVisible }))
    );
  }, [allMeasurementsVisible]);

  // Toggle visibility of all labels
  const toggleAllLabelsVisibility = useCallback(() => {
    setAllLabelsVisible(prev => !prev);
    return !allLabelsVisible;
  }, [allLabelsVisible]);

  // Toggle edit mode for a measurement
  const toggleEditMode = useCallback((id: string) => {
    setMeasurements(prev => 
      prev.map(m => 
        m.id === id 
          ? { ...m, editMode: m.editMode !== true } 
          : m
      )
    );
  }, []);

  // Update a measurement with new data
  const updateMeasurement = useCallback((id: string, data: Partial<Measurement>) => {
    setMeasurements(prev => 
      prev.map(m => 
        m.id === id 
          ? { ...m, ...data } 
          : m
      )
    );
  }, []);

  // Delete a measurement
  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  // Delete a point from a measurement
  const deletePoint = useCallback((measurementId: string, pointIndex: number) => {
    setMeasurements(prev => 
      prev.map(m => {
        if (m.id !== measurementId) return m;
        
        const newPoints = [...m.points];
        newPoints.splice(pointIndex, 1);
        
        if (newPoints.length < 2) {
          return m;
        }
        
        if (m.type === 'length' || m.type === 'height') {
          return m;
        } else {
          const area = calculateArea(newPoints);
          const segments = generateSegments(newPoints);
          
          return {
            ...m,
            points: newPoints,
            value: area,
            segments,
            label: formatMeasurement(area, m.type as 'area')
          };
        }
      })
    );
  }, []);

  // Remove the last point from the current measurement
  const undoLastPoint = useCallback(() => {
    setCurrentPoints(prev => {
      if (prev.length === 0) return prev;
      return prev.slice(0, prev.length - 1);
    });
  }, []);

  // Clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    clearCurrentPoints();
  }, [clearCurrentPoints]);

  // Start editing a specific point
  const startPointEdit = useCallback((id: string, pointIndex: number) => {
    setEditMeasurementId(id);
    setEditingPointIndex(pointIndex);
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, []);

  // Update a point in a measurement
  const updateMeasurementPoint = useCallback((id: string, pointIndex: number, newPoint: Point) => {
    setMeasurements(prev => {
      return prev.map(m => {
        if (m.id !== id) return m;
        
        const newPoints = [...m.points];
        newPoints[pointIndex] = newPoint;
        
        if (m.type === 'length') {
          const distance = calculateDistance(newPoints[0], newPoints[1]);
          return {
            ...m,
            points: newPoints,
            value: distance,
            label: formatMeasurement(distance, 'length')
          };
        } else if (m.type === 'height') {
          const height = calculateHeight(newPoints[0], newPoints[1]);
          return {
            ...m,
            points: newPoints,
            value: height,
            label: formatMeasurement(height, 'height')
          };
        } else if (m.type === 'area' || m.type === 'solar' || 
                   m.type === 'skylight' || m.type === 'chimney' || 
                   m.type === 'vent' || m.type === 'hook' || 
                   m.type === 'other' || m.type === 'pvmodule' as unknown as MeasurementMode) {
          const area = calculateArea(newPoints);
          const segments = generateSegments(newPoints);
          
          return {
            ...m,
            points: newPoints,
            value: area,
            segments,
            label: formatMeasurement(area, m.type as 'area')
          };
        }
        
        return m;
      });
    });
  }, []);

  // Move a measurement up in the list
  const moveMeasurementUp = useCallback((id: string) => {
    setMeasurements(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index <= 0) return prev;
      
      const newMeasurements = [...prev];
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[index - 1];
      newMeasurements[index - 1] = temp;
      
      return newMeasurements;
    });
  }, []);

  // Move a measurement down in the list
  const moveMeasurementDown = useCallback((id: string) => {
    setMeasurements(prev => {
      const index = prev.findIndex(m => m.id === id);
      if (index < 0 || index >= prev.length - 1) return prev;
      
      const newMeasurements = [...prev];
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[index + 1];
      newMeasurements[index + 1] = temp;
      
      return newMeasurements;
    });
  }, []);

  // Find and link shared segments between measurements
  const findAndLinkSharedSegments = useCallback((measurementsToProcess: Measurement[]) => {
    return findSharedSegments(measurementsToProcess);
  }, []);

  // Set the update visual state function
  const setUpdateVisualState = useCallback((fn: (measurements: Measurement[], labelsVisible: boolean) => void) => {
    setUpdateVisualStateFn(() => fn);
  }, []);

  // Update measurements when allLabelsVisible changes
  useEffect(() => {
    if (updateVisualStateFn) {
      updateVisualStateFn(measurements, allLabelsVisible);
    }
  }, [allLabelsVisible, measurements, updateVisualStateFn]);

  return (
    <MeasurementContext.Provider
      value={{
        measurements,
        currentPoints,
        activeMode,
        editMeasurementId,
        editingPointIndex,
        allMeasurementsVisible,
        allLabelsVisible,
        setMeasurements,
        addPoint,
        clearCurrentPoints,
        finalizeMeasurement,
        toggleMeasurementTool,
        toggleMeasurementVisibility,
        toggleLabelVisibility,
        toggleAllMeasurementsVisibility,
        toggleAllLabelsVisibility,
        toggleEditMode,
        updateMeasurement,
        deleteMeasurement,
        deletePoint,
        undoLastPoint,
        clearMeasurements,
        startPointEdit,
        cancelEditing,
        updateMeasurementPoint,
        moveMeasurementUp,
        moveMeasurementDown,
        findAndLinkSharedSegments,
        updateVisualState: updateVisualStateFn,
        setUpdateVisualState
      }}
    >
      {children}
    </MeasurementContext.Provider>
  );
};
