import * as THREE from 'three';
import { Point, Measurement, ModulePosition } from '@/types/measurements';
import {
  createMeasurementLabel,
  formatMeasurementLabel,
  calculateMidpoint,
  calculateCentroid,
  calculateInclination,
  updateTextSprite
} from '@/utils/textSprite';
import { 
  createPVModuleMesh, 
  createSimplifiedPVModuleMesh, 
  generateModulePositions 
} from '@/utils/pvModuleMesh';

/**
 * Helper functions to convert Point to THREE.Vector3
 */
const pointToVector3 = (point: Point): THREE.Vector3 => {
  return new THREE.Vector3(point.x, point.y, point.z);
};

const pointsToVector3Array = (points: Point[]): THREE.Vector3[] => {
  return points.map(pointToVector3);
};

// Constants for visualization
const POINT_Y_OFFSET = 0.01; // Reduced from 0.1 to place points closer to the model
const LINE_Y_OFFSET = 0.025; // Slightly higher than points to ensure visibility
const LABEL_Y_OFFSET = 0.15; // Maintained higher for readability
const PV_LINE_Y_OFFSET = 0.03; // Slightly higher than regular lines for PV visibility

// PV Module visualization constants
const PV_MODULE_COLORS = {
  MODULE: 0x33C3F0,        // Sky blue for modules
  GRID: 0x0066cc,          // Darker blue for grid lines
  BOUNDARY: 0x8B5CF6,      // Purple for boundary
  AVAILABLE_AREA: 0xD946EF // Magenta for available area
};

// Use simplified modules for better performance when module count exceeds this threshold
const SIMPLIFIED_MODULE_THRESHOLD = 50;

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
 * Clears labels for a specific measurement
 */
