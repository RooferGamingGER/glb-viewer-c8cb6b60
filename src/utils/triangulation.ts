import * as THREE from 'three';
import { Point } from '@/types/measurements';
import earcut from 'earcut';

/**
 * Check if a point is concave in the polygon
 */
export function isPointConcave(points: Point[], index: number): boolean {
  const n = points.length;
  const current = points[index];
  const next = points[(index + 1) % n];
  const prev = points[(index - 1 + n) % n];

  // Create vectors
  const v1 = new THREE.Vector3(prev.x - current.x, prev.y - current.y, prev.z - current.z);
  const v2 = new THREE.Vector3(next.x - current.x, next.y - current.y, next.z - current.z);

  // Cross product to determine concave/convex
  const crossProduct = new THREE.Vector3().crossVectors(v1, v2).y;
  
  return crossProduct < 0;
}

/**
 * Ear-clipping algorithm for triangulating a polygon
 * This works better for complex 3D surfaces than earcut in some cases
 */
export function earClip(points: Point[]): number[][] {
  if (points.length < 3) return [];
  
  // Make a copy of the points array that we can modify
  const vertices = [...points];
  const triangles: number[][] = [];
  const indices = Array.from({ length: points.length }, (_, i) => i);
  
  let i = 0;
  let n = indices.length;
  
  // Continue until we can't form any more triangles
  while (n > 2) {
    // Get indices of the three consecutive vertices
    const a = indices[i % n];
    const b = indices[(i + 1) % n];
    const c = indices[(i + 2) % n];
    
    // Get the actual vertices
    const pointA = vertices[a];
    const pointB = vertices[b];
    const pointC = vertices[c];
    
    // Check if this vertex forms an ear
    if (isEar(vertices, indices, i % n, n)) {
      // Add the triangle to our result
      triangles.push([a, b, c]);
      
      // Remove the middle vertex from the polygon
      indices.splice((i + 1) % n, 1);
      n--;
      
      // Reset the counter to ensure we don't skip vertices
      i = 0;
    } else {
      // Move to the next vertex
      i++;
      
      // If we've gone all the way around without finding an ear, break to avoid infinite loop
      if (i >= n) break;
    }
  }
  
  return triangles;
}

/**
 * Check if a vertex forms an "ear" in the polygon
 */
function isEar(vertices: Point[], indices: number[], i: number, n: number): boolean {
  const a = indices[i % n];
  const b = indices[(i + 1) % n];
  const c = indices[(i + 2) % n];
  
  const pointA = vertices[a];
  const pointB = vertices[b];
  const pointC = vertices[c];
  
  // First check if the angle is convex
  const v1 = new THREE.Vector3(pointA.x - pointB.x, 0, pointA.z - pointB.z);
  const v2 = new THREE.Vector3(pointC.x - pointB.x, 0, pointC.z - pointB.z);
  
  // Using 2D coordinates (x,z) for this check
  const cross = v1.x * v2.z - v1.z * v2.x;
  
  // If angle is not convex, this can't be an ear
  if (cross < 0) return false;
  
  // Check if any other point is inside this triangle
  for (let j = 0; j < n; j++) {
    // Skip the points that form the triangle
    if (j === i % n || j === (i + 1) % n || j === (i + 2) % n) continue;
    
    const p = vertices[indices[j]];
    
    // Check if point p is inside the triangle (a,b,c)
    if (isPointInTriangle(p, pointA, pointB, pointC)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if a point is inside a triangle (using 2D projection, ignoring Y)
 */
function isPointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  // Using barycentric coordinates to check if point is in triangle
  const area = 0.5 * Math.abs(
    (a.x * (b.z - c.z) + b.x * (c.z - a.z) + c.x * (a.z - b.z))
  );
  
  const s = 1 / (2 * area) * (a.z * c.x - a.x * c.z + (c.z - a.z) * p.x + (a.x - c.x) * p.z);
  const t = 1 / (2 * area) * (a.x * b.z - a.z * b.x + (a.z - b.z) * p.x + (b.x - a.x) * p.z);
  
  return s > 0 && t > 0 && 1 - s - t > 0;
}

/**
 * Triangulate a polygon using earcut
 * @param points - Array of 3D points defining the polygon
 * @returns Array of triangle indices
 */
export function triangulatePolygon(points: Point[]): number[] {
  if (points.length < 3) return [];
  
  // First project the points to 2D
  const { projectedPoints } = projectPointsToPlane(points);
  
  // Prepare data for earcut (flatten coordinates)
  const vertices: number[] = [];
  for (const point of projectedPoints) {
    vertices.push(point.x, point.z); // Use x and z for 2D projection
  }
  
  // Perform triangulation
  return earcut(vertices, undefined, 2);
}

/**
 * Project 3D points onto a best-fit plane
 * Improved implementation for more accurate projection
 */
export function projectPointsToPlane(points: Point[]): { 
  projectedPoints: Point[],
  planeNormal: THREE.Vector3
} {
  if (points.length < 3) {
    return { 
      projectedPoints: [...points], 
      planeNormal: new THREE.Vector3(0, 1, 0) 
    };
  }

  // 1. Calculate centroid
  const centroid = calculateCentroid(points);
  
  // 2. Set up the covariance matrix
  const covariance = calculateCovarianceMatrix(points, centroid);
  
  // 3. Find the eigenvectors (principal components)
  const { eigenvectors } = computeEigenVectorsJacobi(covariance);
  
  // The eigenvector with the smallest eigenvalue is the normal to the best-fit plane
  const normal = new THREE.Vector3().fromArray(eigenvectors[0]);
  normal.normalize();
  
  // Create orthogonal basis vectors for the plane
  const tangent = new THREE.Vector3(1, 0, 0);
  if (Math.abs(normal.dot(tangent)) > 0.9) {
    tangent.set(0, 1, 0); // Use different vector if too parallel
  }
  
  // Get basis vectors for the plane
  const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  tangent.crossVectors(binormal, normal).normalize();
  
  // Create a plane using the centroid and normal
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    normal,
    new THREE.Vector3(centroid.x, centroid.y, centroid.z)
  );
  
  // Project each point onto the plane - but preserve the original scale
  const projectedPoints = points.map(point => {
    const p = new THREE.Vector3(point.x, point.y, point.z);
    const projected = new THREE.Vector3();
    
    // Project the point onto the plane
    projected.copy(p);
    const distance = plane.distanceToPoint(p);
    projected.sub(normal.clone().multiplyScalar(distance));
    
    return {
      x: projected.x,
      y: projected.y,
      z: projected.z
    };
  });
  
  return { projectedPoints, planeNormal: normal };
}

/**
 * Calculate centroid of a set of points
 */
function calculateCentroid(points: Point[]): Point {
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
}

/**
 * Calculate the covariance matrix of a set of points
 */
function calculateCovarianceMatrix(points: Point[], centroid: Point): number[][] {
  // 3x3 Matrix
  const covariance: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  
  for (const point of points) {
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    const dz = point.z - centroid.z;
    
    covariance[0][0] += dx * dx;
    covariance[0][1] += dx * dy;
    covariance[0][2] += dx * dz;
    
    covariance[1][0] += dy * dx;
    covariance[1][1] += dy * dy;
    covariance[1][2] += dy * dz;
    
    covariance[2][0] += dz * dx;
    covariance[2][1] += dz * dy;
    covariance[2][2] += dz * dz;
  }
  
  // Normalize
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      covariance[i][j] /= points.length;
    }
  }
  
  return covariance;
}

