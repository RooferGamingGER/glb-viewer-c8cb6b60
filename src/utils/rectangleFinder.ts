
import { Point } from '@/types/measurements';
import * as THREE from 'three';

/**
 * Calculates the area of a rectangle defined by four points
 * @param points - Array of four points defining the rectangle
 * @returns Area of the rectangle
 */
export const calculateRectangleArea = (points: Point[]): number => {
  if (points.length !== 4) return 0;
  
  // Calculate side lengths
  const side1 = Math.sqrt(
    Math.pow(points[1].x - points[0].x, 2) + 
    Math.pow(points[1].z - points[0].z, 2)
  );
  
  const side2 = Math.sqrt(
    Math.pow(points[2].x - points[1].x, 2) + 
    Math.pow(points[2].z - points[1].z, 2)
  );
  
  return side1 * side2;
};

/**
 * Checks if a point is inside a polygon using ray casting algorithm
 * @param point - The point to check
 * @param polygon - Array of points defining the polygon
 * @returns True if the point is inside the polygon
 */
export const isPointInPolygon = (point: { x: number, z: number }, polygon: Point[]): boolean => {
  // Convert 3D points to 2D for the check (using X and Z coordinates)
  const polygon2D = polygon.map(p => ({ x: p.x, y: p.z }));
  const point2D = { x: point.x, y: point.z };
  
  let inside = false;
  for (let i = 0, j = polygon2D.length - 1; i < polygon2D.length; j = i++) {
    const xi = polygon2D[i].x;
    const yi = polygon2D[i].y;
    const xj = polygon2D[j].x;
    const yj = polygon2D[j].y;
    
    const intersect = ((yi > point2D.y) !== (yj > point2D.y)) &&
      (point2D.x < (xj - xi) * (point2D.y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
};

/**
 * Finds the dominating direction vectors of the polygon
 * @param points - Array of points defining the polygon
 * @returns Array of normalized direction vectors
 */
export const findDominantDirections = (points: Point[]): THREE.Vector2[] => {
  if (points.length < 3) return [new THREE.Vector2(1, 0), new THREE.Vector2(0, 1)];
  
  // Create edges and find their directions
  const directions: THREE.Vector2[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    // Create direction vector using X and Z coordinates (since Y is height)
    const dir = new THREE.Vector2(p2.x - p1.x, p2.z - p1.z).normalize();
    
    // Skip very short edges
    if (Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2)) < 0.01) {
      continue;
    }
    
    // Check if we already have a similar direction
    let isUnique = true;
    for (const existingDir of directions) {
      // Check if directions are similar (dot product close to 1 or -1)
      const dot = Math.abs(existingDir.dot(dir));
      if (dot > 0.95) { // Within ~18 degrees
        isUnique = false;
        break;
      }
    }
    
    if (isUnique) {
      directions.push(dir);
      
      // Also add perpendicular direction
      const perpDir = new THREE.Vector2(-dir.y, dir.x);
      
      // Check if perpendicular direction is unique
      let perpUnique = true;
      for (const existingDir of directions) {
        const perpDot = Math.abs(existingDir.dot(perpDir));
        if (perpDot > 0.95) {
          perpUnique = false;
          break;
        }
      }
      
      if (perpUnique) {
        directions.push(perpDir);
      }
    }
  }
  
  // If we couldn't find enough directions, use default X and Z axes
  if (directions.length < 2) {
    return [new THREE.Vector2(1, 0), new THREE.Vector2(0, 1)];
  }
  
  // Return the first two dominant directions
  return directions.slice(0, 2);
};

/**
 * Calculates the bounding box of a set of points
 * @param points - The points to calculate the bounding box for
 * @returns Object with min and max coordinates
 */
export const calculateBoundingBox = (points: Point[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  });
  
  return { minX, maxX, minZ, maxZ };
};

/**
 * Finds the largest rectangle inside a polygon
 * @param points - Array of points defining the polygon
 * @returns Array of points defining the largest rectangle found
 */
export const findLargestRectangle = (points: Point[]): Point[] => {
  if (points.length < 3) return points;
  
  // Calculate average Y (height) to use for the rectangle
  const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  
  // Find dominant directions
  const dominantDirs = findDominantDirections(points);
  
  // Get the bounding box to establish search limits
  const bbox = calculateBoundingBox(points);
  
  // Create grid points within the bounding box
  const gridSize = 10; // Number of grid points in each direction
  const gridPoints: { x: number, z: number }[] = [];
  
  const xStep = (bbox.maxX - bbox.minX) / gridSize;
  const zStep = (bbox.maxZ - bbox.minZ) / gridSize;
  
  // Generate grid points that are inside the polygon
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = bbox.minX + i * xStep;
      const z = bbox.minZ + j * zStep;
      
      if (isPointInPolygon({ x, z }, points)) {
        gridPoints.push({ x, z });
      }
    }
  }
  
  // Add the original polygon points to ensure we consider them
  points.forEach(p => {
    gridPoints.push({ x: p.x, z: p.z });
  });
  
  let largestRect: Point[] = [];
  let maxArea = 0;
  
  // Try each grid point as the origin of a rectangle
  for (const origin of gridPoints) {
    // For each dominant direction
    for (let dirIndex = 0; dirIndex < dominantDirs.length; dirIndex++) {
      const dir1 = dominantDirs[dirIndex];
      const dir2 = dirIndex + 1 < dominantDirs.length ? 
        dominantDirs[dirIndex + 1] : 
        new THREE.Vector2(-dir1.y, dir1.x); // Perpendicular to dir1
      
      // Make sure dir2 is perpendicular to dir1
      if (Math.abs(dir1.dot(dir2)) > 0.1) {
        // If not perpendicular, use a perpendicular direction
        dir2.set(-dir1.y, dir1.x);
      }
      
      // Try different scales for the rectangle
      for (let scale1 = 0.5; scale1 <= 10; scale1 += 0.5) {
        for (let scale2 = 0.5; scale2 <= 10; scale2 += 0.5) {
          // Generate the four corners of the potential rectangle
          const p1 = { x: origin.x, y: avgY, z: origin.z };
          const p2 = { x: origin.x + dir1.x * scale1, y: avgY, z: origin.z + dir1.y * scale1 };
          const p3 = { 
            x: origin.x + dir1.x * scale1 + dir2.x * scale2, 
            y: avgY, 
            z: origin.z + dir1.y * scale1 + dir2.y * scale2 
          };
          const p4 = { x: origin.x + dir2.x * scale2, y: avgY, z: origin.z + dir2.y * scale2 };
          
          const rectPoints = [p1, p2, p3, p4];
          
          // Check if all points are inside the polygon
          const allInside = rectPoints.every(p => isPointInPolygon(p, points));
          
          if (allInside) {
            const area = calculateRectangleArea(rectPoints);
            if (area > maxArea) {
              maxArea = area;
              largestRect = rectPoints;
            }
          }
        }
      }
    }
  }
  
  return largestRect;
};
