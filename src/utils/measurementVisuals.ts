import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { calculateDistance } from './measurementCalculations';
import { Measurement, Point, PVModuleInfo } from '@/types/measurements';

/**
 * Creates a text label using CSS2DObject
 * @param text - The text to display
 * @param position - The 3D position of the label
 * @param className - Optional CSS class name for styling
 * @returns A CSS2DObject representing the label
 */
export const createTextLabel = (
  text: string,
  position: THREE.Vector3,
  className: string = 'default-label'
): CSS2DObject => {
  const labelDiv = document.createElement('div');
  labelDiv.className = `label ${className}`;
  labelDiv.textContent = text;

  const label = new CSS2DObject(labelDiv);
  label.position.copy(position);
  return label;
};

/**
 * Render the current points being placed
 * @param pointsGroup - The group to add the points to
 * @param linesGroup - The group to add the lines to
 * @param labelsGroup - The group to add the labels to
 * @param currentPoints - The array of current points
 * @param activeMode - The current measurement mode
 */
export const renderCurrentPoints = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  labelsGroup: THREE.Group,
  currentPoints: Point[],
  activeMode: string
) => {
  // Clear existing points and lines
  clearGroup(pointsGroup);
  clearGroup(linesGroup);
  clearGroup(labelsGroup);

  // Render each point
  currentPoints.forEach((point, index) => {
    // Create sphere for the point
    const sphereGeometry = new THREE.SphereGeometry(0.02, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y, point.z);
    pointsGroup.add(sphere);

    // Create label for the point
    const labelText = `(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`;
    const labelPosition = new THREE.Vector3(point.x, point.y + 0.1, point.z);
    const label = createTextLabel(labelText, labelPosition);
    labelsGroup.add(label);

    // Create line between points if there are at least two points
    if (index > 0) {
      const previousPoint = currentPoints[index - 1];
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(previousPoint.x, previousPoint.y, previousPoint.z),
        new THREE.Vector3(point.x, point.y, point.z),
      ]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      linesGroup.add(line);

      // If it's a length or height measurement, add a label in the middle of the segment
      if (['length', 'height'].includes(activeMode)) {
        const distance = calculateDistance(previousPoint, point);
        const midPoint = {
          x: (previousPoint.x + point.x) / 2,
          y: (previousPoint.y + point.y) / 2,
          z: (previousPoint.z + point.z) / 2
        };
        const distanceLabel = createTextLabel(`${distance.toFixed(2)} m`, new THREE.Vector3(midPoint.x, midPoint.y + 0.05, midPoint.z));
        labelsGroup.add(distanceLabel);
      }
    }
  });
};

/**
 * Render the edit points for a measurement
 * @param editPointsGroup - The group to add the edit points to
 * @param measurements - The array of measurements
 * @param editMeasurementId - The ID of the measurement being edited
 * @param editingPointIndex - The index of the point being edited
 */
export const renderEditPoints = (
  editPointsGroup: THREE.Group,
  measurements: Measurement[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  isPreview = false
) => {
  // Clear existing edit points
  clearGroup(editPointsGroup);

  if (!editMeasurementId) return;

  // Find the measurement being edited
  const measurement = measurements.find(m => m.id === editMeasurementId);
  if (!measurement) return;

  // Render each point
  measurement.points.forEach((point, index) => {
    // Create sphere for the point
    const sphereGeometry = new THREE.SphereGeometry(0.03, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: index === editingPointIndex ? 0xffff00 : 0xff0000, // Highlighted if editing
      transparent: isPreview,
      opacity: isPreview ? 0.5 : 1
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y, point.z);
    sphere.userData = {
      measurementId: measurement.id,
      pointIndex: index,
      isPreview: isPreview
    };
    editPointsGroup.add(sphere);
  });
};

/**
 * Clears all objects from a group
 */
export const clearGroup = (group: THREE.Group) => {
  while (group.children.length > 0) {
    group.remove(group.children[0]);
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
) => {
  clearGroup(pointsGroup);
  clearGroup(linesGroup);
  clearGroup(measurementsGroup);
  clearGroup(editPointsGroup);
  clearGroup(labelsGroup);
  clearGroup(segmentLabelsGroup);
};

/**
 * Create a basic mesh for area visualization
 */
const createAreaMesh = (points: Point[], color: number, opacity: number, useWireframe = false): THREE.Mesh => {
  // Convert points to Vector3
  const vertices = points.map(p => new THREE.Vector3(p.x, p.y, p.z));

  // Create geometry
  const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
  geometry.computeVertexNormals(); // Ensure normals are computed

  // Create material
  const material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    wireframe: useWireframe,
    transparent: true,
    opacity: opacity
  });

  // Create mesh
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
};