export function clearMeasurementLabels(
  measurementId: string,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group
) {
  // Remove main labels for the measurement
  const labels = labelsGroup.children.filter(
    obj => obj.userData && obj.userData.measurementId === measurementId && !obj.userData.isPreview
  );
  
  // Dispose and remove each label
  labels.forEach(label => {
    labelsGroup.remove(label);
  });
  
  // Remove segment labels for the measurement
  const segmentLabels = segmentLabelsGroup.children.filter(
    obj => obj.userData && obj.userData.measurementId === measurementId
  );
  
  // Dispose and remove each segment label
  segmentLabels.forEach(label => {
    segmentLabelsGroup.remove(label);
  });
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

  // Clear preview labels - only remove preview labels, not permanent ones
  labelsRef.children.forEach(child => {
    if (child.userData && child.userData.isPreview) {
      labelsRef.remove(child);
    }
  });

  // Add current points as spheres with minimal Y position offset
  currentPoints.forEach((point, index) => {
    const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: activeMode === 'length' ? 0x00ff00 : 
             activeMode === 'height' ? 0x0000ff : 
             activeMode === 'solar' ? 0x1EAEDB : // Changed from 0xffaa00 to blue
             activeMode === 'skylight' ? 0xff8800 :
             activeMode === 'chimney' ? 0xff0000 :
             activeMode === 'vent' ? 0x00ffff :
             activeMode === 'hook' ? 0xff00ff :
             0xffaa00 
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // Add a smaller Y offset to place points closer to the surface
    sphere.position.set(point.x, point.y + POINT_Y_OFFSET, point.z);
    // Set higher renderOrder to ensure points are visible
    sphere.renderOrder = 1;
    pointsRef.add(sphere);

    // Add connecting lines between points with slightly higher Y offset
    if (index > 0) {
      const prevPoint = currentPoints[index - 1];
      // Add Y offset to both points when creating the line
      const p1 = new THREE.Vector3(prevPoint.x, prevPoint.y + LINE_Y_OFFSET, prevPoint.z);
      const p2 = new THREE.Vector3(point.x, point.y + LINE_Y_OFFSET, point.z);
      
      const points = [p1, p2];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: activeMode === 'length' ? 0x00ff00 : 
               activeMode === 'height' ? 0x0000ff : 
               activeMode === 'solar' ? 0x1EAEDB : // Changed from 0xffaa00 to blue
               activeMode === 'skylight' ? 0xff8800 :
               activeMode === 'chimney' ? 0xff0000 :
               activeMode === 'vent' ? 0x00ffff :
               activeMode === 'hook' ? 0xff00ff :
               0xffaa00,
        linewidth: 3, // Increased from 2 for better visibility
        opacity: 0.9, // Higher opacity
        transparent: true
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      // Set high renderOrder to ensure lines appear above the model
      line.renderOrder = 2;
      linesRef.add(line);
    }
  });

  // Add special final connecting line for area/solar/skylight measurement to close the shape
  if ((activeMode === 'area' || activeMode === 'solar' || activeMode === 'skylight' || activeMode === 'chimney') && currentPoints.length >= 3) {
    const firstPoint = currentPoints[0];
    const lastPoint = currentPoints[currentPoints.length - 1];
    const p1 = new THREE.Vector3(lastPoint.x, lastPoint.y + LINE_Y_OFFSET, lastPoint.z);
    const p2 = new THREE.Vector3(firstPoint.x, firstPoint.y + LINE_Y_OFFSET, firstPoint.z);
    
    const closingPoints = [p1, p2];
    const closingGeometry = new THREE.BufferGeometry().setFromPoints(closingPoints);
    // Use a dashed line material with improved visibility
    const closingMaterial = new THREE.LineDashedMaterial({ 
      color: activeMode === 'solar' ? 0x1EAEDB : // Changed from 0xffaa00 to blue
             activeMode === 'skylight' ? 0xff8800 :
             activeMode === 'chimney' ? 0xff0000 :
             0xffaa00,
      linewidth: 3, // Increased from 2 for better visibility
      opacity: 0.9, // Higher opacity
      transparent: true,
      scale: 1,
      dashSize: 0.1,
      gapSize: 0.1
    });
    const closingLine = new THREE.Line(closingGeometry, closingMaterial);
    // Must call computeLineDistances for the dashed line to work
    closingLine.computeLineDistances();
    // Set high renderOrder to ensure visibility
    closingLine.renderOrder = 2;
    linesRef.add(closingLine);
  }
  
  // Create preview label if we have enough points for a complete measurement
  if (currentPoints.length >= 2) {
    if (activeMode === 'length' && currentPoints.length >= 2) {
      // For length measurement preview
      const p1 = pointToVector3(currentPoints[0]);
      const p2 = pointToVector3(currentPoints[1]);
      
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
      const p1 = pointToVector3(currentPoints[0]);
      const p2 = pointToVector3(currentPoints[1]);
      
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
    else if ((activeMode === 'area' || activeMode === 'solar') && currentPoints.length >= 3) {
      // For area/solar measurement preview
      const points3D = pointsToVector3Array(currentPoints);
      
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
      const labelText = formatMeasurementLabel(area, activeMode === 'solar' ? 'solar' : 'area');
      
      // Create label at centroid
      const centroid = calculateCentroid(points3D);
      const label = createMeasurementLabel(labelText, centroid, true);
      label.userData.isPreview = true;
      
      labelsRef.add(label);
    }
    else if ((activeMode === 'skylight' || activeMode === 'chimney') && currentPoints.length >= 3) {
      // For skylight/chimney measurement preview
      const points3D = pointsToVector3Array(currentPoints);
      
      // Calculate area (simplified - for preview only)
      let area = 0;
      const n = points3D.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points3D[i].x * points3D[j].z;
        area -= points3D[j].x * points3D[i].z;
      }
      area = Math.abs(area) / 2;
      
      // Format label text for skylight or chimney
      const labelText = formatMeasurementLabel(area, activeMode === 'skylight' ? 'skylight' : 'chimney');
      
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
  
  // Add editable points with a different appearance and minimal Y position offset
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
    // Add reduced Y offset to place edit points closer to the surface
    sphere.position.set(point.x, point.y + POINT_Y_OFFSET, point.z);
    // Set high renderOrder for visibility
    sphere.renderOrder = 10;
    
    // Add user data to the sphere for identification when clicking
    sphere.userData = {
      isEditPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    editPointsRef.add(sphere);
    
    // Create a label for each point in area measurements
    if (measurement.type === 'area' || measurement.type === 'solar' || 
        measurement.type === 'skylight' || measurement.type === 'chimney') {
      // Position the label slightly above the point
      const labelPosition = new THREE.Vector3(point.x, point.y + LABEL_Y_OFFSET, point.z);
      
      // Create point label (P1, P2, etc.) - mark as point label
      const pointLabel = createMeasurementLabel(`P${index + 1}`, labelPosition, true, undefined, true);
      
      // Store info in userData
      pointLabel.userData = {
        isEditPointLabel: true, // Mark as an edit point label
        isPointLabel: true,
        measurementId: measurement.id,
        pointIndex: index,
        isPreview: true // Mark as preview so it isn't removed with permanent labels
      };
      
      // Set high render order
      pointLabel.renderOrder = 1000;
      
      // Add to edit points group
      editPointsRef.add(pointLabel);
    }
  });
}

/**
 * Create a roof element marker
 */
function createRoofElementMarker(
  position: THREE.Vector3,
  type: string, 
  color: number = 0xffaa00,
  size: number = 0.1
): THREE.Group {
  const markerGroup = new THREE.Group();
  
  // Base marker element - use different geometries for different types
  let geometry;
  
  switch(type) {
    case 'skylight':
      // Rectangle for skylight
      geometry = new THREE.BoxGeometry(size, size * 0.2, size);
      break;
      
    case 'chimney':
      // Cylinder for chimney
      geometry = new THREE.CylinderGeometry(size * 0.5, size * 0.5, size * 1.2, 8);
      break;
      
    case 'solar':
      // Thin box for solar panel - use blue color for solar
      geometry = new THREE.BoxGeometry(size * 1.5, size * 0.1, size * 1.2);
      break;
      
    case 'vent':
      // Cone for vent
      geometry = new THREE.ConeGeometry(size * 0.5, size, 8);
      break;
      
    case 'hook':
      // Small sphere for hook
      geometry = new THREE.SphereGeometry(size * 0.4, 8, 8);
      break;
      
    default:
      // Default box
      geometry = new THREE.BoxGeometry(size, size, size);
  }
  
  // Create material with proper color
  const material = new THREE.MeshLambertMaterial({
    color: color,
    transparent: true,
    opacity: 0.7
  });
  
  // Create mesh and position it
  const marker = new THREE.Mesh(geometry, material);
  
  // Add to marker group
  markerGroup.add(marker);
  
  // Position the entire group
  markerGroup.position.copy(position);
  
  return markerGroup;
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
  
  // Create a map of current measurement IDs for lookup
  const currentMeasurementIds = new Set(measurements.map(m => m.id));
  
  // Remove labels for measurements that no longer exist
  for (let i = labelsRef.children.length - 1; i >= 0; i--) {
    const label = labelsRef.children[i];
    if (!label.userData.isPreview && 
        (!label.userData.measurementId || 
         !currentMeasurementIds.has(label.userData.measurementId))) {
      labelsRef.remove(label);
    }
  }
  
  // Remove segment labels that don't belong to current measurements
  for (let i = segmentLabelsRef.children.length - 1; i >= 0; i--) {
    const label = segmentLabelsRef.children[i];
    if (!label.userData.measurementId || 
        !currentMeasurementIds.has(label.userData.measurementId)) {
      segmentLabelsRef.remove(label);
    }
  }
  
  // Add visual representation for each finalized measurement
  measurements.forEach((measurement) => {
    // Skip measurements that are explicitly marked as not visible
    if (measurement.visible === false) return;
    
    // Find existing labels for this measurement
    const existingLabels = labelsRef.children.filter(
      child => child.userData.measurementId === measurement.id
    );
    
    const existingSegmentLabels = segmentLabelsRef.children.filter(
      child => child.userData.measurementId === measurement.id
    );
    
    // Always recreate labels for measurements being edited or that have changed
    const isMeasurementBeingEdited = measurement.editMode || 
                                     existingLabels.length === 0 || 
                                     existingSegmentLabels.length === 0 ||
                                     (measurement.type === 'area' && 
                                      measurement.segments && 
                                      existingSegmentLabels.length !== measurement.segments.length);
    
    // If this measurement is being edited or doesn't have labels, remove any existing labels
    if (isMeasurementBeingEdited) {
      // Remove existing labels for this measurement to avoid duplicates
      clearMeasurementLabels(measurement.id, labelsRef, segmentLabelsRef);
    }
    
    // Create different visualizations based on measurement type
    if (measurement.type === 'length') {
      renderLengthMeasurement(measurement, measurementsRef, labelsRef, isMeasurementBeingEdited);
    } 
    else if (measurement.type === 'height') {
      renderHeightMeasurement(measurement, measurementsRef, labelsRef, isMeasurementBeingEdited);
    } 
    else if (measurement.type === 'area') {
      renderAreaMeasurement(
        measurement, 
        measurementsRef, 
        labelsRef, 
        segmentLabelsRef, 
        isMeasurementBeingEdited,
        isMeasurementBeingEdited
      );
    }
    else if (measurement.type === 'solar') {
      // First render the base area measurement visuals
      renderAreaMeasurement(
        measurement, 
        measurementsRef, 
        labelsRef, 
        segmentLabelsRef, 
        isMeasurementBeingEdited,
        isMeasurementBeingEdited
      );
      
      // Then add the PV module visualization if modules are visible
      if (measurement.pvModuleInfo && measurement.pvModuleInfo.modulesVisible !== false) {
        renderPVModules(measurement, measurementsRef);
      }
    }
    else if (measurement.type === 'skylight' || measurement.type === 'chimney' || 
             measurement.type === 'vent' || measurement.type === 'hook' || 
             measurement.type === 'other') {
      
      // Render roof elements with markers
      renderRoofElementMeasurement(
        measurement, 
        measurementsRef, 
        labelsRef, 
        isMeasurementBeingEdited
      );
    }
  });
  
  // Check if any measurement is being edited
  const anyMeasurementBeingEdited = measurements.some(m => m.editMode);
  
  // Synchronized visibility logic for main and segment labels
  const updateLabelVisibility = (
    child: THREE.Object3D, 
    isPreview: boolean, 
    measurementId: string | undefined
  ) => {
    // Always hide during editing
    if (anyMeasurementBeingEdited && !isPreview) {
      child.visible = false;
      return;
    }
    
    if (measurementId) {
      const measurement = measurements.find(m => m.id === measurementId);
      if (measurement) {
        // Only show if the measurement exists, is visible and not being edited
        child.visible = measurement.visible !== false && !measurement.editMode;
      } else if (isPreview) {
        // Preview labels are always visible
        child.visible = true;
      } else {
        // Default: visible
        child.visible = true;
      }
    } else if (isPreview) {
      // Preview labels are always visible
      child.visible = true;
    } else {
      // Default: visible
      child.visible = true;
    }
    
    // Ensure high render order
    child.renderOrder = 100;
  };
  
  // Update main labels
  labelsRef.children.forEach(child => {
    updateLabelVisibility(
      child, 
      child.userData.isPreview || false,
      child.userData.measurementId
    );
  });
  
  // Update segment labels
  segmentLabelsRef.children.forEach(child => {
    updateLabelVisibility(
      child, 
      false, // Segment labels are never preview labels
      child.userData.measurementId
    );
  });
}

/**
 * Renders a length measurement
 */
function renderLengthMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  shouldCreateLabel: boolean
) {
  const [p1, p2] = measurement.points;
  
  // Convert to THREE.Vector3 with minimal Y offset
  const point1 = new THREE.Vector3(p1.x, p1.y + LINE_Y_OFFSET, p1.z);
  const point2 = new THREE.Vector3(p2.x, p2.y + LINE_Y_OFFSET, p2.z);
  
  // Draw the line
  const linePoints = [point1, point2];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00ff00,
    linewidth: 3, // Increased from 2
    opacity: 0.9,
    transparent: true
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.renderOrder = 2; // Ensure line renders above model
  measurementsRef.add(line);
  
  // Add small spheres at endpoints with minimal Y offset
  const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00,
    opacity: 0.9,
    transparent: true
  });
  
  measurement.points.forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y + POINT_Y_OFFSET, point.z);
    sphere.renderOrder = 3; // Higher than line
    
    // Add userData for interactive selection
    sphere.userData = {
      isMeasurementPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    measurementsRef.add(sphere);
  });
  
  // Only create a new label if needed
  if (shouldCreateLabel) {
    // Calculate inclination
    const inclination = Math.abs(calculateInclination(point1, point2));
    
    // Add text label at midpoint
    const midpoint = calculateMidpoint(point1, point2);
    // Raise label position slightly higher for visibility
    midpoint.y += LABEL_Y_OFFSET;
    
    const labelText = formatMeasurementLabel(measurement.value, 'length', inclination);
    const label = createMeasurementLabel(labelText, midpoint, true);
    
    // Store measurement ID in user data for reference
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
}

