import * as THREE from 'three';
import earcut from 'earcut';
import { Measurement, MeasurementMode, Point, Segment } from '@/types/measurements';
import { createTextSprite } from './textSprite';
import { calculateArea, calculatePolygonCenter, measureSegmentLengths } from './measurementCalculations';

// Constants for visual appearance
const POINT_SIZE = 10;
const LINE_WIDTH = 2;
const PREVIEW_LINE_WIDTH = 3;
const DEFAULT_LINE_COLOR = 0x0066cc;       // Blue for regular lines
const DEFAULT_POINT_COLOR = 0x0066cc;      // Blue for regular points
const AREA_FILL_COLOR = 0x0066cc;          // Blue for area fill
const AREA_FILL_OPACITY = 0.25;            // Low opacity for area fill
const PV_FILL_COLOR = 0xff6600;            // Orange for PV module area
const PV_OUTLINE_COLOR = 0xff6600;         // Orange for PV module outline
const PV_POINT_COLOR = 0xff6600;           // Orange for PV module points
const EDIT_POINT_COLOR = 0xff0000;         // Red for edit points
const EDIT_LINE_COLOR = 0xff0000;          // Red for edit lines
const PREVIEW_LINE_COLOR = 0x00ff00;       // Green for preview lines
const RIDGE_COLOR = 0xff0000;              // Red for roof ridge
const EAVE_COLOR = 0x0000ff;               // Blue for eave
const VERGE_COLOR = 0x00ff00;              // Green for verge
const VALLEY_COLOR = 0xff00ff;             // Purple for valley
const HIP_COLOR = 0xffff00;                // Yellow for hip
const LABEL_BACKGROUND = 'rgba(0,0,0,0.7)'; // Black background with 70% opacity

// Helper function to convert number to hex string for labels
const colorToHexString = (color: number): string => {
  return '#' + color.toString(16).padStart(6, '0');
};

/**
 * Creates a measurement point (sphere) at the given position
 */
const createMeasurementPoint = (
  position: THREE.Vector3,
  color: number = DEFAULT_POINT_COLOR,
  size: number = POINT_SIZE,
  isPreview: boolean = false
): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(size / 150, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color,
    depthTest: !isPreview,
    transparent: isPreview,
    opacity: isPreview ? 0.7 : 1.0
  });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.copy(position);
  sphere.renderOrder = isPreview ? 2 : 1; // Ensure preview points render on top
  return sphere;
};

/**
 * Creates a measurement line between two points
 */
const createMeasurementLine = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number = DEFAULT_LINE_COLOR,
  lineWidth: number = LINE_WIDTH,
  isPreview: boolean = false
): THREE.Line => {
  const points = [start, end];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    linewidth: lineWidth,
    depthTest: !isPreview,
    transparent: isPreview,
    opacity: isPreview ? 0.7 : 1.0
  });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = isPreview ? 2 : 1; // Ensure preview lines render on top
  return line;
};

/**
 * Creates a text label for a measurement
 */
const createMeasurementLabel = (
  position: THREE.Vector3,
  text: string,
  color: string = '#0066cc',
  size: number = 24,
  backgroundColor: string = LABEL_BACKGROUND,
  offset: { x: number, y: number } = { x: 0, y: 0 },
  isPreview: boolean = false
): THREE.Sprite => {
  const sprite = createTextSprite(text, {
    fontColor: color,
    fontSize: size,
    backgroundColor,
    offset
  });
  sprite.position.copy(position);
  sprite.renderOrder = isPreview ? 2 : 1; // Ensure preview labels render on top
  sprite.userData = { isPreview };
  return sprite;
};

/**
 * Creates a filled area from a set of points
 */
const createAreaFill = (
  points: THREE.Vector3[],
  color: number = AREA_FILL_COLOR,
  opacity: number = AREA_FILL_OPACITY
): THREE.Mesh => {
  if (points.length < 3) {
    throw new Error('Cannot create area with less than 3 points');
  }

  // Project points to 2D for triangulation
  const vertices: number[] = [];
  const positions: number[] = [];
  const indices: number[] = [];

  // Create 2D vertices array for earcut triangulation
  points.forEach(point => {
    vertices.push(point.x, point.z);
    positions.push(point.x, point.y, point.z);
  });

  // Get triangulation indices
  const triangleIndices = earcut(vertices, null, 2);
  
  // Create geometry from triangulated indices
  const geometry = new THREE.BufferGeometry();
  const positionArray = new Float32Array(positions);
  geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
  geometry.setIndex(triangleIndices);
  
  // Compute vertex normals
  geometry.computeVertexNormals();
  
  // Create material and mesh
  const material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  
  return new THREE.Mesh(geometry, material);
};

