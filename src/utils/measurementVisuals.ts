import * as THREE from 'three';
import { Point, Measurement, MeasurementMode } from '@/types/measurements';
import {
  createMeasurementLabel,
  formatMeasurementLabel,
  calculateMidpoint,
  calculateCentroid,
  calculateInclination,
  updateTextSprite
} from '@/utils/textSprite';
import { 
  measureSegmentLengths, 
  calculatePolygonCenter, 
  calculatePolygonArea 
} from './measurementCalculations';
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
  BOUNDARY: 0xFF9500,      // Orange for boundary (changed from purple to orange)
  AVAILABLE_AREA: 0xFFBB00  // Yellow for available area (changed from magenta to yellow)
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
  currentPoints: THREE.Vector3[],
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
      const p1 = currentPoints[0];
      const p2 = currentPoints[1];
      
      // Calculate distance
      const distance = p1.distanceTo(p2);
      
      // Calculate inclination
      const inclination = calculateInclination(p1, p2);
      
      // Format label text
      const labelText = formatMeasurementLabel(distance, 'length', inclination);
      
      // Create label at midpoint
      const midpoint = calculateMidpoint(p1, p2);
      // Raise label position slightly higher for visibility
      midpoint.y += LABEL_Y_OFFSET;
      
      const label = createMeasurementLabel(labelText, midpoint, true);
      label.userData.isPreview = true;
      
      labelsRef.add(label);
    }
    else if (activeMode === 'height' && currentPoints.length >= 2) {
      // For height measurement preview
      const p1 = currentPoints[0];
      const p2 = currentPoints[1];
      
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
      const points3D = currentPoints;
      
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
      const points3D = currentPoints;
      
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
 * Creates a filled area for area/solar measurements
 */
function createAreaFill(points: THREE.Vector3[], color: number, opacity: number = 0.3): THREE.Mesh {
  // Create a shape from the points (projected to XZ plane for simplicity)
  const shape = new THREE.Shape();
  
  // Start at the first point
  if (points.length > 0) {
    shape.moveTo(points[0].x, points[0].z);
    
    // Add each point to the shape
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].z);
    }
    
    // Close the shape
    shape.lineTo(points[0].x, points[0].z);
  }
  
  // Create geometry from the shape
  const geometry = new THREE.ShapeGeometry(shape);
  
  // Adjust vertices to match the original 3D points (adding Y component back)
  const positions = geometry.attributes.position.array;
  for (let i = 0; i < points.length; i++) {
    const vertexIndex = i * 3;
    if (vertexIndex + 2 < positions.length) {
      // Keep X, set Y from original point, use Z for what was mapped to Z (actually the original Z)
      positions[vertexIndex + 1] = points[i].y + 0.01; // Slight offset to avoid z-fighting
    }
  }
  
  // Create a material with the specified color and opacity
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide,
    depthWrite: false // This helps with transparency rendering
  });
  
  // Create and return the mesh
  const mesh = new THREE.Mesh(geometry, material);
  
  // Set high render order to ensure visibility above the model
  mesh.renderOrder = 1;
  
  return mesh;
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
            const labelPos = new THREE.Vector3(
              point.x, 
              point.y + LABEL_Y_OFFSET, 
              point.z
            );
            
            // Update the label
            const label = existingLabels[0] as THREE.Sprite;
            updateTextSprite(label, labelText);
            label.position.copy(labelPos);
          }
          else {
            // For area-based elements (skylight, chimney)
            const points3D = pointsToVector3Array(measurement.points);
            const centroid = calculateCentroid(points3D);
            
            // Update the label
            const label = existingLabels[0] as THREE.Sprite;
            updateTextSprite(label, labelText);
            label.position.copy(centroid);
          }
        }
      }
    }
    else if (measurement.type === 'pvmodule') {
      // Handle PV module visualization here
      // This would include calculating and rendering the complete module grid based on measurement points
    }
  });
}

/**
 * Function to render a length measurement
 */
function renderLengthMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  isEditing: boolean
) {
  // Skip if not enough points
  if (measurement.points.length < 2) return;
  
  const [p1, p2] = measurement.points;
  const point1 = pointToVector3(p1);
  const point2 = pointToVector3(p2);
  
  // Add line connecting the points
  const points = [
    new THREE.Vector3(point1.x, point1.y + LINE_Y_OFFSET, point1.z),
    new THREE.Vector3(point2.x, point2.y + LINE_Y_OFFSET, point2.z)
  ];
  
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00ff00, // Green for length
    linewidth: 2,
    transparent: true,
    opacity: 0.8
  });
  
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.userData = { measurementId: measurement.id };
  line.renderOrder = 1;
  
  measurementsRef.add(line);
  
  // Create label if it doesn't already exist
  if (isEditing) {
    // Calculate distance and inclination
    const distance = point1.distanceTo(point2);
    const inclination = calculateInclination(point1, point2);
    
    // Format label text
    const labelText = formatMeasurementLabel(measurement.value || distance, 'length', inclination);
    
    // Create label at midpoint
    const midpoint = calculateMidpoint(point1, point2);
    midpoint.y += LABEL_Y_OFFSET; // Raise label for visibility
    
    const label = createMeasurementLabel(labelText, midpoint);
    
    // Store measurement ID in user data for reference
    label.userData = { 
      measurementId: measurement.id,
      type: 'length'
    };
    
    // Add to labels group
    labelsRef.add(label);
  }
}

/**
 * Function to render a height measurement
 */
function renderHeightMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  isEditing: boolean
) {
  // Skip if not enough points
  if (measurement.points.length < 2) return;
  
  const [p1, p2] = measurement.points;
  const point1 = pointToVector3(p1);
  const point2 = pointToVector3(p2);
  
  // Determine which point is higher
  const higherPoint = point1.y > point2.y ? point1 : point2;
  const lowerPoint = point1.y > point2.y ? point2 : point1;
  
  // Create a vertical projection point below the higher point
  const verticalPoint = new THREE.Vector3(
    higherPoint.x,
    lowerPoint.y,
    higherPoint.z
  );
  
  // Add lines - one vertical and one horizontal
  const verticalLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(verticalPoint.x, verticalPoint.y + LINE_Y_OFFSET, verticalPoint.z),
    new THREE.Vector3(higherPoint.x, higherPoint.y + LINE_Y_OFFSET, higherPoint.z)
  ]);
  
  const horizontalLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(lowerPoint.x, lowerPoint.y + LINE_Y_OFFSET, lowerPoint.z),
    new THREE.Vector3(verticalPoint.x, verticalPoint.y + LINE_Y_OFFSET, verticalPoint.z)
  ]);
  
  const lineMaterial = new THREE.LineBasicMaterial({ 
    color: 0x0000ff, // Blue for height
    linewidth: 2,
    transparent: true,
    opacity: 0.8
  });
  
  const vLine = new THREE.Line(verticalLine, lineMaterial);
  const hLine = new THREE.Line(horizontalLine, lineMaterial);
  
  vLine.userData = { measurementId: measurement.id };
  hLine.userData = { measurementId: measurement.id };
  
  vLine.renderOrder = 1;
  hLine.renderOrder = 1;
  
  measurementsRef.add(vLine);
  measurementsRef.add(hLine);
  
  // Create label if it doesn't already exist and we're in edit mode
  if (isEditing) {
    // Height is specifically the Y-axis difference
    const height = Math.abs(higherPoint.y - lowerPoint.y);
    
    // Format label text
    const labelText = formatMeasurementLabel(measurement.value || height, 'height');
    
    // Create label positioned beside the vertical line
    const labelPos = new THREE.Vector3(
      verticalPoint.x + 0.2, // Slightly offset from vertical line
      (higherPoint.y + verticalPoint.y) / 2,
      verticalPoint.z
    );
    
    const label = createMeasurementLabel(labelText, labelPos);
    
    // Store measurement ID in user data for reference
    label.userData = { 
      measurementId: measurement.id,
      type: 'height'
    };
    
    // Add to labels group
    labelsRef.add(label);
  }
}

/**
 * Function to render an area measurement
 */
function renderAreaMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  segmentLabelsRef: THREE.Group,
  isEditing: boolean,
  shouldRecreateSegmentLabels: boolean
) {
  // Skip if not enough points
  if (measurement.points.length < 3) return;
  
  // Convert all points to Vector3
  const points3D = pointsToVector3Array(measurement.points);
  
  // Create area fill with the appropriate color for solar/regular
  const color = measurement.type === 'solar' ? 0x1EAEDB : 0xffaa00;
  const areaFill = createAreaFill(points3D, color);
  
  // Set user data for the filled area
  areaFill.userData = { 
    measurementId: measurement.id,
    type: measurement.type
  };
  
  // Add to measurements group
  measurementsRef.add(areaFill);
  
  // Add lines connecting all points to form a polygon
  for (let i = 0; i < points3D.length; i++) {
    const p1 = points3D[i];
    const p2 = points3D[(i + 1) % points3D.length]; // Wrap around to first point
    
    // Create line at a slight Y offset for visibility
    const linePoints = [
      new THREE.Vector3(p1.x, p1.y + LINE_Y_OFFSET, p1.z),
      new THREE.Vector3(p2.x, p2.y + LINE_Y_OFFSET, p2.z)
    ];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: color,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.userData = { 
      measurementId: measurement.id,
      pointIndex1: i,
      pointIndex2: (i + 1) % points3D.length
    };
    
    line.renderOrder = 2;
    measurementsRef.add(line);
  }
  
  // Create label if we're in edit mode or recreating
  if (isEditing) {
    // Calculate centroid for label placement
    const centroid = calculateCentroid(points3D);
    
    // Format label text
    const labelText = formatMeasurementLabel(measurement.value, measurement.type);
    
    // Create label at centroid
    const label = createMeasurementLabel(labelText, centroid);
    
    // Store measurement ID in user data for reference
    label.userData = { 
      measurementId: measurement.id,
      type: measurement.type
    };
    
    // Add to labels group
    labelsRef.add(label);
  }
  
  // Create segment labels if needed
  if (shouldRecreateSegmentLabels && measurement.segments) {
    // Get segments with length information
    for (const segment of measurement.segments) {
      // Skip segments without valid point indices
      if (typeof segment.startPointIndex !== 'number' || 
          typeof segment.endPointIndex !== 'number' ||
          segment.startPointIndex >= points3D.length ||
          segment.endPointIndex >= points3D.length) continue;
      
      // Get the points for this segment
      const p1 = points3D[segment.startPointIndex];
      const p2 = points3D[segment.endPointIndex];
      
      // Calculate midpoint for label position
      const midpoint = calculateMidpoint(p1, p2);
      
      // Raise the label slightly for visibility
      midpoint.y += 0.05; // Smaller offset for segment labels
      
      // Create segment label with custom formatting
      const segmentLabel = createMeasurementLabel(segment.label || "", midpoint);
      
      // Store segment info in user data
      segmentLabel.userData = {
        measurementId: measurement.id,
        segmentId: segment.id,
        startPointIndex: segment.startPointIndex,
        endPointIndex: segment.endPointIndex
      };
      
      // Add to segment labels group
      segmentLabelsRef.add(segmentLabel);
    }
  }
  
  // Additional visualization for solar measurements
  if (measurement.type === 'solar' && measurement.solarModules) {
    // Render solar module grid
    renderSolarModuleGrid(measurement, measurementsRef);
  }
}

/**
 * Function to render solar module grid
 */
function renderSolarModuleGrid(
  measurement: Measurement,
  measurementsRef: THREE.Group
) {
  if (!measurement.solarModules || !measurement.points) return;
  
  const { moduleCount, coveragePercent } = measurement.solarModules;
  
  // Get points as Vector3 array
  const points3D = pointsToVector3Array(measurement.points);
  
  // Generate grid positions using PV calculations utility
  const gridResult = generatePVModuleGrid(points3D, moduleCount || 0);
  
  if (!gridResult || !gridResult.modules) return;
  
  // Render each module as a rectangle
  gridResult.modules.forEach(modulePosition => {
    // Create a thin box geometry for each module
    const moduleGeometry = new THREE.BoxGeometry(
      modulePosition.width, 
      0.015, // Very thin height
      modulePosition.height
    );
    
    const moduleMaterial = new THREE.MeshBasicMaterial({
      color: PV_MODULE_COLORS.MODULE,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    const module = new THREE.Mesh(moduleGeometry, moduleMaterial);
    
    // Position the module
    module.position.set(
      modulePosition.center.x,
      modulePosition.center.y + PV_LINE_Y_OFFSET, // Offset to float above roof
      modulePosition.center.z
    );
    
    // Set user data for the module
    module.userData = { 
      measurementId: measurement.id,
      type: 'solarModule'
    };
    
    // Set render order for visibility
    module.renderOrder = 3;
    
    // Add to measurements group
    measurementsRef.add(module);
  });
  
  // Add grid lines connecting modules
  if (gridResult.gridLines) {
    gridResult.gridLines.forEach(line => {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(
          line.start.x, 
          line.start.y + PV_LINE_Y_OFFSET, 
          line.start.z
        ),
        new THREE.Vector3(
          line.end.x, 
          line.end.y + PV_LINE_Y_OFFSET, 
          line.end.z
        )
      ]);
      
      const lineMaterial = new THREE.LineBasicMaterial({
        color: PV_MODULE_COLORS.GRID,
        linewidth: 1,
        transparent: true,
        opacity: 0.8
      });
      
      const gridLine = new THREE.Line(lineGeometry, lineMaterial);
      
      // Set user data
      gridLine.userData = { 
        measurementId: measurement.id,
        type: 'gridLine'
      };
      
      // Set render order for visibility
      gridLine.renderOrder = 4;
      
      // Add to measurements group
      measurementsRef.add(gridLine);
    });
  }
  
  // Highlight the boundary of the available area
  const boundaryGeometry = new THREE.BufferGeometry();
  const boundaryPoints: THREE.Vector3[] = [];
  
  for (let i = 0; i < points3D.length; i++) {
    const p1 = points3D[i];
    const p2 = points3D[(i + 1) % points3D.length];
    
    boundaryPoints.push(
      new THREE.Vector3(p1.x, p1.y + PV_LINE_Y_OFFSET, p1.z),
      new THREE.Vector3(p2.x, p2.y + PV_LINE_Y_OFFSET, p2.z)
    );
  }
  
  boundaryGeometry.setFromPoints(boundaryPoints);
  
  const boundaryMaterial = new THREE.LineBasicMaterial({
    color: PV_MODULE_COLORS.BOUNDARY,
    linewidth: 3,
    transparent: true,
    opacity: 1.0
  });
  
  const boundaryLine = new THREE.LineSegments(boundaryGeometry, boundaryMaterial);
  
  // Set user data
  boundaryLine.userData = { 
    measurementId: measurement.id,
    type: 'boundary'
  };
  
  // Set render order for visibility
  boundaryLine.renderOrder = 5;
  
  // Add to measurements group
  measurementsRef.add(boundaryLine);
}