/**
 * Renders a height measurement
 */
function renderHeightMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  shouldCreateLabel: boolean
) {
  const [p1, p2] = measurement.points;
  
  // Convert to THREE.Vector3 with minimal Y offset
  const point1 = new THREE.Vector3(p1.x, p1.y + POINT_Y_OFFSET, p1.z);
  const point2 = new THREE.Vector3(p2.x, p2.y + POINT_Y_OFFSET, p2.z);
  
  // Determine which point is higher
  const higherPoint = point1.y > point2.y ? point1 : point2;
  const lowerPoint = point1.y > point2.y ? point2 : point1;
  
  // Create a vertical projection point below/above the higher point
  const verticalPoint = new THREE.Vector3(
    higherPoint.x,
    lowerPoint.y,
    higherPoint.z
  );
  
  // Draw the vertical line
  const verticalLinePoints = [
    new THREE.Vector3(higherPoint.x, higherPoint.y + LINE_Y_OFFSET, higherPoint.z),
    new THREE.Vector3(verticalPoint.x, verticalPoint.y + LINE_Y_OFFSET, verticalPoint.z)
  ];
  const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints(verticalLinePoints);
  const verticalLineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x0000ff,
    linewidth: 3, // Increased from 2
    opacity: 0.9,
    transparent: true
  });
  const verticalLine = new THREE.Line(verticalLineGeometry, verticalLineMaterial);
  verticalLine.renderOrder = 2; // Ensure line renders above model
  measurementsRef.add(verticalLine);
  
  // Draw horizontal reference line
  const horizontalLinePoints = [
    new THREE.Vector3(verticalPoint.x, verticalPoint.y + LINE_Y_OFFSET, verticalPoint.z),
    new THREE.Vector3(lowerPoint.x, lowerPoint.y + LINE_Y_OFFSET, lowerPoint.z)
  ];
  const horizontalLineGeometry = new THREE.BufferGeometry().setFromPoints(horizontalLinePoints);
  const horizontalLineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x0000ff,
    linewidth: 2,
    opacity: 0.7,
    transparent: true,
    dashSize: 0.1,
    gapSize: 0.05
  });
  const horizontalLine = new THREE.Line(horizontalLineGeometry, horizontalLineMaterial);
  horizontalLine.renderOrder = 2;
  measurementsRef.add(horizontalLine);
  
  // Add small spheres at endpoints with minimal Y offset
  const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x0000ff,
    opacity: 0.9,
    transparent: true
  });
  
  // Create spheres at all points
  const points = [higherPoint, lowerPoint, verticalPoint];
  points.forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y + POINT_Y_OFFSET, point.z);
    sphere.renderOrder = 3;
    
    // Only add user data for actual measurement points
    if (index < 2) {
      sphere.userData = {
        isMeasurementPoint: true,
        measurementId: measurement.id,
        pointIndex: index
      };
    } else {
      sphere.userData = {
        isReferencePoint: true,
        measurementId: measurement.id
      };
    }
    
    measurementsRef.add(sphere);
  });
  
  // Only create a new label if needed
  if (shouldCreateLabel) {
    // Add text label beside the vertical line
    const labelPos = new THREE.Vector3(
      verticalPoint.x + 0.2,  // Offset to the right
      (higherPoint.y + lowerPoint.y) / 2,  // Midpoint of vertical line
      higherPoint.z
    );
    
    const labelText = formatMeasurementLabel(measurement.value, 'height');
    const label = createMeasurementLabel(labelText, labelPos, true);
    
    // Store measurement ID in user data for reference
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
}

