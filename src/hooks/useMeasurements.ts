import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { nanoid } from 'nanoid';

export type MeasurementMode = 'length' | 'height' | 'area' | 'none';

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface MeasurementPoint {
  position: THREE.Vector3;
  worldPosition: THREE.Vector3;
}

export interface Measurement {
  id: string;
  type: MeasurementMode;
  points: Point[];
  value: number;
  label?: string;
  visible?: boolean;
  editMode?: boolean;
  unit?: string;
  description?: string;
}

// Format measurement value based on measurement type
const formatMeasurement = (value: number, type: MeasurementMode): string => {
  if (type === 'area') {
    // Format area measurements
    if (value < 0.01) {
      return `${(value * 10000).toFixed(2)} cm²`;
    }
    return `${value.toFixed(2)} m²`;
  }
  
  // Format length or height measurements
  return `${value.toFixed(2)} m`;
};

export const useMeasurements = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('length');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [allMeasurementsVisible, setAllMeasurementsVisible] = useState<boolean>(true);
  
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
  }, []);

  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
    currentPointsRef.current = [];
  }, []);

  const calculateDistance = useCallback((point1: Point, point2: Point): number => {
    // Calculate true 3D distance between points using Euclidean distance formula
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) +
      Math.pow(point2.y - point1.y, 2) +
      Math.pow(point2.z - point1.z, 2)
    );
  }, []);

  const calculateHeight = useCallback((point1: Point, point2: Point): number => {
    // Height is strictly the absolute difference along the Y axis
    return Math.abs(point2.y - point1.y);
  }, []);

  const calculateArea = useCallback((points: Point[]): number => {
    if (points.length < 3) return 0;
    
    // For polygons, triangulate and sum the areas of the triangles
    const triangleCount = points.length - 2;
    let totalArea = 0;
    
    // Project points to best-fit plane for more accurate area calculation
    // First, find the normal of the polygon by cross product of two edges
    const edge1 = new THREE.Vector3(
      points[1].x - points[0].x,
      points[1].y - points[0].y,
      points[1].z - points[0].z
    );
    
    const edge2 = new THREE.Vector3(
      points[2].x - points[0].x,
      points[2].y - points[0].y,
      points[2].z - points[0].z
    );
    
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
    
    // Simple triangulation using the first point as a pivot
    for (let i = 0; i < triangleCount; i++) {
      const p0 = points[0];
      const p1 = points[i + 1];
      const p2 = points[i + 2];
      
      // Create 3D vectors
      const v0 = new THREE.Vector3(p0.x, p0.y, p0.z);
      const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
      const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
      
      // Calculate sides of the triangle
      const a = v0.distanceTo(v1);
      const b = v1.distanceTo(v2);
      const c = v2.distanceTo(v0);
      
      // Calculate semi-perimeter
      const s = (a + b + c) / 2;
      
      // Calculate triangle area using Heron's formula
      const triangleArea = Math.sqrt(s * (s - a) * (s - b) * (s - c));
      
      totalArea += triangleArea;
    }
    
    return totalArea;
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
    setMeasurements(prev => prev.map(m => 
      m.id === id ? { ...m, editMode: !m.editMode } : m
    ));
  }, []);

  const updateMeasurement = useCallback((id: string, data: Partial<Measurement>) => {
    setMeasurements(prev => prev.map(m => 
      m.id === id ? { ...m, ...data } : m
    ));
  }, []);

  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

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
  }, [calculateDistance, calculateHeight, calculateArea]);

  // Dedicated function to create a Length measurement
  const createLengthMeasurement = useCallback((points: Point[]) => {
    if (points.length !== 2) return;
    
    const value = calculateDistance(points[0], points[1]);
    const label = formatMeasurement(value, 'length');
    
    setMeasurements(prev => [
      ...prev,
      {
        id: nanoid(),
        type: 'length',
        points: [...points],
        value,
        label,
        visible: true,
        unit: 'm',
        description: ''
      }
    ]);
    
    // Clear points after creating the measurement
    setCurrentPoints([]);
    currentPointsRef.current = [];
  }, [calculateDistance]);

  // Dedicated function to create a Height measurement
  const createHeightMeasurement = useCallback((points: Point[]) => {
    if (points.length !== 2) return;
    
    const value = calculateHeight(points[0], points[1]);
    const label = formatMeasurement(value, 'height');
    
    setMeasurements(prev => [
      ...prev,
      {
        id: nanoid(),
        type: 'height',
        points: [...points],
        value,
        label,
        visible: true,
        unit: 'm',
        description: ''
      }
    ]);
    
    // Clear points after creating the measurement
    setCurrentPoints([]);
    currentPointsRef.current = [];
  }, [calculateHeight]);

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
          description: ''
        }
      ]);
      setCurrentPoints([]);
      currentPointsRef.current = [];
    }
  }, [activeMode, calculateArea, createLengthMeasurement, createHeightMeasurement]);

  const addPoint = useCallback((point: Point) => {
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
      } else if (currentMode === 'height') {
        createHeightMeasurement(updatedPoints);
      }
    }
  }, [activeMode, createLengthMeasurement, createHeightMeasurement]);

  // New function to toggle measurement tool
  const toggleMeasurementTool = useCallback((mode: MeasurementMode) => {
    if (activeMode === mode) {
      // If the same tool is clicked again, disable it by setting mode to 'none'
      setActiveMode('none');
      clearCurrentPoints();
    } else {
      // If a different tool is clicked, activate it
      setActiveMode(mode);
      clearCurrentPoints();
    }
  }, [activeMode, clearCurrentPoints]);

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
    deletePoint
  };
};
