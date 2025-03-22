import * as THREE from 'three';
import { Measurement, Point, Segment } from '@/types/measurements';
import { v4 as uuidv4 } from 'uuid';
import { calculatePolygonArea, calculateSegmentLength } from './measurementCalculations';
import { createPVModuleObjects } from './pvCalculations';

// Constants for visual elements
const POINT_SIZE = 0.1;
const LINE_WIDTH = 2;
const EDIT_POINT_SIZE = 0.15;
const AREA_OPACITY = 0.3;
const AREA_LINE_OPACITY = 0.7;
const LABEL_SCALE = 0.5;
const SEGMENT_LABEL_SCALE = 0.4;

// Colors for different measurement types
const COLORS = {
  length: 0x00ff00, // Green
  height: 0x0000ff, // Blue
  area: 0xff0000,   // Red
  preview: 0xffff00, // Yellow
  edit: 0xff00ff,   // Magenta
  chimney: 0xff6600, // Orange
  skylight: 0x00ffff, // Cyan
  solar: 0xffcc00,   // Gold
  vent: 0xff9900,    // Orange
  hook: 0x9900ff,    // Purple
  other: 0x999999,   // Gray
  ridge: 0x990000,   // Dark Red
  eave: 0x009900,    // Dark Green
  verge: 0x000099,   // Dark Blue
  valley: 0x999900,  // Olive
  hip: 0x990099      // Dark Purple
};

/**
 * Creates a point marker in 3D space
 */
export const createPointMarker = (
  position: THREE.Vector3,
  color: number = 0xffff00,
  size: number = POINT_SIZE,
  isPreview: boolean = false
): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(size, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color });
  const point = new THREE.Mesh(geometry, material);
  point.position.copy(position);
  
  // Add metadata
  point.userData = {
    isPoint: true,
    isPreview
  };
  
  return point;
};

/**
 * Creates a line between two points in 3D space
 */
export const createLine = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number = 0xffff00,
  lineWidth: number = LINE_WIDTH,
  isPreview: boolean = false
): THREE.Line => {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
  const material = new THREE.LineBasicMaterial({ 
    color, 
    linewidth: lineWidth
  });
  const line = new THREE.Line(geometry, material);
  
  // Add metadata
  line.userData = {
    isLine: true,
    isPreview
  };
  
  return line;
};

/**
 * Creates a text label in 3D space
 */
export const createTextLabel = (
  position: THREE.Vector3,
  text: string,
  color: number = 0xffffff,
  scale: number = LABEL_SCALE,
  isPreview: boolean = false,
  measurementId?: string
): THREE.Sprite => {
  // Create canvas for the label
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Sprite(); // Fallback if context creation fails
  
  canvas.width = 256;
  canvas.height = 128;
  
  // Draw background
  context.fillStyle = '#00000080'; // Semi-transparent black
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw border
  context.strokeStyle = '#ffffff';
  context.lineWidth = 2;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  
  // Draw text
  context.font = 'Bold 24px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  
  // Split text into lines if it contains newlines
  const lines = text.split('\n');
  const lineHeight = 24;
  const startY = canvas.height / 2 - (lines.length - 1) * lineHeight / 2;
  
  lines.forEach((line, index) => {
    context.fillText(line, canvas.width / 2, startY + index * lineHeight);
  });
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // Create sprite with the texture
  const material = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(scale * 2, scale, 1);
  
  // Add metadata
  sprite.userData = {
    isLabel: true,
    isPreview,
    measurementId
  };
  
  return sprite;
};

/**
 * Creates a filled polygon for area measurements
 */
export const createAreaPolygon = (
  points: THREE.Vector3[],
  color: number = 0xff0000,
  opacity: number = AREA_OPACITY,
  isPreview: boolean = false
): THREE.Mesh => {
  if (points.length < 3) {
    // Need at least 3 points to create a polygon
    return new THREE.Mesh();
  }
  
  // Create a shape from the points
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].z); // Use X and Z for horizontal plane
  
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].z);
  }
  
  shape.lineTo(points[0].x, points[0].z); // Close the shape
  
  // Create geometry from the shape
  const geometry = new THREE.ShapeGeometry(shape);
  
  // Adjust Y position based on points
  const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  
  // Rotate to lie flat on the XZ plane
  geometry.rotateX(Math.PI / 2);
  
  // Create material
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide
  });
  
  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = avgY + 0.01; // Slight offset to prevent z-fighting
  
  // Add metadata
  mesh.userData = {
    isArea: true,
    isPreview
  };
  
  return mesh;
};

