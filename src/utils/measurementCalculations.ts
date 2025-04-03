
import * as THREE from 'three';
import { Point, Measurement, Segment } from '@/types/measurements';
import { nanoid } from 'nanoid';

// Calculate the distance between two points
export const calculateDistance = (p1: Point, p2: Point): number => {
  const a = p2.x - p1.x;
  const b = p2.y - p1.y;
  const c = p2.z - p1.z;
  
  return Math.sqrt(a * a + b * b + c * c);
};

// Calculate the height difference between two points
export const calculateHeight = (p1: Point, p2: Point): number => {
  return Math.abs(p2.y - p1.y);
};

// Calculate area of a polygon
export const calculateArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  // Use three.js to calculate the area
  const shape = new THREE.Shape();
  
  // Project points to a 2D plane for area calculation
  // Choose the dominant plane based on model orientation
  const projectedPoints = projectPointsToPlane(points);
  
  shape.moveTo(projectedPoints[0].x, projectedPoints[0].y);
  
  for (let i = 1; i < projectedPoints.length; i++) {
    shape.lineTo(projectedPoints[i].x, projectedPoints[i].y);
  }
  
  shape.closePath();
  
  return shape.getArea();
};

// Project points to the plane with the largest area
export const projectPointsToPlane = (points: Point[]): { x: number, y: number }[] => {
  // Determine which plane to project to based on the normal vector
  const normal = calculateNormalVector(points);
  
  // Find the dominant axis of the normal (largest absolute component)
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);
  
  // Project onto the plane perpendicular to the dominant axis
  if (absX >= absY && absX >= absZ) {
    // Project onto YZ plane (X is dominant)
    return points.map(p => ({ x: p.z, y: p.y }));
  } else if (absY >= absX && absY >= absZ) {
    // Project onto XZ plane (Y is dominant)
    return points.map(p => ({ x: p.x, y: p.z }));
  } else {
    // Project onto XY plane (Z is dominant)
    return points.map(p => ({ x: p.x, y: p.y }));
  }
};

// Calculate a normal vector for a set of points
export const calculateNormalVector = (points: Point[]): THREE.Vector3 => {
  if (points.length < 3) {
    // Default to Z-up if not enough points
    return new THREE.Vector3(0, 0, 1);
  }
  
  // Use three.js to calculate the normal
  const v1 = new THREE.Vector3(
    points[1].x - points[0].x,
    points[1].y - points[0].y,
    points[1].z - points[0].z
  );
  
  const v2 = new THREE.Vector3(
    points[2].x - points[0].x,
    points[2].y - points[0].y,
    points[2].z - points[0].z
  );
  
  const normal = new THREE.Vector3();
  normal.crossVectors(v1, v2).normalize();
  
  return normal;
};

// Generate segments from an array of points
export const generateSegments = (points: Point[]): Segment[] => {
  if (points.length < 2) return [];
  
  const segments: Segment[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    const segment: Segment = {
      id: nanoid(),
      points: [p1, p2],
      length: calculateDistance(p1, p2),
      isOriginal: true
    };
    
    segments.push(segment);
  }
  
  return segments;
};

// Calculate inclination of a segment
export const calculateInclination = (p1: THREE.Vector3, p2: THREE.Vector3): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  
  // Calculate the horizontal distance
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  
  // Calculate the angle in radians
  const angleRadians = Math.atan2(dy, horizontalDistance);
  
  // Convert to degrees
  return angleRadians * (180 / Math.PI);
};

// Validate a polygon 
export const validatePolygon = (points: Point[]): { valid: boolean; message?: string } => {
  if (points.length < 3) {
    return { valid: false, message: 'Mindestens 3 Punkte erforderlich' };
  }
  
  // Check if any points are duplicates
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];
      
      const distance = calculateDistance(p1, p2);
      
      if (distance < 0.001) {
        return { valid: false, message: 'Überlappende Punkte gefunden' };
      }
    }
  }
  
  return { valid: true };
};

