
import * as THREE from 'three';
import { nanoid } from 'nanoid';
import { Point, Segment, Measurement } from '@/types/measurements';

// Calculate the distance between two points in 3D space
export const calculateDistance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// Calculate the height difference between two points (y-axis)
export const calculateHeight = (p1: Point, p2: Point): number => {
  return Math.abs(p2.y - p1.y);
};

// Calculate the area of a polygon defined by a set of points
export const calculateArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  try {
    // Project points onto dominant plane for area calculation
    // First determine dominant plane
    const vectors = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    
    // Create a shape from the points
    const shape = new THREE.Shape();
    shape.moveTo(vectors[0].x, vectors[0].z);
    
    for (let i = 1; i < vectors.length; i++) {
      shape.lineTo(vectors[i].x, vectors[i].z);
    }
    
    // Close the shape
    shape.lineTo(vectors[0].x, vectors[0].z);
    
    // Calculate area
    const area = THREE.ShapeUtils.area(shape.getPoints());
    
    return Math.abs(area);
  } catch (error) {
    console.error('Error calculating area:', error);
    return 0;
  }
};

// Generate segments between consecutive points
export const generateSegments = (points: Point[]): Segment[] => {
  if (points.length < 2) return [];
  
  const segments: Segment[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const nextIndex = (i + 1) % points.length;
    const p1 = points[i];
    const p2 = points[nextIndex];
    const length = calculateDistance(p1, p2);
    
    segments.push({
      id: nanoid(),
      points: [p1, p2],
      length
    });
  }
  
  return segments;
};

// Find segments that are shared between different measurements
export const findAndLinkSharedSegments = (measurements: Measurement[]): Measurement[] => {
  if (measurements.length < 2) return measurements;
  
  const updatedMeasurements = [...measurements];
  
  // Loop through each measurement
  for (let i = 0; i < updatedMeasurements.length; i++) {
    const measurement1 = updatedMeasurements[i];
    
    if (!measurement1.segments) continue;
    
    // Loop through each segment of the current measurement
    for (let j = 0; j < measurement1.segments.length; j++) {
      const segment1 = measurement1.segments[j];
      
      // Skip if this segment is already marked as shared
      if (segment1.shared) continue;
      
      // Loop through other measurements to find matching segments
      for (let k = i + 1; k < updatedMeasurements.length; k++) {
        const measurement2 = updatedMeasurements[k];
        
        if (!measurement2.segments) continue;
        
        // Loop through each segment of the other measurement
        for (let l = 0; l < measurement2.segments.length; l++) {
          const segment2 = measurement2.segments[l];
          
          // Skip if this segment is already marked as shared
          if (segment2.shared) continue;
          
          // Check if segments are nearly identical (either in same or reverse order)
          if (areSegmentsMatching(segment1, segment2)) {
            // Mark segments as shared
            segment1.shared = true;
            segment1.isOriginal = true;
            segment1.sharedWithSegmentId = segment2.id;
            
            segment2.shared = true;
            segment2.isOriginal = false;
            segment2.sharedWithSegmentId = segment1.id;
            
            break;
          }
        }
        
        // If we found a match, no need to check other measurements
        if (segment1.shared) break;
      }
    }
  }
  
  return updatedMeasurements;
};

// Helper function to check if two segments match
const areSegmentsMatching = (segment1: Segment, segment2: Segment): boolean => {
  const DISTANCE_THRESHOLD = 0.05; // Points within 5cm are considered the same
  
  const s1p1 = segment1.points[0];
  const s1p2 = segment1.points[1];
  const s2p1 = segment2.points[0];
  const s2p2 = segment2.points[1];
  
  // Check if points match in same order
  const forwardMatch = 
    calculateDistance(s1p1, s2p1) < DISTANCE_THRESHOLD && 
    calculateDistance(s1p2, s2p2) < DISTANCE_THRESHOLD;
  
  // Check if points match in reverse order
  const reverseMatch = 
    calculateDistance(s1p1, s2p2) < DISTANCE_THRESHOLD && 
    calculateDistance(s1p2, s2p1) < DISTANCE_THRESHOLD;
  
  return forwardMatch || reverseMatch;
};

