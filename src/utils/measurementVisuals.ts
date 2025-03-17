
import * as THREE from 'three';
import { Point, Measurement } from '@/hooks/useMeasurements';
import {
  createMeasurementLabel,
  formatMeasurementLabel,
  calculateMidpoint,
  calculateCentroid,
  calculateInclination
} from '@/utils/textSprite';

/**
 * Safely disposes of Three.js object's geometry and material
 */
function safelyDisposeObject(object: THREE.Object3D) {
  // Check for geometry property and ensure it has a dispose method
  if ('geometry' in object && object.geometry) {
    // Type assertion to access the dispose method
    const geometry = object.geometry as { dispose?: () => void };
    if (geometry.dispose) {
      geometry.dispose();
    }
  }
  
  // Check for material property and ensure it has a dispose method
  if ('material' in object && object.material) {
    if (Array.isArray(object.material)) {
      // Handle array of materials
      object.material.forEach(mat => {
        const material = mat as { dispose?: () => void };
        if (material.dispose) {
          material.dispose();
        }
      });
    } else {
      // Handle single material
      const material = object.material as { dispose?: () => void };
      if (material.dispose) {
        material.dispose();
      }
    }
  }
}

/**
 * Clears all visual elements from groups
 */
export function clearAllVisuals(
  pointsRef: THREE.Group | null,
  linesRef: THREE.Group | null,
  measurementsRef: THREE.Group | null,
  editPointsRef: THREE.Group | null,
  labelsRef: THREE.Group | null,
  segmentLabelsRef: THREE.Group | null
) {
  // Helper function to clear a group and dispose of geometries and materials
  const clearGroup = (group: THREE.Group | null) => {
    if (!group) return;
    
    while (group.children.length > 0) {
      const object = group.children[0];
      
      // Safely dispose of object resources
      safelyDisposeObject(object);
      
      // Remove from parent
      group.remove(object);
    }
  };
  
  // Clear all groups
  clearGroup(pointsRef);
  clearGroup(linesRef);
  clearGroup(measurementsRef);
  clearGroup(editPointsRef);
  clearGroup(labelsRef);
  clearGroup(segmentLabelsRef);
}

/**
 * Renders current measurement points being placed
 */
