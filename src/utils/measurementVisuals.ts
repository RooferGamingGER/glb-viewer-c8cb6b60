import * as THREE from 'three';
import { Point, Measurement, Segment, PVModuleInfo } from '@/types/measurements';
import {
  createMeasurementLabel,
  formatMeasurementLabel,
  calculateMidpoint,
  calculateCentroid,
  calculateInclination,
  updateTextSprite
} from '@/utils/textSprite';
import { generatePVModuleGrid } from '@/utils/pvCalculations';

/**
 * Helper functions to convert Point to THREE.Vector3
 */
const pointToVector3 = (point: Point): THREE.Vector3 => {
  return new THREE.Vector3(point.x, point.y, point.z);
};

const pointsToVector3Array = (points: Point[]): THREE.Vector3[] => {
  return points.map(pointToVector3);
};

// Update constants for PV module visualization for better visibility
const POINT_Y_OFFSET = 0.01; 
const LINE_Y_OFFSET = 0.025; 
const LABEL_Y_OFFSET = 0.15; 
const PV_LINE_Y_OFFSET = 0.3; // Significantly increased for better visibility

// PV Module visualization constants
const PV_MODULE_COLORS = {
  MODULE: 0x33C3F0,        // Sky blue for modules
  GRID: 0x0066cc,          // Darker blue for grid lines
  BOUNDARY: 0x8B5CF6,      // Purple for boundary
  AVAILABLE_AREA: 0xD946EF // Magenta for available area
};

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
  if (!measurementsRef || !labelsRef || !segmentLabelsRef) {
    console.log("One of the required refs is null in renderMeasurements", { 
      hasMeasurementsRef: !!measurementsRef, 
      hasLabelsRef: !!labelsRef, 
      hasSegmentLabelsRef: !!segmentLabelsRef
    });
    return;
  }
  
  console.log("Starting renderMeasurements with", { 
    measurementsCount: measurements.length,
    visibleMeasurements: measurements.filter(m => m.visible !== false).length,
    solarMeasurements: measurements.filter(m => m.type === 'solar').length
  });
  
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
    if (measurement.visible === false) {
      console.log(`Skipping invisible measurement ${measurement.id}, type: ${measurement.type}`);
      return;
    }
    
    // Debug solar measurements
    if (measurement.type === 'solar') {
      console.log(`Processing solar measurement ${measurement.id}`, {
        pointCount: measurement.points.length,
        value: measurement.value,
        hasSegments: !!measurement.segments,
        hasPvModuleInfo: !!measurement.pvModuleInfo
      });
    }
    
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
      // Use specialized solar rendering that includes PV module visualization
      console.log(`Using specialized renderSolarMeasurement for ${measurement.id}`);
      
      renderSolarMeasurement(
        measurement, 
        measurementsRef, 
        labelsRef, 
        segmentLabelsRef, 
        isMeasurementBeingEdited,
        isMeasurementBeingEdited
      );
      
      // EXPLICITLY render PV module grid if we have PV module info
      if (measurement.pvModuleInfo && measurement.pvModuleInfo.moduleCount > 0) {
        console.log(`Rendering PV module grid for measurement ${measurement.id}`, measurement.pvModuleInfo);
        renderPVModuleGrid(measurement, measurementsRef, labelsRef);
      } else {
        console.log(`No PV module info available for solar measurement ${measurement.id} or moduleCount = 0`);
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
        // Only show if measurement exists, is visible, and not being edited
        child.visible = measurement.visible !== false && !measurement.editMode;
      } else if (isPreview) {
        // Preview labels always visible
        child.visible = true;
      } else {
        // Default: visible
        child.visible = true;
      }
    } else if (isPreview) {
      // Preview labels always visible
      child.visible = true;
    } else {
      // Default: visible
      child.visible = true;
    }
    
    // Ensure high renderOrder
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
  
  console.log("After renderMeasurements, measurementsRef contains:", {
    totalChildren: measurementsRef.children.length,
    pvModules: measurementsRef.children.filter(c => c.userData?.isPVModule).length,
    solarMeshes: measurementsRef.children.filter(c => c.userData?.measurementId && 
                                                  measurements.find(m => m.id === c.userData.measurementId)?.type === 'solar').length
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
  const horizontalLineMaterial = new THREE.LineDashedMaterial({ 
    color: 0x0000ff,
    linewidth: 3, // Increased from 2
    opacity: 0.9,
    transparent: true,
    dashSize: 0.1,
    gapSize: 0.05,
  });
  const horizontalLine = new THREE.Line(horizontalLineGeometry, horizontalLineMaterial);
  horizontalLine.computeLineDistances();
  horizontalLine.renderOrder = 2;
  measurementsRef.add(horizontalLine);
  
  // Add small spheres at all points
  const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x0000ff,
    opacity: 0.9,
    transparent: true
  });
  
  [point1, point2].forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(point);
    sphere.renderOrder = 3;
    
    // Add userData for interactive selection - HIER WAR DER FEHLER
    sphere.userData = {
      isMeasurementPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    measurementsRef.add(sphere);
  });
  
  // Only create a new label if needed
  if (shouldCreateLabel) {
    // Height is specifically the Y-axis difference
    const height = Math.abs(point2.y - point1.y);
    
    // Add text label positioned beside the vertical line
    const labelPos = new THREE.Vector3(
      higherPoint.x + 0.2, 
      (higherPoint.y + lowerPoint.y) / 2, 
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
  // Convert points to THREE.Vector3 array
  const points3D = measurement.points.map(point => 
    new THREE.Vector3(point.x, point.y + LINE_Y_OFFSET, point.z)
  );
  
  if (points3D.length < 3) return; // Need at least 3 points for an area
  
  // Create a shape for filled polygon
  const shape = new THREE.Shape();
  shape.moveTo(points3D[0].x, points3D[0].z); // Note: using X and Z for 2D shape
  
  for (let i = 1; i < points3D.length; i++) {
    shape.lineTo(points3D[i].x, points3D[i].z);
  }
  
  shape.closePath();
  
  // Create geometry from shape
  const shapeGeometry = new THREE.ShapeGeometry(shape);
  
  // Adjust vertices to match original Y positions
  const positionAttribute = shapeGeometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const z = positionAttribute.getY(i); // ShapeGeometry uses Y as Z
    
    // Find closest original point for Y value
    let closestPoint = points3D[0];
    let minDist = Infinity;
    
    for (const point of points3D) {
      const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.z - z, 2));
      if (dist < minDist) {
        minDist = dist;
        closestPoint = point;
      }
    }
    
    // Set the Y position
    positionAttribute.setY(i, closestPoint.y);
    // Correct Z which is actually Y in the ShapeGeometry
    positionAttribute.setZ(i, z);
  }
  
  // Create material for the area
  const areaMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  });
  
  // Create mesh
  const areaMesh = new THREE.Mesh(shapeGeometry, areaMaterial);
  areaMesh.userData = {
    isMeasurement: true,
    measurementId: measurement.id,
    measurementType: 'area'
  };
  measurementsRef.add(areaMesh);
  
  // Draw outline
  const outlinePoints = [...points3D, points3D[0]]; // Close the loop
  const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: 0xff7700,
    linewidth: 2,
    opacity: 0.8,
    transparent: true
  });
  const outline = new THREE.Line(outlineGeometry, outlineMaterial);
  outline.userData = {
    isMeasurement: true,
    measurementId: measurement.id,
    measurementType: 'area'
  };
  outline.renderOrder = 2;
  measurementsRef.add(outline);
  
  // Add points at each vertex
  measurement.points.forEach((point, index) => {
    const vertexGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const vertexMaterial = new THREE.MeshBasicMaterial({
      color: 0xff7700,
      opacity: 0.9,
      transparent: true
    });
    const vertex = new THREE.Mesh(vertexGeometry, vertexMaterial);
    vertex.position.set(point.x, point.y + POINT_Y_OFFSET, point.z);
    vertex.renderOrder = 3;
    
    // Add userData for interactive selection
    vertex.userData = {
      isMeasurementPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    measurementsRef.add(vertex);
  });
  
  // Create labels if needed
  if (shouldCreateLabel) {
    // Calculate centroid for label position
    const centroid = calculateCentroid(points3D);
    centroid.y += LABEL_Y_OFFSET; // Raise label for visibility
    
    // Format area label
    const labelText = formatMeasurementLabel(measurement.value, 'area');
    const label = createMeasurementLabel(labelText, centroid, true);
    
    // Store reference data
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
  
  // Add segment labels if needed
  if (shouldCreateSegmentLabels && measurement.segments) {
    measurement.segments.forEach((segment, segmentIndex) => {
      // In segment, points is an array of two points: [start, end]
      const startPoint = measurement.points.find(p => 
        p.x === segment.points[0].x && p.y === segment.points[0].y && p.z === segment.points[0].z
      );
      const endPoint = measurement.points.find(p => 
        p.x === segment.points[1].x && p.y === segment.points[1].y && p.z === segment.points[1].z
      );
      
      // Skip if we can't find the points (shouldn't happen)
      if (!startPoint || !endPoint) return;
      
      const p1 = new THREE.Vector3(startPoint.x, startPoint.y + LINE_Y_OFFSET, startPoint.z);
      const p2 = new THREE.Vector3(endPoint.x, endPoint.y + LINE_Y_OFFSET, endPoint.z);
      
      // Calculate midpoint for label
      const midpoint = calculateMidpoint(p1, p2);
      midpoint.y += LABEL_Y_OFFSET; // Raise label
      
      // Create segment label - convert number to string for formatMeasurementLabel
      const segmentLabel = createMeasurementLabel(
        formatMeasurementLabel(segment.length.toString(), 'length'), 
        midpoint, 
        true,
        0x555555 // Darker color for segment labels
      );
      
      // Store reference data
      segmentLabel.userData = {
        measurementId: measurement.id,
        segmentIndex
      };
      
      // Add to segment labels group
      segmentLabelsRef.add(segmentLabel);
    });
  }
}

/**
 * Renders a solar measurement with PV modules
 */
function renderSolarMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  segmentLabelsRef: THREE.Group,
  shouldCreateLabel: boolean,
  shouldCreateSegmentLabels: boolean
) {
  // First render the base area similar to a regular area measurement
  // but with a different color scheme
  
  // Convert points to THREE.Vector3 array
  const points3D = measurement.points.map(point => 
    new THREE.Vector3(point.x, point.y + PV_LINE_Y_OFFSET, point.z)
  );
  
  if (points3D.length < 3) return; // Need at least 3 points for an area
  
  // Create a shape for filled polygon
  const shape = new THREE.Shape();
  shape.moveTo(points3D[0].x, points3D[0].z); // Note: using X and Z for 2D shape
  
  for (let i = 1; i < points3D.length; i++) {
    shape.lineTo(points3D[i].x, points3D[i].z);
  }
  
  shape.closePath();
  
  // Create geometry from shape
  const shapeGeometry = new THREE.ShapeGeometry(shape);
  
  // Adjust vertices to match original Y positions
  const positionAttribute = shapeGeometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const z = positionAttribute.getY(i); // ShapeGeometry uses Y as Z
    
    // Find closest original point for Y value
    let closestPoint = points3D[0];
    let minDist = Infinity;
    
    for (const point of points3D) {
      const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.z - z, 2));
      if (dist < minDist) {
        minDist = dist;
        closestPoint = point;
      }
    }
    
    // Set the Y position with increased offset for PV modules
    positionAttribute.setY(i, closestPoint.y + PV_LINE_Y_OFFSET);
    // Correct Z which is actually Y in the ShapeGeometry
    positionAttribute.setZ(i, z);
  }
  
  // Create solar area material with enhanced blue color
  const solarMaterial = new THREE.MeshBasicMaterial({
    color: PV_MODULE_COLORS.AVAILABLE_AREA,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  
  // Create mesh
  const solarMesh = new THREE.Mesh(shapeGeometry, solarMaterial);
  solarMesh.renderOrder = 1;
  solarMesh.userData = {
    isMeasurement: true,
    measurementId: measurement.id,
    measurementType: 'solar'
  };
  measurementsRef.add(solarMesh);
  
  // Draw outline with brighter color
  const outlinePoints = [...points3D, points3D[0]]; // Close the loop
  const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: PV_MODULE_COLORS.BOUNDARY,
    linewidth: 3, // Thicker line
    opacity: 0.9,  // Higher opacity
    transparent: true
  });
  const outline = new THREE.Line(outlineGeometry, outlineMaterial);
  outline.renderOrder = 2;
  outline.userData = {
    isMeasurement: true,
    measurementId: measurement.id,
    measurementType: 'solar'
  };
  measurementsRef.add(outline);
  
  // Add points at each vertex with solar color
  measurement.points.forEach((point, index) => {
    const vertexGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const vertexMaterial = new THREE.MeshBasicMaterial({
      color: PV_MODULE_COLORS.BOUNDARY,
      opacity: 0.9,
      transparent: true
    });
    const vertex = new THREE.Mesh(vertexGeometry, vertexMaterial);
    // Adding additional Y-offset for better visibility
    vertex.position.set(point.x, point.y + PV_LINE_Y_OFFSET, point.z);
    vertex.renderOrder = 3;
    
    // Add userData for interactive selection
    vertex.userData = {
      isMeasurementPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    measurementsRef.add(vertex);
  });
  
  // Create main label if needed
  if (shouldCreateLabel) {
    // Calculate centroid for label position
    const centroid = calculateCentroid(points3D);
    centroid.y += LABEL_Y_OFFSET * 1.5; // Extra height for solar labels
    
    // Format solar area label with special indicators
    const labelText = formatMeasurementLabel(measurement.value, 'solar');
    const label = createMeasurementLabel(labelText, centroid, true);
    
    // Store reference data
    label.userData = {
      measurementId: measurement.id,
      isSolarLabel: true
    };
    
    // Add to labels group
    labelsRef.add(label);
    
    // If we have PV module info, create an additional info label
    if (measurement.pvModuleInfo) {
      const { moduleCount, columns, rows } = measurement.pvModuleInfo;
      
      if (moduleCount > 0) {
        // Position the PV info label slightly below the main label
        const infoLabelPos = new THREE.Vector3(
          centroid.x, 
          centroid.y - 0.15, 
          centroid.z
        );
        
        // Create info label with PV module details - Convert the values to strings
        const moduleCountStr = moduleCount.toString();
        const rowsStr = rows ? rows.toString() : "?";
        const colsStr = columns ? columns.toString() : "?";
        
        const infoLabel = createMeasurementLabel(
          `PV-Module: ${moduleCountStr} (${rowsStr}×${colsStr})`, 
          infoLabelPos, 
          true,
          PV_MODULE_COLORS.MODULE // Use solar blue color
        );
        
        // Store reference data
        infoLabel.userData = {
          measurementId: measurement.id,
          isPVInfoLabel: true
        };
        
        // Add to labels group
        labelsRef.add(infoLabel);
      }
    }
  }
  
  // Add segment labels if needed (similar to area measurement)
  if (shouldCreateSegmentLabels && measurement.segments) {
    measurement.segments.forEach((segment, segmentIndex) => {
      // In segment, points is an array of two points: [start, end]
      const startPoint = measurement.points.find(p => 
        p.x === segment.points[0].x && p.y === segment.points[0].y && p.z === segment.points[0].z
      );
      const endPoint = measurement.points.find(p => 
        p.x === segment.points[1].x && p.y === segment.points[1].y && p.z === segment.points[1].z
      );
      
      // Skip if we can't find the points
      if (!startPoint || !endPoint) return;
      
      const p1 = new THREE.Vector3(startPoint.x, startPoint.y + PV_LINE_Y_OFFSET, startPoint.z);
      const p2 = new THREE.Vector3(endPoint.x, endPoint.y + PV_LINE_Y_OFFSET, endPoint.z);
      
      // Calculate midpoint for label
      const midpoint = calculateMidpoint(p1, p2);
      midpoint.y += LABEL_Y_OFFSET; // Raise label
      
      // Create segment label - convert number to string for formatMeasurementLabel
      const segmentLabel = createMeasurementLabel(
        formatMeasurementLabel(segment.length.toString(), 'length'), 
        midpoint, 
        true,
        PV_MODULE_COLORS.BOUNDARY // Use solar boundary color
      );
      
      // Store reference data
      segmentLabel.userData = {
        measurementId: measurement.id,
        segmentIndex
      };
      
      // Add to segment labels group
      segmentLabelsRef.add(segmentLabel);
    });
  }
}