// Calculate bounding box for a set of points
export const calculateBoundingBox = (points: Point[]): {
  min: Point;
  max: Point;
} => {
  if (points.length === 0) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 }
    };
  }
  
  const min = { ...points[0] };
  const max = { ...points[0] };
  
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    
    min.x = Math.min(min.x, p.x);
    min.y = Math.min(min.y, p.y);
    min.z = Math.min(min.z, p.z);
    
    max.x = Math.max(max.x, p.x);
    max.y = Math.max(max.y, p.y);
    max.z = Math.max(max.z, p.z);
  }
  
  return { min, max };
};

// Calculate centroid (center point) of a polygon
export const calculateCentroid = (points: Point[]): Point => {
  if (points.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  
  let sumX = 0, sumY = 0, sumZ = 0;
  
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumZ += point.z;
  }
  
  return {
    x: sumX / points.length,
    y: sumY / points.length,
    z: sumZ / points.length
  };
};

// Calculate dimensions (width, length) of a quadrilateral
export const calculateQuadrilateralDimensions = (points: Point[]): {
  width: number;
  length: number;
  area: number;
  perimeter: number;
} => {
  if (points.length !== 4) {
    return { width: 0, length: 0, area: 0, perimeter: 0 };
  }
  
  // Calculate lengths of all sides
  const side1 = calculateDistance(points[0], points[1]);
  const side2 = calculateDistance(points[1], points[2]);
  const side3 = calculateDistance(points[2], points[3]);
  const side4 = calculateDistance(points[3], points[0]);
  
  // For simplicity, we'll use average of opposite sides
  const width = (side1 + side3) / 2;
  const length = (side2 + side4) / 2;
  
  // Calculate area using the calculateArea function
  const area = calculateArea(points);
  
  // Calculate perimeter
  const perimeter = side1 + side2 + side3 + side4;
  
  return { width, length, area, perimeter };
};

// Calculate inclination (slope) of a segment
export const calculateInclination = (p1: Point, p2: Point): number => {
  // Calculate horizontal distance (ignoring y)
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  
  // Calculate vertical distance
  const dy = Math.abs(p2.y - p1.y);
  
  // Calculate angle in degrees
  if (horizontalDistance === 0) return 90; // Vertical line
  
  const radians = Math.atan(dy / horizontalDistance);
  return radians * (180 / Math.PI);
};

// Calculate average inclination of multiple segments
export const calculateAverageInclination = (segments: Segment[]): number => {
  if (segments.length === 0) return 0;
  
  let totalInclination = 0;
  let totalLength = 0;
  
  for (const segment of segments) {
    const inclination = calculateInclination(segment.points[0], segment.points[1]);
    totalInclination += inclination * segment.length; // Weight by length
    totalLength += segment.length;
  }
  
  return totalLength > 0 ? totalInclination / totalLength : 0;
};

// Validate if polygon is properly formed (no self-intersections)
export const validatePolygon = (points: Point[]): boolean => {
  if (points.length < 3) return false;
  
  // This is a simplified validation
  // For complete validation, we would need to check for self-intersections
  
  // Check if points are not too close to each other
  const MIN_DISTANCE = 0.01; // 1cm minimum distance
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    if (calculateDistance(p1, p2) < MIN_DISTANCE) {
      return false; // Points too close
    }
  }
  
  return true;
};

// Calculate the polygon area in 2D (useful for flatter structures)
export const calculatePolygonArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  // Project points onto XZ plane (ignoring Y) for simplicity
  let area = 0;
  
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].z;
    area -= points[j].x * points[i].z;
  }
  
  return Math.abs(area) / 2;
};

