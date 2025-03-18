import { useState, useCallback, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { 
  MeasurementMode, 
  Point, 
  Measurement 
} from '@/types/measurements';
import { 
  calculateDistance, 
  calculateHeight, 
  calculateArea,
  generateSegments,
  calculateInclination
} from '@/utils/measurementCalculations';
import { formatMeasurement, MIN_INCLINATION_THRESHOLD } from '@/constants/measurements';
import * as THREE from 'three';

/**
 * Core measurement functionality hook
 */
export const useMeasurementCore = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none');
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

  // Listen for custom events to handle adding points to existing area measurements
  useEffect(() => {
    const handleAreaPointAdded = (event: CustomEvent) => {
      const { measurementId, updatedMeasurement } = event.detail;
      
      setMeasurements(prev => prev.map(m => {
        if (m.id === measurementId) {
          // Recalculate area based on the new points
          const newValue = calculateArea(updatedMeasurement.points);
          const segments = generateSegments(updatedMeasurement.points);
          
          return {
            ...updatedMeasurement,
            value: newValue,
            label: formatMeasurement(newValue, 'area'),
            segments
          };
        }
        return m;
      }));
    };
    
    // Add event listener for the custom event
    document.addEventListener('areaPointAdded', handleAreaPointAdded as EventListener);
    
    return () => {
      document.removeEventListener('areaPointAdded', handleAreaPointAdded as EventListener);
    };
  }, []);

  // Create a length measurement from two points
  const createLengthMeasurement = useCallback((points: Point[]) => {
    if (points.length < 2) return;
    
    const p1 = points[0];
    const p2 = points[1];
    
    const distance = calculateDistance(p1, p2);
    const label = formatMeasurement(distance, 'length');
    
    // Calculate inclination for length measurements
    const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
    const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
    const calculatedInclination = calculateInclination(v1, v2);
    
    // Only set inclination if it's above the threshold
    const inclination = Math.abs(calculatedInclination) >= MIN_INCLINATION_THRESHOLD 
      ? calculatedInclination 
      : undefined;
    
    setMeasurements(prev => [
      ...prev,
      {
        id: nanoid(),
        type: 'length',
        points: [p1, p2],
        value: distance,
        label,
        visible: true,
        unit: 'm',
        description: '',
        inclination
      }
    ]);
    
    // Clear current points after creating the measurement
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    // Reset to 'none' mode after creating a length measurement
    setActiveMode('none');
  }, []);

  // Create a height measurement from two points
  const createHeightMeasurement = useCallback((points: Point[]) => {
    if (points.length < 2) return;
    
    const p1 = points[0];
    const p2 = points[1];
    
    const height = calculateHeight(p1, p2);
    const label = formatMeasurement(height, 'height');
    
    setMeasurements(prev => [
      ...prev,
      {
        id: nanoid(),
        type: 'height',
        points: [p1, p2],
        value: height,
        label,
        visible: true,
        unit: 'm',
        description: ''
      }
    ]);
    
    // Clear current points after creating the measurement
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    // Reset to 'none' mode after creating a height measurement
    setActiveMode('none');
  }, []);

  // Finalize the current measurement (create it based on the points and type)
  const finalizeMeasurement = useCallback(() => {
    const points = [...currentPointsRef.current];
    
    if (points.length === 0) return;
    
    if (activeMode === 'length' && points.length >= 2) {
      createLengthMeasurement([points[0], points[1]]);
    } 
    else if (activeMode === 'height' && points.length >= 2) {
      createHeightMeasurement([points[0], points[1]]);
    }
    else if (activeMode === 'area' && points.length >= 3) {
      const value = calculateArea(points);
      const label = formatMeasurement(value, 'area');
      const segments = generateSegments(points);
      
      setMeasurements(prev => [
        ...prev,
        {
          id: nanoid(),
          type: 'area',
          points: [...points],
          value,
          label,
          visible: true,
          unit: 'm²',
          description: '',
          segments
          // Keine Neigung für Flächenmessungen
        }
      ]);
      setCurrentPoints([]);
      currentPointsRef.current = [];
    }
  }, [activeMode, calculateArea, createLengthMeasurement, createHeightMeasurement]);

  // Add a point to the current measurement
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
        createLengthMeasurement(updatedPoints);
        toast.success('Längenmessung abgeschlossen - Messwerkzeug deaktiviert');
      } else if (currentMode === 'height') {
        createHeightMeasurement(updatedPoints);
        toast.success('Höhenmessung abgeschlossen - Messwerkzeug deaktiviert');
      }
    }
  }, [activeMode, editMeasurementId, editingPointIndex, createLengthMeasurement, createHeightMeasurement]);

  // Update a point in an existing measurement
  const updateMeasurementPoint = useCallback((measurementId: string, pointIndex: number, newPoint: Point) => {
    setMeasurements(prev => {
      return prev.map(m => {
        if (m.id !== measurementId) return m;
        
        // Create a new points array with the updated point
        const newPoints = [...m.points];
        newPoints[pointIndex] = newPoint;
        
        // Recalculate the measurement value
        let newValue: number;
        let newInclination: number | undefined;
        
        if (m.type === 'length') {
          newValue = calculateDistance(newPoints[0], newPoints[1]);
          
          // Recalculate inclination for length measurements
          const p1 = new THREE.Vector3(newPoints[0].x, newPoints[0].y, newPoints[0].z);
          const p2 = new THREE.Vector3(newPoints[1].x, newPoints[1].y, newPoints[1].z);
          const calculatedInclination = calculateInclination(p1, p2);
          
          // Only set inclination if it's above the threshold
          newInclination = Math.abs(calculatedInclination) >= MIN_INCLINATION_THRESHOLD ? calculatedInclination : undefined;
          
        } else if (m.type === 'height') {
          newValue = calculateHeight(newPoints[0], newPoints[1]);
        } else if (m.type === 'area') {
          newValue = calculateArea(newPoints);
          // Update segments for area measurements
          const newSegments = generateSegments(newPoints);
          
          return {
            ...m,
            points: newPoints,
            value: newValue,
            label: formatMeasurement(newValue, m.type),
            segments: newSegments
          };
        } else {
          newValue = m.value; // Fallback
        }
        
        return {
          ...m,
          points: newPoints,
          value: newValue,
          label: formatMeasurement(newValue, m.type),
          inclination: newInclination
        };
      });
    });
  }, []);

  // Undo the last point of the current measurement
  const undoLastPoint = useCallback((): boolean => {
    if (currentPoints.length === 0) {
      return false;
    }
    
    const newPoints = [...currentPoints];
    newPoints.pop();
    setCurrentPoints(newPoints);
    currentPointsRef.current = newPoints;
    return true;
  }, [currentPoints]);
  
  // Clear all current measurement points
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
    currentPointsRef.current = [];
  }, []);

  // Clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, []);

  return {
    measurements,
    setMeasurements,
    currentPoints,
    setCurrentPoints,
    currentPointsRef,
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
    undoLastPoint,
    createLengthMeasurement,
    createHeightMeasurement
  };
};
