import * as THREE from 'three';
import { Point, Measurement } from '@/hooks/useMeasurements';
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
      
      if (!isMeasurementBeingEdited && existingLabels.length > 0) {
        const [p1, p2] = measurement.points;
        const point1 = pointToVector3(p1);
        const point2 = pointToVector3(p2);
        
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
    else if (measurement.type === 'height') {
      renderHeightMeasurement(measurement, measurementsRef, labelsRef, isMeasurementBeingEdited);
      
      if (!isMeasurementBeingEdited && existingLabels.length > 0) {
        const [p1, p2] = measurement.points;
        const point1 = pointToVector3(p1);
        const point2 = pointToVector3(p2);
        
        // Determine which point is higher
        const higherPoint = point1.y > point2.y ? point1 : point2;
        const lowerPoint = point1.y > point2.y ? point2 : point1;
        
        // Create a vertical projection point below/above the higher point
        const verticalPoint = new THREE.Vector3(
          higherPoint.x,
          lowerPoint.y,
          higherPoint.z
        );
        
        // Add text label at midpoint of vertical line
        const labelPos = new THREE.Vector3(
          verticalPoint.x + 0.2, // Slightly offset from vertical line
          (higherPoint.y + verticalPoint.y) / 2 + LINE_Y_OFFSET,
          verticalPoint.z
        );
        
        const labelText = formatMeasurementLabel(measurement.value, 'height');
        const label = createMeasurementLabel(labelText, labelPos, true);
        
        // Store measurement ID in user data for reference
        label.userData.measurementId = measurement.id;
        
        // Add to labels group
        labelsRef.add(label);
      }
    } 
    else if (measurement.type === 'area' || measurement.type === 'solar') {
      // Always recreate segment labels if the measurement is being edited
      const shouldRecreateSegmentLabels = isMeasurementBeingEdited ||
        existingSegmentLabels.length !== (measurement.segments?.length || 0) ||
        // Also recreate if the segment IDs don't match up with existing labels
        (measurement.segments && measurement.segments.some(segment => 
          !existingSegmentLabels.some(label => label.userData.segmentId === segment.id)
        ));
      
      renderAreaMeasurement(
        measurement, 
        measurementsRef, 
        labelsRef, 
        segmentLabelsRef, 
        isMeasurementBeingEdited,
        shouldRecreateSegmentLabels
      );
      
      // Wenn es sich um eine solar-Messung handelt und showPVModules aktiviert ist, 
      // renderPVModuleGrid aufrufen
      if (measurement.type === 'solar' && 
          measurement.pvModuleInfo && 
          measurement.pvModuleInfo.showPVModules !== false) {
        renderPVModuleGrid(measurement, measurementsRef, labelsRef);
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
  
  // Synchronisierte Sichtbarkeits-Logik für Haupt- und Segment-Labels
  const updateLabelVisibility = (
    child: THREE.Object3D, 
    isPreview: boolean, 
    measurementId: string | undefined
  ) => {
    // Immer ausblenden während der Bearbeitung
    if (anyMeasurementBeingEdited && !isPreview) {
      child.visible = false;
      return;
    }
    
    if (measurementId) {
      const measurement = measurements.find(m => m.id === measurementId);
      if (measurement) {
        // Nur anzeigen, wenn die Messung existiert, sichtbar ist und nicht bearbeitet wird
        child.visible = measurement.visible !== false && !measurement.editMode;
      } else if (isPreview) {
        // Vorschau-Labels immer sichtbar
        child.visible = true;
      } else {
        // Standard: sichtbar
        child.visible = true;
      }
    } else if (isPreview) {
      // Vorschau-Labels immer sichtbar
      child.visible = true;
    } else {
      // Standard: sichtbar
      child.visible = true;
    }
    
    // Hohe Render-Ordnung sicherstellen
    child.renderOrder = 100;
  };
  
  // Haupt-Labels aktualisieren
  labelsRef.children.forEach(child => {
    updateLabelVisibility(
      child, 
      child.userData.isPreview || false,
      child.userData.measurementId
    );
  });
  
  // Segment-Labels aktualisieren
  segmentLabelsRef.children.forEach(child => {
    updateLabelVisibility(
      child, 
      false, // Segment-Labels sind nie Vorschau-Labels
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
  const horizontalLineMaterial = new THREE.LineDashedMaterial({ 
    color: 0x0000ff,
    linewidth: 3, // Increased from 2
    opacity: 0.9,
    transparent: true,
    scale: 1,
    dashSize: 0.1,
    gapSize: 0.1
  });
  const horizontalLine = new THREE.Line(horizontalLineGeometry, horizontalLineMaterial);
  horizontalLine.computeLineDistances();
  horizontalLine.renderOrder = 2; // Ensure line renders above model
  measurementsRef.add(horizontalLine);
  
  // Add small spheres at endpoints with minimal Y offset
  const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x0000ff,
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
    // Add text label with position offset
    const labelPos = new THREE.Vector3(
      verticalPoint.x + 0.2, // Slightly offset from vertical line
      (higherPoint.y + verticalPoint.y) / 2 + LINE_Y_OFFSET,
      verticalPoint.z
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
 * Creates a triangulated surface from points
 */
function createTriangulatedSurface(
  points: THREE.Vector3[],
  color: number,
  opacity: number = 0.5
): THREE.Mesh {
  // Create shape from points
  const shape = new THREE.Shape();
  
  // Start shape at first point
  if (points.length > 0) {
    shape.moveTo(points[0].x, points[0].z);
    
    // Add rest of points
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].z);
    }
    
    // Close shape
    shape.lineTo(points[0].x, points[0].z);
  }
  
  // Create geometry from shape
  const geometry = new THREE.ShapeGeometry(shape);
  
  // Adjust Y values to match original points for 3D surface
  const positionAttr = geometry.getAttribute('position');
  
  // Create a mapping of original points to Y values
  const pointMap = new Map<string, number>();
  points.forEach(p => {
    // Use X,Z as key to lookup Y value
    const key = `${p.x.toFixed(3)},${p.z.toFixed(3)}`;
    pointMap.set(key, p.y);
  });
  
  // Update Y values in the geometry
  for (let i = 0; i < positionAttr.count; i++) {
    const x = positionAttr.getX(i);
    const z = positionAttr.getZ(i);
    
    // Try to find matching original point
    const key = `${x.toFixed(3)},${z.toFixed(3)}`;
    const y = pointMap.get(key) || 0;
    
    // Set Y value
    positionAttr.setY(i, y + LINE_Y_OFFSET);
  }
  
  // Compute vertex normals for proper lighting
  geometry.computeVertexNormals();
  
  // Create material
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide
  });
  
  // Create and return mesh
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1; // Above model, below lines
  
  return mesh;
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
  // Skip if there are no points
  if (!measurement.points || measurement.points.length < 3) return;
  
  const points = measurement.points;
  const vectors = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
  
  // Create and add triangulated surface for the area
  const surfaceColor = 
    measurement.type === 'solar' ? 0x1EAEDB : // Blue for solar
    measurement.type === 'skylight' ? 0xff8800 : // Orange for skylight
    measurement.type === 'chimney' ? 0xff0000 : // Red for chimney
    0xffaa00; // Default yellow for regular areas
  
  const surface = createTriangulatedSurface(vectors, surfaceColor, 0.5);
  
  // Store measurement ID in user data
  surface.userData = {
    isMeasurementSurface: true,
    measurementId: measurement.id,
    measurementType: measurement.type
  };
  
  measurementsRef.add(surface);
  
  // Draw perimeter lines
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    // Create line between points with minimal Y offset
    const linePoints = [
      new THREE.Vector3(p1.x, p1.y + LINE_Y_OFFSET, p1.z),
      new THREE.Vector3(p2.x, p2.y + LINE_Y_OFFSET, p2.z)
    ];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    
    // Different colors for different measurement types
    const lineColor = 
      measurement.type === 'solar' ? 0x1EAEDB : // Blue for solar
      measurement.type === 'skylight' ? 0xff8800 : // Orange for skylight
      measurement.type === 'chimney' ? 0xff0000 : // Red for chimney
      0xffaa00; // Default yellow for regular areas
    
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: lineColor,
      linewidth: 3, // Increased from 2
      opacity: 0.9,
      transparent: true
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 2; // Higher render order for visibility
    
    // Store segment ID if available
    if (measurement.segments && measurement.segments[i]) {
      line.userData = {
        isSegmentLine: true,
        measurementId: measurement.id,
        segmentId: measurement.segments[i].id,
        segmentIndex: i
      };
    }
    
    measurementsRef.add(line);
    
    // Add segment length labels if segments are available
    if (measurement.segments && 
        measurement.segments[i] && 
        shouldCreateSegmentLabels) {
      const segment = measurement.segments[i];
      
      // Position segment label at midpoint of line
      const midpoint = calculateMidpoint(linePoints[0], linePoints[1]);
      // Raise label position slightly higher for visibility
      midpoint.y += LINE_Y_OFFSET;
      
      // Calculate inclination
      const inclination = calculateInclination(linePoints[0], linePoints[1]);
      
      // Generate segment length label text
      const segmentLabelText = formatMeasurementLabel(segment.length, 'segment', inclination);
      const segmentLabel = createMeasurementLabel(segmentLabelText, midpoint, true, undefined, true);
      
      // Store metadata in label
      segmentLabel.userData = {
        isSegmentLabel: true,
        measurementId: measurement.id,
        segmentId: segment.id,
        segmentIndex: i
      };
      
      // Add to segment labels group
      segmentLabelsRef.add(segmentLabel);
    }
  }
  
  // Add small spheres at each point with minimal Y offset
  const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
  const sphereColor = 
    measurement.type === 'solar' ? 0x1EAEDB : // Blue for solar
    measurement.type === 'skylight' ? 0xff8800 : // Orange for skylight
    measurement.type === 'chimney' ? 0xff0000 : // Red for chimney
    0xffaa00; // Default yellow for regular areas
  
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: sphereColor,
    opacity: 0.9,
    transparent: true
  });
  
  points.forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y + POINT_Y_OFFSET, point.z);
    sphere.renderOrder = 3; // Higher than lines
    
    // Add data for point identification
    sphere.userData = {
      isMeasurementPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    measurementsRef.add(sphere);
  });
  
  // Only create area label if needed
  if (shouldCreateLabel) {
    // Convert to THREE.Vector3 array
    const points3D = vectors;
    
    // Add text label at centroid
    const centroid = calculateCentroid(points3D);
    // Raise label position for visibility
    centroid.y += LABEL_Y_OFFSET;
    
    // Calculate label text based on type
    const labelText = formatMeasurementLabel(
      measurement.value, 
      measurement.type
    );
    
    const label = createMeasurementLabel(labelText, centroid, true);
    
    // Add metadata to label
    label.userData = {
      isMeasurementLabel: true,
      measurementId: measurement.id
    };
    
    // Add to labels group
    labelsRef.add(label);
  }
}

