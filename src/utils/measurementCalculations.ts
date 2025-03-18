
import * as THREE from 'three';
import { nanoid } from 'nanoid';
import { Point, Segment } from '@/types/measurements';
import { MIN_INCLINATION_THRESHOLD } from '@/constants/measurements';

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
 * Calculate area of polygon defined by points
 */
export const calculateArea = (points: Point[]): number => {
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
