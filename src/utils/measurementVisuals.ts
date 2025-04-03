
import * as THREE from 'three';
import { Point, Measurement, MeasurementMode } from '@/types/measurements';
import { formatMeasurement } from '@/constants/measurements';

// Color scheme for different measurement types
const COLORS = {
  length: new THREE.Color(0x4caf50),  // Green
  height: new THREE.Color(0x2196f3),  // Blue
  area: new THREE.Color(0xff9800),    // Orange
  solar: new THREE.Color(0xe91e63),   // Pink
  skylight: new THREE.Color(0x9c27b0), // Purple
  chimney: new THREE.Color(0x795548), // Brown
  vent: new THREE.Color(0x607d8b),    // Blue Grey
  hook: new THREE.Color(0x8bc34a),    // Light Green
  other: new THREE.Color(0xff5722),   // Deep Orange
  pvmodule: new THREE.Color(0xe91e63),// Pink
  editPoint: new THREE.Color(0xff0000), // Red
  ridge: new THREE.Color(0xff0000),   // Red
  eave: new THREE.Color(0x2196f3),    // Blue
  verge: new THREE.Color(0x4caf50),   // Green
  valley: new THREE.Color(0x9c27b0),  // Purple
  hip: new THREE.Color(0xff9800)      // Orange
};

// Create a 3D label for measurement
export const createLabel = (
  position: THREE.Vector3, 
  text: string, 
  measurementId?: string,
  isPreview?: boolean,
  scale: number = 1.0
) => {
  const labelDiv = document.createElement('div');
  labelDiv.className = 'measurement-label';
  labelDiv.textContent = text;
  labelDiv.style.color = 'white';
  labelDiv.style.padding = '4px 8px';
  labelDiv.style.background = 'rgba(0, 0, 0, 0.75)';
  labelDiv.style.borderRadius = '4px';
  labelDiv.style.backdropFilter = 'blur(2px)';
  labelDiv.style.fontSize = `${Math.max(12, 14 * scale)}px`;
  labelDiv.style.fontWeight = 'bold';
  labelDiv.style.whiteSpace = 'nowrap';
  labelDiv.style.pointerEvents = 'none';
  labelDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
  
  const label = new THREE.CSS2DObject(labelDiv);
  label.position.copy(position);
  
  if (measurementId) {
    label.userData = { measurementId, isPreview: !!isPreview };
  }
  
  return label;
};

// Render current measurement points
export const renderCurrentPoints = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  labelsGroup: THREE.Group,
  currentPoints: Point[],
  activeMode: MeasurementMode
) => {
  // Clear existing points and lines
  while (pointsGroup.children.length > 0) {
    pointsGroup.remove(pointsGroup.children[0]);
  }
  
  while (linesGroup.children.length > 0) {
    linesGroup.remove(linesGroup.children[0]);
  }
  
  // Remove labels that have no measurement ID (current points)
  labelsGroup.children.forEach(child => {
    if (!child.userData?.measurementId) {
      labelsGroup.remove(child);
    }
  });
  
  if (currentPoints.length === 0) return;
  
  // Get color for current mode
  const color = COLORS[activeMode] || new THREE.Color(0xaaaaaa);
  
  // Create points
  const pointsMaterial = new THREE.MeshBasicMaterial({ color });
  const pointsGeometry = new THREE.SphereGeometry(0.05, 16, 16);
  
  currentPoints.forEach((point, index) => {
    const pointMesh = new THREE.Mesh(pointsGeometry, pointsMaterial);
    pointMesh.position.set(point.x, point.y, point.z);
    pointsGroup.add(pointMesh);
    
    // Add label for point
    const label = createLabel(
      new THREE.Vector3(point.x, point.y, point.z),
      `Punkt ${index + 1}`
    );
    labelsGroup.add(label);
  });
  
  // Create lines connecting points
  if (currentPoints.length > 1) {
    const lineMaterial = new THREE.LineBasicMaterial({ color });
    
    for (let i = 0; i < currentPoints.length - 1; i++) {
      const p1 = currentPoints[i];
      const p2 = currentPoints[i + 1];
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(p1.x, p1.y, p1.z),
        new THREE.Vector3(p2.x, p2.y, p2.z)
      ]);
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      linesGroup.add(line);
      
      // For length measurements, add a distance label
      if (activeMode === 'length' && i === 0) {
        const midPoint = new THREE.Vector3(
          (p1.x + p2.x) / 2,
          (p1.y + p2.y) / 2,
          (p1.z + p2.z) / 2
        );
        
        const distance = Math.sqrt(
          Math.pow(p2.x - p1.x, 2) +
          Math.pow(p2.y - p1.y, 2) +
          Math.pow(p2.z - p1.z, 2)
        );
        
        const label = createLabel(
          midPoint,
          formatMeasurement(distance, 'length'),
          undefined,
          true
        );
        labelsGroup.add(label);
      }
      
      // For height measurements, add a height label
      if (activeMode === 'height' && i === 0) {
        const midPoint = new THREE.Vector3(
          (p1.x + p2.x) / 2,
          (p1.y + p2.y) / 2,
          (p1.z + p2.z) / 2
        );
        
        const height = Math.abs(p2.y - p1.y);
        
        const label = createLabel(
          midPoint,
          formatMeasurement(height, 'height'),
          undefined,
          true
        );
        labelsGroup.add(label);
      }
    }
    
    // Close the loop for area measurements with 3+ points
    if ((activeMode === 'area' || 
         activeMode === 'solar' || 
         activeMode === 'skylight' || 
         activeMode === 'chimney' ||
         activeMode === 'vent' || 
         activeMode === 'hook' || 
         activeMode === 'other' ||
         activeMode === 'pvmodule') && 
        currentPoints.length >= 3) {
      
      const p1 = currentPoints[currentPoints.length - 1];
      const p2 = currentPoints[0];
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(p1.x, p1.y, p1.z),
        new THREE.Vector3(p2.x, p2.y, p2.z)
      ]);
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      linesGroup.add(line);
    }
  }
};

