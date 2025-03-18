import * as THREE from 'three';
import { nanoid } from 'nanoid';
import { MeasurementMode, Point, Measurement } from '@/types/measurements';
import { calculateDistance, getMidpoint, calculateHeight, calculatePolygonCenter } from './measurementCalculations';
import { 
  COLORS_RGBA, 
  POINT_MATERIAL_SELECT,
  MEASUREMENT_MODES_COLORS,
  AREA_GRADIENT_COLORS,
  SEGMENT_LABEL_OFFSET,
  POINT_SIZE
} from '@/constants/measurements';

// Special larger size for vent markers
const VENT_MARKER_SIZE = 0.5; // Significantly larger than regular points
const VENT_MARKER_COLOR = new THREE.Color(0xff0000); // Bright red for visibility

/**
 * Creates a point mesh
 */
const createPoint = (point: Point, color: number = 0xFF0000, size: number = POINT_SIZE): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(size, 32, 32);
  const material = new THREE.MeshBasicMaterial({ 
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.8,
    depthTest: false
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(point.x, point.y, point.z);
  return mesh;
};

/**
 * Creates a line between two points
 */
const createLine = (start: Point, end: Point, color: number = 0xFF0000): THREE.Line => {
  const material = new THREE.LineBasicMaterial({ 
    color: new THREE.Color(color),
    linewidth: 2,
    depthTest: false
  });
  
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(start.x, start.y, start.z),
    new THREE.Vector3(end.x, end.y, end.z)
  ]);
  
  const line = new THREE.Line(geometry, material);
  return line;
};

/**
 * Creates a label for a measurement
 */
const createLabel = (
  position: THREE.Vector3, 
  text: string, 
  bold: boolean = false,
  color: number = 0xFFFFFF,
  size: number = 0.1
): THREE.Mesh => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.width = 256;
  canvas.height = 128;
  
  if (!context) {
    console.error('Canvas context not available');
    return new THREE.Mesh();
  }
  
  context.font = `${bold ? 'Bold ' : ''}${32}px Arial`;
  context.fillStyle = `rgb(${COLORS_RGBA.white})`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  
  const material = new THREE.MeshBasicMaterial({ 
    map: texture, 
    side: THREE.DoubleSide,
    transparent: true,
    depthTest: false
  });
  
  const geometry = new THREE.PlaneGeometry(size * text.length / 2, size);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  
  return mesh;
};

/**
 * Creates a vent marker (larger red sphere)
 */
const createVentMarker = (point: Point): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(VENT_MARKER_SIZE, 16, 16);
  const material = new THREE.MeshBasicMaterial({ 
    color: VENT_MARKER_COLOR,
    transparent: true,
    opacity: 0.7,
    depthTest: false
  });
  
  const marker = new THREE.Mesh(geometry, material);
  marker.position.set(point.x, point.y, point.z);
  marker.userData = { isVentMarker: true };
  
  return marker;
};

/**
 * Add measurement points, lines, and labels to display in the 3D scene
 */