/**
 * Renders an area measurement
 */
function renderAreaMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  segmentLabelsRef: THREE.Group,
  shouldCreateLabel: boolean,
  shouldCreateSegmentLabels: boolean
) {
  const { points, type } = measurement;
  
  // Convert points to THREE.Vector3
  const points3D = points.map(p => 
    new THREE.Vector3(p.x, p.y + LINE_Y_OFFSET, p.z)
  );
  
  // Create a single geometry for the area outline
  const lineGeometry = new THREE.BufferGeometry();
  
  // Create points array for closed loop (add first point at the end)
  const linePoints: THREE.Vector3[] = [...points3D];
  if (linePoints.length > 0) {
    linePoints.push(linePoints[0].clone()); // Close the loop
  }
  
  // Set points for the line geometry
  lineGeometry.setFromPoints(linePoints);
  
  // Determine color based on measurement type
  const lineColor = type === 'solar' ? PV_MODULE_COLORS.MODULE : 
                   type === 'skylight' ? 0xff8800 :
                   type === 'chimney' ? 0xff0000 :
                   0xffaa00;
  
  // Create material for outline
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: lineColor,
    linewidth: 3, // Increased from 2
    opacity: 0.9,
    transparent: true
  });
  
  // Create and add outline to scene
  const outline = new THREE.Line(lineGeometry, lineMaterial);
  outline.renderOrder = 2;
  measurementsRef.add(outline);
  
  // Add fill if this is a solar measurement (semi-transparent)
  if (type === 'solar') {
    // Create shape for fill
    const shape = new THREE.Shape();
    
    // Start shape at first point
    if (points3D.length > 0) {
      shape.moveTo(points3D[0].x, points3D[0].z);
      
      // Add remaining points
      for (let i = 1; i < points3D.length; i++) {
        shape.lineTo(points3D[i].x, points3D[i].z);
      }
      
      // Close shape
      shape.closePath();
      
      // Create geometry (XZ plane)
      const shapeGeometry = new THREE.ShapeGeometry(shape);
      
      // Rotate geometry to the proper plane and position
      shapeGeometry.rotateX(Math.PI / 2);
      
      // Adjust Y position to match points with a small offset to prevent z-fighting
      // Calculate average Y position
      const avgY = points3D.reduce((sum, p) => sum + p.y, 0) / points3D.length;
      
      // Create fill material (semi-transparent)
      const fillMaterial = new THREE.MeshBasicMaterial({
        color: PV_MODULE_COLORS.AVAILABLE_AREA,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false // Prevents z-fighting
      });
      
      // Create and add fill mesh
      const fill = new THREE.Mesh(shapeGeometry, fillMaterial);
      fill.position.y = avgY + 0.001; // Slightly above the outline
      fill.renderOrder = 1; // Below the outline
      measurementsRef.add(fill);
    }
  }
  
  // Add small spheres at corners with minimal Y offset
  const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: lineColor,
    opacity: 0.9,
    transparent: true
  });
  
  points.forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y + POINT_Y_OFFSET, point.z);
    sphere.renderOrder = 3;
    
    // Add userData for interactive selection
    sphere.userData = {
      isMeasurementPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    measurementsRef.add(sphere);
  });
  
  // Only create a new area label if needed
  if (shouldCreateLabel) {
    // Calculate centroid for label position
    const centroid = calculateCentroid(points3D);
    centroid.y += LABEL_Y_OFFSET; // Raise label for visibility
    
    // Format label text based on measurement type
    const labelText = formatMeasurementLabel(
      measurement.value, 
      type === 'solar' ? 'solar' : 
      type === 'skylight' ? 'skylight' :
      type === 'chimney' ? 'chimney' :
      'area'
    );
    
    const label = createMeasurementLabel(labelText, centroid, true);
    
    // Store measurement ID in user data for reference
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
  
  // Add segment labels if needed and if segments exist
  if (shouldCreateSegmentLabels && measurement.segments) {
    measurement.segments.forEach((segment, segmentIndex) => {
      const [p1, p2] = segment.points;
      
      // Convert to THREE.Vector3
      const point1 = new THREE.Vector3(p1.x, p1.y + LINE_Y_OFFSET, p1.z);
      const point2 = new THREE.Vector3(p2.x, p2.y + LINE_Y_OFFSET, p2.z);
      
      // Calculate midpoint for label placement
      const midpoint = calculateMidpoint(point1, point2);
      midpoint.y += LABEL_Y_OFFSET * 0.75; // Slightly lower than area label
      
      // Format label with segment length
      const segmentLabel = formatMeasurementLabel(segment.length, 'segment');
      const label = createMeasurementLabel(segmentLabel, midpoint, true, 0.75); // Smaller scale
      
      // Store segment reference in user data
      label.userData = {
        measurementId: measurement.id,
        segmentId: segment.id,
        segmentIndex,
        isSegmentLabel: true
      };
      
      // Add to segment labels group
      segmentLabelsRef.add(label);
    });
  }
}