/**
 * Renders a roof element (skylight, chimney, etc.)
 */
function renderRoofElementMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  shouldCreateLabel: boolean
) {
  // Use different rendering depending on the roof element type
  if (measurement.points.length === 1) {
    // Single point markers (vents, hooks, etc.)
    const point = measurement.points[0];
    const markerPosition = new THREE.Vector3(point.x, point.y + 0.1, point.z);
    
    // Select color based on type
    let markerColor;
    switch(measurement.type) {
      case 'vent': markerColor = 0x00ffff; break;
      case 'hook': markerColor = 0xff00ff; break;
      default: markerColor = 0xffaa00; break;
    }
    
    // Create appropriate marker
    const marker = createRoofElementMarker(markerPosition, measurement.type, markerColor, 0.15);
    
    // Add userData for interaction
    marker.userData = {
      isMeasurement: true,
      measurementId: measurement.id,
      measurementType: measurement.type
    };
    
    measurementsRef.add(marker);
    
    // Add label
    if (shouldCreateLabel) {
      const labelPos = new THREE.Vector3(point.x, point.y + 0.3, point.z);
      const labelText = measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1);
      const label = createMeasurementLabel(labelText, labelPos, true);
      
      // Store reference data
      label.userData.measurementId = measurement.id;
      
      // Add to labels group
      labelsRef.add(label);
    }
  } 
  else if (measurement.points.length >= 3) {
    // Area-based roof elements (skylights, chimneys)
    // Convert points to THREE.Vector3 array
    const points3D = measurement.points.map(point => 
      new THREE.Vector3(point.x, point.y + 0.05, point.z)
    );
    
    // Create a shape
    const shape = new THREE.Shape();
    shape.moveTo(points3D[0].x, points3D[0].z);
    
    for (let i = 1; i < points3D.length; i++) {
      shape.lineTo(points3D[i].x, points3D[i].z);
    }
    
    shape.closePath();
    
    // Create geometry
    const shapeGeometry = new THREE.ShapeGeometry(shape);
    
    // Adjust vertices Y positions
    const positionAttribute = shapeGeometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getY(i);
      
      // Find closest original point
      let closestPoint = points3D[0];
      let minDist = Infinity;
      
      for (const point of points3D) {
        const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.z - z, 2));
        if (dist < minDist) {
          minDist = dist;
          closestPoint = point;
        }
      }
      
      // Set Y position
      positionAttribute.setY(i, closestPoint.y + 0.05);
      positionAttribute.setZ(i, z);
    }
    
    // Create material
    let elementColor;
    let elementHeight = 0.1;
    
    switch(measurement.type) {
      case 'skylight':
        elementColor = 0xff8800;
        elementHeight = 0.05;
        break;
      case 'chimney':
        elementColor = 0xff0000;
        elementHeight = 0.3;
        break;
      default:
        elementColor = 0xffaa00;
        elementHeight = 0.1;
        break;
    }
    
    const elementMaterial = new THREE.MeshBasicMaterial({
      color: elementColor,
      transparent: true,
      opacity: 0.7
    });
    
    // Create mesh
    const elementMesh = new THREE.Mesh(shapeGeometry, elementMaterial);
    
    // For chimneys, extrude upward
    if (measurement.type === 'chimney') {
      // Create extrusion geometry
      const extrudeSettings = {
        steps: 1,
        depth: elementHeight,
        bevelEnabled: false
      };
      
      const extrudeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      // Adjust for correct positioning
      extrudeGeometry.translate(0, points3D[0].y, 0);
      
      // Create extruded mesh
      const extrudedMesh = new THREE.Mesh(extrudeGeometry, elementMaterial);
      extrudedMesh.userData = {
        isMeasurement: true,
        measurementId: measurement.id,
        measurementType: measurement.type
      };
      
      measurementsRef.add(extrudedMesh);
    } else {
      // For non-extruded elements
      elementMesh.userData = {
        isMeasurement: true,
        measurementId: measurement.id,
        measurementType: measurement.type
      };
      
      measurementsRef.add(elementMesh);
    }
    
    // Add outline
    const outlinePoints = [...points3D, points3D[0]]; // Close the loop
    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: elementColor,
      linewidth: 2,
      opacity: 0.9,
      transparent: true
    });
    const outline = new THREE.Line(outlineGeometry, outlineMaterial);
    outline.userData = {
      isMeasurement: true,
      measurementId: measurement.id,
      measurementType: measurement.type
    };
    
    measurementsRef.add(outline);
    
    // Add points at vertices
    measurement.points.forEach((point, index) => {
      const vertexGeometry = new THREE.SphereGeometry(0.04, 16, 16);
      const vertexMaterial = new THREE.MeshBasicMaterial({
        color: elementColor,
        opacity: 0.9,
        transparent: true
      });
      const vertex = new THREE.Mesh(vertexGeometry, vertexMaterial);
      vertex.position.set(point.x, point.y + 0.05, point.z);
      
      // Add userData for interactive selection
      vertex.userData = {
        isMeasurementPoint: true,
        measurementId: measurement.id,
        pointIndex: index
      };
      
      measurementsRef.add(vertex);
    });
    
    // Add label if needed
    if (shouldCreateLabel) {
      const centroid = calculateCentroid(points3D);
      centroid.y += 0.25; // Raise label
      
      // Format label with type indicator
      const typeLabel = measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1);
      const areaText = formatMeasurementLabel(measurement.value, measurement.type);
      const labelText = `${typeLabel}: ${areaText}`;
      
      const label = createMeasurementLabel(labelText, centroid, true);
      
      // Store reference data
      label.userData.measurementId = measurement.id;
      
      // Add to labels group
      labelsRef.add(label);
    }
  }
}