// Render edit points
export const renderEditPoints = (
  editPointsGroup: THREE.Group,
  measurements: Measurement[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  clear: boolean = false
) => {
  if (clear) {
    while (editPointsGroup.children.length > 0) {
      editPointsGroup.remove(editPointsGroup.children[0]);
    }
  }
  
  if (!editMeasurementId) return;
  
  const measurement = measurements.find(m => m.id === editMeasurementId);
  if (!measurement) return;
  
  const color = COLORS.editPoint;
  const pointsMaterial = new THREE.MeshBasicMaterial({ color });
  const pointsGeometry = new THREE.SphereGeometry(0.08, 16, 16);
  
  measurement.points.forEach((point, index) => {
    const highlight = editingPointIndex === index;
    
    const pointMesh = new THREE.Mesh(
      highlight ? new THREE.SphereGeometry(0.1, 16, 16) : pointsGeometry, 
      highlight ? new THREE.MeshBasicMaterial({ color: 0xffff00 }) : pointsMaterial
    );
    pointMesh.position.set(point.x, point.y, point.z);
    pointMesh.userData = { pointIndex: index, measurementId: measurement.id };
    editPointsGroup.add(pointMesh);
  });
};

// Render all measurements
export const renderMeasurements = (
  measurementsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group,
  measurements: Measurement[],
  clear: boolean = false
) => {
  if (clear) {
    while (measurementsGroup.children.length > 0) {
      measurementsGroup.remove(measurementsGroup.children[0]);
    }
    
    // Remove labels with measurement IDs
    const labelsToRemove: THREE.Object3D[] = [];
    labelsGroup.children.forEach(child => {
      if (child.userData?.measurementId) {
        labelsToRemove.push(child);
      }
    });
    
    labelsToRemove.forEach(label => {
      labelsGroup.remove(label);
    });
    
    // Clear segment labels
    while (segmentLabelsGroup.children.length > 0) {
      segmentLabelsGroup.remove(segmentLabelsGroup.children[0]);
    }
  }
  
  measurements.forEach(measurement => {
    if (measurement.visible === false) return;
    
    const color = COLORS[measurement.type] || new THREE.Color(0xaaaaaa);
    
    if (measurement.type === 'length' || measurement.type === 'height') {
      // Render lines for length and height measurements
      renderLineSegment(
        measurementsGroup,
        labelsGroup,
        measurement,
        color
      );
    } else if (measurement.points.length >= 3) {
      // Render polygons for area measurements
      renderPolygon(
        measurementsGroup,
        labelsGroup,
        segmentLabelsGroup,
        measurement,
        color
      );
    }
  });
};

// Render a line segment (length/height measurement)
const renderLineSegment = (
  group: THREE.Group,
  labelsGroup: THREE.Group,
  measurement: Measurement,
  color: THREE.Color
) => {
  if (measurement.points.length < 2) return;
  
  const p1 = measurement.points[0];
  const p2 = measurement.points[1];
  
  // Create line
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color,
    linewidth: 2
  });
  
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(p1.x, p1.y, p1.z),
    new THREE.Vector3(p2.x, p2.y, p2.z)
  ]);
  
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.userData = { measurementId: measurement.id };
  group.add(line);
  
  // Create points
  const pointsMaterial = new THREE.MeshBasicMaterial({ color });
  const pointsGeometry = new THREE.SphereGeometry(0.03, 16, 16);
  
  [p1, p2].forEach(point => {
    const pointMesh = new THREE.Mesh(pointsGeometry, pointsMaterial);
    pointMesh.position.set(point.x, point.y, point.z);
    pointMesh.userData = { measurementId: measurement.id };
    group.add(pointMesh);
  });
  
  // Add label
  if (measurement.label && measurement.labelVisible !== false) {
    const midPoint = new THREE.Vector3(
      (p1.x + p2.x) / 2,
      (p1.y + p2.y) / 2,
      (p1.z + p2.z) / 2
    );
    
    const label = createLabel(
      midPoint,
      measurement.label,
      measurement.id
    );
    labelsGroup.add(label);
  }
};