/**
 * Creates a wireframe outline for area measurements
 */
export const createAreaOutline = (
  points: THREE.Vector3[],
  color: number = 0xff0000,
  opacity: number = AREA_LINE_OPACITY,
  isPreview: boolean = false
): THREE.LineLoop => {
  if (points.length < 3) {
    // Need at least 3 points to create an outline
    return new THREE.LineLoop();
  }
  
  // Create geometry from points
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  // Create material
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    linewidth: LINE_WIDTH
  });
  
  // Create line loop
  const lineLoop = new THREE.LineLoop(geometry, material);
  
  // Add metadata
  lineLoop.userData = {
    isAreaOutline: true,
    isPreview
  };
  
  return lineLoop;
};

/**
 * Renders the current points being placed
 */
export const renderCurrentPoints = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  labelsGroup: THREE.Group,
  points: Point[],
  mode: string
): void => {
  // Clear existing points and lines
  while (pointsGroup.children.length > 0) {
    pointsGroup.remove(pointsGroup.children[0]);
  }
  
  while (linesGroup.children.length > 0) {
    linesGroup.remove(linesGroup.children[0]);
  }
  
  // Remove preview labels
  const labelsToRemove: THREE.Object3D[] = [];
  labelsGroup.children.forEach(child => {
    if (child.userData && child.userData.isPreview) {
      labelsToRemove.push(child);
    }
  });
  
  labelsToRemove.forEach(label => {
    labelsGroup.remove(label);
  });
  
  if (points.length === 0) return;
  
  // Get color based on measurement mode
  const color = COLORS[mode as keyof typeof COLORS] || COLORS.preview;
  
  // Add points
  points.forEach((point, index) => {
    const position = new THREE.Vector3(point.x, point.y, point.z);
    const marker = createPointMarker(position, color, POINT_SIZE, true);
    marker.userData.pointIndex = index;
    pointsGroup.add(marker);
  });
  
  // Add lines between points
  for (let i = 0; i < points.length - 1; i++) {
    const start = new THREE.Vector3(points[i].x, points[i].y, points[i].z);
    const end = new THREE.Vector3(points[i + 1].x, points[i + 1].y, points[i + 1].z);
    const line = createLine(start, end, color, LINE_WIDTH, true);
    linesGroup.add(line);
  }
  
  // For area measurements, add a preview polygon if we have at least 3 points
  if (mode === 'area' && points.length >= 3) {
    // Create vectors for the area polygon
    const vectors = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    
    // Add closing line from last point to first point
    const start = new THREE.Vector3(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 1].z);
    const end = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
    const closingLine = createLine(start, end, color, LINE_WIDTH, true);
    closingLine.userData.isClosingLine = true;
    linesGroup.add(closingLine);
    
    // Calculate area for the label
    const area = calculatePolygonArea(points);
    const areaText = `Fläche: ${area.toFixed(2)} m²`;
    
    // Calculate centroid for label position
    const centroid = new THREE.Vector3();
    vectors.forEach(v => {
      centroid.add(v);
    });
    centroid.divideScalar(vectors.length);
    centroid.y += 0.2; // Raise label slightly above the surface
    
    // Create and add label
    const label = createTextLabel(centroid, areaText, 0xffffff, LABEL_SCALE, true);
    labelsGroup.add(label);
  }
  
  // For length measurements, add a distance label
  if (mode === 'length' && points.length >= 2) {
    const lastIndex = points.length - 1;
    const start = new THREE.Vector3(points[lastIndex - 1].x, points[lastIndex - 1].y, points[lastIndex - 1].z);
    const end = new THREE.Vector3(points[lastIndex].x, points[lastIndex].y, points[lastIndex].z);
    
    // Calculate distance
    const distance = start.distanceTo(end);
    const distanceText = `Länge: ${distance.toFixed(2)} m`;
    
    // Position label at midpoint
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    midpoint.y += 0.1; // Raise label slightly above the line
    
    // Create and add label
    const label = createTextLabel(midpoint, distanceText, 0xffffff, LABEL_SCALE, true);
    labelsGroup.add(label);
  }
  
  // For height measurements, add a height label
  if (mode === 'height' && points.length >= 2) {
    const lastIndex = points.length - 1;
    const start = new THREE.Vector3(points[lastIndex - 1].x, points[lastIndex - 1].y, points[lastIndex - 1].z);
    const end = new THREE.Vector3(points[lastIndex].x, points[lastIndex].y, points[lastIndex].z);
    
    // Calculate height (Y difference)
    const height = Math.abs(end.y - start.y);
    const heightText = `Höhe: ${height.toFixed(2)} m`;
    
    // Position label at midpoint
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    midpoint.x += 0.1; // Offset label slightly to the side
    
    // Create and add label
    const label = createTextLabel(midpoint, heightText, 0xffffff, LABEL_SCALE, true);
    labelsGroup.add(label);
  }
};

