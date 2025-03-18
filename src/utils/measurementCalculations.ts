
import * as THREE from 'three';
import { nanoid } from 'nanoid';
import { Point, Segment } from '@/types/measurements';
import { MIN_INCLINATION_THRESHOLD } from '@/constants/measurements';
import { earClip, projectPointsToPlane } from './triangulation';

/**
 * Calculate 3D distance between two points
 */
export const calculateDistance = (point1: Point, point2: Point): number => {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) +
    Math.pow(point2.y - point1.y, 2) +
    Math.pow(point2.z - point1.z, 2)
  );
};

/**
 * Calculate height (Y-axis difference) between two points
 */
export const calculateHeight = (point1: Point, point2: Point): number => {
  return Math.abs(point2.y - point1.y);
};

/**
 * Calculate area of polygon defined by points using 3D triangulation
 * Based on approach used in Potree for accurate 3D surface area measurement
 */
export const calculateArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  // Projektion auf die am besten passende Ebene durchführen
  const { projectedPoints, planeNormal } = projectPointsToPlane(points);
  
  // Ear-Clipping für robuste Triangulation verwenden
  const triangles = earClip(projectedPoints);
  
  let totalArea = 0;
  
  // Fläche berechnen mit der Kreuzprodukt-Methode (wie in Potree)
  // Diese Methode ist genauer als die Heronsche Formel für 3D-Flächen
  for (const triangle of triangles) {
    const p0 = new THREE.Vector3(points[triangle[0]].x, points[triangle[0]].y, points[triangle[0]].z);
    const p1 = new THREE.Vector3(points[triangle[1]].x, points[triangle[1]].y, points[triangle[1]].z);
    const p2 = new THREE.Vector3(points[triangle[2]].x, points[triangle[2]].y, points[triangle[2]].z);
    
    // Vektoren zwischen den Punkten berechnen
    const v1 = new THREE.Vector3().subVectors(p1, p0);
    const v2 = new THREE.Vector3().subVectors(p2, p0);
    
    // Kreuzprodukt der Vektoren berechnen
    const crossProduct = new THREE.Vector3().crossVectors(v1, v2);
    
    // Die Länge des Kreuzprodukts ist doppelt so groß wie die Fläche
    const triangleArea = crossProduct.length() * 0.5;
    
    totalArea += triangleArea;
  }
  
  return totalArea;
};

/**
 * Calculate length of a segment between two points
 */
export const calculateSegmentLength = (point1: Point, point2: Point): number => {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) +
    Math.pow(point2.y - point1.y, 2) +
    Math.pow(point2.z - point1.z, 2)
  );
};

/**
 * Calculate inclination in degrees between two points
 */
export const calculateInclination = (p1: THREE.Vector3, p2: THREE.Vector3): number => {
  const deltaY = p2.y - p1.y;
  const horizontalDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
  
  // Calculate inclination in radians
  const inclinationRad = Math.atan2(deltaY, horizontalDistance);
  
  // Convert radians to degrees
  return inclinationRad * (180 / Math.PI);
};

/**
 * Calculate average inclination from all segments
 */
export const calculateAverageInclination = (segments: Segment[]): number | undefined => {
  if (!segments || segments.length === 0) return undefined;
  
  let totalInclination = 0;
  let segmentsWithSignificantInclination = 0;
  
  for (const segment of segments) {
    const p1 = new THREE.Vector3(segment.points[0].x, segment.points[0].y, segment.points[0].z);
    const p2 = new THREE.Vector3(segment.points[1].x, segment.points[1].y, segment.points[1].z);
    
    // Skip horizontal segments (no inclination)
    if (Math.abs(p1.y - p2.y) < 0.001) continue;
    
    const inclination = calculateInclination(p1, p2);
    
    // Only consider inclinations above the minimum threshold
    if (Math.abs(inclination) >= MIN_INCLINATION_THRESHOLD) {
      totalInclination += Math.abs(inclination);
      segmentsWithSignificantInclination++;
    }
  }
  
  // Only return if we have segments with significant inclination
  if (segmentsWithSignificantInclination > 0) {
    return totalInclination / segmentsWithSignificantInclination;
  }
  
  return undefined;
};

/**
 * Generate segments from an array of points
 */
export const generateSegments = (points: Point[]): Segment[] => {
  if (points.length < 3) return [];
  
  const segments: Segment[] = [];
  
  // Create a segment for each pair of consecutive points
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length]; // Connect back to first point
    
    const length = calculateSegmentLength(p1, p2);
    const label = `${length.toFixed(2)} m`;
    
    // Calculate inclination for each segment
    const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
    const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
    const inclination = calculateInclination(v1, v2);
    
    // For area measurements, don't include inclination in segment label
    segments.push({
      id: nanoid(),
      points: [p1, p2],
      length,
      label
    });
  }
  
  return segments;
};

/**
 * Get the nearest point index in a measurement
 */