/**
 * Renders current measurement points and lines being actively created
 */
export const renderCurrentPoints = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  labelsGroup: THREE.Group,
  points: THREE.Vector3[],
  mode: MeasurementMode
): void => {
  // Clear previous points and lines
  while (pointsGroup.children.length > 0) {
    pointsGroup.remove(pointsGroup.children[0]);
  }
  
  while (linesGroup.children.length > 0) {
    linesGroup.remove(linesGroup.children[0]);
  }
  
  // Remove temporary labels (those without a measurementId)
  for (let i = labelsGroup.children.length - 1; i >= 0; i--) {
    const label = labelsGroup.children[i];
    if (!label.userData?.measurementId) {
      labelsGroup.remove(label);
    }
  }
  
  if (points.length === 0) return;
  
  // Determine colors based on measurement mode
  let pointColor = DEFAULT_POINT_COLOR;
  let lineColor = DEFAULT_LINE_COLOR;
  
  switch (mode) {
    case 'ridge':
      pointColor = lineColor = RIDGE_COLOR;
      break;
    case 'eave':
      pointColor = lineColor = EAVE_COLOR;
      break;
    case 'verge':
      pointColor = lineColor = VERGE_COLOR;
      break;
    case 'valley':
      pointColor = lineColor = VALLEY_COLOR;
      break;
    case 'hip':
      pointColor = lineColor = HIP_COLOR;
      break;
    case 'solar':
      pointColor = lineColor = PV_FILL_COLOR;
      break;
    default:
      break;
  }
  
  // Add points
  points.forEach((point, index) => {
    const mesh = createMeasurementPoint(point, pointColor);
    mesh.userData = { pointIndex: index };
    pointsGroup.add(mesh);
  });
  
  // Add lines between consecutive points
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const line = createMeasurementLine(start, end, lineColor);
    line.userData = { startIndex: i, endIndex: i + 1 };
    linesGroup.add(line);
    
    // If it's a length measurement, add a temporary label
    if (mode === 'length' || ['ridge', 'eave', 'verge', 'valley', 'hip', 'solar'].includes(mode)) {
      const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const distance = start.distanceTo(end);
      const label = createMeasurementLabel(
        midpoint,
        `${distance.toFixed(2)} m`,
        colorToHexString(lineColor)
      );
      labelsGroup.add(label);
    }
  }
  
  // For area measurements, close the polygon if we have at least 3 points
  if ((mode === 'area' || mode === 'solar') && points.length >= 3) {
    const start = points[points.length - 1];
    const end = points[0];
    const line = createMeasurementLine(start, end, lineColor);
    line.userData = { startIndex: points.length - 1, endIndex: 0 };
    linesGroup.add(line);
    
    // Add a temporary label on the closing line
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const distance = start.distanceTo(end);
    const label = createMeasurementLabel(
      midpoint,
      `${distance.toFixed(2)} m`,
      colorToHexString(lineColor)
    );
    labelsGroup.add(label);
    
    // Calculate and display area if we have a closed polygon
    // Convert THREE.Vector3 array to Point array for calculcations
    const pointsForCalculation: Point[] = points.map(p => ({ x: p.x, y: p.y, z: p.z }));
    const area = calculateArea(pointsForCalculation);
    
    // Calculate center for label placement
    const center = calculatePolygonCenter(points);
    
    const areaLabel = createMeasurementLabel(
      center,
      `${area.toFixed(2)} m²`,
      colorToHexString(mode === 'solar' ? PV_FILL_COLOR : AREA_FILL_COLOR),
      32,
      LABEL_BACKGROUND,
      { x: 0, y: 0 }
    );
    
    labelsGroup.add(areaLabel);
  }
};

/**
 * Renders all finalized measurements
 */
