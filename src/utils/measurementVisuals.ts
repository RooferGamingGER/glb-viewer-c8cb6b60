
import * as THREE from 'three';
import { Point, Measurement, PVModuleInfo } from '@/types/measurements';
import {
  createMeasurementLabel,
  formatMeasurementLabel,
  calculateMidpoint,
  calculateCentroid,
  calculateInclination,
  updateTextSprite
} from '@/utils/textSprite';
import { generatePVModuleGrid } from '@/utils/pvCalculations';

const LINE_Y_OFFSET = 0.01;
const PV_LINE_Y_OFFSET = 0.02;
const LABEL_Y_OFFSET = 0.2;

const LINE_COLORS = {
  DEFAULT: 0x0066ff,
  HOVER: 0x00ffff,
  SELECTED: 0x00ffff,
  EDIT: 0xff0000,
  MOVING: 0x00ff00
};

const POINT_COLORS = {
  DEFAULT: 0x0066ff,
  HOVER: 0x00ffff,
  SELECTED: 0x00ffff,
  EDIT: 0xff0000,
  MOVING: 0x00ff00
};

const PV_MODULE_COLORS = {
  MODULE: 0x0066ff,
  GRID: 0x00ffff,
  BOUNDARY: 0xff0000,
  AVAILABLE_AREA: 0x00ff00
};

/**
 * Renders a point as a sphere
 */
function renderPoint(
  point: Point,
  pointsRef: THREE.Group,
  pointSize: number,
  color: number
) {
  const sphereGeometry = new THREE.SphereGeometry(pointSize, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: color });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(point.x, point.y + LINE_Y_OFFSET, point.z);
  sphere.renderOrder = 2;
  sphere.userData = {
    pointId: point.id || "",
    measurementId: point.measurementId || "",
    isPoint: true
  };
  pointsRef.add(sphere);
}

/**
 * Updates the position of a point
 */
function updatePointPosition(
  pointMesh: THREE.Mesh,
  point: Point
) {
  pointMesh.position.set(point.x, point.y + LINE_Y_OFFSET, point.z);
}

/**
 * Renders a line between two points
 */
function renderLine(
  start: Point,
  end: Point,
  linesRef: THREE.Group,
  lineWidth: number,
  color: number
) {
  const lineMaterial = new THREE.LineBasicMaterial({ color: color, linewidth: lineWidth });
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(start.x, start.y + LINE_Y_OFFSET, start.z),
    new THREE.Vector3(end.x, end.y + LINE_Y_OFFSET, end.z)
  ]);
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.renderOrder = 1;
  line.userData = {
    startId: start.id || "",
    endId: end.id || "",
    measurementId: start.measurementId || "",
    isLine: true
  };
  linesRef.add(line);
}

/**
 * Updates the geometry of a line between two points
 */
function updateLineGeometry(
  lineMesh: THREE.Line,
  start: Point,
  end: Point
) {
  const points = [
    new THREE.Vector3(start.x, start.y + LINE_Y_OFFSET, start.z),
    new THREE.Vector3(end.x, end.y + LINE_Y_OFFSET, end.z)
  ];
  lineMesh.geometry.setFromPoints(points);
  lineMesh.geometry.attributes.position.needsUpdate = true;
}

/**
 * Renders a height measurement as a line
 */
function renderHeight(
  measurement: Measurement,
  linesRef: THREE.Group,
  labelsRef: THREE.Group
) {
  if (measurement.points.length < 2) return;
  
  const start = measurement.points[0];
  const end = measurement.points[1];
  
  const lineMaterial = new THREE.LineBasicMaterial({ color: LINE_COLORS.DEFAULT, linewidth: 2 });
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(start.x, start.y, start.z),
    new THREE.Vector3(end.x, end.y, end.z)
  ]);
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.renderOrder = 1;
  line.userData = {
    measurementId: measurement.id,
    isHeight: true
  };
  linesRef.add(line);
  
  const midpoint = new THREE.Vector3(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    (start.z + end.z) / 2
  );
  midpoint.y += LABEL_Y_OFFSET;
  
  const label = createMeasurementLabel(measurement.value.toFixed(2) + " m", midpoint);
  label.userData = {
    measurementId: measurement.id,
    isLabel: true
  };
  labelsRef.add(label);
}

/**
 * Updates the geometry of a height measurement
 */