/**
 * Create a PV Module mesh with proper materials based on the type
 */
export const createPVModuleMesh = (
  moduleInfo: PVModuleInfo,
  area: number,
  modulePoints: Point[][],
  gridLines: {from: Point, to: Point}[],
  baseY: number,
  useWireframe = false
): THREE.Group => {
  // Create a group to hold all module-related objects
  const moduleGroup = new THREE.Group();
  moduleGroup.userData.isPVModule = true;
  
  // Add debug info for module orientation
  console.log("Creating PV module mesh:", {
    orientation: moduleInfo.orientation,
    moduleCount: moduleInfo.moduleCount,
    columns: moduleInfo.columns,
    rows: moduleInfo.rows
  });

  // Create outline lines for grid
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x1976D2, 
    linewidth: 2,
    opacity: 0.9,
    transparent: true 
  });
  
  // Create individual module outlines
  for (const line of gridLines) {
    const points = [
      new THREE.Vector3(line.from.x, line.from.y, line.from.z),
      new THREE.Vector3(line.to.x, line.to.y, line.to.z)
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineObj = new THREE.Line(geometry, lineMaterial);
    moduleGroup.add(lineObj);
  }
  
  // Create individual module panels
  modulePoints.forEach((corners, index) => {
    // Create a mesh for each module panel
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(1, 0);
    shape.lineTo(1, 1);
    shape.lineTo(0, 1);
    shape.lineTo(0, 0);
    
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: 0x0EA5E9,
      opacity: 0.7,
      transparent: true,
      side: THREE.DoubleSide,
      // Use wireframe for debug view
      wireframe: useWireframe
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Transform the mesh to match the module position and size
    const v1 = new THREE.Vector3(corners[0].x, corners[0].y, corners[0].z);
    const v2 = new THREE.Vector3(corners[1].x, corners[1].y, corners[1].z);
    const v3 = new THREE.Vector3(corners[3].x, corners[3].y, corners[3].z);
    
    // Calculate basis vectors for the transformation
    const xAxis = new THREE.Vector3().subVectors(v2, v1).normalize();
    const zAxis = new THREE.Vector3().subVectors(v3, v1).normalize();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
    
    // Create transformation matrix
    const width = new THREE.Vector3().subVectors(v2, v1).length();
    const height = new THREE.Vector3().subVectors(v3, v1).length();
    
    // Set scale and position
    const matrix = new THREE.Matrix4();
    matrix.makeBasis(
      xAxis.multiplyScalar(width),
      yAxis.multiplyScalar(0.01), // Very thin
      zAxis.multiplyScalar(height)
    );
    matrix.setPosition(v1);
    
    mesh.applyMatrix4(matrix);
    mesh.userData.isPVModule = true;
    mesh.userData.moduleIndex = index;
    
    // Add the module mesh to the group
    moduleGroup.add(mesh);
  });
  
  // Create a label for the power data
  const power = (moduleInfo.moduleCount * (moduleInfo.pvModuleSpec?.power || 425)) / 1000;
  const powerLabelText = `${moduleInfo.moduleCount} Module (${power.toFixed(2)} kWp)`;
  
  // Create center of the PV array for overall label positioning
  if (modulePoints.length > 0) {
    // Calculate center position of all modules
    const center = new THREE.Vector3(0, 0, 0);
    modulePoints.forEach(corners => {
      corners.forEach(corner => {
        center.add(new THREE.Vector3(corner.x, corner.y, corner.z));
      });
    });
    center.divideScalar(modulePoints.length * 4);
    
    // Create central power label slightly above the modules
    const powerLabelPosition = new THREE.Vector3(center.x, center.y + 0.5, center.z);
    const powerLabel = createTextLabel(powerLabelText, powerLabelPosition);
    powerLabel.userData.isPVModuleLabel = true;
    moduleGroup.add(powerLabel);
  }
  
  // Return the complete module group
  return moduleGroup;
};

/**
 * Render existing measurements
 * @param measurementsGroup - The group to add the measurements to
 * @param labelsGroup - The group to add the labels to
 * @param segmentLabelsGroup - The group to add the segment labels to
 * @param measurements - The array of measurements
 * @param useWireframe - Whether to use wireframe for the area meshes
 */