export const renderMeasurements = (
  measurementsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group,
  measurements: Measurement[],
  clearFirst: boolean = false
) => {
  if (!measurementsGroup || !labelsGroup || !segmentLabelsGroup) return;
  
  if (clearFirst) {
    // Remove all existing measurements
    while (measurementsGroup.children.length > 0) {
      measurementsGroup.remove(measurementsGroup.children[0]);
    }
    
    // Remove all existing labels
    while (labelsGroup.children.length > 0) {
      labelsGroup.remove(labelsGroup.children[0]);
    }
    
    // Remove all existing segment labels
    while (segmentLabelsGroup.children.length > 0) {
      segmentLabelsGroup.remove(segmentLabelsGroup.children[0]);
    }
  }
  
  // Create a material and mesh for each measurement
  measurements.forEach(measurement => {
    if (!measurement.visible) return;
    
    const points = measurement.points;
    const type = measurement.type;
    
    // Skip if no points
    if (!points || points.length === 0) return;
    
    // Create a group for this specific measurement
    const measurementGroup = new THREE.Group();
    measurementGroup.userData = { measurementId: measurement.id };
    
    // For special case of vent markers
    if (type === 'vent' && points.length > 0) {
      const ventMarker = createVentMarker(points[0]);
      measurementGroup.add(ventMarker);
      
      // Add label if available
      if (measurement.label) {
        const position = new THREE.Vector3(points[0].x, points[0].y + 0.3, points[0].z);
        const label = createLabel(
          position,
          measurement.label,
          true,
          MEASUREMENT_MODES_COLORS[type] || 0xFF0000
        );
        label.userData = { measurementId: measurement.id };
        labelsGroup.add(label);
      }
      
      measurementsGroup.add(measurementGroup);
      return;
    }
    
    // Handle length measurements
    if (type === 'length' && points.length === 2) {
      const p1 = points[0];
      const p2 = points[1];
      
      // Create points
      const point1 = createPoint(p1, MEASUREMENT_MODES_COLORS[type]);
      const point2 = createPoint(p2, MEASUREMENT_MODES_COLORS[type]);
      measurementGroup.add(point1, point2);
      
      // Create line
      const line = createLine(p1, p2, MEASUREMENT_MODES_COLORS[type]);
      measurementGroup.add(line);
      
      // Create label
      if (measurement.label) {
        const midpoint = getMidpoint(p1, p2);
        const position = new THREE.Vector3(midpoint.x, midpoint.y + 0.3, midpoint.z);
        const label = createLabel(
          position,
          measurement.label,
          true,
          MEASUREMENT_MODES_COLORS[type] || 0xFF0000
        );
        label.userData = { measurementId: measurement.id };
        labelsGroup.add(label);
      }
    }
    
    // Handle height measurements
    if (type === 'height' && points.length === 2) {
      const p1 = points[0];
      const p2 = points[1];
      
      // Create points
      const point1 = createPoint(p1, MEASUREMENT_MODES_COLORS[type]);
      const point2 = createPoint(p2, MEASUREMENT_MODES_COLORS[type]);
      measurementGroup.add(point1, point2);
      
      // Create line
      const line = createLine(p1, p2, MEASUREMENT_MODES_COLORS[type]);
      measurementGroup.add(line);
      
      // Create label
      if (measurement.label) {
        const midpoint = getMidpoint(p1, p2);
        const position = new THREE.Vector3(midpoint.x, midpoint.y + 0.3, midpoint.z);
        const label = createLabel(
          position,
          measurement.label,
          true,
          MEASUREMENT_MODES_COLORS[type] || 0xFF0000
        );
        label.userData = { measurementId: measurement.id };
        labelsGroup.add(label);
      }
    }
    
    // Handle area measurements
    if (type === 'area' && points.length >= 3) {
      // Create points
      points.forEach(point => {
        const mesh = createPoint(point, MEASUREMENT_MODES_COLORS[type]);
        measurementGroup.add(mesh);
      });
      
      // Create lines
      for (let i = 0; i < points.length; i++) {
        const start = points[i];
        const end = points[(i + 1) % points.length];
        const line = createLine(start, end, MEASUREMENT_MODES_COLORS[type]);
        measurementGroup.add(line);
      }
      
      // Create area fill
      const shape = new THREE.Shape();
      shape.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, points[i].y);
      }
      shape.closePath();
      
      const geometry = new THREE.ShapeGeometry(shape);
      
      // Use a gradient material
      const color1 = new THREE.Color(AREA_GRADIENT_COLORS.start);
      const color2 = new THREE.Color(AREA_GRADIENT_COLORS.end);
      
      const colors = [];
      const positions = geometry.attributes.position;
      
      for (let i = 0; i < positions.count; i++) {
        const point = new THREE.Vector3(
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i)
        );
        
        const alpha = point.y / 5;
        const color = color1.clone().lerp(color2, alpha);
        colors.push(color.r, color.g, color.b);
      }
      
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        depthTest: false
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      measurementGroup.add(mesh);
      
      // Create label
      if (measurement.label) {
        const centroid = calculatePolygonCenter(points);
        const position = new THREE.Vector3(centroid.x, centroid.y + 0.3, centroid.z);
        const label = createLabel(
          position,
          measurement.label,
          true,
          MEASUREMENT_MODES_COLORS[type] || 0xFF0000
        );
        label.userData = { measurementId: measurement.id };
        labelsGroup.add(label);
      }
      
      // Create segment labels
      if (measurement.segments) {
        measurement.segments.forEach(segment => {
          if (!segment.label) return;
          
          const p1 = segment.points[0];
          const p2 = segment.points[1];
          
          const midpoint = getMidpoint(p1, p2);
          const position = new THREE.Vector3(
            midpoint.x, 
            midpoint.y + SEGMENT_LABEL_OFFSET, 
            midpoint.z
          );
          
          const label = createLabel(
            position,
            segment.label,
            false,
            MEASUREMENT_MODES_COLORS[type] || 0xFF0000,
            0.07
          );
          label.userData = { 
            measurementId: measurement.id,
            isSegmentLabel: true
          };
          segmentLabelsGroup.add(label);
        });
      }
    }
    
    measurementsGroup.add(measurementGroup);
  });
};