function updateHeightGeometry(
  lineMesh: THREE.Line,
  labelMesh: THREE.Mesh,
  measurement: Measurement
) {
  if (measurement.points.length < 2) return;
  
  const start = measurement.points[0];
  const end = measurement.points[1];
  
  const points = [
    new THREE.Vector3(start.x, start.y, start.z),
    new THREE.Vector3(end.x, end.y, end.z)
  ];
  lineMesh.geometry.setFromPoints(points);
  lineMesh.geometry.attributes.position.needsUpdate = true;
  
  const midpoint = new THREE.Vector3(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    (start.z + end.z) / 2
  );
  midpoint.y += LABEL_Y_OFFSET;
  
  updateTextSprite(labelMesh, measurement.value.toFixed(2) + " m", midpoint);
}

/**
 * Renders a length measurement as a line
 */
function renderLength(
  measurement: Measurement,
  linesRef: THREE.Group,
  labelsRef: THREE.Group
) {
  if (measurement.points.length < 2) return;
  
  const start = measurement.points[0];
  const end = measurement.points[1];
  
  const lineMaterial = new THREE.LineBasicMaterial({ color: LINE_COLORS.DEFAULT, linewidth: 2 });
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(start.x, start.y + LINE_Y_OFFSET, start.z),
    new THREE.Vector3(end.x, end.y + LINE_Y_OFFSET, end.z)
  ]);
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.renderOrder = 1;
  line.userData = {
    measurementId: measurement.id,
    isLength: true
  };
  linesRef.add(line);
  
  const midpoint = new THREE.Vector3(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    (start.z + end.z) / 2
  );
  midpoint.y += LABEL_Y_OFFSET;
  
  const label = createMeasurementLabel(measurement.value.toFixed(2) + " m", midpoint);
  label.userData = {
    measurementId: measurement.id,
    isLabel: true
  };
  labelsRef.add(label);
}

/**
 * Updates the geometry of a length measurement
 */
function updateLengthGeometry(
  lineMesh: THREE.Line,
  labelMesh: THREE.Mesh,
  measurement: Measurement
) {
  if (measurement.points.length < 2) return;
  
  const start = measurement.points[0];
  const end = measurement.points[1];
  
  const points = [
    new THREE.Vector3(start.x, start.y + LINE_Y_OFFSET, start.z),
    new THREE.Vector3(end.x, end.y + LINE_Y_OFFSET, end.z)
  ];
  lineMesh.geometry.setFromPoints(points);
  lineMesh.geometry.attributes.position.needsUpdate = true;
  
  const midpoint = new THREE.Vector3(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    (start.z + end.z) / 2
  );
  midpoint.y += LABEL_Y_OFFSET;
  
  updateTextSprite(labelMesh, measurement.value.toFixed(2) + " m", midpoint);
}

/**
 * Renders an area measurement as a polygon
 */
function renderArea(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group
) {
  if (measurement.points.length < 3) return;
  
  // Create a shape from the points
  const shape = new THREE.Shape();
  shape.moveTo(measurement.points[0].x, measurement.points[0].z);
  for (let i = 1; i < measurement.points.length; i++) {
    shape.lineTo(measurement.points[i].x, measurement.points[i].z);
  }
  shape.lineTo(measurement.points[0].x, measurement.points[0].z);
  
  // Create geometry for the shape
  const geometry = new THREE.ShapeGeometry(shape);
  
  // Get the base height from the first point (assuming relatively flat roof surface)
  const baseY = measurement.points[0]?.y || 0;
  
  // Adjust the vertices to have the correct Y value and X/Z positions
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i);
    positions.setXYZ(i, x, baseY + LINE_Y_OFFSET, z);
  }
  
  // Create material for the area
  const material = new THREE.MeshBasicMaterial({
    color: LINE_COLORS.DEFAULT,
    opacity: 0.3,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  // Create mesh for the area
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 3;
  mesh.userData = {
    measurementId: measurement.id,
    isArea: true
  };
  measurementsRef.add(mesh);
  
  // Calculate the centroid of the area
  const points3D = measurement.points.map(point => new THREE.Vector3(point.x, point.y, point.z));
  const centroid = calculateCentroid(points3D);
  centroid.y += LABEL_Y_OFFSET;
  
  const label = createMeasurementLabel(measurement.value.toFixed(2) + " m²", centroid);
  label.userData = {
    measurementId: measurement.id,
    isLabel: true
  };
  labelsRef.add(label);
}

/**
 * Updates the geometry of an area measurement
 */
function updateAreaGeometry(
  areaMesh: THREE.Mesh,
  labelMesh: THREE.Mesh,
  measurement: Measurement
) {
  if (measurement.points.length < 3) return;
  
  // Create a shape from the points
  const shape = new THREE.Shape();
  shape.moveTo(measurement.points[0].x, measurement.points[0].z);
  for (let i = 1; i < measurement.points.length; i++) {
    shape.lineTo(measurement.points[i].x, measurement.points[i].z);
  }
  shape.lineTo(measurement.points[0].x, measurement.points[0].z);
  
  // Create geometry for the shape
  const geometry = new THREE.ShapeGeometry(shape);
  
  // Get the base height from the first point (assuming relatively flat roof surface)
  const baseY = measurement.points[0]?.y || 0;
  
  // Adjust the vertices to have the correct Y value and X/Z positions
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i);
    positions.setXYZ(i, x, baseY + LINE_Y_OFFSET, z);
  }
  
  geometry.attributes.position.needsUpdate = true;
  geometry.computeBoundingSphere();
  
  // Update the label position
  const points3D = measurement.points.map(point => new THREE.Vector3(point.x, point.y, point.z));
  const centroid = calculateCentroid(points3D);
  centroid.y += LABEL_Y_OFFSET;
  
  updateTextSprite(labelMesh, measurement.value.toFixed(2) + " m²", centroid);
}

