import * as THREE from 'three';
import { Point, Segment } from '@/types/measurements';
import { nanoid } from 'nanoid';
import earcut from 'earcut';

/**
 * Calculate the distance between two 3D points
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Distance in meters
 */
export const calculateDistance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Calculate the height difference between two 3D points (y-axis)
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Height difference in meters
 */
export const calculateHeight = (p1: Point, p2: Point): number => {
  return Math.abs(p2.y - p1.y);
};

/**
 * Calculate the inclination (slope) between two 3D points in degrees
 * @param p1 - First point (THREE.Vector3)
 * @param p2 - Second point (THREE.Vector3)
 * @returns Inclination in degrees
 */
export const calculateInclination = (p1: THREE.Vector3, p2: THREE.Vector3): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distanceXZ = Math.sqrt(dx * dx + (p2.z - p1.z) * (p2.z - p1.z));
  
  // Avoid division by zero
  if (distanceXZ === 0) {
    return 0; // Or another appropriate value/logic
  }
  
  const inclinationRad = Math.atan(dy / distanceXZ);
  return THREE.MathUtils.radToDeg(inclinationRad);
};

/**
 * Calculate the average inclination of multiple segments
 * @param segments - Array of segments with inclination data
 * @returns Average inclination in degrees
 */
export const calculateAverageInclination = (segments: Segment[]): number => {
  if (segments.length === 0) return 0;
  
  const totalInclination = segments.reduce((sum, segment) => sum + (segment.inclination || 0), 0);
  return totalInclination / segments.length;
};

/**
 * Generate segments from an array of 3D points
 * @param points - Array of 3D points
 * @returns Array of segments with length and inclination
 */
export const generateSegments = (points: Point[]): Segment[] => {
  const segments: Segment[] = [];
  
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = new THREE.Vector3(points[i].x, points[i].y, points[i].z);
    const p2 = new THREE.Vector3(points[i + 1].x, points[i + 1].y, points[i + 1].z);
    
    const length = calculateDistance(points[i], points[i + 1]);
    const inclination = calculateInclination(p1, p2);
    
    segments.push({
      id: nanoid(),
      points: [points[i], points[i + 1]],
      length,
      inclination
    });
  }
  
  return segments;
};

/**
 * Calculate the area of a polygon defined by 3D points using triangulation
 * @param points - Array of 3D points defining the polygon
 * @returns Area in square meters
 */
export const calculateArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  // Convert 3D points to 2D coordinates for triangulation
  const vertices2D: number[] = [];
  for (const point of points) {
    vertices2D.push(point.x, point.z); // Use x and z coordinates for 2D projection
  }
  
  // Triangulate the 2D polygon using earcut
  const triangles = earcut(vertices2D, [], 2);
  
  // Calculate the area of each triangle and sum them up
  let totalArea = 0;
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i] * 2;
    const b = triangles[i + 1] * 2;
    const c = triangles[i + 2] * 2;
    
    const p1 = { x: vertices2D[a], z: vertices2D[a + 1] };
    const p2 = { x: vertices2D[b], z: vertices2D[b + 1] };
    const p3 = { x: vertices2D[c], z: vertices2D[c + 1] };
    
    const area = 0.5 * Math.abs(
      (p2.x - p1.x) * (p3.z - p1.z) - (p3.x - p1.x) * (p2.z - p1.z)
    );
    totalArea += area;
  }
  
  return totalArea;
};

/**
 * Validate if the polygon is valid (has at least 3 points)
 * @param points - Array of 3D points defining the polygon
 * @returns Object with validity status and message
 */
export const validatePolygon = (points: Point[]): { valid: boolean; message?: string } => {
  if (points.length < 3) {
    return {
      valid: false,
      message: 'Fläche benötigt mindestens 3 Punkte.'
    };
  }
  
  // Check if the polygon is self-intersecting (very basic check)
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    for (let j = i + 2; j < points.length; j++) {
      const p3 = points[j];
      const p4 = points[(j + 1) % points.length];
      
      if (doIntersect(p1, p2, p3, p4)) {
        return {
          valid: false,
          message: 'Polygon schneidet sich selbst. Bitte anpassen.'
        };
      }
    }
  }
  
  return { valid: true };
};

/**
 * Basic line segment intersection check
 * @param p1 - Start point of the first line segment
 * @param p2 - End point of the first line segment
 * @param p3 - Start point of the second line segment
 * @param p4 - End point of the second line segment
 * @returns True if the line segments intersect, false otherwise
 */
const doIntersect = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);
  
  if (o1 !== o2 && o3 !== o4) {
    return true; // General case
  }
  
  // Special Cases
  // p1, p2 and p3 are collinear and p3 lies on segment p1p2
  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  
  // p1, p2 and p4 are collinear and p4 lies on segment p1p2
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  
  // p3, p4 and p1 are collinear and p1 lies on segment p3p4
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  
  // p3, p4 and p2 are collinear and p2 lies on segment p3p4
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;
  
  return false; // Doesn't fall in any of the above cases
};

/**
 * Utility function to check if point q lies on segment p-r
 * @param p - Start point of the segment
 * @param q - Point to check
 * @param r - End point of the segment
 * @returns True if q lies on segment p-r, false otherwise
 */
