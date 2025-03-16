
import { Point } from './types';
import * as THREE from 'three';

// Format measurement value based on measurement type
export const formatMeasurement = (value: number, type: 'length' | 'height' | 'area'): string => {
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

export const calculateDistance = (point1: Point, point2: Point): number => {
  // Calculate true 3D distance between points using Euclidean distance formula
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) +
    Math.pow(point2.y - point1.y, 2) +
    Math.pow(point2.z - point1.z, 2)
  );
};

export const calculateHeight = (point1: Point, point2: Point): number => {
  // Height is strictly the absolute difference along the Y axis
  return Math.abs(point2.y - point1.y);
};

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

export const getNearestPointIndex = (points: Point[], position: Point): number => {
  // Find the index of the closest point in the measurement
  let nearestIndex = 0;
  let minDistance = Number.MAX_VALUE;
  
  points.forEach((point, index) => {
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