/**
 * Improved Jacobi eigenvalue algorithm for 3x3 matrices
 * This provides more accurate eigenvectors for the plane fitting
 */
function computeEigenVectorsJacobi(matrix: number[][]): { 
  eigenvalues: number[], 
  eigenvectors: number[][] 
} {
  // Create a copy of the matrix to work with
  const a: number[][] = [
    [...matrix[0]],
    [...matrix[1]],
    [...matrix[2]]
  ];
  
  // Identity matrix as initial eigenvectors
  const v: number[][] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
  
  const n = 3; // Matrix size
  const maxRotations = 50; // Maximum number of rotations
  
  // Perform Jacobi rotations
  for (let rotation = 0; rotation < maxRotations; rotation++) {
    // Find the largest off-diagonal element
    let maxVal = 0;
    let p = 0, q = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(a[i][j]) > maxVal) {
          maxVal = Math.abs(a[i][j]);
          p = i;
          q = j;
        }
      }
    }
    
    // Check if we're done
    if (maxVal < 1e-10) break;
    
    // Compute rotation parameters
    const theta = 0.5 * Math.atan2(2 * a[p][q], a[p][p] - a[q][q]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    
    // Apply rotation to a
    const apq = a[p][q];
    const app = a[p][p];
    const aqq = a[q][q];
    
    a[p][p] = app * c * c + aqq * s * s - 2 * apq * c * s;
    a[q][q] = app * s * s + aqq * c * c + 2 * apq * c * s;
    a[p][q] = a[q][p] = (app - aqq) * c * s + apq * (c * c - s * s);
    
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const api = a[p][i];
        const aqi = a[q][i];
        a[p][i] = a[i][p] = api * c - aqi * s;
        a[q][i] = a[i][q] = api * s + aqi * c;
      }
    }
    
    // Apply rotation to v
    for (let i = 0; i < n; i++) {
      const vip = v[i][p];
      const viq = v[i][q];
      v[i][p] = vip * c - viq * s;
      v[i][q] = vip * s + viq * c;
    }
  }
  
  // Extract eigenvalues and eigenvectors
  const eigenvalues = [a[0][0], a[1][1], a[2][2]];
  const eigenvectors = [
    [v[0][0], v[1][0], v[2][0]],
    [v[0][1], v[1][1], v[2][1]],
    [v[0][2], v[1][2], v[2][2]]
  ];
  
  // Sort by eigenvalues (smallest first)
  const indices = [0, 1, 2].sort((a, b) => eigenvalues[a] - eigenvalues[b]);
  
  return {
    eigenvalues: indices.map(i => eigenvalues[i]),
    eigenvectors: indices.map(i => eigenvectors[i])
  };
}

/**
 * Create visualization objects for triangulation (for debugging)
 */
export function createTriangulationVisuals(
  points: Point[],
  triangles: number[][]
): THREE.Group {
  const group = new THREE.Group();
  
  // Material for triangles
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  
  // Render each triangle
  for (const triangle of triangles) {
    const geometry = new THREE.BufferGeometry();
    
    // Vertices for the triangle
    const vertices = [
      points[triangle[0]].x, points[triangle[0]].y, points[triangle[0]].z,
      points[triangle[1]].x, points[triangle[1]].y, points[triangle[1]].z,
      points[triangle[2]].x, points[triangle[2]].y, points[triangle[2]].z
    ];
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
  }
  
  return group;
}