/**
 * Function to render a roof element measurement
 */
function renderRoofElementMeasurement(
  measurement: Measurement,
  measurementsRef: THREE.Group,
  labelsRef: THREE.Group,
  isEditing: boolean
) {
  // Handle different element types
  if (measurement.points.length === 0) return;
  
  // Get element color based on type
  const getElementColor = (type: string): number => {
    switch(type) {
      case 'skylight': return 0xff8800;
      case 'chimney': return 0xff0000;
      case 'vent': return 0x00ffff;
      case 'hook': return 0xff00ff;
      case 'other': default: return 0xffaa00;
    }
  };
  
  const color = getElementColor(measurement.type);
  
  // For point-based elements (vent, hook, other)
  if (measurement.points.length === 1) {
    const point = pointToVector3(measurement.points[0]);
    
    // Create a 3D marker for the element
    const marker = createRoofElementMarker(point, measurement.type, color);
    
    // Set user data
    marker.userData = { 
      measurementId: measurement.id,
      type: measurement.type
    };
    
    // Add to measurements group
    measurementsRef.add(marker);
    
    // Create label if editing
    if (isEditing) {
      // Position label slightly above the point
      const labelPos = new THREE.Vector3(
        point.x, 
        point.y + LABEL_Y_OFFSET, 
        point.z
      );
      
      // Create label with element name or custom label
      const labelText = measurement.label || measurement.type;
      const label = createMeasurementLabel(labelText, labelPos);
      
      // Set user data
      label.userData = { 
        measurementId: measurement.id,
        type: measurement.type
      };
      
      // Add to labels group
      labelsRef.add(label);
    }
  }
  // For area-based elements (skylight, chimney)
  else if (measurement.points.length >= 3) {
    // Convert points to Vector3
    const points3D = pointsToVector3Array(measurement.points);
    
    // Create area fill with appropriate color
    const areaFill = createAreaFill(points3D, color, 0.5);
    
    // Set user data
    areaFill.userData = { 
      measurementId: measurement.id,
      type: measurement.type
    };
    
    // Add to measurements group
    measurementsRef.add(areaFill);
    
    // Add boundary lines
    for (let i = 0; i < points3D.length; i++) {
      const p1 = points3D[i];
      const p2 = points3D[(i + 1) % points3D.length];
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(p1.x, p1.y + LINE_Y_OFFSET, p1.z),
        new THREE.Vector3(p2.x, p2.y + LINE_Y_OFFSET, p2.z)
      ]);
      
      const lineMaterial = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2,
        transparent: true,
        opacity: 0.9
      });
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = { measurementId: measurement.id };
      line.renderOrder = 2;
      
      measurementsRef.add(line);
    }
    
    // Create label if editing
    if (isEditing) {
      // Calculate centroid for label placement
      const centroid = calculateCentroid(points3D);
      
      // Create label with element name or area calculation
      const labelText = measurement.label || formatMeasurementLabel(measurement.value, measurement.type);
      const label = createMeasurementLabel(labelText, centroid);
      
      // Set user data
      label.userData = { 
        measurementId: measurement.id,
        type: measurement.type
      };
      
      // Add to labels group
      labelsRef.add(label);
    }
  }
}
