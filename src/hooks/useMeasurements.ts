import { useState, useCallback, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { 
  Point, 
  Measurement, 
  MeasurementMode 
} from './measurements/types';
import { 
  calculateDistance, 
  calculateHeight, 
  calculateArea, 
  formatMeasurement, 
  getNearestPointIndex 
} from './measurements/measurementUtils';
import { 
  createLengthMeasurement, 
  createHeightMeasurement, 
  createAreaMeasurement 
} from './measurements/measurementCreators';

export type { MeasurementMode, Point, Measurement };

export const useMeasurements = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('length');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [allMeasurementsVisible, setAllMeasurementsVisible] = useState<boolean>(true);
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  
  // Use a ref to track points separately from state to avoid timing issues
  const currentPointsRef = useRef<Point[]>([]);

  // Keep the ref in sync with the state
  useEffect(() => {
    currentPointsRef.current = currentPoints;
  }, [currentPoints]);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, []);

  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
    currentPointsRef.current = [];
  }, []);

  const toggleMeasurementVisibility = useCallback((id: string) => {
    setMeasurements(prev => prev.map(m => 
      m.id === id ? { ...m, visible: m.visible === false ? true : false } : m
    ));
  }, []);

  const toggleAllMeasurementsVisibility = useCallback(() => {
    setAllMeasurementsVisible(prev => !prev);
    setMeasurements(prev => prev.map(m => ({ ...m, visible: !allMeasurementsVisible })));
  }, [allMeasurementsVisible]);

  const toggleEditMode = useCallback((id: string) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => {
        // Turn off edit mode for all other measurements
        if (m.id !== id) {
          return { ...m, editMode: false };
        }
        // Toggle for the selected measurement
        return { ...m, editMode: !m.editMode };
      });
      
      // If we're turning off edit mode for the current measurement
      const measurement = prev.find(m => m.id === id);
      if (measurement?.editMode) {
        setEditMeasurementId(null);
        setEditingPointIndex(null);
      } else {
        setEditMeasurementId(id);
        setEditingPointIndex(null); // Reset point index when entering edit mode
      }
      
      return updatedMeasurements;
    });
  }, []);

  const startPointEdit = useCallback((measurementId: string, pointIndex: number) => {
    setEditMeasurementId(measurementId);
    setEditingPointIndex(pointIndex);
  }, []);

  const updateMeasurementPoint = useCallback((measurementId: string, pointIndex: number, newPoint: Point) => {
    setMeasurements(prev => {
      return prev.map(m => {
        if (m.id !== measurementId) return m;
        
        // Create a new points array with the updated point
        const newPoints = [...m.points];
        newPoints[pointIndex] = newPoint;
        
        // Recalculate the measurement value
        let newValue: number;
        
        if (m.type === 'length') {
          newValue = calculateDistance(newPoints[0], newPoints[1]);
        } else if (m.type === 'height') {
          newValue = calculateHeight(newPoints[0], newPoints[1]);
        } else if (m.type === 'area') {
          newValue = calculateArea(newPoints);
        } else {
          newValue = m.value; // Fallback
        }
        
        return {
          ...m,
          points: newPoints,
          value: newValue,
          label: formatMeasurement(newValue, m.type)
        };
      });
    });
  }, []);

  const updateMeasurement = useCallback((id: string, data: Partial<Measurement>) => {
    setMeasurements(prev => prev.map(m => 
      m.id === id ? { ...m, ...data } : m
    ));
  }, []);

  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
    // Cancel edit mode if the deleted measurement was being edited
    if (editMeasurementId === id) {
      setEditMeasurementId(null);
      setEditingPointIndex(null);
    }
  }, [editMeasurementId]);

  const deletePoint = useCallback((measurementId: string, pointIndex: number) => {
    setMeasurements(prev => prev.map(m => {
      if (m.id === measurementId) {
        // Only remove the point if there would still be enough points left
        // (2 for length/height, 3 for area)
        const minPoints = m.type === 'area' ? 3 : 2;
        if (m.points.length > minPoints) {
          const newPoints = [...m.points];
          newPoints.splice(pointIndex, 1);
          
          // Recalculate the measurement value
          let newValue = 0;
          
          if (m.type === 'length' && newPoints.length >= 2) {
            newValue = calculateDistance(newPoints[0], newPoints[1]);
          } else if (m.type === 'height' && newPoints.length >= 2) {
            newValue = calculateHeight(newPoints[0], newPoints[1]);
          } else if (m.type === 'area' && newPoints.length >= 3) {
            newValue = calculateArea(newPoints);
          }
          
          const newLabel = formatMeasurement(newValue, m.type);
          
          return {
            ...m,
            points: newPoints,
            value: newValue,
            label: newLabel
          };
        }
      }
      return m;
    }));
  }, []);

  const finalizeMeasurement = useCallback(() => {
    const points = [...currentPointsRef.current];
    
    if (points.length === 0) return;
    
    if (activeMode === 'length' && points.length >= 2) {
      const measurement = createLengthMeasurement([points[0], points[1]]);
      if (measurement) {
        setMeasurements(prev => [...prev, measurement]);
        setCurrentPoints([]);
        currentPointsRef.current = [];
      }
    } 
    else if (activeMode === 'height' && points.length >= 2) {
      const measurement = createHeightMeasurement([points[0], points[1]]);
      if (measurement) {
        setMeasurements(prev => [...prev, measurement]);
        setCurrentPoints([]);
        currentPointsRef.current = [];
      }
    }
    else if (activeMode === 'area' && points.length >= 3) {
      const measurement = createAreaMeasurement(points);
      if (measurement) {
        setMeasurements(prev => [...prev, measurement]);
        setCurrentPoints([]);
        currentPointsRef.current = [];
      }
    }
  }, [activeMode]);

  const addPoint = useCallback((point: Point) => {
    // If we're in edit mode and have a point selected, update that point
    if (editMeasurementId && editingPointIndex !== null) {
      updateMeasurementPoint(editMeasurementId, editingPointIndex, point);
      setEditingPointIndex(null); // Finish editing this point
      return;
    }
    
    // Regular point adding behavior for new measurements
    // First update the ref directly to ensure we have accurate count
    const updatedPoints = [...currentPointsRef.current, point];
    currentPointsRef.current = updatedPoints;
    
    // Then update the state
    setCurrentPoints(updatedPoints);
    
    // Immediately check if we need to finalize measurement
    const currentMode = activeMode;
    
    // Auto-finalize length and height measurements after exactly 2 points
    if ((currentMode === 'length' || currentMode === 'height') && updatedPoints.length === 2) {
      if (currentMode === 'length') {
        const measurement = createLengthMeasurement(updatedPoints);
        if (measurement) {
          setMeasurements(prev => [...prev, measurement]);
          setCurrentPoints([]);
          currentPointsRef.current = [];
        }
      } else if (currentMode === 'height') {
        const measurement = createHeightMeasurement(updatedPoints);
        if (measurement) {
          setMeasurements(prev => [...prev, measurement]);
          setCurrentPoints([]);
          currentPointsRef.current = [];
        }
      }
    }
  }, [activeMode, editMeasurementId, editingPointIndex, updateMeasurementPoint]);

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
  }, [activeMode, clearCurrentPoints]);

  const cancelEditing = useCallback(() => {
    setEditMeasurementId(null);
    setEditingPointIndex(null);
    setMeasurements(prev => prev.map(m => ({ ...m, editMode: false })));
  }, []);

  return {
    measurements,
    currentPoints,
    setCurrentPoints,
    addPoint,
    activeMode,
    setActiveMode,
    toggleMeasurementTool,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement,
    toggleMeasurementVisibility,
    toggleAllMeasurementsVisibility,
    allMeasurementsVisible,
    toggleEditMode,
    updateMeasurement,
    deleteMeasurement,
    deletePoint,
    // Editing functionality
    editMeasurementId,
    editingPointIndex,
    startPointEdit,
    updateMeasurementPoint,
    cancelEditing,
    getNearestPointIndex
  };
};