const onSegment = (p: Point, q: Point, r: Point): boolean => {
  if (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
      q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y))
    return true;
  
  return false;
};

/**
 * Utility function to find the orientation of ordered triplet (p, q, r)
 * @param p - First point
 * @param q - Second point
 * @param r - Third point
 * @returns 0 if p, q and r are collinear, 1 if Clockwise, 2 if Counterclockwise
 */
const orientation = (p: Point, q: Point, r: Point): number => {
  const val = (q.y - p.y) * (r.x - q.x) -
              (q.x - p.x) * (r.y - q.y);
  
  if (val === 0) return 0;  // collinear
  
  return (val > 0) ? 1 : 2; // clock or counterclock wise
};

/**
 * Calculate the nearest point index on a list of points
 * @param point - The reference point
 * @param points - Array of points to search
 * @returns The index of the nearest point
 */
export const getNearestPointIndex = (point: Point, points: Point[]): number => {
  let nearestIndex = -1;
  let minDistance = Infinity;
  
  for (let i = 0; i < points.length; i++) {
    const distance = calculateDistance(point, points[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }
  
  return nearestIndex;
};

/**
 * Calculate the length of a segment
 */
export const calculateSegmentLength = (segment: Segment): number => {
  return calculateDistance(segment.points[0], segment.points[1]);
};

/**
 * Calculate dimensions (width, length, area, perimeter) of a quadrilateral
 * @param points - Array of 4 points defining the quadrilateral
 * @returns Object with dimensions
 */
export const calculateQuadrilateralDimensions = (points: Point[]): {
  width: number;
  length: number;
  area: number;
  perimeter: number;
} => {
  if (points.length !== 4) {
    return { width: 0, length: 0, area: 0, perimeter: 0 };
  }
  
  // Calculate the lengths of the sides
  const side1 = calculateDistance(points[0], points[1]);
  const side2 = calculateDistance(points[1], points[2]);
  const side3 = calculateDistance(points[2], points[3]);
  const side4 = calculateDistance(points[3], points[0]);
  
  // Assume it's a rectangle-like quadrilateral, so take average of opposite sides
  const width = (side1 + side3) / 2;
  const length = (side2 + side4) / 2;
  
  // Calculate area (approximation for non-rectangles)
  const area = width * length;
  
  // Calculate perimeter
  const perimeter = side1 + side2 + side3 + side4;
  
  return { width, length, area, perimeter };
};

/**
 * Calculate the bounding box of a set of points
 * @param points - Array of 3D points
 * @returns Object with min and max coordinates
 */
export const calculateBoundingBox = (points: Point[]): {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
} => {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    minZ = Math.min(minZ, point.z);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
    maxZ = Math.max(maxZ, point.z);
  }
  
  return { minX, minY, minZ, maxX, maxY, maxZ };
};

/**
 * Calculate the centroid (center point) of a set of points
 * @param points - Array of 3D points
 * @returns Object with centroid coordinates
 */
export const calculateCentroid = (points: Point[]): { x: number; y: number; z: number } => {
  let sumX = 0, sumY = 0, sumZ = 0;
  
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumZ += point.z;
  }
  
  const count = points.length;
  return {
    x: sumX / count,
    y: sumY / count,
    z: sumZ / count
  };
};

/**
 * Calculate the area of a polygon defined by 3D points
 * @param points - Array of 3D points defining the polygon
 * @returns Area in square meters
 */
export const calculatePolygonArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  // Project points onto their best-fitting plane
  const positions = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const centroid = new THREE.Vector3();
  
  // Calculate centroid
  for (const pos of positions) {
    centroid.add(pos);
  }
  centroid.divideScalar(positions.length);
  
  // Calculate normal using the first three non-collinear points
  const normal = new THREE.Vector3();
  const tempVec1 = new THREE.Vector3();
  const tempVec2 = new THREE.Vector3();
  
  for (let i = 0; i < positions.length - 2; i++) {
    tempVec1.subVectors(positions[i+1], positions[i]);
    tempVec2.subVectors(positions[i+2], positions[i]);
    normal.crossVectors(tempVec1, tempVec2);
    
    if (normal.lengthSq() > 0.001) break; // Found non-collinear points
  }
  
  normal.normalize();
  
  // Create a coordinate system on the plane
  const xAxis = new THREE.Vector3(1, 0, 0);
  if (Math.abs(normal.dot(xAxis)) > 0.9) {
    xAxis.set(0, 1, 0); // Use Y axis if normal is close to X
  }
  
  const yAxis = new THREE.Vector3();
  yAxis.crossVectors(normal, xAxis).normalize();
  xAxis.crossVectors(yAxis, normal).normalize();
  
  // Project the points onto the plane
  const projectedPoints: [number, number][] = [];
  
  for (const pos of positions) {
    const relPos = pos.clone().sub(centroid);
    const x = relPos.dot(xAxis);
    const y = relPos.dot(yAxis);
    projectedPoints.push([x, y]);
  }
  
  // Calculate the area using the shoelace formula
  let area = 0;
  for (let i = 0; i < projectedPoints.length; i++) {
    const j = (i + 1) % projectedPoints.length;
    area += projectedPoints[i][0] * projectedPoints[j][1];
    area -= projectedPoints[j][0] * projectedPoints[i][1];
  }
  
  area = Math.abs(area) / 2;
  return area;
};