/**
 * Renders edit points for a measurement being edited
 */
export const renderEditPoints = (
  editPointsGroup: THREE.Group,
  measurements: Measurement[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  clearExisting: boolean = true
): void => {
  // Clear existing edit points if requested
  if (clearExisting) {
    while (editPointsGroup.children.length > 0) {
      editPointsGroup.remove(editPointsGroup.children[0]);
    }
  }
  
  // If no measurement is being edited, return
  if (!editMeasurementId) return;
  
  // Find the measurement being edited
  const measurement = measurements.find(m => m.id === editMeasurementId);
  if (!measurement) return;
  
  // Add edit points for each point in the measurement
  measurement.points.forEach((point, index) => {
    const position = new THREE.Vector3(point.x, point.y, point.z);
    
    // Use a different color for the currently selected point
    const color = (index === editingPointIndex) ? COLORS.edit : COLORS.edit;
    const size = (index === editingPointIndex) ? EDIT_POINT_SIZE * 1.5 : EDIT_POINT_SIZE;
    
    const marker = createPointMarker(position, color, size, false);
    marker.userData.isEditPoint = true;
    marker.userData.pointIndex = index;
    marker.userData.measurementId = measurement.id;
    
    editPointsGroup.add(marker);
  });
};

/**
 * Renders all measurements
 */
export const renderMeasurements = (
  measurementsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group,
  measurements: Measurement[],
  clearExisting: boolean = true
): void => {
  // Clear existing measurements if requested
  if (clearExisting) {
    while (measurementsGroup.children.length > 0) {
      measurementsGroup.remove(measurementsGroup.children[0]);
    }
    
    // Remove non-preview labels
    const labelsToRemove: THREE.Object3D[] = [];
    for (let i = 0; i < labelsGroup.children.length; i++) {
      const child = labelsGroup.children[i];
      if (child.userData && !child.userData.isPreview) {
        labelsToRemove.push(child);
      }
    }
    
    labelsToRemove.forEach(label => {
      labelsGroup.remove(label);
    });
    
    // Clear segment labels
    while (segmentLabelsGroup.children.length > 0) {
      segmentLabelsGroup.remove(segmentLabelsGroup.children[0]);
    }
  }
  
  // Render each measurement
  measurements.forEach(measurement => {
    // Skip if measurement is marked as not visible
    if (measurement.visible === false) return;
    
    // Get color based on measurement type
    const color = COLORS[measurement.type as keyof typeof COLORS] || COLORS.length;
    
    // Create a group for this measurement
    const measurementGroup = new THREE.Group();
    measurementGroup.name = `measurement-${measurement.id}`;
    measurementGroup.userData = {
      measurementId: measurement.id,
      measurementType: measurement.type
    };
    
    // Convert points to Vector3
    const vectors = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    
    // Render based on measurement type
    switch (measurement.type) {
      case 'area':
      case 'solar':
        if (vectors.length >= 3) {
          // Create area polygon
          const polygon = createAreaPolygon(vectors, color, AREA_OPACITY);
          polygon.userData.measurementId = measurement.id;
          measurementGroup.add(polygon);
          
          // Create area outline
          const outline = createAreaOutline(vectors, color, AREA_LINE_OPACITY);
          outline.userData.measurementId = measurement.id;
          measurementGroup.add(outline);
          
          // Add points at vertices
          vectors.forEach((vector, index) => {
            const point = createPointMarker(vector, color, POINT_SIZE * 0.8);
            point.userData.measurementId = measurement.id;
            point.userData.pointIndex = index;
            measurementGroup.add(point);
          });
          
          // Add label at centroid
          const centroid = new THREE.Vector3();
          vectors.forEach(v => {
            centroid.add(v);
          });
          centroid.divideScalar(vectors.length);
          centroid.y += 0.2; // Raise label slightly above the surface
          
          // Create label text
          let labelText = measurement.label || `${measurement.value.toFixed(2)} m²`;
          if (measurement.description) {
            labelText += `\n${measurement.description}`;
          }
          
          // Add PV info if available for solar measurements
          if (measurement.type === 'solar' && measurement.pvModuleInfo) {
            labelText += `\n${measurement.pvModuleInfo.moduleCount} Module`;
          }
          
          const label = createTextLabel(centroid, labelText, 0xffffff, LABEL_SCALE, false, measurement.id);
          label.visible = measurement.labelVisible !== false;
          labelsGroup.add(label);
          
          // Add segment labels if segments exist
          if (measurement.segments) {
            measurement.segments.forEach(segment => {
              if (!segment.points || segment.points.length !== 2) return;
              
              const start = new THREE.Vector3(
                segment.points[0].x,
                segment.points[0].y,
                segment.points[0].z
              );
              
              const end = new THREE.Vector3(
                segment.points[1].x,
                segment.points[1].y,
                segment.points[1].z
              );
              
              // Create segment line
              const segmentLine = createLine(start, end, color, LINE_WIDTH * 0.7);
              segmentLine.userData.measurementId = measurement.id;
              segmentLine.userData.segmentId = segment.id;
              measurementGroup.add(segmentLine);
              
              // Create segment label
              const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
              midpoint.y += 0.05; // Slight offset
              
              const segmentText = segment.label || `${segment.length.toFixed(2)} m`;
              const segmentLabel = createTextLabel(
                midpoint, 
                segmentText, 
                0xffffff, 
                SEGMENT_LABEL_SCALE, 
                false,
                measurement.id
              );
              segmentLabel.userData.segmentId = segment.id;
              segmentLabel.visible = measurement.labelVisible !== false;
              segmentLabelsGroup.add(segmentLabel);
            });
          }
          
          // Add PV module visualization if available
          if (measurement.pvModuleInfo && measurement.pvModuleInfo.moduleCount > 0) {
            const pvModules = createPVModuleObjects(measurement.pvModuleInfo);
            pvModules.userData.measurementId = measurement.id;
            measurementGroup.add(pvModules);
          }
        }
        break;
        
      case 'length':
      case 'ridge':
      case 'eave':
      case 'verge':
      case 'valley':
      case 'hip':
        // Create lines between points
        for (let i = 0; i < vectors.length - 1; i++) {
          const line = createLine(vectors[i], vectors[i + 1], color, LINE_WIDTH);
          line.userData.measurementId = measurement.id;
          line.userData.segmentIndex = i;
          measurementGroup.add(line);
          
          // Add points at vertices
          const point = createPointMarker(vectors[i], color, POINT_SIZE * 0.8);
          point.userData.measurementId = measurement.id;
          point.userData.pointIndex = i;
          measurementGroup.add(point);
          
          // Add endpoint for the last segment
          if (i === vectors.length - 2) {
            const endpoint = createPointMarker(vectors[i + 1], color, POINT_SIZE * 0.8);
            endpoint.userData.measurementId = measurement.id;
            endpoint.userData.pointIndex = i + 1;
            measurementGroup.add(endpoint);
          }
          
          // Add label at midpoint of each segment
          const midpoint = new THREE.Vector3().addVectors(vectors[i], vectors[i + 1]).multiplyScalar(0.5);
          midpoint.y += 0.1; // Raise label slightly
          
          // Calculate length
          const length = vectors[i].distanceTo(vectors[i + 1]);
          
          // Create label text
          let labelText = '';
          if (i === 0 && measurement.label) {
            // Use the main label for the first segment
            labelText = measurement.label;
          } else {
            // Use calculated length for other segments
            labelText = `${length.toFixed(2)} m`;
          }
          
          // Add inclination if available
          if (measurement.inclination !== undefined) {
            labelText += `\n${Math.abs(measurement.inclination).toFixed(1)}°`;
          }
          
          // Add description if available and this is the first segment
          if (i === 0 && measurement.description) {
            labelText += `\n${measurement.description}`;
          }
          
          const label = createTextLabel(midpoint, labelText, 0xffffff, LABEL_SCALE, false, measurement.id);
          label.userData.segmentIndex = i;
          label.visible = measurement.labelVisible !== false;
          labelsGroup.add(label);
        }
        break;
        
      case 'height':
        // Create vertical line
        if (vectors.length >= 2) {
          const line = createLine(vectors[0], vectors[1], color, LINE_WIDTH);
          line.userData.measurementId = measurement.id;
          measurementGroup.add(line);
          
          // Add points at endpoints
          vectors.forEach((vector, index) => {
            const point = createPointMarker(vector, color, POINT_SIZE * 0.8);
            point.userData.measurementId = measurement.id;
            point.userData.pointIndex = index;
            measurementGroup.add(point);
          });
          
          // Add label at midpoint
          const midpoint = new THREE.Vector3().addVectors(vectors[0], vectors[1]).multiplyScalar(0.5);
          midpoint.x += 0.1; // Offset label to the side
          
          // Create label text
          let labelText = measurement.label || `${measurement.value.toFixed(2)} m`;
          if (measurement.description) {
            labelText += `\n${measurement.description}`;
          }
          
          const label = createTextLabel(midpoint, labelText, 0xffffff, LABEL_SCALE, false, measurement.id);
          label.visible = measurement.labelVisible !== false;
          labelsGroup.add(label);
        }
        break;
        
      case 'chimney':
      case 'skylight':
      case 'vent':
      case 'hook':
      case 'other':
        // For roof elements, create a marker or outline
        if (vectors.length >= 3) {
          // Create area polygon with higher opacity
          const polygon = createAreaPolygon(vectors, color, AREA_OPACITY * 1.5);
          polygon.userData.measurementId = measurement.id;
          measurementGroup.add(polygon);
          
          // Create area outline
          const outline = createAreaOutline(vectors, color, AREA_LINE_OPACITY * 1.2);
          outline.userData.measurementId = measurement.id;
          measurementGroup.add(outline);
          
          // Add points at vertices
          vectors.forEach((vector, index) => {
            const point = createPointMarker(vector, color, POINT_SIZE * 0.8);
            point.userData.measurementId = measurement.id;
            point.userData.pointIndex = index;
            measurementGroup.add(point);
          });
          
          // Add label at centroid
          const centroid = new THREE.Vector3();
          vectors.forEach(v => {
            centroid.add(v);
          });
          centroid.divideScalar(vectors.length);
          centroid.y += 0.2; // Raise label slightly
          
          // Create label text
          let labelText = getElementLabel(measurement);
          
          const label = createTextLabel(centroid, labelText, 0xffffff, LABEL_SCALE, false, measurement.id);
          label.visible = measurement.labelVisible !== false;
          labelsGroup.add(label);
        } else if (vectors.length === 1) {
          // For single point markers (like vents)
          const point = createPointMarker(vectors[0], color, POINT_SIZE * 1.2);
          point.userData.measurementId = measurement.id;
          point.userData.pointIndex = 0;
          measurementGroup.add(point);
          
          // Add label
          const labelPos = new THREE.Vector3(vectors[0].x, vectors[0].y + 0.2, vectors[0].z);
          
          // Create label text
          let labelText = getElementLabel(measurement);
          
          const label = createTextLabel(labelPos, labelText, 0xffffff, LABEL_SCALE, false, measurement.id);
          label.visible = measurement.labelVisible !== false;
          labelsGroup.add(label);
        }
        break;
    }
    
    // Add the measurement group to the main group
    measurementsGroup.add(measurementGroup);
  });
};

/**
 * Helper function to generate label text for roof elements
 */
function getElementLabel(measurement: Measurement): string {
  let labelText = '';
  
  // Add type name
  switch (measurement.type) {
    case 'chimney': labelText = 'Kamin'; break;
    case 'skylight': labelText = 'Dachfenster'; break;
    case 'solar': labelText = 'Solaranlage'; break;
    case 'vent': labelText = 'Lüfter'; break;
    case 'hook': labelText = 'Dachhaken'; break;
    case 'other': labelText = 'Einbau'; break;
    default: labelText = measurement.type;
  }
  
  // Add subtype if available
  if (measurement.subType) {
    labelText += ` (${measurement.subType})`;
  }
  
  // Add count if available
  if (measurement.count && measurement.count > 0) {
    labelText += `\nAnzahl: ${measurement.count}`;
  }
  
  // Add dimensions if available
  if (measurement.dimensions) {
    if (measurement.dimensions.width && measurement.dimensions.length) {
      labelText += `\n${measurement.dimensions.width.toFixed(2)}m × ${measurement.dimensions.length.toFixed(2)}m`;
    } else if (measurement.dimensions.diameter) {
      labelText += `\nØ ${measurement.dimensions.diameter.toFixed(2)}m`;
    } else if (measurement.dimensions.area) {
      labelText += `\n${measurement.dimensions.area.toFixed(2)}m²`;
    }
  }
  
  // Add description if available
  if (measurement.description) {
    labelText += `\n${measurement.description}`;
  }
  
  return labelText;
}

/**
 * Updates the visibility of a label based on measurement visibility
 */
export const updateLabelVisibility = (
  label: THREE.Object3D,
  isPreview: boolean,
  measurementId?: string
): void => {
  // Preview labels are always visible
  if (isPreview) {
    label.visible = true;
    return;
  }
  
  // If no measurement ID, default to visible
  if (!measurementId) {
    label.visible = true;
    return;
  }
};

/**
 * Clears all measurement visuals
 */
export const clearAllVisuals = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  measurementsGroup: THREE.Group,
  editPointsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group
): void => {
  // Clear all groups
  while (pointsGroup.children.length > 0) {
    pointsGroup.remove(pointsGroup.children[0]);
  }
  
  while (linesGroup.children.length > 0) {
    linesGroup.remove(linesGroup.children[0]);
  }
  
  while (measurementsGroup.children.length > 0) {
    measurementsGroup.remove(measurementsGroup.children[0]);
  }
  
  while (editPointsGroup.children.length > 0) {
    editPointsGroup.remove(editPointsGroup.children[0]);
  }
  
  while (labelsGroup.children.length > 0) {
    labelsGroup.remove(labelsGroup.children[0]);
  }
  
  while (segmentLabelsGroup.children.length > 0) {
    segmentLabelsGroup.remove(segmentLabelsGroup.children[0]);
  }
};

