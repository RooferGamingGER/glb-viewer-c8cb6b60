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
const POINT_Y_OFFSET = 0.03; // Raised for depth-tested visibility on roof surfaces
const LINE_Y_OFFSET = 0.04; // Slightly higher than points to ensure visibility
const LABEL_Y_OFFSET = 0.20; // Maintained higher for readability
const PV_LINE_Y_OFFSET = 0.05; // Slightly higher than regular lines for PV visibility

// Shared depth/polygonOffset settings for all measurement materials
const DEPTH_SETTINGS = {
  depthTest: true,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
} as const;

// Unified color palette (matching reference project)
const COLORS = {
  CYAN: 0x00e5ff,        // Standard points & lines
  ORANGE: 0xffab00,      // Selected/editing points
  SOLAR: 0x1EAEDB,       // Solar/PV elements
  SKYLIGHT: 0xff8800,    // Skylight elements
  CHIMNEY: 0xff0000,     // Chimney elements
  VENT: 0x00ffff,        // Vent elements
  HOOK: 0xff00ff,        // Hook elements
};

// Standard point size
const POINT_SIZE = 0.05;
const EDIT_POINT_SIZE = 0.05;
const EDIT_POINT_SELECTED_SIZE = 0.08;

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
    const pointColor = activeMode === 'solar' ? COLORS.SOLAR :
                       activeMode === 'skylight' ? COLORS.SKYLIGHT :
                       activeMode === 'chimney' ? COLORS.CHIMNEY :
                       activeMode === 'vent' ? COLORS.VENT :
                       activeMode === 'hook' ? COLORS.HOOK :
                       COLORS.CYAN;
    const sphereGeometry = new THREE.SphereGeometry(POINT_SIZE, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: pointColor,
      ...DEPTH_SETTINGS
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y + POINT_Y_OFFSET, point.z);
    sphere.renderOrder = 10;
    pointsRef.add(sphere);

    // Add connecting lines between points with slightly higher Y offset
    if (index > 0) {
      const prevPoint = currentPoints[index - 1];
      const p1 = new THREE.Vector3(prevPoint.x, prevPoint.y + LINE_Y_OFFSET, prevPoint.z);
      const p2 = new THREE.Vector3(point.x, point.y + LINE_Y_OFFSET, point.z);
      
      const points = [p1, p2];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: pointColor,
        linewidth: 3,
        ...DEPTH_SETTINGS
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.renderOrder = 10;
      linesRef.add(line);
    }
  });

  // Add special final connecting line for area/solar/skylight measurement to close the shape
  if ((activeMode === 'area' || activeMode === 'solar' || activeMode === 'skylight' || activeMode === 'chimney') && currentPoints.length >= 3) {
    const closingColor = activeMode === 'solar' ? COLORS.SOLAR :
                         activeMode === 'skylight' ? COLORS.SKYLIGHT :
                         activeMode === 'chimney' ? COLORS.CHIMNEY :
                         COLORS.CYAN;
    const firstPoint = currentPoints[0];
    const lastPoint = currentPoints[currentPoints.length - 1];
    const p1 = new THREE.Vector3(lastPoint.x, lastPoint.y + LINE_Y_OFFSET, lastPoint.z);
    const p2 = new THREE.Vector3(firstPoint.x, firstPoint.y + LINE_Y_OFFSET, firstPoint.z);
    
    const closingPoints = [p1, p2];
    const closingGeometry = new THREE.BufferGeometry().setFromPoints(closingPoints);
    const closingMaterial = new THREE.LineDashedMaterial({ 
      color: closingColor,
      linewidth: 3,
      ...DEPTH_SETTINGS,
      scale: 1,
      dashSize: 0.1,
      gapSize: 0.1
    });
    const closingLine = new THREE.Line(closingGeometry, closingMaterial);
    closingLine.computeLineDistances();
    closingLine.renderOrder = 10;
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
    
    const size = isSelected ? EDIT_POINT_SELECTED_SIZE : EDIT_POINT_SIZE;
    const sphereGeometry = new THREE.SphereGeometry(size, 16, 16);
    
    const color = isSelected ? COLORS.ORANGE : COLORS.CYAN;
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color,
      ...DEPTH_SETTINGS
    });
    
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y + POINT_Y_OFFSET, point.z);
    sphere.renderOrder = 10;
    
    // Add user data to the sphere for identification when clicking
    const userData = {
      isEditPoint: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    sphere.userData = userData;

    // Add an invisible, larger hit area to make touch selection easier
    const hitGeometry = new THREE.SphereGeometry(size * 1.8, 16, 16);
    const hitMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0, ...DEPTH_SETTINGS });
    const hitSphere = new THREE.Mesh(hitGeometry, hitMaterial);
    hitSphere.position.copy(sphere.position);
    hitSphere.userData = { ...userData };
    hitSphere.renderOrder = 9;
    
    editPointsRef.add(sphere);
    editPointsRef.add(hitSphere);

    // Create a label for each point in area-like measurements
    if (measurement.type === 'area' || measurement.type === 'solar' || 
        measurement.type === 'skylight' || measurement.type === 'chimney') {
      const labelPosition = new THREE.Vector3(point.x, point.y + LABEL_Y_OFFSET, point.z);
      const pointLabel = createMeasurementLabel(`P${index + 1}`, labelPosition, true, undefined, true);
      pointLabel.userData = {
        isEditPointLabel: true,
        isPointLabel: true,
        measurementId: measurement.id,
        pointIndex: index,
        isPreview: true
      };
      pointLabel.renderOrder = 1000;
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
  visible: boolean,
  isDrawing: boolean = false
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
      
      if (!isMeasurementBeingEdited && existingLabels.length > 0) {
        const points3D = pointsToVector3Array(measurement.points);
        
        // Calculate centroid for label placement
        const centroid = calculateCentroid(points3D);
        
        // Create label text (without inclination for area measurements)
        const labelText = formatMeasurementLabel(measurement.value, measurement.type);
        
        // Update the existing label
        const label = existingLabels[0] as THREE.Sprite;
        updateTextSprite(label, labelText);
        
        // Update position
        label.position.copy(centroid);
      }
      
      if (!shouldRecreateSegmentLabels && existingSegmentLabels.length > 0 && measurement.segments) {
        // Get all points as THREE.Vector3
        const points3D = pointsToVector3Array(measurement.points);
        
        // For each segment, find its label and update it
        for (const segment of measurement.segments) {
          const segmentLabel = existingSegmentLabels.find(
            label => label.userData.segmentId === segment.id
          ) as THREE.Sprite | undefined;
          
          if (segmentLabel && segment) {
            // Find the segment's points
            const startPointIndex = segmentLabel.userData.startPointIndex || 0;
            const endPointIndex = segmentLabel.userData.endPointIndex || 0;
            
            // Make sure the indices are valid
            if (startPointIndex < points3D.length && endPointIndex < points3D.length) {
              const p1 = points3D[startPointIndex];
              const p2 = points3D[endPointIndex];
              
              // Update label position
              const midpoint = calculateMidpoint(p1, p2);
              
              // Offset midpoint slightly to avoid overlap with lines
              midpoint.y += 0.05;
              
              // Entferne Neigungs-Info aus dem Segment-Label für Flächenmessungen
              const segmentLabelText = segment.label || "";
              
              // Update the label text and position
              updateTextSprite(segmentLabel, segmentLabelText);
              segmentLabel.position.copy(midpoint);
            }
          }
        }
      }
    }
    else if (measurement.type === 'solar') {
      // Always recreate segment labels if the measurement is being edited
      const shouldRecreateSegmentLabels = isMeasurementBeingEdited ||
        existingSegmentLabels.length !== (measurement.segments?.length || 0) ||
        // Also recreate if the segment IDs don't match up with existing labels
        (measurement.segments && measurement.segments.some(segment => 
          !existingSegmentLabels.some(label => label.userData.segmentId === segment.id)
        ));
      
      // First render the base solar area similar to a regular area
      renderAreaMeasurement(
        measurement, 
        measurementsRef, 
        labelsRef, 
        segmentLabelsRef, 
        isMeasurementBeingEdited,
        shouldRecreateSegmentLabels
      );
      
      // Then render the PV module grid if PV module information is available
      if (measurement.pvModuleInfo && measurement.pvModuleInfo.moduleCount > 0) {
        console.log(`Rendering PV module grid for measurement ${measurement.id} with ${measurement.pvModuleInfo.moduleCount} modules`);
        renderPVModuleGrid(measurement, measurementsRef, labelsRef);
      } else {
        console.log(`No PV module info available for solar measurement ${measurement.id}`);
      }
      
      if (!isMeasurementBeingEdited && existingLabels.length > 0) {
        const points3D = pointsToVector3Array(measurement.points);
        
        // Calculate centroid for label placement
        const centroid = calculateCentroid(points3D);
        
        // Create label text (without inclination for area measurements)
        const labelText = formatMeasurementLabel(measurement.value, measurement.type);
        
        // Update the existing label
        const label = existingLabels[0] as THREE.Sprite;
        updateTextSprite(label, labelText);
        
        // Update position
        label.position.copy(centroid);
      }
      
      if (!shouldRecreateSegmentLabels && existingSegmentLabels.length > 0 && measurement.segments) {
        // Get all points as THREE.Vector3
        const points3D = pointsToVector3Array(measurement.points);
        
        // For each segment, find its label and update it
        for (const segment of measurement.segments) {
          const segmentLabel = existingSegmentLabels.find(
            label => label.userData.segmentId === segment.id
          ) as THREE.Sprite | undefined;
          
          if (segmentLabel && segment) {
            // Find the segment's points
            const startPointIndex = segmentLabel.userData.startPointIndex || 0;
            const endPointIndex = segmentLabel.userData.endPointIndex || 0;
            
            // Make sure the indices are valid
            if (startPointIndex < points3D.length && endPointIndex < points3D.length) {
              const p1 = points3D[startPointIndex];
              const p2 = points3D[endPointIndex];
              
              // Update label position
              const midpoint = calculateMidpoint(p1, p2);
              
              // Offset midpoint slightly to avoid overlap with lines
              midpoint.y += 0.05;
              
              // Entferne Neigungs-Info aus dem Segment-Label für Flächenmessungen
              const segmentLabelText = segment.label || "";
              
              // Update the label text and position
              updateTextSprite(segmentLabel, segmentLabelText);
              segmentLabel.position.copy(midpoint);
            }
          }
        }
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
      
      if (!isMeasurementBeingEdited && existingLabels.length > 0) {
        // Update labels for roof elements
        if (measurement.points.length > 0) {
          const labelText = measurement.label || formatMeasurementLabel(measurement.value, measurement.type);
          
          // For point-based elements (vent, hook, other)
          if (measurement.points.length === 1) {
            const point = pointToVector3(measurement.points[0]);
            
            // Position label slightly above the point
            const labelPos = new THREE.Vector3(point.x, point.y + 0.2, point.z);
            
            // Update the existing label
            const label = existingLabels[0] as THREE.Sprite;
            updateTextSprite(label, labelText);
            
            // Update position
            label.position.copy(labelPos);
          } 
          // For area-based elements (skylight, chimney)
          else if (measurement.points.length >= 3) {
            const points3D = pointsToVector3Array(measurement.points);
            
            // Calculate centroid for label placement
            const centroid = calculateCentroid(points3D);
            
            // Update the existing label
            const label = existingLabels[0] as THREE.Sprite;
            updateTextSprite(label, labelText);
            
            // Update position - raise label slightly above the element
            centroid.y += 0.15;
            label.position.copy(centroid);
          }
        }
      }
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
    // Ausblenden während der Bearbeitung ODER während des Zeichnens
    if ((anyMeasurementBeingEdited || isDrawing) && !isPreview) {
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
    child.renderOrder = 20;
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
  
  // PV-Module während des Zeichnens ausblenden
  if (isDrawing) {
    measurementsRef.children.forEach(child => {
      if (child.userData?.isPVModule || child.userData?.isPVGridLine) {
        child.visible = false;
      }
    });
  }
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
    color: COLORS.CYAN,
    linewidth: 3,
    ...DEPTH_SETTINGS
  });
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.renderOrder = 10;
  measurementsRef.add(line);
  
  // Add small spheres at endpoints with minimal Y offset
  const sphereGeometry = new THREE.SphereGeometry(POINT_SIZE, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: COLORS.CYAN,
    ...DEPTH_SETTINGS
  });
  
  measurement.points.forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(point.x, point.y + POINT_Y_OFFSET, point.z);
    sphere.renderOrder = 999;
    
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
    color: COLORS.CYAN,
    linewidth: 3,
    depthTest: false
  });
  const verticalLine = new THREE.Line(verticalLineGeometry, verticalLineMaterial);
  verticalLine.renderOrder = 999;
  measurementsRef.add(verticalLine);
  
  // Draw horizontal reference line
  const horizontalLinePoints = [
    new THREE.Vector3(verticalPoint.x, verticalPoint.y + LINE_Y_OFFSET, verticalPoint.z),
    new THREE.Vector3(lowerPoint.x, lowerPoint.y + LINE_Y_OFFSET, lowerPoint.z)
  ];
  const horizontalLineGeometry = new THREE.BufferGeometry().setFromPoints(horizontalLinePoints);
  const horizontalLineMaterial = new THREE.LineDashedMaterial({ 
    color: COLORS.CYAN,
    linewidth: 3,
    depthTest: false,
    dashSize: 0.1,
    gapSize: 0.05,
  });
  const horizontalLine = new THREE.Line(horizontalLineGeometry, horizontalLineMaterial);
  horizontalLine.computeLineDistances();
  horizontalLine.renderOrder = 999;
  measurementsRef.add(horizontalLine);
  
  // Add small spheres at all points
  const sphereGeometry = new THREE.SphereGeometry(POINT_SIZE, 16, 16);
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: COLORS.CYAN,
    depthTest: false
  });
  
  [point1, point2].forEach((point, index) => {
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(point);
    sphere.renderOrder = 999;
    
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
  // Convert points to THREE.Vector3 with minimal Y offset
  const points3D = measurement.points.map(p => new THREE.Vector3(p.x, p.y + LINE_Y_OFFSET, p.z));
  
  // Choose color based on measurement type
  const measurementColor = measurement.type === 'solar' ? COLORS.SOLAR : COLORS.CYAN;
  
  // Create outline from points
  for (let i = 0; i < points3D.length; i++) {
    const p1 = points3D[i];
    const p2 = points3D[(i + 1) % points3D.length];
    
    // Draw the line segment
    const linePoints = [p1, p2];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: measurementColor,
      linewidth: 3,
      depthTest: false
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 999;
    measurementsRef.add(line);
    
    // Add small sphere at each vertex with minimal Y offset
    const sphereGeometry = new THREE.SphereGeometry(POINT_SIZE, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: measurementColor,
      depthTest: false
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // Adjust position to use original point data with minimal offset
    sphere.position.set(
      measurement.points[i].x, 
      measurement.points[i].y + POINT_Y_OFFSET, 
      measurement.points[i].z
    );
    sphere.renderOrder = 999;
    
    // Add userData for interactive selection
    sphere.userData = {
      isAreaPoint: true,
      measurementId: measurement.id,
      pointIndex: i,
      segmentIndex: i
    };
    
    measurementsRef.add(sphere);

    // Add segment labels (for the line measurements)
    if (shouldCreateSegmentLabels && measurement.segments) {
      const segment = measurement.segments[i];
      const midpoint = calculateMidpoint(p1, p2);
      
      // Offset midpoint slightly to avoid overlap with lines
      midpoint.y += LABEL_Y_OFFSET;
      
      // Zeige immer den Messwert im 3D-Modell an, unabhängig vom benutzerdefinierten Label
      const segmentLabelText = `${segment.length.toFixed(2)}m`;
      
      // Create label with smaller size
      const segmentLabelSprite = createMeasurementLabel(segmentLabelText, midpoint, true, '#' + measurementColor.toString(16).padStart(6, '0'));
      
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
  
  // For solar panels, add a visual marker
  if (measurement.type === 'solar') {
    // Calculate centroid of points
    const centroid = calculateCentroid(points3D);
    
    // Create a solar panel marker
    const solarMarker = createRoofElementMarker(centroid, 'solar', 0x1EAEDB); // Changed to blue
    
    // Store measurement ID in user data
    solarMarker.userData = {
      measurementId: measurement.id,
      type: 'solar'
    };
    
    // Add marker to measurements group
    measurementsRef.add(solarMarker);
  }
  
  // Only create a new main label if needed
  if (shouldCreateLabel) {
    // Calculate centroid for label placement
    const centroid = calculateCentroid(points3D);
    
    // Raise label position for visibility
    centroid.y += LABEL_Y_OFFSET;
    
    // Create label text (without inclination for area measurements)
    const labelText = formatMeasurementLabel(measurement.value, measurement.type);
    
    const label = createMeasurementLabel(labelText, centroid, true, '#' + measurementColor.toString(16).padStart(6, '0'));
    
    // Store measurement ID in user data for reference
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
}

/**
 * Renders a solar measurement (enhanced visualization compared to regular area)
 */
function renderSolarMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  segmentLabelsRef: THREE.Group,
  shouldCreateLabel: boolean,
  shouldCreateSegmentLabels: boolean
) {
  // Convert points to THREE.Vector3 with minimal Y offset
  const points3D = measurement.points.map(p => new THREE.Vector3(p.x, p.y + LINE_Y_OFFSET, p.z));
  
  // Use a distinct blue color for solar measurements
  const measurementColor = COLORS.SOLAR;
  
  // Create outline from points
  for (let i = 0; i < points3D.length; i++) {
    const p1 = points3D[i];
    const p2 = points3D[(i + 1) % points3D.length];
    
    // Draw the line segment
    const linePoints = [p1, p2];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: measurementColor,
      linewidth: 3,
      depthTest: false
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.renderOrder = 999;
    measurementsRef.add(line);
    
    // Add small sphere at each vertex with minimal Y offset
    const sphereGeometry = new THREE.SphereGeometry(POINT_SIZE, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: measurementColor,
      depthTest: false
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // Adjust position to use original point data with minimal offset
    sphere.position.set(
      measurement.points[i].x, 
      measurement.points[i].y + POINT_Y_OFFSET, 
      measurement.points[i].z
    );
    sphere.renderOrder = 999;
    
    // Add userData for interactive selection
    sphere.userData = {
      isAreaPoint: true,
      measurementId: measurement.id,
      pointIndex: i,
      segmentIndex: i,
      isSolar: true // Mark as solar point for special handling
    };
    
    measurementsRef.add(sphere);

    // Add segment labels (for the line measurements)
    if (shouldCreateSegmentLabels && measurement.segments) {
      const segment = measurement.segments[i];
      const midpoint = calculateMidpoint(p1, p2);
      
      // Offset midpoint slightly to avoid overlap with lines
      midpoint.y += LABEL_Y_OFFSET;
      
      // Create label with smaller size
      const segmentLabelSprite = createMeasurementLabel(segment.label || "", midpoint, true, '#' + measurementColor.toString(16).padStart(6, '0'));
      
      // Adjust the scale to make it slightly smaller than area labels
      segmentLabelSprite.scale.multiplyScalar(0.8);
      
      // Store measurement ID and segment ID in user data for reference
      segmentLabelSprite.userData = {
        measurementId: measurement.id,
        segmentId: segment.id,
        startPointIndex: i,
        endPointIndex: (i + 1) % points3D.length,
        isSolar: true
      };
      
      // Add to segment labels group
      segmentLabelsRef.add(segmentLabelSprite);
    }
  }
  
  // Create a translucent fill for the solar area
  if (points3D.length >= 3) {
    // Create a shape from the points (projecting to xz plane)
    const shape = new THREE.Shape();
    shape.moveTo(points3D[0].x, points3D[0].z);
    for (let i = 1; i < points3D.length; i++) {
      shape.lineTo(points3D[i].x, points3D[i].z);
    }
    shape.lineTo(points3D[0].x, points3D[0].z);
    
    // Create a geometry from the shape
    const geometry = new THREE.ShapeGeometry(shape);
    
    // Adjust the geometry to match the Y positions of the original points
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      // Get the projected X, Z coordinates
      const x = positions.getX(i);
      const z = positions.getY(i); // Y in the shape is Z in 3D space
      
      // Find the Y coordinate by interpolating between original points
      // For simplicity, we'll just use the average Y of all points
      const averageY = points3D.reduce((sum, p) => sum + p.y, 0) / points3D.length;
      
      // Set the new XYZ coordinates
      positions.setXYZ(i, x, averageY + 0.02, z);
    }
    
    // Create a material for the fill
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: measurementColor,
      opacity: 0.3,
      transparent: true,
      side: THREE.FrontSide,
      depthTest: false
    });
    
    const mesh = new THREE.Mesh(geometry, fillMaterial);
    mesh.renderOrder = 998;
    
    // Store measurement ID in user data
    mesh.userData = {
      measurementId: measurement.id,
      isSolarFill: true
    };
    
    measurementsRef.add(mesh);
  }
  
  // Add a visual marker for solar area
  const centroid = calculateCentroid(points3D);
  const solarMarker = createRoofElementMarker(centroid, 'solar', measurementColor);
  
  // Store measurement ID in user data
  solarMarker.userData = {
    measurementId: measurement.id,
    type: 'solar'
  };
  
  // Add marker to measurements group
  measurementsRef.add(solarMarker);
  
  // Create label if needed
  if (shouldCreateLabel) {
    // Calculate centroid for label placement
    centroid.y += LABEL_Y_OFFSET;
    
    // Create label text
    const labelText = formatMeasurementLabel(measurement.value, measurement.type);
    
    // Fixed: Convert color number to string using CSS hex format
    const label = createMeasurementLabel(labelText, centroid, true, '#' + measurementColor.toString(16).padStart(6, '0'));
    
    // Store measurement ID in user data for reference
    label.userData.measurementId = measurement.id;
    
    // Add to labels group
    labelsRef.add(label);
  }
}

/**
 * Renders a roof element measurement (skylight, chimney, vent, etc.)
 */
function renderRoofElementMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  shouldCreateLabel: boolean
) {
  // Set element color based on type
  const getElementColor = (type: string): number => {
    switch(type) {
      case 'skylight': return COLORS.SKYLIGHT;
      case 'chimney': return COLORS.CHIMNEY;
      case 'vent': return COLORS.VENT;
      case 'hook': return COLORS.HOOK;
      default: return 0xcccccc;
    }
  };
  
  const elementColor = getElementColor(measurement.type);
  
  // Handle point-based elements (vent, hook, other)
  if (measurement.points.length === 1) {
    const point = pointToVector3(measurement.points[0]);
    
    // Add marker at the point
    const marker = createRoofElementMarker(point, measurement.type, elementColor);
    
    // Store element data
    marker.userData = {
      measurementId: measurement.id,
      type: measurement.type
    };
    
    // Add to measurements group
    measurementsRef.add(marker);
    
    // Add small sphere at the point for interaction
    const sphereGeometry = new THREE.SphereGeometry(POINT_SIZE, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: elementColor,
      depthTest: false
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(
      measurement.points[0].x, 
      measurement.points[0].y + POINT_Y_OFFSET, 
      measurement.points[0].z
    );
    sphere.renderOrder = 999;
    
    // Add userData for interactive selection
    sphere.userData = {
      isMeasurementPoint: true,
      measurementId: measurement.id,
      pointIndex: 0
    };
    
    measurementsRef.add(sphere);
    
    // Create label if needed
    if (shouldCreateLabel) {
      // Position label slightly above the point
      const labelPos = new THREE.Vector3(point.x, point.y + LABEL_Y_OFFSET, point.z);
      
      // Create label text
      const labelText = measurement.label || measurement.type;
      
      const label = createMeasurementLabel(labelText, labelPos, true);
      
      // Store measurement ID in user data for reference
      label.userData.measurementId = measurement.id;
      
      // Add to labels group
      labelsRef.add(label);
    }
  }
  // Handle area-based elements (skylight, chimney)
  else if (measurement.points.length >= 3) {
    const points3D = pointsToVector3Array(measurement.points);
    
    // Create outline from points
    for (let i = 0; i < points3D.length; i++) {
      const p1 = points3D[i];
      const p2 = points3D[(i + 1) % points3D.length]; // Connect back to first point
      
      // Draw the line segment with slightly raised Y position
      const linePoints = [
        new THREE.Vector3(p1.x, p1.y + LINE_Y_OFFSET, p1.z),
        new THREE.Vector3(p2.x, p2.y + LINE_Y_OFFSET, p2.z)
      ];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: elementColor,
        linewidth: 3,
        depthTest: false
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.renderOrder = 999;
      measurementsRef.add(line);
      
      // Add small sphere at each vertex with minimal Y offset
      const sphereGeometry = new THREE.SphereGeometry(POINT_SIZE, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color: elementColor,
        depthTest: false
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(
        measurement.points[i].x, 
        measurement.points[i].y + POINT_Y_OFFSET, 
        measurement.points[i].z
      );
      sphere.renderOrder = 999;
      
      // Add userData for interactive selection
      sphere.userData = {
        isAreaPoint: true,
        measurementId: measurement.id,
        pointIndex: i
      };
      
      measurementsRef.add(sphere);
    }
    
    // Calculate centroid of points
    const centroid = calculateCentroid(points3D);
    
    // Create a marker at the centroid
    const elementMarker = createRoofElementMarker(centroid, measurement.type, elementColor);
    
    // Store measurement ID in user data
    elementMarker.userData = {
      measurementId: measurement.id,
      type: measurement.type
    };
    
    // Add marker to measurements group
    measurementsRef.add(elementMarker);
    
    // Create label if needed
    if (shouldCreateLabel) {
      // Position label slightly above the element
      const labelPos = new THREE.Vector3(centroid.x, centroid.y + 0.15, centroid.z);
      
      // Create label text
      const labelText = measurement.label || formatMeasurementLabel(measurement.value, measurement.type);
      
      const label = createMeasurementLabel(labelText, labelPos, true);
      
      // Store measurement ID in user data for reference
      label.userData.measurementId = measurement.id;
      
      // Add to labels group
      labelsRef.add(label);
    }
  }
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

  // Generate the PV module grid (only module surfaces)
  const { modulePoints, moduleOriginalIndices } = generatePVModuleGrid(measurement.pvModuleInfo, baseY);

  // Visual defaults (can be overridden via pvModuleInfo.moduleVisuals)
  const vDefaults = {
    panelColor: 0x0b1f3a,
    panelOpacity: 0.95,
  } as const;
  const v = { ...vDefaults, ...(measurement.pvModuleInfo?.moduleVisuals || {}) } as any;

  // Load module texture
  const textureLoader = new THREE.TextureLoader();
  let moduleTexture: THREE.Texture | null = null;
  try {
    const texturePath = new URL('@/assets/moduli_standard.png', import.meta.url).href;
    moduleTexture = textureLoader.load(texturePath);
    moduleTexture.colorSpace = THREE.SRGBColorSpace;
    moduleTexture.minFilter = THREE.LinearMipmapLinearFilter;
    moduleTexture.magFilter = THREE.LinearFilter;
  } catch (e) {
    console.warn('Could not load PV module texture, falling back to color', e);
  }

  // Keep modules always visible through GLB, and render texture only (no extra line patterns)
  const moduleMaterial = moduleTexture
    ? new THREE.MeshBasicMaterial({
        map: moduleTexture,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
      })
    : new THREE.MeshBasicMaterial({
        color: (v.panelColor ?? PV_MODULE_COLORS.MODULE) as any,
        opacity: v.panelOpacity ?? 0.95,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
      });

  modulePoints.forEach((points, index) => {
    const geometry = new THREE.BufferGeometry();

    // 2 triangles = quad module surface
    // Corner order: 0=BL, 1=BR, 2=TR, 3=TL
    // Split along diagonal 0-2: Triangle1(BL,BR,TR) + Triangle2(BL,TR,TL)
    const vertices = new Float32Array([
      points[0].x, points[0].y, points[0].z, // BL
      points[1].x, points[1].y, points[1].z, // BR
      points[2].x, points[2].y, points[2].z, // TR

      points[0].x, points[0].y, points[0].z, // BL
      points[2].x, points[2].y, points[2].z, // TR
      points[3].x, points[3].y, points[3].z  // TL
    ]);

    // Small offset to avoid z-fighting on roof surface
    const normal = new THREE.Vector3()
      .crossVectors(
        new THREE.Vector3().subVectors(
          new THREE.Vector3(points[1].x, points[1].y, points[1].z),
          new THREE.Vector3(points[0].x, points[0].y, points[0].z)
        ),
        new THREE.Vector3().subVectors(
          new THREE.Vector3(points[3].x, points[3].y, points[3].z),
          new THREE.Vector3(points[0].x, points[0].y, points[0].z)
        )
      )
      .normalize();

    const OFFSET_DISTANCE = 0.01;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] += normal.x * OFFSET_DISTANCE;
      vertices[i + 1] += normal.y * OFFSET_DISTANCE;
      vertices[i + 2] += normal.z * OFFSET_DISTANCE;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // UVs matching: BL(0,0) BR(1,0) TR(1,1) | BL(0,0) TR(1,1) TL(0,1)
    const uvs = new Float32Array([
      0, 0,  // BL
      1, 0,  // BR
      1, 1,  // TR
      0, 0,  // BL
      1, 1,  // TR
      0, 1   // TL
    ]);
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, moduleMaterial);
    mesh.renderOrder = 950;
    mesh.userData = {
      measurementId: measurement.id,
      isPVModule: true,
      moduleIndex: moduleOriginalIndices[index]
    };
    measurementsRef.add(mesh);

    // Module number label
    const centerX = (points[0].x + points[1].x + points[2].x + points[3].x) / 4;
    const centerY = (points[0].y + points[1].y + points[2].y + points[3].y) / 4;
    const centerZ = (points[0].z + points[1].z + points[2].z + points[3].z) / 4;

    const moduleCenter = new THREE.Vector3(centerX, centerY + 0.03, centerZ);
    const moduleLabel = createMeasurementLabel(`${index + 1}`, moduleCenter, true);
    moduleLabel.userData = {
      measurementId: measurement.id,
      isModuleLabel: true,
      moduleIndex: index
    };
    moduleLabel.userData.isModuleLabel = true;
    moduleLabel.scale.set(0.2, 0.2, 0.2);
    labelsRef.add(moduleLabel);
  });
}