/**
 * Renders PV module grid
 */
function renderPVModuleGrid(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group
) {
  // Skip if not a solar measurement with PV module info
  if (measurement.type !== 'solar' || 
      !measurement.pvModuleInfo ||
      measurement.pvModuleInfo.showPVModules === false ||
      !measurement.points ||
      measurement.points.length < 3) {
    return;
  }
  
  // Get average Y coordinate for the base elevation
  const avgY = measurement.points.reduce((sum, p) => sum + p.y, 0) / measurement.points.length;
  
  // Generate PV module layout - Fix for error #1: Pass the required avgY parameter
  const moduleLayout = generatePVModuleGrid(measurement.pvModuleInfo, avgY);
  
  // If no layout generated, skip
  if (!moduleLayout) return;
  
  // For each module point set in the layout, create a visual representation
  // Fix for error #2: Use modulePoints instead of modules
  moduleLayout.modulePoints.forEach((moduleCorners) => {
    // Create a module representation as a thin box
    // Use the first point as the reference for positioning
    const centerX = (moduleCorners[0].x + moduleCorners[2].x) / 2;
    const centerY = (moduleCorners[0].y + moduleCorners[2].y) / 2;
    const centerZ = (moduleCorners[0].z + moduleCorners[2].z) / 2;
    
    // Calculate module dimensions from corners
    const width = Math.sqrt(
      Math.pow(moduleCorners[1].x - moduleCorners[0].x, 2) + 
      Math.pow(moduleCorners[1].z - moduleCorners[0].z, 2)
    );
    
    const height = Math.sqrt(
      Math.pow(moduleCorners[3].x - moduleCorners[0].x, 2) + 
      Math.pow(moduleCorners[3].z - moduleCorners[0].z, 2)
    );
    
    const moduleGeometry = new THREE.BoxGeometry(
      width, 
      0.02, // Very thin
      height
    );
    
    const moduleMaterial = new THREE.MeshLambertMaterial({
      color: PV_MODULE_COLORS.MODULE,
      transparent: true,
      opacity: 0.8
    });
    
    const moduleMesh = new THREE.Mesh(moduleGeometry, moduleMaterial);
    
    // Position the module at its center
    moduleMesh.position.set(
      centerX,
      centerY + PV_LINE_Y_OFFSET, // Slightly above surface
      centerZ
    );
    
    // Add to measurements group
    measurementsRef.add(moduleMesh);
  });
  
  // Add lines for the module grid
  moduleLayout.gridLines.forEach(line => {
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(line.from.x, line.from.y, line.from.z),
      new THREE.Vector3(line.to.x, line.to.y, line.to.z)
    ]);
    
    const lineMaterial = new THREE.LineBasicMaterial({
      color: PV_MODULE_COLORS.GRID,
      linewidth: 1,
      opacity: 0.6,
      transparent: true
    });
    
    const lineObject = new THREE.Line(lineGeometry, lineMaterial);
    lineObject.renderOrder = 3;
    measurementsRef.add(lineObject);
  });
  
  // Fix for errors #3, #4, #5, #6: Calculate totalModules and use power from PVModuleSpec
  // Add label with module count and power info
  if (measurement.pvModuleInfo && measurement.pvModuleInfo.moduleCount > 0) {
    // Create a label near the top of the area
    const points = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    const centroid = calculateCentroid(points);
    centroid.y += LABEL_Y_OFFSET + 0.1; // Position above the area label
    
    // Calculate total power based on module count and power from pvModuleSpec
    const moduleCount = measurement.pvModuleInfo.moduleCount;
    const powerPerModule = measurement.pvModuleInfo.pvModuleSpec?.power || 400; // Default to 400W if not specified
    const totalPower = (moduleCount * powerPerModule) / 1000;
    
    // Format label text
    const modulesLabel = `${moduleCount} Module - ${totalPower.toFixed(2)} kWp`;
    
    const label = createMeasurementLabel(modulesLabel, centroid, true);
    
    // Add metadata to label
    label.userData = {
      isPVModuleLabel: true,
      measurementId: measurement.id
    };
    
    // Add to labels group
    labelsRef.add(label);
  }
}