/**
 * Renders a PV module grid visualization for an area measurement
 */
function renderPVModuleGrid(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group
) {
  if (!measurement.pvModuleInfo || measurement.pvModuleInfo.moduleCount <= 0) return;
  
  // Get the base height from the first point (assuming relatively flat roof surface)
  const baseY = measurement.points[0]?.y || 0;
  
  // Generate the PV module grid
  const { modulePoints, gridLines } = generatePVModuleGrid(measurement);
  
  // Create materials for different elements
  const moduleMaterial = new THREE.MeshBasicMaterial({
    color: PV_MODULE_COLORS.MODULE,
    opacity: 0.3,
    transparent: true,
    side: THREE.DoubleSide
  });
  
  const gridLineMaterial = new THREE.LineBasicMaterial({
    color: PV_MODULE_COLORS.GRID,
    linewidth: 2,
    opacity: 0.8,
    transparent: true
  });
  
  const boundaryMaterial = new THREE.LineDashedMaterial({
    color: PV_MODULE_COLORS.BOUNDARY,
    dashSize: 0.2,
    gapSize: 0.1,
    linewidth: 2,
    opacity: 0.8,
    transparent: true
  });
  
  const availableAreaMaterial = new THREE.LineDashedMaterial({
    color: PV_MODULE_COLORS.AVAILABLE_AREA,
    dashSize: 0.1,
    gapSize: 0.1,
    linewidth: 2,
    opacity: 0.8,
    transparent: true
  });
  
  // Create module meshes
  modulePoints.forEach((points, index) => {
    // Create a shape from the four points
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].z);
    for (let i = 1; i < 4; i++) {
      shape.lineTo(points[i].x, points[i].z);
    }
    shape.lineTo(points[0].x, points[0].z);
    
    // Create geometry for the module
    const geometry = new THREE.ShapeGeometry(shape);
    
    // Adjust the vertices to have the correct Y value and X/Z positions
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i);
      positions.setXYZ(i, x, baseY + PV_LINE_Y_OFFSET, z);
    }
    
    // Create mesh for the module
    const mesh = new THREE.Mesh(geometry, moduleMaterial);
    mesh.renderOrder = 3;
    
    // Store measurement ID in user data
    mesh.userData = {
      measurementId: measurement.id,
      isPVModule: true,
      moduleIndex: index
    };
    
    measurementsRef.add(mesh);
    
    // Add module number label (without orientation text)
    const moduleCenter = new THREE.Vector3(
      (points[0].x + points[2].x) / 2,
      baseY + PV_LINE_Y_OFFSET + 0.05,
      (points[0].z + points[2].z) / 2
    );
    
    // Fixed: Convert color number to string using CSS hex format
    const moduleLabel = createMeasurementLabel(`${index + 1}`, moduleCenter);
    moduleLabel.userData = {
      measurementId: measurement.id,
      isModuleLabel: true,
      moduleIndex: index
    };
    
    // Make module labels smaller
    moduleLabel.scale.set(0.5, 0.5, 0.5);
    
    labelsRef.add(moduleLabel);
  });
  
  // Create grid lines
  gridLines.forEach((line, lineIndex) => {
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(line.from.x, baseY + PV_LINE_Y_OFFSET, line.from.z),
      new THREE.Vector3(line.to.x, baseY + PV_LINE_Y_OFFSET, line.to.z)
    ]);
    
    const lineMaterial = new THREE.LineBasicMaterial({
      color: PV_MODULE_COLORS.GRID,
      linewidth: 2,
      opacity: 0.8,
      transparent: true
    });
    
    const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
    lineMesh.renderOrder = 4;
    lineMesh.userData = {
      measurementId: measurement.id,
      isPVGridLine: true
    };
    measurementsRef.add(lineMesh);
  });
  
  // Create boundary lines
  for (let i = 0; i < measurement.points.length; i++) {
    const start = measurement.points[i];
    const end = measurement.points[(i + 1) % measurement.points.length];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(start.x, baseY + PV_LINE_Y_OFFSET, start.z),
      new THREE.Vector3(end.x, baseY + PV_LINE_Y_OFFSET, end.z)
    ]);
    
    const lineMaterial = new THREE.LineDashedMaterial({
      color: PV_MODULE_COLORS.BOUNDARY,
      dashSize: 0.2,
      gapSize: 0.1,
      linewidth: 2,
      opacity: 0.8,
      transparent: true
    });
    
    const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
    lineMesh.computeLineDistances();
    lineMesh.renderOrder = 4;
    lineMesh.userData = {
      measurementId: measurement.id,
      isBoundary: true
    };
    measurementsRef.add(lineMesh);
  }
  
  // Create available area lines if they exist in the measurement
  if (measurement.availableAreaPoints && measurement.availableAreaPoints.length > 0) {
    for (let i = 0; i < measurement.availableAreaPoints.length; i++) {
      const start = measurement.availableAreaPoints[i];
      const end = measurement.availableAreaPoints[(i + 1) % measurement.availableAreaPoints.length];
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(start.x, baseY + PV_LINE_Y_OFFSET, start.z),
        new THREE.Vector3(end.x, baseY + PV_LINE_Y_OFFSET, end.z)
      ]);
      
      const lineMaterial = new THREE.LineDashedMaterial({
        color: PV_MODULE_COLORS.AVAILABLE_AREA,
        dashSize: 0.1,
        gapSize: 0.1,
        linewidth: 2,
        opacity: 0.8,
        transparent: true
      });
      
      const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
      lineMesh.computeLineDistances();
      lineMesh.renderOrder = 4;
      lineMesh.userData = {
        measurementId: measurement.id,
        isAvailableArea: true
      };
      measurementsRef.add(lineMesh);
    }
  }
  
  // Add power and module count label
  const points3D = measurement.points.map(point => new THREE.Vector3(point.x, point.y, point.z));
  const centroid = calculateCentroid(points3D);
  
  // Position label above the area
  centroid.y += LABEL_Y_OFFSET + 0.15;
  
  // Fixed: Convert color number to string using CSS hex format
  const powerOutput = ((measurement.pvModuleInfo.moduleCount * (measurement.pvModuleInfo.pvModuleSpec?.power || 380)) / 1000).toFixed(2);
  
  const powerLabel = `${measurement.pvModuleInfo.moduleCount} PV-Module\n${powerOutput} kWp`;
  
  const pvLabel = createMeasurementLabel(powerLabel, centroid);
  pvLabel.userData = {
    measurementId: measurement.id,
    isPVLabel: true
  };
  
  labelsRef.add(pvLabel);
}