/**
 * Creates a preview of a measurement being edited
 */
export const createMeasurementPreview = (
  points: Point[],
  type: string,
  color: number = COLORS.preview
): THREE.Group => {
  const previewGroup = new THREE.Group();
  previewGroup.name = 'measurement-preview';
  
  // Convert points to Vector3
  const vectors = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  
  // Create preview based on measurement type
  switch (type) {
    case 'area':
    case 'solar':
      if (vectors.length >= 3) {
        // Create area polygon
        const polygon = createAreaPolygon(vectors, color, AREA_OPACITY * 0.7, true);
        previewGroup.add(polygon);
        
        // Create area outline
        const outline = createAreaOutline(vectors, color, AREA_LINE_OPACITY, true);
        previewGroup.add(outline);
      }
      break;
      
    case 'length':
    case 'ridge':
    case 'eave':
    case 'verge':
    case 'valley':
    case 'hip':
      // Create lines between points
      for (let i = 0; i < vectors.length - 1; i++) {
        const line = createLine(vectors[i], vectors[i + 1], color, LINE_WIDTH, true);
        previewGroup.add(line);
      }
      break;
      
    case 'height':
      // Create vertical line
      if (vectors.length >= 2) {
        const line = createLine(vectors[0], vectors[1], color, LINE_WIDTH, true);
        previewGroup.add(line);
      }
      break;
      
    case 'chimney':
    case 'skylight':
    case 'vent':
    case 'hook':
    case 'other':
      if (vectors.length >= 3) {
        // Create area polygon with higher opacity
        const polygon = createAreaPolygon(vectors, color, AREA_OPACITY, true);
        previewGroup.add(polygon);
        
        // Create area outline
        const outline = createAreaOutline(vectors, color, AREA_LINE_OPACITY, true);
        previewGroup.add(outline);
      } else if (vectors.length === 1) {
        // For single point markers
        const point = createPointMarker(vectors[0], color, POINT_SIZE * 1.2, true);
        previewGroup.add(point);
      }
      break;
  }
  
  return previewGroup;
};

