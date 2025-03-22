
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

// Level of detail settings for PV visualization
const PV_MODULE_LOD = {
  HIGH_DETAIL_DISTANCE: 20,  // Distance threshold in meters for high detail
  MID_DETAIL_DISTANCE: 40    // Distance threshold in meters for mid detail
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
    } 
    else if (measurement.type === 'height') {
      renderHeightMeasurement(measurement, measurementsRef, labelsRef, isMeasurementBeingEdited);
    } 
    else if (measurement.type === 'area') {
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
    }
    else if (measurement.type === 'solar') {
      // Always recreate segment labels if the measurement is being edited
      const shouldRecreateSegmentLabels = isMeasurementBeingEdited ||
        existingSegmentLabels.length !== (measurement.segments?.length || 0) ||
        // Also recreate if the segment IDs don't match up with existing labels
        (measurement.segments && measurement.segments.some(segment => 
          !existingSegmentLabels.some(label => label.userData.segmentId === segment.id)
        ));
      
      renderSolarMeasurement(
        measurement, 
        measurementsRef, 
        labelsRef, 
        segmentLabelsRef, 
        isMeasurementBeingEdited,
        shouldRecreateSegmentLabels
      );
      
      // If PV modules should be visible and we have module info, render them
      if (measurement.pvModuleInfo && 
          measurement.pvModulesVisible !== false && 
          measurement.pvModuleInfo.moduleCount > 0) {
        renderPVModules(
          measurement,
          measurementsRef
        );
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
}

/**
 * Function to render a solar array visualization with PV modules
 */
export function renderPVModules(
  measurement: Measurement,
  measurementsRef: THREE.Group | null
) {
  if (!measurementsRef || !measurement.pvModuleInfo) return;

  const moduleInfo = measurement.pvModuleInfo;
  
  // Calculate average Y height for the plane
  const avgY = measurement.points.reduce((sum, pt) => sum + pt.y, 0) / measurement.points.length;
  
  // Create a group for the PV modules
  const pvModuleGroup = new THREE.Group();
  pvModuleGroup.name = `pv-modules-${measurement.id}`;
  
  // Setting user data for identification
  pvModuleGroup.userData = {
    measurementId: measurement.id,
    type: 'pv-modules'
  };
  
  // Create module visualization
  if (moduleInfo.rows && moduleInfo.columns) {
    const moduleWidth = moduleInfo.moduleWidth || 1.0;
    const moduleHeight = moduleInfo.moduleHeight || 1.7;
    const moduleSpacing = moduleInfo.moduleSpacing || 0.05;
    const isPortrait = moduleInfo.orientation === 'portrait';
    
    // Dimensions for visualization
    const width = isPortrait ? moduleWidth : moduleHeight;
    const height = 0.04; // Thickness of the module
    const depth = isPortrait ? moduleHeight : moduleWidth;
    
    // Loop through the grid and create modules
    for (let row = 0; row < moduleInfo.rows; row++) {
      for (let col = 0; col < moduleInfo.columns; col++) {
        // Calculate position
        const x = (moduleInfo.startX || 0) + col * (width + moduleSpacing);
        const z = (moduleInfo.startZ || 0) + row * (depth + moduleSpacing);
        
        // Create module geometry and materials
        const moduleGeometry = new THREE.BoxGeometry(width, height, depth);
        
        // Frame material (silver aluminum)
        const frameMaterial = new THREE.MeshLambertMaterial({
          color: 0xC0C0C0,
          metalness: 0.7,
          roughness: 0.3
        });
        
        // Cell material (blue silicon)
        const cellMaterial = new THREE.MeshLambertMaterial({
          color: PV_MODULE_COLORS.MODULE,
          metalness: 0.2,
          roughness: 0.7
        });
        
        // Create module mesh with multiple materials
        const materials = [
          frameMaterial, // Right side
          frameMaterial, // Left side
          frameMaterial, // Top
          frameMaterial, // Bottom
          cellMaterial,  // Front (cell side)
          frameMaterial  // Back
        ];
        
        const moduleMesh = new THREE.Mesh(moduleGeometry, materials);
        
        // Position the module
        moduleMesh.position.set(x + width/2, avgY + height/2 + PV_LINE_Y_OFFSET, z + depth/2);
        
        // Add to group
        pvModuleGroup.add(moduleMesh);
      }
    }
    
    // Add to measurements group
    measurementsRef.add(pvModuleGroup);
  }
}

/**
 * Renders a length measurement
 */
export function renderLengthMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group | null,
  labelsRef: THREE.Group | null,
  recreateLabels: boolean
) {
  if (!measurementsRef || measurement.points.length < 2) return;

  const [p1, p2] = measurement.points;
  const point1 = pointToVector3(p1);
  const point2 = pointToVector3(p2);
  
  // Create line with proper Y-offset for visibility
  const linePoints = [
    new THREE.Vector3(point1.x, point1.y + LINE_Y_OFFSET, point1.z),
    new THREE.Vector3(point2.x, point2.y + LINE_Y_OFFSET, point2.z)
  ];
  
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00ff00,
    linewidth: 2
  });
  
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.renderOrder = 2; // Ensure it renders above the model
  
  // Store measurement ID in user data for reference
  line.userData = {
    measurementId: measurement.id,
    measurementType: 'length'
  };
  
  // Add to measurements group
  measurementsRef.add(line);
  
  // If we should recreate the labels
  if (recreateLabels && labelsRef) {
    // Calculate inclination for label
    const inclination = calculateInclination(point1, point2);
    
    // Add text label at midpoint
    const midpoint = calculateMidpoint(point1, point2);
    // Raise label position for visibility
    midpoint.y += LABEL_Y_OFFSET;
    
    const labelText = formatMeasurementLabel(measurement.value, 'length', inclination);
    const label = createMeasurementLabel(labelText, midpoint, true);
    
    // Store measurement ID in user data
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
}