// Render a polygon (area measurement)
const renderPolygon = (
  group: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group,
  measurement: Measurement,
  color: THREE.Color
) => {
  const { points } = measurement;
  
  // Create shape
  const shape = new THREE.Shape();
  const projectedPoints = projectPoints(points);
  
  shape.moveTo(projectedPoints[0].x, projectedPoints[0].y);
  for (let i = 1; i < projectedPoints.length; i++) {
    shape.lineTo(projectedPoints[i].x, projectedPoints[i].y);
  }
  shape.closePath();
  
  // Create shaded polygon
  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  
  // Apply the projected points to the 3D space
  const vertices = geometry.getAttribute('position').array;
  for (let i = 0; i < vertices.length / 3; i++) {
    const index = Math.min(i, points.length - 1);
    vertices[i * 3 + 2] = points[index].z; // Apply original Z
  }
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData = { measurementId: measurement.id };
  group.add(mesh);
  
  // Draw outline
  const outlineMaterial = new THREE.LineBasicMaterial({ color });
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1.x, p1.y, p1.z),
      new THREE.Vector3(p2.x, p2.y, p2.z)
    ]);
    
    const line = new THREE.Line(lineGeometry, outlineMaterial);
    line.userData = { measurementId: measurement.id };
    group.add(line);
  }
  
  // Draw points
  const pointsMaterial = new THREE.MeshBasicMaterial({ color });
  const pointsGeometry = new THREE.SphereGeometry(0.03, 16, 16);
  
  points.forEach(point => {
    const pointMesh = new THREE.Mesh(pointsGeometry, pointsMaterial);
    pointMesh.position.set(point.x, point.y, point.z);
    pointMesh.userData = { measurementId: measurement.id };
    group.add(pointMesh);
  });
  
  // Add main area label
  if (measurement.label && measurement.labelVisible !== false) {
    const centroid = calculateCentroid(points);
    
    const label = createLabel(
      new THREE.Vector3(centroid.x, centroid.y, centroid.z),
      measurement.label,
      measurement.id
    );
    labelsGroup.add(label);
  }
  
  // Add segment labels if this is a shared segment
  if (measurement.segments) {
    measurement.segments.forEach(segment => {
      if (segment.label && (segment.isOriginal || !segment.shared)) {
        const p1 = segment.points[0];
        const p2 = segment.points[1];
        
        const midPoint = new THREE.Vector3(
          (p1.x + p2.x) / 2,
          (p1.y + p2.y) / 2,
          (p1.z + p2.z) / 2
        );
        
        const label = createLabel(
          midPoint,
          segment.label,
          measurement.id
        );
        segmentLabelsGroup.add(label);
      }
    });
  }
};

// Project points to the appropriate 2D plane
const projectPoints = (points: Point[]) => {
  if (points.length === 0) return [];
  
  // Calculate normal vector by taking the cross product of two edges
  if (points.length < 3) {
    // For less than 3 points, use the XY plane
    return points.map(p => ({ x: p.x, y: p.y }));
  }
  
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
  
  // Determine the dominant axis
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);
  
  if (absX >= absY && absX >= absZ) {
    // Project onto YZ plane
    return points.map(p => ({ x: p.z, y: p.y }));
  } else if (absY >= absX && absY >= absZ) {
    // Project onto XZ plane
    return points.map(p => ({ x: p.x, y: p.z }));
  } else {
    // Project onto XY plane
    return points.map(p => ({ x: p.x, y: p.y }));
  }
};

// Calculate centroid of a set of points
const calculateCentroid = (points: Point[]): Point => {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  
  points.forEach(point => {
    sumX += point.x;
    sumY += point.y;
    sumZ += point.z;
  });
  
  return {
    x: sumX / points.length,
    y: sumY / points.length,
    z: sumZ / points.length
  };
};

// Clear all visual elements
export const clearAllVisuals = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  measurementsGroup: THREE.Group,
  editPointsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group
) => {
  // Clear points
  while (pointsGroup.children.length > 0) {
    pointsGroup.remove(pointsGroup.children[0]);
  }
  
  // Clear lines
  while (linesGroup.children.length > 0) {
    linesGroup.remove(linesGroup.children[0]);
  }
  
  // Clear measurements
  while (measurementsGroup.children.length > 0) {
    measurementsGroup.remove(measurementsGroup.children[0]);
  }
  
  // Clear edit points
  while (editPointsGroup.children.length > 0) {
    editPointsGroup.remove(editPointsGroup.children[0]);
  }
  
  // Clear labels
  while (labelsGroup.children.length > 0) {
    labelsGroup.remove(labelsGroup.children[0]);
  }
  
  // Clear segment labels
  while (segmentLabelsGroup.children.length > 0) {
    segmentLabelsGroup.remove(segmentLabelsGroup.children[0]);
  }
};
