
import * as THREE from 'three';
import { Point } from '@/types/measurements';

/**
 * Prüft, ob ein Polygon konkav ist
 */
export function isPointConcave(points: Point[], index: number): boolean {
  const n = points.length;
  const current = points[index];
  const next = points[(index + 1) % n];
  const prev = points[(index - 1 + n) % n];

  // Vektoren erstellen
  const v1 = new THREE.Vector3(prev.x - current.x, prev.y - current.y, prev.z - current.z);
  const v2 = new THREE.Vector3(next.x - current.x, next.y - current.y, next.z - current.z);

  // Kreuzprodukt für konkave/konvexe Bestimmung berechnen
  const crossProduct = new THREE.Vector3().crossVectors(v1, v2).y;
  
  return crossProduct < 0;
}

/**
 * Ear-Clipping-Algorithmus für robuste Triangulation
 * Wandelt ein Polygon in Dreiecke um
 */
export function earClip(points: Point[]): number[][] {
  if (points.length < 3) return [];
  
  // Projektion auf die am besten passende Ebene
  const { projectedPoints, planeNormal } = projectPointsToPlane(points);
  
  // Normalisierte Punkte
  const normalizedPoints = normalizePointsForTriangulation(projectedPoints);

  // Index-Array initialisieren (um das Original-Array nicht zu verändern)
  const indices: number[] = Array.from({ length: normalizedPoints.length }, (_, i) => i);
  const triangles: number[][] = [];

  let remainingPoints = normalizedPoints.length;
  let earFound = false;
  let currentIndex = 0;

  // Schleife, bis nur noch ein Dreieck übrig ist (letzten 3 Punkte)
  while (remainingPoints > 3) {
    earFound = false;

    // Aktuellen Punkt sowie Vorgänger und Nachfolger
    const prevIndex = (currentIndex - 1 + remainingPoints) % remainingPoints;
    const nextIndex = (currentIndex + 1) % remainingPoints;
    
    const prev = normalizedPoints[indices[prevIndex]];
    const current = normalizedPoints[indices[currentIndex]];
    const next = normalizedPoints[indices[nextIndex]];

    // Prüfen, ob der aktuelle Punkt ein "Ear" ist
    if (isEar(normalizedPoints, indices, remainingPoints, currentIndex)) {
      // Dreieck aus den drei Punkten bilden
      triangles.push([
        indices[prevIndex],
        indices[currentIndex], 
        indices[nextIndex]
      ]);

      // Punkt aus der Liste entfernen
      indices.splice(currentIndex, 1);
      remainingPoints--;
      earFound = true;

      // Falls wir den letzten Punkt entfernt haben, gehen wir zum Anfang zurück
      currentIndex = currentIndex % remainingPoints;
    } else {
      // Weiter zum nächsten Punkt
      currentIndex = (currentIndex + 1) % remainingPoints;
    }

    // Sicherheitsabbruch, falls keine Ears gefunden werden
    if (!earFound && currentIndex === 0) {
      // Hier könnten wir alternativ eine Delaunay-Triangulation verwenden
      break;
    }
  }

  // Letztes Dreieck hinzufügen
  if (remainingPoints === 3) {
    triangles.push([indices[0], indices[1], indices[2]]);
  }

  return triangles;
}

/**
 * Prüft, ob ein Punkt ein "Ear" ist (kein anderer Punkt befindet sich im Dreieck)
 */