/**
 * Creates a preview point indicator
 */
export const createAddPointIndicator = (
  position: THREE.Vector3,
  color: number = 0xffff00
): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'add-point-indicator';
  
  // Create a pulsing sphere
  const geometry = new THREE.SphereGeometry(POINT_SIZE * 1.5, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7
  });
  
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.copy(position);
  group.add(sphere);
  
  // Create a smaller, solid sphere in the center
  const innerGeometry = new THREE.SphereGeometry(POINT_SIZE * 0.5, 16, 16);
  const innerMaterial = new THREE.MeshBasicMaterial({ color });
  
  const innerSphere = new THREE.Mesh(innerGeometry, innerMaterial);
  innerSphere.position.copy(position);
  group.add(innerSphere);
  
  // Add animation data to the group's userData
  group.userData = {
    isAddPointIndicator: true,
    animationStartTime: Date.now(),
    pulse: {
      min: 0.7,
      max: 1.0,
      speed: 0.002
    }
  };
  
  return group;
};

/**
 * Animates the add point indicator
 */
export const animateAddPointIndicator = (indicator: THREE.Group): void => {
  if (!indicator.userData || !indicator.userData.isAddPointIndicator) return;
  
  const now = Date.now();
  const elapsed = now - indicator.userData.animationStartTime;
  const pulse = indicator.userData.pulse;
  
  // Calculate pulsing opacity
  const opacity = pulse.min + (Math.sin(elapsed * pulse.speed) * 0.5 + 0.5) * (pulse.max - pulse.min);
  
  // Update material opacity
  if (indicator.children[0] && indicator.children[0].material) {
    indicator.children[0].material.opacity = opacity;
  }
};

