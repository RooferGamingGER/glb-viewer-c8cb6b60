import * as THREE from 'three';
import { Point } from '@/types/measurements';
import { createPVModuleVisuals } from './pvCalculations';

/**
 * Configuration for the measurement points
 */
const pointSize = 0.05;
const pointColor = 0x0099ff;

/**
 * Configuration for the measurement lines
 */
const lineColor = 0x0099ff;
const lineWidth = 2;

/**
 * Configuration for the edit points
 */
const editPointSize = 0.07;
const editPointColor = 0xffff00;

/**
 * Configuration for the labels
 */
const labelColor = '#ffffff';
const labelSize = 0.08;
const labelBackgroundColor = 'rgba(0, 0, 0, 0.7)';

/**
 * Render a point
 */
function renderPoint(point: Point, color: number = pointColor, size: number = pointSize): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(size, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: color });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(point.x, point.y, point.z);
  return sphere;
}

/**
 * Render a line between two points
 */
function renderLine(start: Point, end: Point, color: number = lineColor): THREE.Line {
  const material = new THREE.LineBasicMaterial({ color: color, linewidth: lineWidth });
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(start.x, start.y, start.z),
    new THREE.Vector3(end.x, end.y, end.z)
  ]);
  return new THREE.Line(geometry, material);
}

/**
 * Render a text label
 */
function renderTextLabel(
  text: string,
  position: THREE.Vector3,
  options: {
    color?: string;
    size?: number;
    backgroundColor?: string;
    borderRadius?: number;
  } = {}
): THREE.Object3D {
  const { color = labelColor, size = labelSize, backgroundColor = labelBackgroundColor, borderRadius = 2 } = options;
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    console.error('Canvas context not available');
    return new THREE.Object3D();
  }
  
  // Font settings
  const font = `${size * 50}px Inter, sans-serif`;
  context.font = font;
  
  // Measure text width
  const textWidth = context.measureText(text).width;
  
  // Set canvas dimensions (increased for padding)
  const padding = size * 50 * 0.5; // Adjust padding based on text size
  canvas.width = textWidth + 2 * padding;
  canvas.height = size * 50 + 2 * padding;
  
  // Re-apply font settings after resizing
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Draw rounded background
  context.fillStyle = backgroundColor;
  
  // Rounded rectangle drawing function
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }
  
  roundRect(context, 0, 0, canvas.width, canvas.height, borderRadius * 5);
  
  // Draw text
  context.fillStyle = color;
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // Create sprite material
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, sizeAttenuation: true });
  
  // Create sprite
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width / 5000, canvas.height / 5000, 1); // Adjust scale as needed
  sprite.position.copy(position);
  
  return sprite;
}

/**
 * Render the current points
 */
export function renderCurrentPoints(
  pointsGroup: THREE.Group | null,
  linesGroup: THREE.Group | null,
  labelsGroup: THREE.Group | null,
  points: Point[],
  activeMode: string
): void {
  if (!pointsGroup || !linesGroup || !labelsGroup) return;
  
  // Clear existing points and lines
  while (pointsGroup.children.length > 0) {
    pointsGroup.remove(pointsGroup.children[0]);
  }
  while (linesGroup.children.length > 0) {
    linesGroup.remove(linesGroup.children[0]);
  }
  
  // Render new points
  points.forEach((point, index) => {
    const sphere = renderPoint(point);
    sphere.userData = {
      type: 'measurementPoint',
      index: index,
      isPreview: true
    };
    pointsGroup.add(sphere);
    
    // Render labels for points
    const labelPosition = new THREE.Vector3(point.x, point.y + pointSize * 2, point.z);
    const label = renderTextLabel(`${index + 1}`, labelPosition, { size: labelSize * 0.75 });
    label.userData = {
      type: 'measurementLabel',
      index: index,
      isPreview: true
    };
    labelsGroup.add(label);
  });
  
  // Render lines between points
  for (let i = 0; i < points.length - 1; i++) {
    const line = renderLine(points[i], points[i + 1]);
    line.userData = {
      type: 'measurementLine',
      index: i,
      isPreview: true
    };
    linesGroup.add(line);
  }
}

/**
 * Render the edit points
 */
export function renderEditPoints(
  editPointsGroup: THREE.Group | null,
  measurements: any[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  clearExisting: boolean = false
): void {
  if (!editPointsGroup) return;
  
  if (clearExisting) {
    while (editPointsGroup.children.length > 0) {
      editPointsGroup.remove(editPointsGroup.children[0]);
    }
  }
  
  if (!editMeasurementId) return;
  
  const measurement = measurements.find(m => m.id === editMeasurementId);
  if (!measurement) return;
  
  measurement.points.forEach((point, index) => {
    const sphere = renderPoint(point, editPointColor, editPointSize);
    sphere.userData = {
      type: 'editPoint',
      measurementId: measurement.id,
      index: index,
      isBeingDragged: index === editingPointIndex
    };
    editPointsGroup.add(sphere);
  });
}

/**
 * Clear all visuals
 */
export function clearAllVisuals(
  pointsGroup: THREE.Group | null,
  linesGroup: THREE.Group | null,
  measurementsGroup: THREE.Group | null,
  editPointsGroup: THREE.Group | null,
  labelsGroup: THREE.Group | null,
  segmentLabelsGroup: THREE.Group | null
): void {
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
}

/**
 * Render a segment label
 */
export function renderSegmentLabel(
  text: string,
  position: THREE.Vector3,
  options: {
    color?: string;
    size?: number;
    backgroundColor?: string;
    borderRadius?: number;
  } = {}
): THREE.Object3D {
  const { color = labelColor, size = labelSize, backgroundColor = labelBackgroundColor, borderRadius = 2 } = options;
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    console.error('Canvas context not available');
    return new THREE.Object3D();
  }
  
  // Font settings
  const font = `${size * 50}px Inter, sans-serif`;
  context.font = font;
  
  // Measure text width
  const textWidth = context.measureText(text).width;
  
  // Set canvas dimensions (increased for padding)
  const padding = size * 50 * 0.5; // Adjust padding based on text size
  canvas.width = textWidth + 2 * padding;
  canvas.height = size * 50 + 2 * padding;
  
  // Re-apply font settings after resizing
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Draw rounded background
  context.fillStyle = backgroundColor;
  
  // Rounded rectangle drawing function
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }
  
  roundRect(context, 0, 0, canvas.width, canvas.height, borderRadius * 5);
  
  // Draw text
  context.fillStyle = color;
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // Create sprite material
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, sizeAttenuation: true });
  
  // Create sprite
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width / 5000, canvas.height / 5000, 1); // Adjust scale as needed
  sprite.position.copy(position);
  
  return sprite;
}

