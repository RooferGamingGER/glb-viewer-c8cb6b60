
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { Point, Measurement, MeasurementMode } from '@/types/measurements';

// Colors for different measurement types
const COLORS = {
  length: 0x2196f3, // Blue
  height: 0x4caf50, // Green
  area: 0xff9800,   // Orange
  current: 0xf44336, // Red
  edit: 0xe91e63,    // Pink
  preview: 0x9c27b0,  // Purple
  ridge: 0xff5722,   // Deep Orange
  eave: 0x00bcd4,    // Cyan
  verge: 0x9e9e9e,   // Grey
  solar: 0xffeb3b,   // Yellow
  valley: 0x795548,  // Brown
  hip: 0x607d8b     // Blue Grey
};

// Material for lines
const LINE_MATERIAL = {
  length: new THREE.LineBasicMaterial({ color: COLORS.length, linewidth: 2 }),
  height: new THREE.LineBasicMaterial({ color: COLORS.height, linewidth: 2 }),
  area: new THREE.LineBasicMaterial({ color: COLORS.area, linewidth: 2 }),
  current: new THREE.LineBasicMaterial({ color: COLORS.current, linewidth: 3 }),
  edit: new THREE.LineBasicMaterial({ color: COLORS.edit, linewidth: 3 }),
  preview: new THREE.LineBasicMaterial({ color: COLORS.preview, linewidth: 2, opacity: 0.7, transparent: true }),
  ridge: new THREE.LineBasicMaterial({ color: COLORS.ridge, linewidth: 2 }),
  eave: new THREE.LineBasicMaterial({ color: COLORS.eave, linewidth: 2 }),
  verge: new THREE.LineBasicMaterial({ color: COLORS.verge, linewidth: 2 }),
  solar: new THREE.LineBasicMaterial({ color: COLORS.solar, linewidth: 2 }),
  valley: new THREE.LineBasicMaterial({ color: COLORS.valley, linewidth: 2 }),
  hip: new THREE.LineBasicMaterial({ color: COLORS.hip, linewidth: 2 })
};

// Create a text label div element
const createLabelElement = (text: string, type: MeasurementMode = 'length', measurementId?: string, isPreview = false): HTMLDivElement => {
  const div = document.createElement('div');
  div.className = `measurement-label ${type} ${isPreview ? 'preview' : ''}`;
  div.textContent = text;
  div.style.backgroundColor = `#${COLORS[type].toString(16).padStart(6, '0')}`;
  div.style.color = (type === 'solar') ? '#000' : '#fff';
  div.style.padding = '2px 4px';
  div.style.borderRadius = '2px';
  div.style.fontSize = '10px';
  div.style.pointerEvents = 'none';
  div.style.whiteSpace = 'nowrap';
  return div;
};

// Create a CSS2D object for a label
const createLabelObject = (text: string, position: THREE.Vector3, type: MeasurementMode = 'length', measurementId?: string, isPreview = false): CSS2DObject => {
  const labelDiv = createLabelElement(text, type, measurementId, isPreview);
  const labelObject = new CSS2DObject(labelDiv);
  labelObject.position.copy(position);
  
  // Store metadata for later reference
  labelObject.userData = {
    type,
    measurementId,
    isPreview
  };
  
  return labelObject;
};

// Render the current measurement points and lines
export const renderCurrentPoints = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  labelsGroup: THREE.Group,
  points: Point[],
  mode: MeasurementMode = 'length'
): void => {
  // Clear existing points and lines
  while (pointsGroup.children.length > 0) {
    pointsGroup.remove(pointsGroup.children[0]);
  }
  
  while (linesGroup.children.length > 0) {
    linesGroup.remove(linesGroup.children[0]);
  }
  
  // Remove any preview labels
  labelsGroup.children.forEach((child, index) => {
    if (child.userData?.isPreview) {
      labelsGroup.remove(child);
    }
  });
  
  // If no points, exit early
  if (points.length === 0) return;
  
  // Add points
  const sphereGeometry = new THREE.SphereGeometry(0.03, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: COLORS.current });
  
  points.forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y, point.z);
    pointsGroup.add(sphere);
  });
  
  // Add lines between consecutive points
  if (points.length > 1) {
    const lineGeometry = new THREE.BufferGeometry();
    const lineVertices = [];
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      lineVertices.push(point.x, point.y, point.z);
    }
    
    // For area measurements, close the loop if we have enough points
    if (mode === 'area' && points.length > 2) {
      lineVertices.push(points[0].x, points[0].y, points[0].z);
    }
    
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
    const line = new THREE.Line(lineGeometry, LINE_MATERIAL.current);
    linesGroup.add(line);
    
    // Add label at midpoint of the last segment
    if (points.length >= 2) {
      const lastPoint = points[points.length - 1];
      const prevPoint = points[points.length - 2];
      
      // Calculate midpoint
      const midpoint = new THREE.Vector3(
        (lastPoint.x + prevPoint.x) / 2,
        (lastPoint.y + prevPoint.y) / 2,
        (lastPoint.z + prevPoint.z) / 2
      );
      
      // Calculate value based on mode
      let value = 0;
      let text = '';
      
      if (mode === 'length' || mode === 'ridge' || mode === 'eave' || mode === 'verge') {
        value = Math.sqrt(
          Math.pow(lastPoint.x - prevPoint.x, 2) +
          Math.pow(lastPoint.y - prevPoint.y, 2) +
          Math.pow(lastPoint.z - prevPoint.z, 2)
        );
        text = `${value.toFixed(2)}m`;
      } else if (mode === 'height') {
        value = Math.abs(lastPoint.y - prevPoint.y);
        text = `${value.toFixed(2)}m`;
      }
      
      if (text) {
        const labelObject = createLabelObject(text, midpoint, mode, undefined, true);
        labelsGroup.add(labelObject);
      }
    }
  }
};