/**
 * Renders roof elements (skylights, chimneys, etc.)
 */
function renderRoofElementMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  shouldCreateLabel: boolean
) {
  // Skip if this isn't a roof element type or has insufficient points
  if (!['skylight', 'chimney', 'vent', 'hook', 'other'].includes(measurement.type) ||
      !measurement.points || 
      measurement.points.length < 3) {
    return;
  }
  
  // For area-based elements (skylight, chimney), use the area renderer
  if (measurement.type === 'skylight' || measurement.type === 'chimney') {
    // Reuse the area measurement renderer with a different color
    renderAreaMeasurement(
      measurement,
      measurementsRef,
      labelsRef,
      new THREE.Group(), // Dummy group since we don't need segment labels
      shouldCreateLabel,
      false
    );
    
    // Add a 3D marker at the centroid
    const points = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
    const centroid = calculateCentroid(points);
    
    // Create marker with appropriate type and color
    let markerColor;
    switch(measurement.type) {
      case 'skylight':
        markerColor = 0xff8800; // Orange
        break;
      case 'chimney':
        markerColor = 0xff0000; // Red
        break;
      default:
        markerColor = 0xaaaaaa; // Gray for unknown types
    }
    
    const marker = createRoofElementMarker(
      centroid,
      measurement.type,
      markerColor,
      0.2 // Larger size for visibility
    );
    
    // Add marker to measurement group
    measurementsRef.add(marker);
    return;
  }
  
  // For point-based elements like vents and hooks
  if (measurement.type === 'vent' || measurement.type === 'hook' || measurement.type === 'other') {
    // Create point markers at each position
    measurement.points.forEach((point, index) => {
      // Create position vector
      const position = new THREE.Vector3(point.x, point.y, point.z);
      
      // Determine color based on type
      let markerColor;
      switch(measurement.type) {
        case 'vent':
          markerColor = 0x00ffff; // Cyan
          break;
        case 'hook':
          markerColor = 0xff00ff; // Magenta
          break;
        default:
          markerColor = 0xaaaaaa; // Gray for unknown types
      }
      
      // Create appropriate marker
      const marker = createRoofElementMarker(
        position,
        measurement.type,
        markerColor,
        0.15 // Medium size
      );
      
      // Add metadata
      marker.userData = {
        isRoofElement: true,
        measurementId: measurement.id,
        pointIndex: index
      };
      
      // Add to measurements group
      measurementsRef.add(marker);
    });
    
    // Draw connecting lines between points if there are multiple
    if (measurement.points.length > 1) {
      for (let i = 0; i < measurement.points.length - 1; i++) {
        const p1 = measurement.points[i];
        const p2 = measurement.points[i + 1];
        
        // Create line with minimal Y offset
        const linePoints = [
          new THREE.Vector3(p1.x, p1.y + LINE_Y_OFFSET, p1.z),
          new THREE.Vector3(p2.x, p2.y + LINE_Y_OFFSET, p2.z)
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        
        // Determine color based on type
        let lineColor;
        switch(measurement.type) {
          case 'vent':
            lineColor = 0x00ffff; // Cyan
            break;
          case 'hook':
            lineColor = 0xff00ff; // Magenta
            break;
          default:
            lineColor = 0xaaaaaa; // Gray
        }
        
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: lineColor,
          linewidth: 2,
          opacity: 0.8,
          transparent: true
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.renderOrder = 2;
        
        measurementsRef.add(line);
      }
    }
    
    // Create a label if needed
    if (shouldCreateLabel) {
      // Find a good position for the label (using first point)
      const labelPosition = new THREE.Vector3(
        measurement.points[0].x,
        measurement.points[0].y + LABEL_Y_OFFSET,
        measurement.points[0].z
      );
      
      // Generate type-specific label
      let labelText;
      switch(measurement.type) {
        case 'vent':
          labelText = "Lüfter";
          break;
        case 'hook':
          labelText = "Dachhaken";
          break;
        default:
          labelText = "Element";
      }
      
      // Add count if multiple points
      if (measurement.points.length > 1) {
        labelText += ` (${measurement.points.length})`;
      }
      
      const label = createMeasurementLabel(labelText, labelPosition, true);
      
      // Add metadata
      label.userData = {
        isRoofElementLabel: true,
        measurementId: measurement.id
      };
      
      labelsRef.add(label);
    }
  }
}