export const getNearestPointIndex = (measurement: any, position: Point): number => {
  // Find the index of the closest point in the measurement
  let nearestIndex = 0;
  let minDistance = Number.MAX_VALUE;
  
  measurement.points.forEach((point: Point, index: number) => {
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
};

/**
 * Validate a polygon to check if it's valid for area calculation
 */
export const validatePolygon = (points: Point[]): { 
  valid: boolean; 
  message?: string;
} => {
  if (points.length < 3) {
    return { valid: false, message: 'Mindestens 3 Punkte werden benötigt.' };
  }
  
  // Prüfen, ob alle Punkte koplanar (auf einer Ebene) sind
  if (points.length > 3) {
    const { projectedPoints } = projectPointsToPlane(points);
    
    // Vergleiche die Originalpunkte mit den projizierten Punkten
    let maxDeviation = 0;
    for (let i = 0; i < points.length; i++) {
      const deviation = calculateDistance(points[i], projectedPoints[i]);
      maxDeviation = Math.max(maxDeviation, deviation);
    }
    
    // Wenn die maximale Abweichung zu groß ist, ist das Polygon nicht ausreichend planar
    if (maxDeviation > 0.5) {  // 0.5 Meter Toleranz
      return { 
        valid: true,  // Immer noch gültig, aber mit Warnung
        message: 'Warnung: Die Punkte liegen nicht auf einer Ebene. Die Flächenberechnung könnte ungenau sein.' 
      };
    }
  }
  
  return { valid: true };
};

/**
 * Calculate diameter from two opposite points of a circle
 */
export const calculateDiameter = (point1: Point, point2: Point): number => {
  return calculateDistance(point1, point2);
};

/**
 * Calculate rectangular dimensions (width and length) from 4 points
 * For skylights and chimney cutouts
 */
export const calculateQuadrilateralDimensions = (points: Point[]): { 
  width: number; 
  length: number; 
  area: number;
  perimeter: number;
} => {
  if (points.length < 4) {
    return { width: 0, length: 0, area: 0, perimeter: 0 };
  }

  // Calculate perimeter
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const nextIdx = (i + 1) % points.length;
    perimeter += calculateDistance(points[i], points[nextIdx]);
  }
  
  // Calculate area using the polygon area formula
  const area = calculateArea(points);
  
  // Use bounding box for width and length approximation
  const boundingBox = calculateBoundingBox(points);
  const width = boundingBox.max.x - boundingBox.min.x;
  const length = boundingBox.max.z - boundingBox.min.z;
  
  return { width, length, area, perimeter };
};

/**
 * Create a measurement object for a chimney or vent
 */
export const createChimneyMeasurement = (points: Point[], type: 'chimney' | 'vent'): {
  value: number;
  diameter?: number;
  height?: number;
  width?: number;
  length?: number;
  area?: number;
  perimeter?: number;
  position?: Point;
} => {
  // For a vent, we just need position
  if (type === 'vent' || points.length === 1) {
    return {
      value: 0,
      position: points[0]
    };
  }
  
  // For a chimney with 4 points (cutout measurement)
  if (points.length >= 4) {
    const dimensions = calculateQuadrilateralDimensions(points);
    
    return {
      value: dimensions.area,
      width: dimensions.width,
      length: dimensions.length,
      area: dimensions.area,
      perimeter: dimensions.perimeter
    };
  }
  
  // Fallback for older measurements with 2-3 points
  if (points.length >= 2) {
    const diameter = calculateDiameter(points[0], points[1]);
    let height: number | undefined;
    
    // If we have a height measurement
    if (points.length >= 3) {
      height = calculateHeight(points[0], points[2]);
    }
    
    return {
      value: diameter,
      diameter,
      height,
      position: points[0]
    };
  }
  
  return {
    value: 0
  };
};

/**
 * Create a measurement object for a dormer
 */
export const createDormerMeasurement = (points: Point[]): {
  value: number;
  area: number;
  width?: number;
  length?: number;
  height?: number;
} => {
  // Calculate base area
  const area = calculateArea(points.slice(0, points.length > 3 ? points.length - 1 : 3));
  
  // Try to estimate width and length from the points
  const boundingBox = calculateBoundingBox(points.slice(0, points.length > 3 ? points.length - 1 : 3));
  const width = boundingBox.max.x - boundingBox.min.x;
  const length = boundingBox.max.z - boundingBox.min.z;
  
  // If we have an additional point for height
  let height: number | undefined;
  if (points.length > 3) {
    const baseCenter = calculateCentroid(points.slice(0, 3));
    height = calculateHeight(baseCenter, points[3]);
  }
  
  return {
    value: area,
    area,
    width,
    length,
    height
  };
};

/**
 * Calculate a centroid (center point) of a set of points
 */
export const calculateCentroid = (points: Point[]): Point => {
  const numPoints = points.length;
  let sumX = 0, sumY = 0, sumZ = 0;
  
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumZ += point.z;
  }
  
  return {
    x: sumX / numPoints,
    y: sumY / numPoints,
    z: sumZ / numPoints
  };
};

/**
 * Calculate bounding box of a set of points
 */
export const calculateBoundingBox = (points: Point[]): { min: Point; max: Point } => {
  if (points.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 }
    };
  }
  
  const min = { 
    x: points[0].x, 
    y: points[0].y, 
    z: points[0].z 
  };
  
  const max = { 
    x: points[0].x, 
    y: points[0].y, 
    z: points[0].z 
  };
  
  for (let i = 1; i < points.length; i++) {
    min.x = Math.min(min.x, points[i].x);
    min.y = Math.min(min.y, points[i].y);
    min.z = Math.min(min.z, points[i].z);
    
    max.x = Math.max(max.x, points[i].x);
    max.y = Math.max(max.y, points[i].y);
    max.z = Math.max(max.z, points[i].z);
  }
  
  return { min, max };
};
