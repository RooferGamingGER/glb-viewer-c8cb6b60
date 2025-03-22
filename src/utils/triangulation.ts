
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
 * Triangulate a polygon using earcut
 * @param points - Array of 3D points defining the polygon
 * @returns Array of triangle indices
 */
export function triangulatePolygon(points: Point[]): number[] {
  if (points.length < 3) return [];
  
  // Prepare data for earcut (flatten coordinates)
  const vertices: number[] = [];
  for (const point of points) {
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
    projected.sub(normal.clone().multiplyScalar(plane.distanceToPoint(p)));
    
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
  // For small 3x3 matrices, we can use a simpler algorithm
  // This is a simplified implementation of the Jacobi eigenvalue algorithm
  
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
