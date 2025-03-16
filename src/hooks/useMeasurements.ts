
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
    return Math.abs(point2.y - point1.y);
  }, []);

  const calculateArea = useCallback((points: Point[]): number => {
    if (points.length < 3) return 0;
    
    // Simple implementation for triangular area using Heron's formula
    if (points.length === 3) {
      const a = calculateDistance(points[0], points[1]);
      const b = calculateDistance(points[1], points[2]);
      const c = calculateDistance(points[2], points[0]);
      const s = (a + b + c) / 2;
      return Math.sqrt(s * (s - a) * (s - b) * (s - c));
    }
    
    // For polygons with more than 3 points, use the Shoelace formula
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      // Using a simplified 2D projection on the XZ plane for area calculation
      area += points[i].x * points[j].z;
      area -= points[j].x * points[i].z;
    }
    return Math.abs(area) / 2;
  }, [calculateDistance]);

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