export const renderMeasurements = (
  measurementsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group,
  measurements: Measurement[],
  useWireframe = false
) => {
  // Clear existing measurements
  clearGroup(measurementsGroup);
  clearGroup(labelsGroup);
  clearGroup(segmentLabelsGroup);

  measurements.forEach(measurement => {
    if (!measurement.visible) return;

    // Skip rendering if there are fewer than 2 points
    if (measurement.points.length < 2) return;

    // Create different visuals based on measurement type
    switch (measurement.type) {
      case 'length':
      case 'height': {
        // Create line between the two points
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(measurement.points[0].x, measurement.points[0].y, measurement.points[0].z),
          new THREE.Vector3(measurement.points[1].x, measurement.points[1].y, measurement.points[1].z),
        ]);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData.measurementId = measurement.id;
        measurementsGroup.add(line);

        // Add label in the middle of the line
        const midPoint = {
          x: (measurement.points[0].x + measurement.points[1].x) / 2,
          y: (measurement.points[0].y + measurement.points[1].y) / 2,
          z: (measurement.points[0].z + measurement.points[1].z) / 2
        };
        const labelPosition = new THREE.Vector3(midPoint.x, midPoint.y + 0.05, midPoint.z);
        const label = createTextLabel(`${measurement.value?.toFixed(2)} m`, labelPosition);
        label.userData.measurementId = measurement.id;
        labelsGroup.add(label);
        break;
      }
      case 'area': {
        if (measurement.points.length < 3) break;

        // Create mesh for the area
        const areaMesh = createAreaMesh(measurement.points, 0x888888, 0.5, useWireframe);
        areaMesh.userData.measurementId = measurement.id;
        measurementsGroup.add(areaMesh);

        // Calculate centroid for label position
        const sum = measurement.points.reduce((acc, point) => {
          acc.x += point.x;
          acc.y += point.y;
          acc.z += point.z;
          return acc;
        }, { x: 0, y: 0, z: 0 });
        const centroid = {
          x: sum.x / measurement.points.length,
          y: sum.y / measurement.points.length,
          z: sum.z / measurement.points.length
        };

        // Add label to the center of the area
        const areaLabelPosition = new THREE.Vector3(centroid.x, centroid.y + 0.05, centroid.z);
        const areaLabel = createTextLabel(`${measurement.value?.toFixed(2)} m²`, areaLabelPosition);
        areaLabel.userData.measurementId = measurement.id;
        labelsGroup.add(areaLabel);
        break;
      }
      case 'solar': {
        if (measurement.points.length < 3) break;

        // Create mesh for the solar area
        const solarMesh = createAreaMesh(measurement.points, 0x00ffff, 0.7, useWireframe);
        solarMesh.userData.measurementId = measurement.id;
        measurementsGroup.add(solarMesh);

        // Calculate centroid for label position
        const sum = measurement.points.reduce((acc, point) => {
          acc.x += point.x;
          acc.y += point.y;
          acc.z += point.z;
          return acc;
        }, { x: 0, y: 0, z: 0 });
        const centroid = {
          x: sum.x / measurement.points.length,
          y: sum.y / measurement.points.length,
          z: sum.z / measurement.points.length
        };

        // Add label to the center of the area
        const solarLabelPosition = new THREE.Vector3(centroid.x, centroid.y + 0.05, centroid.z);
        const solarLabel = createTextLabel(`${measurement.value?.toFixed(2)} m²`, solarLabelPosition);
        solarLabel.userData.measurementId = measurement.id;
        labelsGroup.add(solarLabel);
        break;
      }
      case 'pvmodule': {
        // Skip rendering if there are fewer than 3 points
        if (measurement.points.length < 3) break;
        
        // Ensure that the segments and PVModuleInfo are available
        if (!measurement.segments || !measurement.pvModuleInfo) {
          console.warn("PV Module measurement missing segments or PVModuleInfo, skipping render");
          break;
        }
        
        // Create PV module grid
        const pvModuleMesh = createPVModuleMesh(
          measurement.pvModuleInfo,
          measurement.value || 0,
          measurement.pvModuleInfo.modulePoints || [],
          measurement.pvModuleInfo.gridLines || [],
          measurement.points[0].y,
          useWireframe
        );
        
        pvModuleMesh.userData.measurementId = measurement.id;
        measurementsGroup.add(pvModuleMesh);
        break;
      }
      default:
        break;
    }
  });
};