export const renderMeasurements = (
  measurementsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group,
  measurements: Measurement[],
  recreate: boolean = false
): void => {
  // Clear all existing measurements if recreating
  if (recreate) {
    while (measurementsGroup.children.length > 0) {
      measurementsGroup.remove(measurementsGroup.children[0]);
    }
    
    // Remove labels that belong to measurements
    for (let i = labelsGroup.children.length - 1; i >= 0; i--) {
      const label = labelsGroup.children[i];
      if (label.userData?.measurementId) {
        labelsGroup.remove(label);
      }
    }
    
    // Remove all segment labels
    while (segmentLabelsGroup.children.length > 0) {
      segmentLabelsGroup.remove(segmentLabelsGroup.children[0]);
    }
  }
  
  // Render each measurement
  measurements.forEach(measurement => {
    // Skip if no points or not visible
    if (measurement.points.length === 0 || measurement.visible === false) {
      return;
    }
    
    // Convert points to Vector3
    const points = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    
    // Skip rendering if no valid points
    if (points.length === 0) return;
    
    // Determine colors based on measurement type
    let pointColor = DEFAULT_POINT_COLOR;
    let lineColor = DEFAULT_LINE_COLOR;
    let fillColor = AREA_FILL_COLOR;
    
    switch (measurement.type) {
      case 'ridge':
        pointColor = lineColor = RIDGE_COLOR;
        break;
      case 'eave':
        pointColor = lineColor = EAVE_COLOR;
        break;
      case 'verge':
        pointColor = lineColor = VERGE_COLOR;
        break;
      case 'valley':
        pointColor = lineColor = VALLEY_COLOR;
        break;
      case 'hip':
        pointColor = lineColor = HIP_COLOR;
        break;
      case 'solar':
        pointColor = lineColor = fillColor = PV_FILL_COLOR;
        break;
      default:
        break;
    }
    
    // Create new meshes and add them to the group
    const measurementObject = new THREE.Group();
    measurementObject.userData = { measurementId: measurement.id, type: measurement.type };
    
    // Add points
    points.forEach((point, index) => {
      const mesh = createMeasurementPoint(point, pointColor);
      mesh.userData = { 
        measurementId: measurement.id, 
        pointIndex: index, 
        type: 'point'
      };
      measurementObject.add(mesh);
    });
    
    // Add lines between points
    const segments = measurement.segments || [];
    
    // If no segments are defined, create them from points
    if (segments.length === 0 && points.length > 1) {
      for (let i = 0; i < points.length; i++) {
        const startIndex = i;
        const endIndex = (i + 1) % points.length;
        
        // Skip the closing line for non-area/solar measurements if not the last segment
        if ((measurement.type !== 'area' && measurement.type !== 'solar') && endIndex === 0) {
          continue;
        }
        
        const start = points[startIndex];
        const end = points[endIndex];
        const line = createMeasurementLine(start, end, lineColor);
        
        line.userData = { 
          measurementId: measurement.id, 
          startIndex, 
          endIndex,
          type: 'line'
        };
        
        measurementObject.add(line);
        
        // Add segment label if needed
        if (measurement.labelVisible !== false) {
          const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
          const distance = start.distanceTo(end);
          
          const label = createMeasurementLabel(
            midpoint,
            `${distance.toFixed(2)} m`,
            colorToHexString(lineColor),
            24,
            LABEL_BACKGROUND,
            { x: 0, y: 0 }
          );
          
          label.userData = { 
            measurementId: measurement.id, 
            segmentIndex: i,
            type: 'segmentLabel'
          };
          
          segmentLabelsGroup.add(label);
        }
      }
    } else {
      // Add lines and labels from segments
      segments.forEach((segment, index) => {
        const start = new THREE.Vector3(segment.points[0].x, segment.points[0].y, segment.points[0].z);
        const end = new THREE.Vector3(segment.points[1].x, segment.points[1].y, segment.points[1].z);
        const line = createMeasurementLine(start, end, lineColor);
        
        line.userData = { 
          measurementId: measurement.id, 
          segmentId: segment.id,
          type: 'segment'
        };
        
        measurementObject.add(line);
        
        // Add segment label if needed
        if (measurement.labelVisible !== false) {
          const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
          const distance = segment.length || start.distanceTo(end);
          
          const label = createMeasurementLabel(
            midpoint,
            segment.label || `${distance.toFixed(2)} m`,
            colorToHexString(lineColor),
            24,
            LABEL_BACKGROUND,
            { x: 0, y: 0 }
          );
          
          label.userData = { 
            measurementId: measurement.id, 
            segmentId: segment.id,
            type: 'segmentLabel'
          };
          
          segmentLabelsGroup.add(label);
        }
      });
    }
    
    // For area or solar measurements, add a filled area and label
    if ((measurement.type === 'area' || measurement.type === 'solar') && points.length >= 3) {
      // Create filled area
      const fillMesh = createAreaFill(points, fillColor);
      fillMesh.userData = { 
        measurementId: measurement.id,
        type: 'fill'
      };
      measurementObject.add(fillMesh);
      
      // Add area label if needed
      if (measurement.labelVisible !== false) {
        const center = calculatePolygonCenter(points);
        // Convert THREE.Vector3 array to Point array for area calculation
        const pointsForAreaCalculation: Point[] = measurement.points;
        const area = calculateArea(pointsForAreaCalculation);
        
        const areaLabel = createMeasurementLabel(
          center,
          measurement.label || `${area.toFixed(2)} m²`,
          colorToHexString(fillColor),
          32,
          LABEL_BACKGROUND,
          { x: 0, y: 0 }
        );
        
        areaLabel.userData = { 
          measurementId: measurement.id,
          type: 'areaLabel'
        };
        
        labelsGroup.add(areaLabel);
      }
    } else if (measurement.type === 'length' && points.length === 2) {
      // For length measurements with exactly 2 points, add a label
      if (measurement.labelVisible !== false) {
        const midpoint = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
        const distance = points[0].distanceTo(points[1]);
        
        const label = createMeasurementLabel(
          midpoint,
          measurement.label || `${distance.toFixed(2)} m`,
          colorToHexString(lineColor),
          24,
          LABEL_BACKGROUND,
          { x: 0, y: 0 }
        );
        
        label.userData = { 
          measurementId: measurement.id,
          type: 'lengthLabel'
        };
        
        labelsGroup.add(label);
      }
    } else if (measurement.type === 'height' && points.length === 2) {
      // For height measurements, add a label
      if (measurement.labelVisible !== false) {
        const midpoint = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
        const height = Math.abs(points[0].y - points[1].y);
        
        const label = createMeasurementLabel(
          midpoint,
          measurement.label || `${height.toFixed(2)} m`,
          colorToHexString(lineColor),
          24,
          LABEL_BACKGROUND,
          { x: 0, y: 0 }
        );
        
        label.userData = { 
          measurementId: measurement.id,
          type: 'heightLabel'
        };
        
        labelsGroup.add(label);
      }
    }
    
    // Add the complete measurement object to the measurements group
    measurementsGroup.add(measurementObject);
  });
};

