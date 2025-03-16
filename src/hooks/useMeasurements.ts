
import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { nanoid } from 'nanoid';

export type MeasurementMode = 'length' | 'height' | 'area';

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Measurement {
  id: string;
  type: MeasurementMode;
  points: Point[];
  value: number;
  label?: string;
}

export const useMeasurements = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('length');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setCurrentPoints([]);
  }, []);

  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
  }, []);

  const calculateDistance = useCallback((point1: Point, point2: Point): number => {
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

  const finalizeMeasurement = useCallback(() => {
    if (currentPoints.length === 0) return;
    
    let value = 0;
    let label = '';
    
    if (activeMode === 'length' && currentPoints.length >= 2) {
      value = calculateDistance(currentPoints[0], currentPoints[1]);
      label = `${value.toFixed(2)} Einh`;
      
      setMeasurements(prev => [
        ...prev,
        {
          id: nanoid(),
          type: 'length',
          points: [currentPoints[0], currentPoints[1]],
          value,
          label
        }
      ]);
      setCurrentPoints([]);
    } 
    else if (activeMode === 'height' && currentPoints.length >= 2) {
      value = calculateHeight(currentPoints[0], currentPoints[1]);
      label = `${value.toFixed(2)} Einh`;
      
      setMeasurements(prev => [
        ...prev,
        {
          id: nanoid(),
          type: 'height',
          points: [currentPoints[0], currentPoints[1]],
          value,
          label
        }
      ]);
      setCurrentPoints([]);
    }
    else if (activeMode === 'area' && currentPoints.length >= 3) {
      value = calculateArea(currentPoints);
      label = `${value.toFixed(2)} Einh²`;
      
      setMeasurements(prev => [
        ...prev,
        {
          id: nanoid(),
          type: 'area',
          points: [...currentPoints],
          value,
          label
        }
      ]);
      setCurrentPoints([]);
    }
  }, [activeMode, currentPoints, calculateDistance, calculateHeight, calculateArea]);

  return {
    measurements,
    currentPoints,
    setCurrentPoints,
    activeMode,
    setActiveMode,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement
  };
};