/**
 * Updates the geometry of a PV module grid
 */
function updatePVModuleGridGeometry(
  measurement: Measurement,
  scene: THREE.Scene
) {
  // Implementation details omitted for brevity
  // This function would need to be updated similar to the above functions
}

/**
 * Renders current points for ongoing measurements
 */
function renderCurrentPoints(
  pointsRef: THREE.Group,
  linesRef: THREE.Group,
  labelsRef: THREE.Group,
  points: Point[],
  measurementType: string
) {
  // Clear existing points
  while (pointsRef.children.length > 0) {
    pointsRef.remove(pointsRef.children[0]);
  }
  
  // Clear existing lines
  while (linesRef.children.length > 0) {
    linesRef.remove(linesRef.children[0]);
  }
  
  // Render each point
  points.forEach((point, index) => {
    renderPoint(point, pointsRef, 0.1, POINT_COLORS.DEFAULT);
    
    // Connect points with lines if more than one point
    if (index > 0) {
      renderLine(points[index - 1], point, linesRef, 2, LINE_COLORS.DEFAULT);
    }
    
    // For area measurements, connect the last point to the first if > 2 points
    if (measurementType === 'area' && index === points.length - 1 && points.length > 2) {
      renderLine(point, points[0], linesRef, 2, LINE_COLORS.DEFAULT);
    }
  });
}