/**
 * Renders a height measurement
 */
export function renderHeightMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group | null,
  labelsRef: THREE.Group | null,
  recreateLabels: boolean
) {
  if (!measurementsRef || measurement.points.length < 2) return;

  const [p1, p2] = measurement.points;
  const point1 = pointToVector3(p1);
  const point2 = pointToVector3(p2);
  
  // Determine which point is higher for vertical line visualization
  const higherPoint = point1.y > point2.y ? point1 : point2;
  const lowerPoint = point1.y > point2.y ? point2 : point1;
  
  // Create a vertical projection point below/above the higher point
  const verticalPoint = new THREE.Vector3(
    higherPoint.x,
    lowerPoint.y,
    higherPoint.z
  );
  
  // Create the main line between the two original points with proper Y-offset
  const mainPoints = [
    new THREE.Vector3(point1.x, point1.y + LINE_Y_OFFSET, point1.z),
    new THREE.Vector3(point2.x, point2.y + LINE_Y_OFFSET, point2.z)
  ];
  
  const mainGeometry = new THREE.BufferGeometry().setFromPoints(mainPoints);
  const mainMaterial = new THREE.LineBasicMaterial({ 
    color: 0x0000ff,
    linewidth: 2
  });
  
  const mainLine = new THREE.Line(mainGeometry, mainMaterial);
  mainLine.renderOrder = 2;
  
  // Add vertical line highlighting the height difference
  const verticalPoints = [
    new THREE.Vector3(higherPoint.x, lowerPoint.y + LINE_Y_OFFSET, higherPoint.z),
    new THREE.Vector3(higherPoint.x, higherPoint.y + LINE_Y_OFFSET, higherPoint.z)
  ];
  
  const verticalGeometry = new THREE.BufferGeometry().setFromPoints(verticalPoints);
  const verticalMaterial = new THREE.LineBasicMaterial({ 
    color: 0x0000ff,
    linewidth: 3,
    opacity: 0.7,
    transparent: true
  });
  
  const verticalLine = new THREE.Line(verticalGeometry, verticalMaterial);
  verticalLine.renderOrder = 2;
  
  // Add horizontal helper line
  const horizontalPoints = [
    new THREE.Vector3(lowerPoint.x, lowerPoint.y + LINE_Y_OFFSET, lowerPoint.z),
    new THREE.Vector3(higherPoint.x, lowerPoint.y + LINE_Y_OFFSET, higherPoint.z)
  ];
  
  const horizontalGeometry = new THREE.BufferGeometry().setFromPoints(horizontalPoints);
  const horizontalMaterial = new THREE.LineDashedMaterial({ 
    color: 0x0000ff,
    dashSize: 0.1,
    gapSize: 0.05,
    opacity: 0.5,
    transparent: true
  });
  
  const horizontalLine = new THREE.Line(horizontalGeometry, horizontalMaterial);
  horizontalLine.computeLineDistances();
  horizontalLine.renderOrder = 2;
  
  // Store data in user data
  mainLine.userData = { 
    measurementId: measurement.id,
    measurementType: 'height'
  };
  verticalLine.userData = { 
    measurementId: measurement.id,
    measurementType: 'height'
  };
  horizontalLine.userData = { 
    measurementId: measurement.id,
    measurementType: 'height'
  };
  
  // Add to measurements group
  measurementsRef.add(mainLine);
  measurementsRef.add(verticalLine);
  measurementsRef.add(horizontalLine);
  
  // If we should recreate the labels
  if (recreateLabels && labelsRef) {
    // Add text label beside the vertical line
    const labelPos = new THREE.Vector3(
      verticalPoint.x + 0.2, // Offset from vertical line
      (higherPoint.y + verticalPoint.y) / 2 + LINE_Y_OFFSET,
      verticalPoint.z
    );
    
    const labelText = formatMeasurementLabel(measurement.value, 'height');
    const label = createMeasurementLabel(labelText, labelPos, true);
    
    // Store measurement ID in user data
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
}

/**
 * Renders an area measurement
 */
export function renderAreaMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group | null,
  labelsRef: THREE.Group | null,
  segmentLabelsRef: THREE.Group | null,
  recreateLabels: boolean,
  recreateSegmentLabels: boolean
) {
  if (!measurementsRef || measurement.points.length < 3) return;

  // Convert points to THREE.Vector3
  const points3D = pointsToVector3Array(measurement.points);
  
  // Create a shape with proper Y offset for visibility
  const offsetPoints = points3D.map(p => new THREE.Vector3(p.x, p.y + LINE_Y_OFFSET, p.z));
  
  // First, create the boundary lines
  for (let i = 0; i < offsetPoints.length; i++) {
    const p1 = offsetPoints[i];
    const p2 = offsetPoints[(i + 1) % offsetPoints.length];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffaa00, // Orange for area
      linewidth: 2
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 2;
    
    // Store data
    line.userData = { 
      measurementId: measurement.id,
      measurementType: 'area',
      boundaryLine: true,
      pointIndex1: i,
      pointIndex2: (i + 1) % offsetPoints.length
    };
    
    // Add to measurements group
    measurementsRef.add(line);
  }
  
  // If we should recreate the labels
  if (recreateLabels && labelsRef) {
    // Calculate the centroid for the label position
    const centroid = calculateCentroid(points3D);
    // Raise label position
    centroid.y += LABEL_Y_OFFSET;
    
    const labelText = formatMeasurementLabel(measurement.value, 'area');
    const label = createMeasurementLabel(labelText, centroid, true);
    
    // Store measurement ID in user data
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
  
  // Add segment labels if specified
  if (recreateSegmentLabels && segmentLabelsRef && measurement.segments) {
    for (const segment of measurement.segments) {
      const { points: segmentPoints } = segment;
      
      // Check if the segment has valid point data
      if (segmentPoints && segmentPoints.length === 2) {
        const p1 = pointToVector3(segmentPoints[0]);
        const p2 = pointToVector3(segmentPoints[1]);
        
        // Find the indices of these points in the measurement's points array
        let startIndex = -1;
        let endIndex = -1;
        
        for (let i = 0; i < measurement.points.length; i++) {
          const point = measurement.points[i];
          if (point.x === segmentPoints[0].x && 
              point.y === segmentPoints[0].y && 
              point.z === segmentPoints[0].z) {
            startIndex = i;
          }
          if (point.x === segmentPoints[1].x && 
              point.y === segmentPoints[1].y && 
              point.z === segmentPoints[1].z) {
            endIndex = i;
          }
        }
        
        // Calculate midpoint for label placement
        const midpoint = calculateMidpoint(p1, p2);
        // Raise segment label slightly above the line
        midpoint.y += 0.05;
        
        // Create segment label - don't include inclination for area segment labels
        const segmentLabel = segment.label || "";
        
        const label = createMeasurementLabel(segmentLabel, midpoint, true);
        
        // Store segment information in user data
        label.userData = {
          measurementId: measurement.id,
          segmentId: segment.id,
          startPointIndex: startIndex,
          endPointIndex: endIndex,
          isSegmentLabel: true
        };
        
        // Add to segment labels group
        segmentLabelsRef.add(label);
      }
    }
  }
}

/**
 * Renders a solar measurement (similar to area but with different styling and PV module potential)
 */
export function renderSolarMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group | null,
  labelsRef: THREE.Group | null,
  segmentLabelsRef: THREE.Group | null,
  recreateLabels: boolean,
  recreateSegmentLabels: boolean
) {
  if (!measurementsRef || measurement.points.length < 3) return;

  // Convert points to THREE.Vector3
  const points3D = pointsToVector3Array(measurement.points);
  
  // Create a shape with proper Y offset for visibility
  const offsetPoints = points3D.map(p => new THREE.Vector3(p.x, p.y + LINE_Y_OFFSET, p.z));
  
  // First, create the boundary lines
  for (let i = 0; i < offsetPoints.length; i++) {
    const p1 = offsetPoints[i];
    const p2 = offsetPoints[(i + 1) % offsetPoints.length];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x1EAEDB, // Blue for solar
      linewidth: 2
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 2;
    
    // Store data
    line.userData = { 
      measurementId: measurement.id,
      measurementType: 'solar',
      boundaryLine: true,
      pointIndex1: i,
      pointIndex2: (i + 1) % offsetPoints.length
    };
    
    // Add to measurements group
    measurementsRef.add(line);
  }
  
  // If we should recreate the labels
  if (recreateLabels && labelsRef) {
    // Calculate the centroid for the label position
    const centroid = calculateCentroid(points3D);
    // Raise label position
    centroid.y += LABEL_Y_OFFSET;
    
    // Format label text with appropriate unit
    let labelText = formatMeasurementLabel(measurement.value, 'solar');
    
    // Add PV module information if available
    if (measurement.pvModuleInfo) {
      const moduleInfo = measurement.pvModuleInfo;
      if (moduleInfo.moduleCount > 0) {
        labelText += `\n${moduleInfo.moduleCount} Module`;
        
        if (measurement.pvModuleInfo.pvModuleSpec && measurement.pvModuleInfo.pvModuleSpec.power) {
          const totalPower = moduleInfo.moduleCount * measurement.pvModuleInfo.pvModuleSpec.power;
          labelText += ` (${totalPower.toFixed(1)} kWp)`;
        }
      }
    }
    
    const label = createMeasurementLabel(labelText, centroid, true);
    
    // Store measurement ID in user data
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
  
  // Add segment labels if specified - similar to area measurement
  if (recreateSegmentLabels && segmentLabelsRef && measurement.segments) {
    for (const segment of measurement.segments) {
      const { points: segmentPoints } = segment;
      
      // Check if the segment has valid point data
      if (segmentPoints && segmentPoints.length === 2) {
        const p1 = pointToVector3(segmentPoints[0]);
        const p2 = pointToVector3(segmentPoints[1]);
        
        // Find the indices of these points in the measurement's points array
        let startIndex = -1;
        let endIndex = -1;
        
        for (let i = 0; i < measurement.points.length; i++) {
          const point = measurement.points[i];
          if (point.x === segmentPoints[0].x && 
              point.y === segmentPoints[0].y && 
              point.z === segmentPoints[0].z) {
            startIndex = i;
          }
          if (point.x === segmentPoints[1].x && 
              point.y === segmentPoints[1].y && 
              point.z === segmentPoints[1].z) {
            endIndex = i;
          }
        }
        
        // Calculate midpoint for label placement
        const midpoint = calculateMidpoint(p1, p2);
        // Raise segment label slightly above the line
        midpoint.y += 0.05;
        
        // Create segment label - don't include inclination for solar segment labels
        const segmentLabel = segment.label || "";
        
        const label = createMeasurementLabel(segmentLabel, midpoint, true);
        
        // Store segment information in user data
        label.userData = {
          measurementId: measurement.id,
          segmentId: segment.id,
          startPointIndex: startIndex,
          endPointIndex: endIndex,
          isSegmentLabel: true
        };
        
        // Add to segment labels group
        segmentLabelsRef.add(label);
      }
    }
  }
}

/**
 * Renders a roof element (skylight, chimney, etc.)
 */
export function renderRoofElementMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group | null,
  labelsRef: THREE.Group | null,
  recreateLabels: boolean
) {
  if (!measurementsRef || measurement.points.length < 3) return;

  // Get points as THREE.Vector3
  const points3D = pointsToVector3Array(measurement.points);
  
  // Add perimeter lines
  const offsetPoints = points3D.map(p => new THREE.Vector3(p.x, p.y + LINE_Y_OFFSET, p.z));
  
  // Create a color based on the type
  let color;
  switch (measurement.type) {
    case 'skylight': color = 0xff8800; break;
    case 'chimney': color = 0xff0000; break;
    case 'vent': color = 0x00ffff; break;
    case 'hook': color = 0xff00ff; break;
    default: color = 0xffaa00;
  }
  
  // Create boundary lines
  for (let i = 0; i < offsetPoints.length; i++) {
    const p1 = offsetPoints[i];
    const p2 = offsetPoints[(i + 1) % offsetPoints.length];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color,
      linewidth: 2
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 2;
    
    // Add user data
    line.userData = {
      measurementId: measurement.id,
      measurementType: measurement.type,
      boundaryLine: true
    };
    
    measurementsRef.add(line);
  }
  
  // Add a visual marker for the roof element
  const centroid = calculateCentroid(points3D);
  const marker = createRoofElementMarker(centroid, measurement.type, color);
  
  // Add user data
  marker.userData = {
    measurementId: measurement.id,
    measurementType: measurement.type
  };
  
  // Add to measurements group
  measurementsRef.add(marker);
  
  // If we should recreate the labels
  if (recreateLabels && labelsRef) {
    // Raise label position
    const labelPosition = new THREE.Vector3(centroid.x, centroid.y + LABEL_Y_OFFSET * 1.5, centroid.z);
    
    const labelText = formatMeasurementLabel(measurement.value, measurement.type as any);
    const label = createMeasurementLabel(labelText, labelPosition, true);
    
    // Store measurement ID in user data
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
}
