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
  
  const currentPointsRef = useRef<Point[]>([]);

  useEffect(() => {
    currentPointsRef.current = currentPoints;
  }, [currentPoints]);

  useEffect(() => {
    const handleAreaPointAdded = (event: CustomEvent) => {
      const { measurementId, updatedMeasurement } = event.detail;
      
      setMeasurements(prev => prev.map(m => {
        if (m.id === measurementId) {
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
    
    document.addEventListener('areaPointAdded', handleAreaPointAdded as EventListener);
    
    return () => {
      document.removeEventListener('areaPointAdded', handleAreaPointAdded as EventListener);
    };
  }, []);

  const createLengthMeasurement = useCallback((points: Point[]) => {
    if (points.length < 2) return;
    
    const p1 = points[0];
    const p2 = points[1];
    
    const distance = calculateDistance(p1, p2);
    const label = formatMeasurement(distance, 'length');
    
    const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
    const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
    const calculatedInclination = calculateInclination(v1, v2);
    
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
    
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    setActiveMode('none');
  }, []);

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
    
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    setActiveMode('none');
  }, []);

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
        }
      ]);
      setCurrentPoints([]);
      currentPointsRef.current = [];
    }
  }, [activeMode, createLengthMeasurement, createHeightMeasurement]);

  const addPoint = useCallback((point: Point) => {
    if (editMeasurementId && editingPointIndex !== null) {
      updateMeasurementPoint(editMeasurementId, editingPointIndex, point);
      setEditingPointIndex(null);
      return;
    }
    
    const updatedPoints = [...currentPointsRef.current, point];
    currentPointsRef.current = updatedPoints;
    
    setCurrentPoints(updatedPoints);
    
    const currentMode = activeMode;
    
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

  const updateMeasurementPoint = useCallback((measurementId: string, pointIndex: number, newPoint: Point) => {
    setMeasurements(prev => {
      return prev.map(m => {
        if (m.id !== measurementId) return m;
        
        const newPoints = [...m.points];
        newPoints[pointIndex] = newPoint;
        
        let newValue: number;
        let newInclination: number | undefined;
        
        if (m.type === 'length') {
          newValue = calculateDistance(newPoints[0], newPoints[1]);
          
          const p1 = new THREE.Vector3(newPoints[0].x, newPoints[0].y, newPoints[0].z);
          const p2 = new THREE.Vector3(newPoints[1].x, newPoints[1].y, newPoints[1].z);
          const calculatedInclination = calculateInclination(p1, p2);
          
          newInclination = Math.abs(calculatedInclination) >= MIN_INCLINATION_THRESHOLD ? calculatedInclination : undefined;
          
        } else if (m.type === 'height') {
          newValue = calculateHeight(newPoints[0], newPoints[1]);
        } else if (m.type === 'area') {
          newValue = calculateArea(newPoints);
          const newSegments = generateSegments(newPoints);
          
          return {
            ...m,
            points: newPoints,
            value: newValue,
            label: formatMeasurement(newValue, m.type),
            segments: newSegments
          };
        } else {
          newValue = m.value;
        }
        
        return {
          ...m,
          points: newPoints,
          value: newValue,
          label: formatMeasurement(newValue, m.type as 'length' | 'height' | 'area'),
          inclination: newInclination
        };
      });
    });
  }, []);

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
  
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
    currentPointsRef.current = [];
  }, []);

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