/**
 * Render PV module visualization for an area measurement
 * @param parent - The parent THREE.Group to add the visualization to
 * @param measurement - The measurement containing PV module info
 */
export const renderPVModules = (
  parent: THREE.Group | null,
  measurement: any
): void => {
  if (!parent || !measurement || !measurement.pvModuleInfo || measurement.pvModuleInfo.moduleCount === 0) {
    return;
  }
  
  // Remove any existing PV module visualizations
  const existingModules = parent.children.find(child => child.name === "pvModules");
  if (existingModules) {
    parent.remove(existingModules);
  }
  
  // Create new PV module visualizations
  const moduleVisuals = createPVModuleVisuals(measurement.pvModuleInfo);
  parent.add(moduleVisuals);
};

/**
 * Render measurements
 * Update to include PV module visualization
 */
export const renderMeasurements = (
  measurementsGroup: THREE.Group | null,
  labelsGroup: THREE.Group | null,
  segmentLabelsGroup: THREE.Group | null,
  measurements: any[],
  clearExisting: boolean = false
): void => {
  if (!measurementsGroup || !labelsGroup || !segmentLabelsGroup) return;
  
  if (clearExisting) {
    while (measurementsGroup.children.length > 0) {
      measurementsGroup.remove(measurementsGroup.children[0]);
    }
    
    while (labelsGroup.children.length > 0) {
      labelsGroup.remove(labelsGroup.children[0]);
    }
    
    while (segmentLabelsGroup.children.length > 0) {
      segmentLabelsGroup.remove(segmentLabelsGroup.children[0]);
    }
  }
  
  measurements.forEach((measurement) => {
    if (measurement.type === 'length' || measurement.type === 'height') {
      if (measurement.visible !== false) {
        const start = measurement.points[0];
        const end = measurement.points[1];
        
        // Render the line
        const line = renderLine(start, end);
        line.userData = {
          type: 'measurementLine',
          measurementId: measurement.id
        };
        measurementsGroup.add(line);
        
        // Render labels
        if (measurement.labelVisible !== false) {
          const labelPosition = new THREE.Vector3(
            (start.x + end.x) / 2,
            (start.y + end.y) / 2 + pointSize * 4,
            (start.z + end.z) / 2
          );
          
          const label = renderTextLabel(measurement.label, labelPosition);
          label.userData = {
            type: 'measurementLabel',
            measurementId: measurement.id
          };
          labelsGroup.add(label);
        }
      }
    } else if (measurement.type === 'area' || measurement.type === 'solar') {
      if (measurement.visible !== false) {
        const points = measurement.points;
        
        // Render lines between points
        for (let i = 0; i < points.length - 1; i++) {
          const line = renderLine(points[i], points[i + 1]);
          line.userData = {
            type: 'measurementLine',
            measurementId: measurement.id
          };
          measurementsGroup.add(line);
        }
        
        // Render the closing line
        const closingLine = renderLine(points[points.length - 1], points[0]);
        closingLine.userData = {
          type: 'measurementLine',
          measurementId: measurement.id
        };
        measurementsGroup.add(closingLine);
        
        // Render labels
        if (measurement.labelVisible !== false) {
          // Calculate centroid for label position
          let centroid = new THREE.Vector3(0, 0, 0);
          points.forEach(point => {
            centroid.x += point.x;
            centroid.y += point.y;
            centroid.z += point.z;
          });
          centroid.divideScalar(points.length);
          centroid.y += pointSize * 4;
          
          const label = renderTextLabel(measurement.label, centroid);
          label.userData = {
            type: 'measurementLabel',
            measurementId: measurement.id
          };
          labelsGroup.add(label);
        }
        
        // Render segment labels
        if (measurement.segments && measurement.labelVisible !== false) {
          measurement.segments.forEach((segment, index) => {
            const start = segment.points[0];
            const end = segment.points[1];
            
            const labelPosition = new THREE.Vector3(
              (start.x + end.x) / 2,
              (start.y + end.y) / 2 + pointSize * 2,
              (start.z + end.z) / 2
            );
            
            const label = renderSegmentLabel(segment.label || '', labelPosition);
            label.userData = {
              type: 'segmentLabel',
              measurementId: measurement.id,
              segmentId: segment.id
            };
            segmentLabelsGroup.add(label);
          });
        }
      }
    }
    
    // Add PV module visualization for area measurements with PV info
    if (measurement.type === 'area' && 
        measurement.pvModuleInfo && 
        measurement.pvModuleInfo.moduleCount > 0 && 
        measurement.visible !== false) {
      renderPVModules(measurementsGroup, measurement);
    }
  });
};