/**
 * Renders edit points for the currently edited measurement
 */
export const renderEditPoints = (
  editPointsGroup: THREE.Group,
  measurements: Measurement[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  recreate: boolean = false
): void => {
  // Clear existing edit points if recreating
  if (recreate) {
    while (editPointsGroup.children.length > 0) {
      editPointsGroup.remove(editPointsGroup.children[0]);
    }
  }
  
  // If no measurement is being edited, return
  if (!editMeasurementId) return;
  
  // Find the measurement being edited
  const measurement = measurements.find(m => m.id === editMeasurementId);
  if (!measurement) return;
  
  // Get the points of the measurement
  const points = measurement.points;
  if (!points || points.length === 0) return;
  
  // Create edit points
  points.forEach((point, index) => {
    const position = new THREE.Vector3(point.x, point.y, point.z);
    
    // Highlight the currently edited point with a different size
    const isEditingPoint = index === editingPointIndex;
    const size = isEditingPoint ? POINT_SIZE * 1.5 : POINT_SIZE;
    
    const mesh = createMeasurementPoint(position, EDIT_POINT_COLOR, size);
    mesh.userData = { 
      measurementId: editMeasurementId, 
      pointIndex: index,
      isEditPoint: true
    };
    
    editPointsGroup.add(mesh);
  });
  
  // If it's an area measurement, add lines between the edit points
  if (measurement.type === 'area' || measurement.type === 'solar') {
    for (let i = 0; i < points.length; i++) {
      const startIndex = i;
      const endIndex = (i + 1) % points.length;
      
      const start = new THREE.Vector3(points[startIndex].x, points[startIndex].y, points[startIndex].z);
      const end = new THREE.Vector3(points[endIndex].x, points[endIndex].y, points[endIndex].z);
      
      const line = createMeasurementLine(start, end, EDIT_LINE_COLOR);
      line.userData = { 
        measurementId: editMeasurementId, 
        startIndex, 
        endIndex,
        isEditLine: true
      };
      
      editPointsGroup.add(line);
    }
  } else if (points.length > 1) {
    // For other measurements, add lines between consecutive points
    for (let i = 0; i < points.length - 1; i++) {
      const start = new THREE.Vector3(points[i].x, points[i].y, points[i].z);
      const end = new THREE.Vector3(points[i + 1].x, points[i + 1].y, points[i + 1].z);
      
      const line = createMeasurementLine(start, end, EDIT_LINE_COLOR);
      line.userData = { 
        measurementId: editMeasurementId, 
        startIndex: i, 
        endIndex: i + 1,
        isEditLine: true
      };
      
      editPointsGroup.add(line);
    }
  }
};

/**
 * Clears all visual elements from the scene
 */
export const clearAllVisuals = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  measurementsGroup: THREE.Group,
  editPointsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group
): void => {
  // Clear current points and lines
  while (pointsGroup.children.length > 0) {
    pointsGroup.remove(pointsGroup.children[0]);
  }
  
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