/**
 * Render current points for active measurement
 */
export const renderCurrentPoints = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  labelsGroup: THREE.Group,
  currentPoints: Point[],
  activeMode: MeasurementMode
) => {
  if (!pointsGroup || !linesGroup || !labelsGroup) return;
  
  // Clear existing points and lines
  while (pointsGroup.children.length > 0) {
    pointsGroup.remove(pointsGroup.children[0]);
  }
  while (linesGroup.children.length > 0) {
    linesGroup.remove(linesGroup.children[0]);
  }
  while (labelsGroup.children.length > 0) {
    labelsGroup.remove(labelsGroup.children[0]);
  }
  
  // Create points
  currentPoints.forEach(point => {
    const mesh = createPoint(point, MEASUREMENT_MODES_COLORS[activeMode]);
    pointsGroup.add(mesh);
  });
  
  // Create lines
  for (let i = 0; i < currentPoints.length - 1; i++) {
    const start = currentPoints[i];
    const end = currentPoints[i + 1];
    const line = createLine(start, end, MEASUREMENT_MODES_COLORS[activeMode]);
    linesGroup.add(line);
  }
};

/**
 * Render edit points for a measurement
 */
export const renderEditPoints = (
  editPointsGroup: THREE.Group,
  measurements: Measurement[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  clearFirst: boolean = false
) => {
  if (!editPointsGroup) return;
  
  if (clearFirst) {
    while (editPointsGroup.children.length > 0) {
      editPointsGroup.remove(editPointsGroup.children[0]);
    }
  }
  
  if (!editMeasurementId) return;
  
  const measurement = measurements.find(m => m.id === editMeasurementId);
  if (!measurement) return;
  
  measurement.points.forEach((point, index) => {
    const color = index === editingPointIndex ? 0x00FFFF : 0xFFFF00;
    const mesh = createPoint(point, color, 0.08);
    editPointsGroup.add(mesh);
  });
};

/**
 * Clear all visuals
 */
export const clearAllVisuals = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  measurementsGroup: THREE.Group,
  editPointsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group
) => {
  if (pointsGroup) {
    while (pointsGroup.children.length > 0) {
      pointsGroup.remove(pointsGroup.children[0]);
    }
  }
  
  if (linesGroup) {
    while (linesGroup.children.length > 0) {
      linesGroup.remove(linesGroup.children[0]);
    }
  }
  
  if (measurementsGroup) {
    while (measurementsGroup.children.length > 0) {
      measurementsGroup.remove(measurementsGroup.children[0]);
    }
  }
  
  if (editPointsGroup) {
    while (editPointsGroup.children.length > 0) {
      editPointsGroup.remove(editPointsGroup.children[0]);
    }
  }
  
  if (labelsGroup) {
    while (labelsGroup.children.length > 0) {
      labelsGroup.remove(labelsGroup.children[0]);
    }
  }
  
  if (segmentLabelsGroup) {
    while (segmentLabelsGroup.children.length > 0) {
      segmentLabelsGroup.remove(segmentLabelsGroup.children[0]);
    }
  }
};