function isEar(points: Point[], indices: number[], numPoints: number, currentIndex: number): boolean {
  const prevIndex = (currentIndex - 1 + numPoints) % numPoints;
  const nextIndex = (currentIndex + 1) % numPoints;
  
  const p0 = points[indices[prevIndex]];
  const p1 = points[indices[currentIndex]];
  const p2 = points[indices[nextIndex]];
  
  // Konkave Punkte können keine Ears sein
  if (isTriangleClockwise(p0, p1, p2)) {
    return false;
  }
  
  // Prüfe, ob andere Punkte im Dreieck liegen
  for (let i = 0; i < numPoints; i++) {
    // Überspringen der 3 Punkte, die das Dreieck bilden
    if (i === prevIndex || i === currentIndex || i === nextIndex) continue;
    
    const p = points[indices[i]];
    if (isPointInTriangle(p, p0, p1, p2)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Prüft, ob ein Dreieck im Uhrzeigersinn definiert ist
 */
function isTriangleClockwise(p0: Point, p1: Point, p2: Point): boolean {
  return (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y) < 0;
}

/**
 * Prüft, ob ein Punkt innerhalb eines Dreiecks liegt
 */
function isPointInTriangle(p: Point, p0: Point, p1: Point, p2: Point): boolean {
  // Barycentrische Koordinaten zur Prüfung verwenden
  const area = 0.5 * Math.abs(
    (p0.x * (p1.y - p2.y) + p1.x * (p2.y - p0.y) + p2.x * (p0.y - p1.y))
  );
  
  const s = 1 / (2 * area) * (p0.y * p2.x - p0.x * p2.y + (p2.y - p0.y) * p.x + (p0.x - p2.x) * p.y);
  const t = 1 / (2 * area) * (p0.x * p1.y - p0.y * p1.x + (p0.y - p1.y) * p.x + (p1.x - p0.x) * p.y);
  const u = 1 - s - t;
  
  return s >= 0 && t >= 0 && u >= 0;
}

/**
 * Projiziert 3D-Punkte auf eine Best-Fit-Ebene
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

  // 1. Schwerpunkt berechnen
  const centroid = calculateCentroid(points);
  
  // 2. Kovarianzmatrix berechnen
  const covariance = calculateCovarianceMatrix(points, centroid);
  
  // 3. Eigenwerte/Eigenvektoren berechnen (vereinfacht mit der Jacobi-Methode)
  const { eigenvectors } = computeEigenVectors(covariance);
  
  // Der Eigenvektor mit dem kleinsten Eigenwert ist die Normale
  const normal = new THREE.Vector3().fromArray(eigenvectors[0]);
  normal.normalize();
  
  // Erstelle eine Ebene mit dem Centroid und der normalen
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    normal,
    new THREE.Vector3(centroid.x, centroid.y, centroid.z)
  );
  
  // Punkte auf die Ebene projizieren
  const projectedPoints = points.map(point => {
    const p = new THREE.Vector3(point.x, point.y, point.z);
    const projected = new THREE.Vector3();
    
    // Projektion des Punktes auf die Ebene
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
 * Berechnet den Schwerpunkt einer Punktmenge
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
 * Berechnet die Kovarianzmatrix einer Punktmenge
 */
function calculateCovarianceMatrix(points: Point[], centroid: Point): number[][] {
  // 3x3 Matrix initialisieren
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
  
  // Normalisieren
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      covariance[i][j] /= points.length;
    }
  }
  
  return covariance;
}

/**
 * Vereinfachte Berechnung von Eigenvektoren mit der Jacobi-Methode
 * (Vereinfacht für 3x3 Matrizen)
 */
function computeEigenVectors(matrix: number[][]): { 
  eigenvalues: number[], 
  eigenvectors: number[][] 
} {
  // Diagonale ist bereits die Eigenwerte für diese vereinfachte Version
  const eigenvalues = [matrix[0][0], matrix[1][1], matrix[2][2]];
  
  // Einfache Approximation der Eigenvektoren
  // Für präzisere Ergebnisse sollte eine echte Implementierung des Jacobi-Algorithmus verwendet werden
  const v1 = normalizeVector([1, 0, 0]);
  const v2 = normalizeVector([0, 1, 0]);
  const v3 = normalizeVector([0, 0, 1]);
  
  // Eigenvektoren sortieren nach Eigenwerten (Kleinster zuerst)
  const pairs = [
    { value: eigenvalues[0], vector: v1 },
    { value: eigenvalues[1], vector: v2 },
    { value: eigenvalues[2], vector: v3 }
  ].sort((a, b) => a.value - b.value);
  
  return {
    eigenvalues: pairs.map(p => p.value),
    eigenvectors: pairs.map(p => p.vector)
  };
}

/**
 * Normalisiert einen Vektor
 */
function normalizeVector(v: number[]): number[] {
  const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (length === 0) return v;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/**
 * Normalisiert Punkte für die Triangulation
 */
function normalizePointsForTriangulation(points: Point[]): Point[] {
  // Bei dieser Funktion geht es darum, numerische Stabilitätsprobleme zu vermeiden,
  // indem Koordinaten in einen geeigneten Bereich gebracht werden
  
  // Finde die Bounding Box
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
  
  // Berechne Scale-Faktor
  const scaleX = maxX - minX > 0 ? maxX - minX : 1;
  const scaleY = maxY - minY > 0 ? maxY - minY : 1;
  const scaleZ = maxZ - minZ > 0 ? maxZ - minZ : 1;
  
  // Normalisiere die Punkte auf einen Bereich von etwa [0,1]
  return points.map(point => ({
    x: (point.x - minX) / scaleX,
    y: (point.y - minY) / scaleY,
    z: (point.z - minZ) / scaleZ
  }));
}

/**
 * Visualisierungshilfe: Erstellt Three.js-Objekte für die Triangulation
 */
export function createTriangulationVisuals(
  points: Point[],
  triangles: number[][]
): THREE.Group {
  const group = new THREE.Group();
  
  // Material für die Dreiecke
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  
  // Jeden Dreieck rendern
  for (const triangle of triangles) {
    const geometry = new THREE.BufferGeometry();
    
    // Vertices für das Dreieck
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
