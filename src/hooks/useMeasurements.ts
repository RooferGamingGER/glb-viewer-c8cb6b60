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

export interface Segment {
  id: string;
  points: [Point, Point];
  length: number;
  label?: string;
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
  segments?: Segment[];
  inclination?: number; // Add inclination property
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
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none'); // Default to 'none' instead of 'length'
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

  const calculateSegmentLength = useCallback((point1: Point, point2: Point): number => {
    return Math.sqrt(
      Math.pow(point2.x - point1.x, 2) +
      Math.pow(point2.y - point1.y, 2) +
      Math.pow(point2.z - point1.z, 2)
    );
  }, []);

  const generateSegments = useCallback((points: Point[]): Segment[] => {
    if (points.length < 3) return [];
    
    const segments: Segment[] = [];
    
    // Create a segment for each pair of consecutive points
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length]; // Connect back to first point
      
      const length = calculateSegmentLength(p1, p2);
      const label = `${length.toFixed(2)} m`;
      
      segments.push({
        id: nanoid(),
        points: [p1, p2],
        length,
        label
      });
    }
    
    return segments;
  }, [calculateSegmentLength]);

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
        let newInclination: number | undefined;
        
        if (m.type === 'length') {
          newValue = calculateDistance(newPoints[0], newPoints[1]);
          
          // Recalculate inclination for length measurements with positive value
          const p1 = new THREE.Vector3(newPoints[0].x, newPoints[0].y, newPoints[0].z);
          const p2 = new THREE.Vector3(newPoints[1].x, newPoints[1].y, newPoints[1].z);
          
          // Calculate inclination and ensure it's positive
          const deltaY = p2.y - p1.y;
          const horizontalDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
          newInclination = Math.abs(Math.atan2(deltaY, horizontalDistance) * (180 / Math.PI));
        } else if (m.type === 'height') {
          newValue = calculateHeight(newPoints[0], newPoints[1]);
        } else if (m.type === 'area') {
          newValue = calculateArea(newPoints);
          // Update segments for area measurements
          m.segments = generateSegments(newPoints);
        } else {
          newValue = m.value; // Fallback
        }
        
        return {
          ...m,
          points: newPoints,
          value: newValue,
          label: formatMeasurement(newValue, m.type),
          inclination: newInclination !== undefined ? newInclination : m.inclination
        };
      });
    });
  }, [calculateDistance, calculateHeight, calculateArea, generateSegments]);

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
  }, [calculateDistance, calculateHeight, calculateArea]);

  // Calculate inclination - ensure it's always positive
  const calculateInclination = useCallback((p1: THREE.Vector3, p2: THREE.Vector3): number => {
    const deltaY = p2.y - p1.y;
    const horizontalDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
    
    // Calculate inclination in radians
    const inclinationRad = Math.atan2(deltaY, horizontalDistance);
    
    // Convert radians to degrees and ensure positive value
    return Math.abs(inclinationRad * (180 / Math.PI));
  }, []);

  const createLengthMeasurement = useCallback((points: Point[]) => {
    if (points.length !== 2) return;
    
    const value = calculateDistance(points[0], points[1]);
    const label = formatMeasurement(value, 'length');
    
    // Calculate inclination for length measurements (ensure positive)
    const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
    const p2 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
    const inclination = Math.abs(calculateInclination(p1, p2));
    
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
        description: '',
        inclination // Store inclination (always positive)
      }
    ]);
    
    // Clear points after creating the measurement
    setCurrentPoints([]);
    currentPointsRef.current = [];
  }, [calculateDistance, calculateInclination]);

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
  }, [activeMode, calculateArea, createLengthMeasurement, createHeightMeasurement, generateSegments]);

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
      } else if (currentMode === 'height') {
        createHeightMeasurement(updatedPoints);
      }
    }
  }, [activeMode, createLengthMeasurement, createHeightMeasurement, editMeasurementId, editingPointIndex, updateMeasurementPoint]);

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

  const getNearestPointIndex = useCallback((measurement: Measurement, position: Point): number => {
    // Find the index of the closest point in the measurement
    let nearestIndex = 0;
    let minDistance = Number.MAX_VALUE;
    
    measurement.points.forEach((point, index) => {
      const distance = Math.sqrt(
        Math.pow(position.x - point.x, 2) +
        Math.pow(position.y - point.y, 2) +
        Math.pow(position.z - point.z, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });
    
    return nearestIndex;
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
    undoLastPoint,
    // New editing functionality
    editMeasurementId,
    editingPointIndex,
    startPointEdit,
    updateMeasurementPoint,
    cancelEditing,
    getNearestPointIndex,
    // Add segment calculation method for external use
    calculateSegmentLength
  };
};