/**
 * Renders roof elements (skylight, chimney, etc.)
 */
function renderRoofElementMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  shouldCreateLabel: boolean
) {
  // Determine if this is a closed polygon or just a point marker
  const isAreaType = measurement.points.length >= 3;
  
  if (isAreaType) {
    // Render as an area with the appropriate color for the type
    renderAreaMeasurement(
      measurement,
      measurementsRef,
      labelsRef,
      { children: [] } as unknown as THREE.Group, // Empty group - we don't need segment labels
      shouldCreateLabel,
      false
    );
  } else {
    // Render a single marker for point-based elements (e.g., vents, hooks)
    if (measurement.points.length > 0) {
      const point = measurement.points[0];
      const position = new THREE.Vector3(point.x, point.y + 0.05, point.z);
      
      // Determine color and size based on type
      let color;
      let size = 0.15;
      
      switch (measurement.type) {
        case 'skylight':
          color = 0xff8800;
          break;
        case 'chimney':
          color = 0xff0000;
          break;
        case 'vent':
          color = 0x00ffff;
          size = 0.1;
          break;
        case 'hook':
          color = 0xff00ff;
          size = 0.08;
          break;
        default:
          color = 0xffaa00;
      }
      
      // Create marker
      const marker = createRoofElementMarker(position, measurement.type, color, size);
      
      // Add reference to the measurement
      marker.userData = {
        measurementId: measurement.id,
        type: measurement.type
      };
      
      measurementsRef.add(marker);
      
      // Add label if needed
      if (shouldCreateLabel) {
        const labelPosition = new THREE.Vector3(
          position.x, 
          position.y + 0.2, 
          position.z
        );
        
        // Create label text based on type
        let labelText = measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1);
        
        // Add dimensions if available
        if (measurement.dimensions) {
          if (measurement.dimensions.width && measurement.dimensions.length) {
            labelText += ` (${measurement.dimensions.width.toFixed(2)}×${measurement.dimensions.length.toFixed(2)}m)`;
          } else if (measurement.dimensions.diameter) {
            labelText += ` (Ø${measurement.dimensions.diameter.toFixed(2)}m)`;
          }
        }
        
        const label = createMeasurementLabel(labelText, labelPosition, true);
        
        // Store measurement ID in user data for reference
        label.userData.measurementId = measurement.id;
        
        // Add to labels group
        labelsRef.add(label);
      }
    }
  }
}