export function renderCurrentPoints(
  pointsRef: THREE.Group | null,
  linesRef: THREE.Group | null,
  labelsRef: THREE.Group | null,
  currentPoints: Point[],
  activeMode: string
) {
  if (!pointsRef || !linesRef || !labelsRef) return;

  // Clear existing points
  while (pointsRef.children.length > 0) {
    const object = pointsRef.children[0];
    safelyDisposeObject(object);
    pointsRef.remove(object);
  }

  // Clear existing lines
  while (linesRef.children.length > 0) {
    const object = linesRef.children[0];
    safelyDisposeObject(object);
    linesRef.remove(object);
  }

  // Clear preview labels
  labelsRef.children.forEach(child => {
    if (child.userData.isPreview) {
      labelsRef.remove(child);
    }
  });

  // Add current points as spheres
  currentPoints.forEach((point, index) => {
    const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: activeMode === 'length' ? 0x00ff00 : 
             activeMode === 'height' ? 0x0000ff : 0xffaa00 
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y, point.z);
    pointsRef.add(sphere);

    // Add connecting lines between points
    if (index > 0) {
      const prevPoint = currentPoints[index - 1];
      const points = [
        new THREE.Vector3(prevPoint.x, prevPoint.y, prevPoint.z),
        new THREE.Vector3(point.x, point.y, point.z)
      ];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: activeMode === 'length' ? 0x00ff00 : 
               activeMode === 'height' ? 0x0000ff : 0xffaa00,
        linewidth: 2
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      linesRef.add(line);
    }
  });

  // Add special final connecting line for area measurement to close the shape
  if (activeMode === 'area' && currentPoints.length >= 3) {
    const firstPoint = currentPoints[0];
    const lastPoint = currentPoints[currentPoints.length - 1];
    const closingPoints = [
      new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z),
      new THREE.Vector3(firstPoint.x, firstPoint.y, firstPoint.z)
    ];
    const closingGeometry = new THREE.BufferGeometry().setFromPoints(closingPoints);
    // Use a dashed line material
    const closingMaterial = new THREE.LineDashedMaterial({ 
      color: 0xffaa00,
      linewidth: 2,
      scale: 1,
      dashSize: 0.1,
      gapSize: 0.1
    });
    const closingLine = new THREE.Line(closingGeometry, closingMaterial);
    // Must call computeLineDistances for the dashed line to work
    closingLine.computeLineDistances();
    linesRef.add(closingLine);
  }
  
  // Create preview label if we have enough points for a complete measurement
  if (currentPoints.length >= 2) {
    if (activeMode === 'length' && currentPoints.length >= 2) {
      // For length measurement preview
      const p1 = new THREE.Vector3(currentPoints[0].x, currentPoints[0].y, currentPoints[0].z);
      const p2 = new THREE.Vector3(currentPoints[1].x, currentPoints[1].y, currentPoints[1].z);
      
      // Calculate distance
      const distance = p1.distanceTo(p2);
      
      // Calculate inclination
      const inclination = calculateInclination(p1, p2);
      
      // Format label text
      const labelText = formatMeasurementLabel(distance, 'length', inclination);
      
      // Create label at midpoint
      const midpoint = calculateMidpoint(p1, p2);
      const label = createMeasurementLabel(labelText, midpoint, true);
      label.userData.isPreview = true;
      
      labelsRef.add(label);
    }
    else if (activeMode === 'height' && currentPoints.length >= 2) {
      // For height measurement preview
      const p1 = new THREE.Vector3(currentPoints[0].x, currentPoints[0].y, currentPoints[0].z);
      const p2 = new THREE.Vector3(currentPoints[1].x, currentPoints[1].y, currentPoints[1].z);
      
      // Height is specifically the Y-axis difference
      const height = Math.abs(p2.y - p1.y);
      
      // Format label text
      const labelText = formatMeasurementLabel(height, 'height');
      
      // Create label positioned beside the vertical line
      const higher = p1.y > p2.y ? p1 : p2;
      const lower = p1.y > p2.y ? p2 : p1;
      const labelPos = new THREE.Vector3(
        higher.x + 0.2, 
        (higher.y + lower.y) / 2, 
        higher.z
      );
      
      const label = createMeasurementLabel(labelText, labelPos, true);
      label.userData.isPreview = true;
      
      labelsRef.add(label);
    }
    else if (activeMode === 'area' && currentPoints.length >= 3) {
      // For area measurement preview
      const points3D = currentPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
      
      // Calculate area (simplified - for preview only)
      let area = 0;
      const n = points3D.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points3D[i].x * points3D[j].z;
        area -= points3D[j].x * points3D[i].z;
      }
      area = Math.abs(area) / 2;
      
      // Format label text
      const labelText = formatMeasurementLabel(area, 'area');
      
      // Create label at centroid
      const centroid = calculateCentroid(points3D);
      const label = createMeasurementLabel(labelText, centroid, true);
      label.userData.isPreview = true;
      
      labelsRef.add(label);
    }
  }
}

/**
 * Renders edit points for measurement being edited
 */
export function renderEditPoints(
  editPointsRef: THREE.Group | null,
  measurements: Measurement[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  visible: boolean
) {
  if (!editPointsRef) return;
  
  // Clear existing edit points
  while (editPointsRef.children.length > 0) {
    const object = editPointsRef.children[0];
    safelyDisposeObject(object);
    editPointsRef.remove(object);
  }
  
  // If we're not in edit mode, we don't need to show edit points
  if (!editMeasurementId) return;
  
  // Find the measurement being edited
  const measurement = measurements.find(m => m.id === editMeasurementId);
  if (!measurement || measurement.visible === false) return;
  
  // Add editable points with a different appearance
  measurement.points.forEach((point, index) => {
    const isSelected = index === editingPointIndex;
    
    // Create a larger, highlighted sphere for editable points
    const size = isSelected ? 0.08 : 0.06; // Selected point is bigger
    const sphereGeometry = new THREE.SphereGeometry(size, 16, 16);
    
    // Use a bright color for the selected point, different color for others
    const color = isSelected ? 0xff00ff : 0xffff00;
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color,
      opacity: 0.8,
      transparent: true
    });
    
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y, point.z);
    
    // Add user data to the sphere for identification when clicking
    sphere.userData = {
      isEditPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    editPointsRef.add(sphere);
  });
}

