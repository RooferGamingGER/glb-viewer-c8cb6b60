
import { nanoid } from 'nanoid';
import { Point, Measurement, MeasurementMode } from './types';
import { calculateDistance, calculateHeight, calculateArea, formatMeasurement } from './measurementUtils';

export const createLengthMeasurement = (points: Point[]): Measurement | null => {
  if (points.length !== 2) return null;
  
  const value = calculateDistance(points[0], points[1]);
  const label = formatMeasurement(value, 'length');
  
  return {
    id: nanoid(),
    type: 'length',
    points: [...points],
    value,
    label,
    visible: true,
    unit: 'm',
    description: ''
  };
};

export const createHeightMeasurement = (points: Point[]): Measurement | null => {
  if (points.length !== 2) return null;
  
  const value = calculateHeight(points[0], points[1]);
  const label = formatMeasurement(value, 'height');
  
  return {
    id: nanoid(),
    type: 'height',
    points: [...points],
    value,
    label,
    visible: true,
    unit: 'm',
    description: ''
  };
};

export const createAreaMeasurement = (points: Point[]): Measurement | null => {
  if (points.length < 3) return null;
  
  const value = calculateArea(points);
  const label = formatMeasurement(value, 'area');
  
  return {
    id: nanoid(),
    type: 'area',
    points: [...points],
    value,
    label,
    visible: true,
    unit: 'm²',
    description: ''
  };
};