/**
 * Renders PV modules for a solar measurement
 */
function renderPVModules(
  measurement: Measurement,
  measurementsRef: THREE.Group
) {
  // Only process measurements with proper PV module info
  if (
    measurement.type !== 'solar' || 
    !measurement.pvModuleInfo || 
    !measurement.pvModuleInfo.modulePositions ||
    measurement.pvModuleInfo.modulePositions.length === 0
  ) {
    return;
  }
  
  const { modulePositions } = measurement.pvModuleInfo;
  
  // Create a group to hold all modules
  const modulesGroup = new THREE.Group();
  modulesGroup.name = `pvModules-${measurement.id}`;
  
  // Store reference to measurement
  modulesGroup.userData = {
    measurementId: measurement.id,
    type: 'pvModules'
  };
  
  // Determine if we should use simplified meshes for better performance
  const useSimplified = modulePositions.length > SIMPLIFIED_MODULE_THRESHOLD;
  
  // Get module dimensions from the first position
  const { width, height, depth } = modulePositions[0].dimensions;
  
  // Create a reusable module mesh based on measurement type
  let templateMesh;
  
  if (useSimplified) {
    // Create a simplified mesh for large arrays
    templateMesh = createSimplifiedPVModuleMesh(width, height, depth);
  } else {
    // Create a detailed mesh for smaller arrays
    templateMesh = createPVModuleMesh(width, height, depth);
  }
  
  // Place modules at each position
  modulePositions.forEach(modulePos => {
    // Clone the template mesh
    const moduleMesh = templateMesh.clone();
    
    // Position and rotate the module
    moduleMesh.position.copy(modulePos.position);
    moduleMesh.rotation.copy(modulePos.rotation);
    
    // Add row/column info to userData
    moduleMesh.userData = {
      index: modulePos.index,
      row: modulePos.row,
      column: modulePos.column
    };
    
    // Add to modules group
    modulesGroup.add(moduleMesh);
  });
  
  // Add the entire group to the measurements group
  measurementsRef.add(modulesGroup);
}