/**
 * Renders completed measurements
 */
export function renderMeasurements(
  measurementsRef: THREE.Group | null,
  labelsRef: THREE.Group | null,
  segmentLabelsRef: THREE.Group | null,
  measurements: Measurement[],
  visible: boolean
) {
  if (!measurementsRef || !labelsRef || !segmentLabelsRef) return;
  
  // Clear existing measurement elements
  while (measurementsRef.children.length > 0) {
    const object = measurementsRef.children[0];
    safelyDisposeObject(object);
    measurementsRef.remove(object);
  }
  
  // Clear existing text labels (except preview labels)
  labelsRef.children.forEach(child => {
    if (!child.userData.isPreview) {
      labelsRef.remove(child);
    }
  });

  // Clear segment labels
  while (segmentLabelsRef.children.length > 0) {
    segmentLabelsRef.remove(segmentLabelsRef.children[0]);
  }
  
  // Add visual representation for each finalized measurement
  measurements.forEach((measurement) => {
    // Skip measurements that are explicitly marked as not visible
    if (measurement.visible === false) return;
    
    // Create different visualizations based on measurement type
    if (measurement.type === 'length') {
      renderLengthMeasurement(measurement, measurementsRef, labelsRef);
    } 
    else if (measurement.type === 'height') {
      renderHeightMeasurement(measurement, measurementsRef, labelsRef);
    } 
    else if (measurement.type === 'area') {
      renderAreaMeasurement(measurement, measurementsRef, labelsRef, segmentLabelsRef);
    }
  });
}

/**
 * Renders a length measurement
 */
function renderLengthMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group
) {
  const [p1, p2] = measurement.points;
  
  // Convert to THREE.Vector3
  const point1 = new THREE.Vector3(p1.x, p1.y, p1.z);
  const point2 = new THREE.Vector3(p2.x, p2.y, p2.z);
  
  // Draw the line
  const linePoints = [point1, point2];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00ff00,
    linewidth: 3
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  measurementsRef.add(line);
  
  // Add small spheres at endpoints
  const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  
  measurement.points.forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y, point.z);
    
    // Add userData for interactive selection
    sphere.userData = {
      isMeasurementPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    measurementsRef.add(sphere);
  });
  
  // Calculate inclination
  const inclination = Math.abs(calculateInclination(point1, point2));
  
  // Add text label at midpoint
  const midpoint = calculateMidpoint(point1, point2);
  const labelText = formatMeasurementLabel(measurement.value, 'length', inclination);
  const label = createMeasurementLabel(labelText, midpoint);
  
  // Store measurement ID in user data for reference
  label.userData.measurementId = measurement.id;
  
  // Add to labels group
  labelsRef.add(label);
}

/**
 * Renders a height measurement
 */
function renderHeightMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group
) {
  const [p1, p2] = measurement.points;
  
  // Convert to THREE.Vector3
  const point1 = new THREE.Vector3(p1.x, p1.y, p1.z);
  const point2 = new THREE.Vector3(p2.x, p2.y, p2.z);
  
  // Determine which point is higher
  const higherPoint = point1.y > point2.y ? point1 : point2;
  const lowerPoint = point1.y > point2.y ? point2 : point1;
  
  // Create a vertical projection point below/above the higher point
  const verticalPoint = new THREE.Vector3(
    higherPoint.x,
    lowerPoint.y,
    higherPoint.z
  );
  
  // Skip the original line between points (simplified visualization)
  // Only draw vertical and horizontal lines
  
  // Draw the vertical line
  const verticalLinePoints = [higherPoint, verticalPoint];
  const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints(verticalLinePoints);
  const verticalLineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x0000ff,
    linewidth: 3
  });
  const verticalLine = new THREE.Line(verticalLineGeometry, verticalLineMaterial);
  measurementsRef.add(verticalLine);
  
  // Draw horizontal reference line
  const horizontalLinePoints = [verticalPoint, lowerPoint];
  const horizontalLineGeometry = new THREE.BufferGeometry().setFromPoints(horizontalLinePoints);
  const horizontalLineMaterial = new THREE.LineDashedMaterial({ 
    color: 0x0000ff,
    linewidth: 2,
    dashSize: 0.1,
    gapSize: 0.05,
  });
  const horizontalLine = new THREE.Line(horizontalLineGeometry, horizontalLineMaterial);
  horizontalLine.computeLineDistances();
  measurementsRef.add(horizontalLine);
  
  // Add small spheres at all points
  const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  
  [point1, point2].forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(point);
    
    // Add userData for interactive selection
    sphere.userData = {
      isMeasurementPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    measurementsRef.add(sphere);
  });
  
  // Add text label at midpoint of vertical line
  const labelPos = new THREE.Vector3(
    verticalPoint.x + 0.2, // Slightly offset from vertical line
    (higherPoint.y + verticalPoint.y) / 2,
    verticalPoint.z
  );
  
  const labelText = formatMeasurementLabel(measurement.value, 'height');
  const label = createMeasurementLabel(labelText, labelPos);
  
  // Store measurement ID in user data for reference
  label.userData.measurementId = measurement.id;
  
  // Add to labels group
  labelsRef.add(label);
}

/**
 * Renders an area measurement
 */
function renderAreaMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  segmentLabelsRef: THREE.Group
) {
  const points3D = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  
  // Create outline from points
  for (let i = 0; i < points3D.length; i++) {
    const p1 = points3D[i];
    const p2 = points3D[(i + 1) % points3D.length]; // Connect back to first point
    
    // Draw the line segment
    const linePoints = [p1, p2];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffaa00,
      linewidth: 3
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    measurementsRef.add(line);
    
    // Add small sphere at each vertex
    const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(p1);
    
    // Add userData for interactive selection
    sphere.userData = {
      isAreaPoint: true,
      measurementId: measurement.id,
      pointIndex: i,
      segmentIndex: i
    };
    
    measurementsRef.add(sphere);

    // Add segment labels (for the line measurements)
    if (measurement.segments) {
      const segment = measurement.segments[i];
      const midpoint = calculateMidpoint(p1, p2);
      
      // Offset midpoint slightly to avoid overlap with lines
      midpoint.y += 0.05;
      
      // Include segment inclination in label if available and significant
      let segmentLabel = segment.label || "";
      if (segment.inclination !== undefined && Math.abs(segment.inclination) > 1.0) {
        segmentLabel += ` | ${Math.abs(segment.inclination).toFixed(1)}°`;
      }
      
      // Create label with smaller size
      const segmentLabelSprite = createMeasurementLabel(segmentLabel, midpoint);
      
      // Adjust the scale to make it slightly smaller than area labels
      segmentLabelSprite.scale.multiplyScalar(0.75);
      
      // Store measurement ID and segment ID in user data for reference
      segmentLabelSprite.userData = {
        measurementId: measurement.id,
        segmentId: segment.id,
        startPointIndex: i,
        endPointIndex: (i + 1) % points3D.length
      };
      
      // Add to segment labels group
      segmentLabelsRef.add(segmentLabelSprite);
    }
  }
  
  // Calculate centroid for label placement
  const centroid = calculateCentroid(points3D);
  
  // Create label text with inclination if available
  let labelText = formatMeasurementLabel(measurement.value, 'area');
  if (measurement.inclination !== undefined && Math.abs(measurement.inclination) > 1.0) {
    labelText += ` | Ø ${Math.abs(measurement.inclination).toFixed(1)}°`;
  }
  
  const label = createMeasurementLabel(labelText, centroid);
  
  // Store measurement ID in user data for reference
  label.userData.measurementId = measurement.id;
  
  // Add to labels group
  labelsRef.add(label);
}