/**
 * Renders PV module grid for a solar measurement
 */
function renderPVModuleGrid(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group
) {
  // Only continue if we have valid PV module info
  if (!measurement.pvModuleInfo || !measurement.pvModuleInfo.moduleCount || measurement.pvModuleInfo.moduleCount <= 0) {
    console.log(`No valid PV module info for measurement ${measurement.id}`);
    return;
  }
  
  console.log(`Rendering PV module grid for ${measurement.id} with ${measurement.pvModuleInfo.moduleCount} modules`);
  
  // Generate PV module grid using the utility function
  const result = generatePVModuleGrid(measurement);
  
  if (!result || !result.modulePoints || result.modulePoints.length === 0) {
    console.log(`No modules generated for measurement ${measurement.id}`);
    return;
  }
  
  // Create our own module definitions from the modulePoints
  type ModuleInfo = {
    center: THREE.Vector3;
    size: { width: number; height: number };
    rotation: THREE.Vector3;
  };
  
  const modules: ModuleInfo[] = [];
  
  // Process each modulePoint (each module is defined by 4 corner points)
  if (result.modulePoints) {
    result.modulePoints.forEach((points, index) => {
      if (points.length !== 4) return; // Skip invalid modules
      
      // Calculate center
      const center = new THREE.Vector3(0, 0, 0);
      points.forEach(point => {
        center.x += point.x;
        center.y += point.y;
        center.z += point.z;
      });
      center.divideScalar(4);
      
      // Estimate width and height
      const width = Math.sqrt(
        Math.pow(points[1].x - points[0].x, 2) + 
        Math.pow(points[1].z - points[0].z, 2)
      );
      
      const height = Math.sqrt(
        Math.pow(points[3].x - points[0].x, 2) + 
        Math.pow(points[3].z - points[0].z, 2)
      );
      
      // Create module info
      modules.push({
        center,
        size: { width, height },
        rotation: new THREE.Vector3(0, 0, 0) // Default rotation
      });
    });
  }
  
  console.log(`Generated ${modules.length} PV modules for rendering`);
  
  // Add each PV module as a mesh
  modules.forEach((moduleInfo, index) => {
    // Create geometry for the module
    const geometry = new THREE.BoxGeometry(
      moduleInfo.size.width,
      0.03, // Thin box
      moduleInfo.size.height
    );
    
    // Create material with improved visibility
    const material = new THREE.MeshBasicMaterial({
      color: PV_MODULE_COLORS.MODULE,
      transparent: true,
      opacity: 0.95, // Higher opacity for better visibility
      side: THREE.DoubleSide // Show both sides
    });
    
    // Create mesh
    const moduleMesh = new THREE.Mesh(geometry, material);
    
    // Position and rotate according to moduleInfo
    moduleMesh.position.set(
      moduleInfo.center.x,
      moduleInfo.center.y + PV_LINE_Y_OFFSET, // Increased Y offset for visibility
      moduleInfo.center.z
    );
    
    moduleMesh.rotation.set(
      moduleInfo.rotation.x,
      moduleInfo.rotation.y,
      moduleInfo.rotation.z
    );
    
    // Name the mesh for debugging
    moduleMesh.name = `PVModule_${measurement.id}_${index}`;
    
    // Store metadata in userData
    moduleMesh.userData = {
      isPVModule: true,
      measurementId: measurement.id,
      moduleIndex: index,
      measurementType: 'pvmodule'
    };
    
    // Set high render order to ensure visibility
    moduleMesh.renderOrder = 5;
    
    // Add to measurements group
    measurementsRef.add(moduleMesh);
    
    console.log(`Added PV module mesh at position:`, {
      x: moduleInfo.center.x,
      y: moduleInfo.center.y + PV_LINE_Y_OFFSET,
      z: moduleInfo.center.z
    });
  });
  
  // Add grid lines
  if (result.gridLines && result.gridLines.length > 0) {
    console.log(`Adding ${result.gridLines.length} grid lines`);
    
    result.gridLines.forEach((line, index) => {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(line.from.x, line.from.y + PV_LINE_Y_OFFSET, line.from.z),
        new THREE.Vector3(line.to.x, line.to.y + PV_LINE_Y_OFFSET, line.to.z)
      ]);
      
      const lineMaterial = new THREE.LineBasicMaterial({
        color: PV_MODULE_COLORS.GRID,
        linewidth: 1,
        opacity: 0.7,
        transparent: true
      });
      
      const gridLine = new THREE.Line(lineGeometry, lineMaterial);
      gridLine.renderOrder = 4;
      
      gridLine.userData = {
        isPVGridLine: true,
        measurementId: measurement.id
      };
      
      measurementsRef.add(gridLine);
    });
  }
  
  // Add corner markers for enhanced visibility
  if (modules.length > 0) {
    console.log(`Adding corner markers for PV module area`);
    
    const cornerGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const cornerMaterial = new THREE.MeshBasicMaterial({
      color: PV_MODULE_COLORS.MODULE,
      opacity: 0.95,
      transparent: true
    });
    
    // Calculate rows and cols if available
    const rows = measurement.pvModuleInfo.rows || Math.round(Math.sqrt(modules.length));
    const cols = measurement.pvModuleInfo.columns || Math.round(modules.length / rows);
    
    // Get the boundary corners and add markers
    // Estimate corner indices based on the available modules
    const cornerIndices = [
      0,                          // Top-left
      cols - 1,                   // Top-right
      modules.length - 1,         // Bottom-right
      modules.length - cols       // Bottom-left
    ];
    
    // Filter valid indices
    const validCornerIndices = cornerIndices.filter(i => i >= 0 && i < modules.length);
    
    validCornerIndices.forEach((index, cornerIdx) => {
      if (index < 0 || index >= modules.length) return;
      
      const moduleInfo = modules[index];
      const cornerMarker = new THREE.Mesh(cornerGeometry, cornerMaterial);
      
      cornerMarker.position.set(
        moduleInfo.center.x,
        moduleInfo.center.y + PV_LINE_Y_OFFSET + 0.05, // Slightly above modules
        moduleInfo.center.z
      );
      
      cornerMarker.userData = {
        isPVCornerMarker: true,
        measurementId: measurement.id,
        cornerIndex: cornerIdx
      };
      
      cornerMarker.renderOrder = 6;
      
      measurementsRef.add(cornerMarker);
    });
  }
  
  console.log(`Completed rendering PV module grid for ${measurement.id}`);
}