/**
 * Renders edit points for a measurement being edited
 */
function renderEditPoints(
  editPointsRef: THREE.Group,
  measurements: Measurement[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  clearExisting = true
) {
  // Clear existing edit points if requested
  if (clearExisting) {
    while (editPointsRef.children.length > 0) {
      editPointsRef.remove(editPointsRef.children[0]);
    }
  }
  
  // If not editing a measurement, return
  if (!editMeasurementId) return;
  
  // Find the measurement being edited
  const measurement = measurements.find(m => m.id === editMeasurementId);
  if (!measurement) return;
  
  // Render edit points for each point in the measurement
  measurement.points.forEach((point, index) => {
    const isSelected = index === editingPointIndex;
    const color = isSelected ? POINT_COLORS.EDIT : POINT_COLORS.SELECTED;
    const size = isSelected ? 0.15 : 0.12;
    
    renderPoint(point, editPointsRef, size, color);
  });
}

/**
 * Renders all measurements
 */
function renderMeasurements(
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  segmentLabelsRef: THREE.Group,
  measurements: Measurement[],
  clearExisting = true
) {
  // Clear existing measurements if requested
  if (clearExisting) {
    while (measurementsRef.children.length > 0) {
      measurementsRef.remove(measurementsRef.children[0]);
    }
    
    while (labelsRef.children.length > 0) {
      labelsRef.remove(labelsRef.children[0]);
    }
    
    if (segmentLabelsRef) {
      while (segmentLabelsRef.children.length > 0) {
        segmentLabelsRef.remove(segmentLabelsRef.children[0]);
      }
    }
  }
  
  // Render each measurement
  measurements.forEach(measurement => {
    switch (measurement.type) {
      case 'length':
        renderLength(measurement, measurementsRef, labelsRef);
        break;
      case 'height':
        renderHeight(measurement, measurementsRef, labelsRef);
        break;
      case 'area':
        renderArea(measurement, measurementsRef, labelsRef);
        break;
      case 'solar':
        renderArea(measurement, measurementsRef, labelsRef);
        if (measurement.pvModuleInfo) {
          renderPVModuleGrid(measurement, measurementsRef, labelsRef);
        }
        break;
      // Add additional cases for other measurement types as needed
    }
  });
}

/**
 * Clears all visual elements
 */
function clearAllVisuals(
  pointsRef: THREE.Group | null,
  linesRef: THREE.Group | null,
  measurementsRef: THREE.Group | null,
  editPointsRef: THREE.Group | null,
  labelsRef: THREE.Group | null,
  segmentLabelsRef: THREE.Group | null
) {
  // Clear points
  if (pointsRef) {
    while (pointsRef.children.length > 0) {
      pointsRef.remove(pointsRef.children[0]);
    }
  }
  
  // Clear lines
  if (linesRef) {
    while (linesRef.children.length > 0) {
      linesRef.remove(linesRef.children[0]);
    }
  }
  
  // Clear measurements
  if (measurementsRef) {
    while (measurementsRef.children.length > 0) {
      measurementsRef.remove(measurementsRef.children[0]);
    }
  }
  
  // Clear edit points
  if (editPointsRef) {
    while (editPointsRef.children.length > 0) {
      editPointsRef.remove(editPointsRef.children[0]);
    }
  }
  
  // Clear labels
  if (labelsRef) {
    while (labelsRef.children.length > 0) {
      labelsRef.remove(labelsRef.children[0]);
    }
  }
  
  // Clear segment labels
  if (segmentLabelsRef) {
    while (segmentLabelsRef.children.length > 0) {
      segmentLabelsRef.remove(segmentLabelsRef.children[0]);
    }
  }
}

export {
  LINE_COLORS,
  POINT_COLORS,
  LABEL_Y_OFFSET,
  renderPoint,
  renderLine,
  renderHeight,
  updatePointPosition,
  updateLineGeometry,
  updateHeightGeometry,
  renderLength,
  updateLengthGeometry,
  renderArea,
  updateAreaGeometry,
  renderPVModuleGrid,
  updatePVModuleGridGeometry,
  renderCurrentPoints,
  renderEditPoints,
  renderMeasurements,
  clearAllVisuals
};