/**
 * Updates the position of a measurement point
 */
export const updateMeasurementPointPosition = (
  measurementsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group,
  measurements: Measurement[],
  measurementId: string,
  pointIndex: number,
  newPosition: THREE.Vector3
): void => {
  // Find the measurement
  const measurement = measurements.find(m => m.id === measurementId);
  if (!measurement) return;
  
  // Update the point in the measurement
  measurement.points[pointIndex] = {
    x: newPosition.x,
    y: newPosition.y,
    z: newPosition.z
  };
  
  // Re-render the measurement
  const measurementGroup = measurementsGroup.children.find(
    child => child.userData && child.userData.measurementId === measurementId
  );
  
  if (measurementGroup) {
    // Remove the old measurement visualization
    measurementsGroup.remove(measurementGroup);
  }
  
  // Remove labels for this measurement
  const labelsToRemove: THREE.Object3D[] = [];
  for (let i = 0; i < labelsGroup.children.length; i++) {
    const child = labelsGroup.children[i];
    if (child.userData && child.userData.measurementId === measurementId) {
      labelsToRemove.push(child);
    }
  }
  
  labelsToRemove.forEach(label => {
    labelsGroup.remove(label);
  });
  
  // Remove segment labels for this measurement
  const segmentLabelsToRemove: THREE.Object3D[] = [];
  for (let i = 0; i < segmentLabelsGroup.children.length; i++) {
    const child = segmentLabelsGroup.children[i];
    if (child.userData && child.userData.measurementId === measurementId) {
      segmentLabelsToRemove.push(child);
    }
  }
  
  segmentLabelsToRemove.forEach(label => {
    segmentLabelsGroup.remove(label);
  });
  
  // Re-render just this measurement
  renderMeasurements(
    measurementsGroup,
    labelsGroup,
    segmentLabelsGroup,
    [measurement],
    false
  );
};