// Find and link shared segments between measurements
export const findAndLinkSharedSegments = (measurements: Measurement[]): Measurement[] => {
  // Clone measurements to avoid mutating the original array
  const result = JSON.parse(JSON.stringify(measurements)) as Measurement[];
  
  // First, collect all segments
  const allSegments: Array<{
    measurementId: string;
    segmentId: string;
    segment: Segment;
    segmentIndex: number;
  }> = [];
  
  result.forEach(measurement => {
    if (!measurement.segments) return;
    
    measurement.segments.forEach((segment, index) => {
      // Reset any previous sharing info
      segment.shared = false;
      segment.sharedWithSegmentId = undefined;
      segment.isOriginal = true;
      
      allSegments.push({
        measurementId: measurement.id,
        segmentId: segment.id,
        segment,
        segmentIndex: index
      });
    });
  });
  
  // Now look for matching segments
  for (let i = 0; i < allSegments.length; i++) {
    const s1 = allSegments[i];
    
    // Skip if this segment is already shared
    if (s1.segment.shared) continue;
    
    for (let j = i + 1; j < allSegments.length; j++) {
      const s2 = allSegments[j];
      
      // Skip if second segment is already shared
      if (s2.segment.shared) continue;
      
      // Check if these segments are from different measurements
      if (s1.measurementId === s2.measurementId) continue;
      
      // Check if segments match (points are same or reversed)
      if (areSegmentsMatching(s1.segment, s2.segment)) {
        // Mark both segments as shared
        s1.segment.shared = true;
        s1.segment.isOriginal = true;
        s1.segment.sharedWithSegmentId = s2.segmentId;
        
        s2.segment.shared = true;
        s2.segment.isOriginal = false;
        s2.segment.sharedWithSegmentId = s1.segmentId;
        
        // Update the segments in the measurements
        const m1 = result.find(m => m.id === s1.measurementId);
        const m2 = result.find(m => m.id === s2.measurementId);
        
        if (m1 && m1.segments) {
          m1.segments[s1.segmentIndex] = s1.segment;
        }
        
        if (m2 && m2.segments) {
          m2.segments[s2.segmentIndex] = s2.segment;
        }
      }
    }
  }
  
  return result;
};

// Check if two segments are matching (same endpoints, possibly in reverse order)
const areSegmentsMatching = (s1: Segment, s2: Segment): boolean => {
  const s1p1 = s1.points[0];
  const s1p2 = s1.points[1];
  const s2p1 = s2.points[0];
  const s2p2 = s2.points[1];
  
  // Check if points match in order
  const forwardMatch = 
    Math.abs(s1p1.x - s2p1.x) < 0.001 &&
    Math.abs(s1p1.y - s2p1.y) < 0.001 &&
    Math.abs(s1p1.z - s2p1.z) < 0.001 &&
    Math.abs(s1p2.x - s2p2.x) < 0.001 &&
    Math.abs(s1p2.y - s2p2.y) < 0.001 &&
    Math.abs(s1p2.z - s2p2.z) < 0.001;
  
  // Check if points match in reverse order
  const reverseMatch = 
    Math.abs(s1p1.x - s2p2.x) < 0.001 &&
    Math.abs(s1p1.y - s2p2.y) < 0.001 &&
    Math.abs(s1p1.z - s2p2.z) < 0.001 &&
    Math.abs(s1p2.x - s2p1.x) < 0.001 &&
    Math.abs(s1p2.y - s2p1.y) < 0.001 &&
    Math.abs(s1p2.z - s2p1.z) < 0.001;
  
  return forwardMatch || reverseMatch;
};

// Calculate average inclination from segments
export const calculateAverageInclination = (segments: Segment[]): number => {
  if (!segments || segments.length === 0) return 0;
  
  let sum = 0;
  let count = 0;
  
  segments.forEach(segment => {
    if (segment.inclination !== undefined) {
      sum += segment.inclination;
      count++;
    }
  });
  
  return count > 0 ? sum / count : 0;
};