// Render a complete measurement
export const renderMeasurement = (
  measurementsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group,
  measurement: Measurement,
  showLabels: boolean = true
): void => {
  // Skip if not visible
  if (measurement.visible === false) return;
  
  const { type, points, id } = measurement;
  
  // Create a new group for this measurement
  const measurementGroup = new THREE.Group();
  measurementGroup.userData = { id, type };
  
  // Create points
  const sphereGeometry = new THREE.SphereGeometry(0.025, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: COLORS[type] });
  
  points.forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y, point.z);
    sphere.userData = { pointIndex: index };
    measurementGroup.add(sphere);
  });
  
  // Create lines
  const lineGeometry = new THREE.BufferGeometry();
  const lineVertices = [];
  
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    lineVertices.push(point.x, point.y, point.z);
  }
  
  // For area and solar measurements, close the loop
  if ((type === 'area' || type === 'solar') && points.length > 2) {
    lineVertices.push(points[0].x, points[0].y, points[0].z);
  }
  
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
  const line = new THREE.Line(lineGeometry, LINE_MATERIAL[type]);
  measurementGroup.add(line);
  
  // Add to measurements group
  measurementsGroup.add(measurementGroup);
  
  // Create main measurement label
  if (showLabels && measurement.label && measurement.labelVisible !== false) {
    // Calculate center point for the label
    let center: THREE.Vector3;
    
    if (type === 'area' || type === 'solar') {
      // For area, use centroid
      const centroid = calculateCentroid(points);
      center = new THREE.Vector3(centroid.x, centroid.y, centroid.z);
    } else {
      // For lines, use midpoint
      const midIndex = Math.floor(points.length / 2);
      const p1 = points[midIndex - 1];
      const p2 = points[midIndex];
      center = new THREE.Vector3(
        (p1.x + p2.x) / 2,
        (p1.y + p2.y) / 2,
        (p1.z + p2.z) / 2
      );
    }
    
    // Add label
    const label = showLabels ? `${measurement.name}: ${measurement.label}` : measurement.label;
    const labelObject = createLabelObject(label, center, type, id);
    labelsGroup.add(labelObject);
  }
  
  // Add segment labels if available
  if (measurement.segments && showLabels && measurement.labelVisible !== false) {
    measurement.segments.forEach(segment => {
      const [p1, p2] = segment.points;
      const midpoint = new THREE.Vector3(
        (p1.x + p2.x) / 2,
        (p1.y + p2.y) / 2,
        (p1.z + p2.z) / 2
      );
      
      const segmentLabel = `${segment.length.toFixed(2)}m`;
      const labelObject = createLabelObject(segmentLabel, midpoint, type, id);
      segmentLabelsGroup.add(labelObject);
    });
  }
};

// Calculate centroid of a set of points
const calculateCentroid = (points: Point[]): THREE.Vector3 => {
  let sumX = 0, sumY = 0, sumZ = 0;
  
  points.forEach(point => {
    sumX += point.x;
    sumY += point.y;
    sumZ += point.z;
  });
  
  return new THREE.Vector3(
    sumX / points.length,
    sumY / points.length,
    sumZ / points.length
  );
};

// Render all measurements
export const renderMeasurements = (
  measurementsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group,
  measurements: Measurement[],
  showLabels: boolean = true
): void => {
  // Clear existing measurements
  while (measurementsGroup.children.length > 0) {
    measurementsGroup.remove(measurementsGroup.children[0]);
  }
  
  // Clear existing labels (except preview labels)
  labelsGroup.children.forEach((child, index) => {
    if (!child.userData?.isPreview) {
      labelsGroup.remove(child);
    }
  });
  
  // Clear segment labels
  while (segmentLabelsGroup.children.length > 0) {
    segmentLabelsGroup.remove(segmentLabelsGroup.children[0]);
  }
  
  // Render each measurement
  measurements.forEach(measurement => {
    renderMeasurement(measurementsGroup, labelsGroup, segmentLabelsGroup, measurement, showLabels);
  });
};

// Render edit points for a measurement
export const renderEditPoints = (
  editPointsGroup: THREE.Group,
  measurements: Measurement[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  fullRender: boolean = false
): void => {
  // Clear existing edit points if doing a full render
  if (fullRender) {
    while (editPointsGroup.children.length > 0) {
      editPointsGroup.remove(editPointsGroup.children[0]);
    }
  }
  
  // If no edit measurement, exit early
  if (!editMeasurementId) return;
  
  // Find the measurement being edited
  const measurement = measurements.find(m => m.id === editMeasurementId);
  if (!measurement) return;
  
  const { points, type } = measurement;
  
  // Create edit points
  const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  
  points.forEach((point, index) => {
    // Skip if we're only rendering a specific point and this isn't it
    if (editingPointIndex !== null && index !== editingPointIndex && !fullRender) return;
    
    // Create a material - highlighted if this is the currently edited point
    const isEditingPoint = editingPointIndex === index;
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: isEditingPoint ? 0xff0000 : COLORS.edit,
      opacity: isEditingPoint ? 1 : 0.7,
      transparent: !isEditingPoint
    });
    
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y, point.z);
    sphere.userData = { pointIndex: index, measurementId: editMeasurementId };
    editPointsGroup.add(sphere);
  });
};

// Clear all measurement visuals
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
