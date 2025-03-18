
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
    const meshObject = object as THREE.Mesh;
    
    if (Array.isArray(meshObject.material)) {
      // Dispose of all materials in the array
      meshObject.material.forEach(material => {
        if (material.dispose) {
          material.dispose();
        }
      });
    } else if (meshObject.material.dispose) {
      // Dispose of the single material
      meshObject.material.dispose();
    }
  }
}

/**
 * Clears all measurement visualizations from the scene
 */
export const clearAllVisuals = (
  pointsGroup: THREE.Group | null,
  linesGroup: THREE.Group | null,
  measurementsGroup: THREE.Group | null,
  editPointsGroup: THREE.Group | null,
  labelsGroup: THREE.Group | null,
  segmentLabelsGroup: THREE.Group | null
) => {
  // Helper to clear a group
  const clearGroup = (group: THREE.Group | null) => {
    if (!group) return;
    
    // Remove and dispose all children
    while (group.children.length > 0) {
      const child = group.children[0];
      
      // Dispose of geometry and materials to prevent memory leaks
      safelyDisposeObject(child);
      
      // Remove from group
      group.remove(child);
    }
  };
  
  // Clear all groups
  clearGroup(pointsGroup);
  clearGroup(linesGroup);
  clearGroup(measurementsGroup);
  clearGroup(editPointsGroup);
  clearGroup(labelsGroup);
  clearGroup(segmentLabelsGroup);
};

/**
 * Renders the current measurement points and lines
 */
export const renderCurrentPoints = (
  pointsGroup: THREE.Group | null,
  linesGroup: THREE.Group | null,
  labelsGroup: THREE.Group | null,
  points: Point[],
  mode: string
) => {
  if (!pointsGroup || !linesGroup || !labelsGroup) return;
  
  // Remove existing points and lines
  while (pointsGroup.children.length > 0) {
    const obj = pointsGroup.children[0];
    safelyDisposeObject(obj);
    pointsGroup.remove(obj);
  }
  
  while (linesGroup.children.length > 0) {
    const obj = linesGroup.children[0];
    
    // Only remove objects related to current points (not existing measurements)
    if (obj.userData && obj.userData.isCurrentLine) {
      safelyDisposeObject(obj);
      linesGroup.remove(obj);
    }
  }
  
  // Remove existing labels for current measurement
  const currentLabels = labelsGroup.children.filter(
    child => child.userData && child.userData.isCurrentMeasurement
  );
  
  for (const label of currentLabels) {
    safelyDisposeObject(label);
    labelsGroup.remove(label);
  }
  
  // If there are no points, nothing to render
  if (points.length === 0) return;
  
  // Point material
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  
  // Draw points
  points.forEach((point, index) => {
    const pointGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    
    pointMesh.position.set(point.x, point.y, point.z);
    pointMesh.userData = {
      isCurrentPoint: true,
      pointIndex: index
    };
    
    pointsGroup.add(pointMesh);
  });
  
  // Line material
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
  
  // Connect the points with lines
  if (points.length >= 2) {
    // For length and height measurements, simply connect two points
    if (mode === 'length' || mode === 'height') {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(points[0].x, points[0].y, points[0].z),
        new THREE.Vector3(points[1].x, points[1].y, points[1].z)
      ]);
      
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = { isCurrentLine: true };
      linesGroup.add(line);
      
      // Add measurement label
      if (points.length === 2) {
        const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
        const p2 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
        
        // Calculate midpoint for label placement
        const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        
        let value, labelText;
        if (mode === 'length') {
          // Calculate distance and format label
          value = p1.distanceTo(p2);
          labelText = formatMeasurementLabel(value, 'length');
        } else { // height mode
          // Calculate vertical difference for height
          value = Math.abs(p2.y - p1.y);
          labelText = formatMeasurementLabel(value, 'height');
        }
        
        // Create label
        const labelSprite = createMeasurementLabel(labelText, { x: midpoint.x, y: midpoint.y, z: midpoint.z });
        labelSprite.userData = { 
          isCurrentMeasurement: true,
          measurementType: mode
        };
        
        labelsGroup.add(labelSprite);
      }
    }
    
    // For skylight, chimney, solar - connect all points and close the shape
    else if (['skylight', 'chimney', 'solar', 'area'].includes(mode)) {
      // Create closed polygon for area measurements
      const vertices: THREE.Vector3[] = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
      
      // If area, close the polygon
      if (['area', 'solar'].includes(mode) && points.length >= 3) {
        vertices.push(vertices[0]); // Close the loop
      }
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(vertices);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = { isCurrentLine: true };
      linesGroup.add(line);
      
      // For area measures with at least 3 points, show area label
      if (['area', 'solar'].includes(mode) && points.length >= 3) {
        // Calculate center point of polygon for label placement
        const centerPoint = calculateCentroid(points);
        
        // Calculate area (implemented elsewhere)
        // This is just a placeholder for the real area calculation
        const labelText = `Messung...`;
        
        // Create label
        const labelSprite = createMeasurementLabel(labelText, centerPoint);
        labelSprite.userData = { 
          isCurrentMeasurement: true,
          measurementType: mode
        };
        
        labelsGroup.add(labelSprite);
      }
    }
    
    // For gutter, just connect the two points
    else if (mode === 'gutter') {
      if (points.length === 2) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(points[0].x, points[0].y, points[0].z),
          new THREE.Vector3(points[1].x, points[1].y, points[1].z)
        ]);
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        line.userData = { isCurrentLine: true };
        linesGroup.add(line);
      }
    }
  }
};

/**
 * Renders edit points for measurements being edited
 */
export const renderEditPoints = (
  editPointsGroup: THREE.Group | null,
  measurements: Measurement[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  clearExisting: boolean = true
) => {
  if (!editPointsGroup) return;
  
  // Clear existing edit points if requested
  if (clearExisting) {
    while (editPointsGroup.children.length > 0) {
      const obj = editPointsGroup.children[0];
      safelyDisposeObject(obj);
      editPointsGroup.remove(obj);
    }
  }
  
  // If no measurement is being edited, nothing to render
  if (!editMeasurementId) return;
  
  // Find the measurement being edited
  const measurement = measurements.find(m => m.id === editMeasurementId);
  if (!measurement) return;
  
  // Create edit points for each point in the measurement
  measurement.points.forEach((point, index) => {
    // Point geometry and material
    const isEditingThisPoint = (editingPointIndex === index);
    const pointGeometry = new THREE.SphereGeometry(0.075, 16, 16);
    const pointMaterial = new THREE.MeshBasicMaterial({ 
      color: isEditingThisPoint ? 0xff0000 : 0xffaa00,
      opacity: 0.8,
      transparent: true
    });
    
    const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
    pointMesh.position.set(point.x, point.y, point.z);
    
    // Add user data for interaction
    pointMesh.userData = {
      isEditPoint: true,
      measurementId: measurement.id,
      pointIndex: index,
      point: point
    };
    
    // Make the edit point render above other geometry
    pointMesh.renderOrder = 999;
    
    editPointsGroup.add(pointMesh);
    
    // Add a text label with the point number
    const labelGeometry = new THREE.SphereGeometry(0.04, 16, 16);
    const labelMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x333333,
      opacity: 0.9,
      transparent: true
    });
    
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    
    // Position the label slightly offset from the point
    labelMesh.position.set(
      point.x + 0.05,
      point.y + 0.05,
      point.z + 0.05
    );
    
    // Add user data for interaction
    labelMesh.userData = {
      isEditPointLabel: true,
      measurementId: measurement.id,
      pointIndex: index,
      point: point
    };
    
    // Add the label to the edit points group
    labelMesh.renderOrder = 1000; // Ensure it renders on top
    editPointsGroup.add(labelMesh);
    
    // Add the number as a text sprite
    const numLabel = createMeasurementLabel(`${index + 1}`, {
      x: point.x + 0.15,
      y: point.y + 0.15,
      z: point.z + 0.01
    }, 0.4, 0x000000, 0xffffff);
    
    numLabel.userData = {
      isEditPointLabel: true,
      measurementId: measurement.id,
      pointIndex: index
    };
    
    numLabel.renderOrder = 1001; // Ensure it renders on top of everything
    editPointsGroup.add(numLabel);
  });
};

/**
 * Creates a visual marker for a measured element
 */
export const createElementMarker = (
  measurement: Measurement,
  color: number = 0x00aaff,
  opacity: number = 0.3
) => {
  const { type, points } = measurement;
  
  // Choose marker type based on measurement type
  switch (type) {
    case 'skylight':
    case 'chimney':
    case 'solar':
    case 'area':
      // For area-based measurements, create a semi-transparent fill
      if (points.length < 3) return null;
      
      // Convert points to Vector3
      const vertices = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
      
      // Create a shape from the points
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      
      // Project vertices onto a plane for the shape
      // First, calculate the normal of the polygon
      const v1 = new THREE.Vector3().subVectors(vertices[1], vertices[0]);
      const v2 = new THREE.Vector3().subVectors(vertices[2], vertices[0]);
      const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
      
      // Create a coordinate system in the plane
      const xAxis = v1.normalize();
      const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();
      
      // Project each vertex onto the plane
      const projectedVertices = vertices.map(vertex => {
        const localX = vertex.clone().sub(vertices[0]).dot(xAxis);
        const localY = vertex.clone().sub(vertices[0]).dot(yAxis);
        return { x: localX, y: localY };
      });
      
      // Create the shape using the projected vertices
      shape.moveTo(projectedVertices[0].x, projectedVertices[0].y);
      for (let i = 1; i < projectedVertices.length; i++) {
        shape.lineTo(projectedVertices[i].x, projectedVertices[i].y);
      }
      shape.closePath();
      
      // Create geometry from shape
      const shapeGeometry = new THREE.ShapeGeometry(shape);
      
      // Choose color based on type
      let markerColor;
      if (type === 'skylight') markerColor = 0x33aaff; // Blue for skylights
      else if (type === 'chimney') markerColor = 0xff5533; // Red/orange for chimneys
      else if (type === 'solar') markerColor = 0x00cc66; // Green for solar panels
      else markerColor = color;
      
      // Create material with transparency
      const material = new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: false // Helps with transparency issues
      });
      
      const mesh = new THREE.Mesh(shapeGeometry, material);
      
      // Position and orient the mesh
      // We need to apply the transformation that maps our shape back to 3D space
      const positionMatrix = new THREE.Matrix4();
      positionMatrix.makeBasis(
        xAxis,
        yAxis,
        normal
      );
      positionMatrix.setPosition(vertices[0]);
      
      mesh.applyMatrix4(positionMatrix);
      
      // Add metadata
      mesh.userData = {
        isElementMarker: true,
        measurementId: measurement.id,
        measurementType: type
      };
      
      mesh.renderOrder = 10; // Low render order so it's behind other elements
      
      return mesh;
      
    case 'vent':
    case 'hook':
    case 'other':
      // For point-based elements like vents, hooks, etc.
      if (points.length === 0) return null;
      
      // Create a circular marker
      let markerGeometry;
      let markerMaterial;
      
      if (type === 'vent') {
        // Circular marker for vents
        markerGeometry = new THREE.CircleGeometry(0.2, 32);
        markerMaterial = new THREE.MeshBasicMaterial({
          color: 0xff5500, // Orange-red for vents
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
      } else if (type === 'hook') {
        // Square marker for hooks
        markerGeometry = new THREE.PlaneGeometry(0.15, 0.15);
        markerMaterial = new THREE.MeshBasicMaterial({
          color: 0xffcc00, // Yellow for hooks
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
      } else {
        // Diamond marker for other elements
        markerGeometry = new THREE.CircleGeometry(0.15, 4);
        markerMaterial = new THREE.MeshBasicMaterial({
          color: 0xaa55ff, // Purple for other elements
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
      }
      
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      
      // Position at the point
      marker.position.set(points[0].x, points[0].y, points[0].z);
      
      // Orient to face the camera (this will need to be updated in a render loop)
      marker.lookAt(new THREE.Vector3(0, 0, 1));
      
      // Add metadata
      marker.userData = {
        isElementMarker: true,
        measurementId: measurement.id,
        measurementType: type,
        needsLookAt: true // Flag to update orientation in render loop
      };
      
      marker.renderOrder = 100; // Higher render order to ensure visibility
      
      return marker;
      
    default:
      // For other types (length, height, etc.), no markers needed
      return null;
  }
};

/**
 * Renders all measurements
 */
export const renderMeasurements = (
  measurementsGroup: THREE.Group | null,
  labelsGroup: THREE.Group | null,
  segmentLabelsGroup: THREE.Group | null,
  measurements: Measurement[],
  clearExisting: boolean = true
) => {
  if (!measurementsGroup || !labelsGroup) return;
  
  // Clear existing measurements if requested
  if (clearExisting) {
    // Remove all measurements
    while (measurementsGroup.children.length > 0) {
      const obj = measurementsGroup.children[0];
      safelyDisposeObject(obj);
      measurementsGroup.remove(obj);
    }
    
    // Remove all labels except current measurement labels
    const permanentLabels = labelsGroup.children.filter(
      child => child.userData && child.userData.isCurrentMeasurement
    );
    
    while (labelsGroup.children.length > 0) {
      const obj = labelsGroup.children[0];
      if (obj.userData && obj.userData.isCurrentMeasurement) {
        continue; // Skip current measurement labels
      }
      safelyDisposeObject(obj);
      labelsGroup.remove(obj);
    }
    
    // Add back the permanent labels
    for (const label of permanentLabels) {
      if (!labelsGroup.children.includes(label)) {
        labelsGroup.add(label);
      }
    }
    
    // Clear segment labels
    if (segmentLabelsGroup) {
      while (segmentLabelsGroup.children.length > 0) {
        const obj = segmentLabelsGroup.children[0];
        safelyDisposeObject(obj);
        segmentLabelsGroup.remove(obj);
      }
    }
  }
  
  // Line material for regular measurements
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00aaff, linewidth: 2 });
  
  // Line material for skylight measurements
  const skylightLineMaterial = new THREE.LineBasicMaterial({ color: 0x33aaff, linewidth: 2 });
  
  // Line material for chimney measurements
  const chimneyLineMaterial = new THREE.LineBasicMaterial({ color: 0xff5533, linewidth: 2 });
  
  // Line material for solar panel measurements
  const solarLineMaterial = new THREE.LineBasicMaterial({ color: 0x00cc66, linewidth: 2 });
  
  // Line material for penetrations (vents, hooks, etc.)
  const penetrationLineMaterial = new THREE.LineBasicMaterial({ color: 0xff5500, linewidth: 2 });
  
  // Render each measurement
  measurements.forEach(measurement => {
    const { id, type, points, visible, value, unit, inclination, segments } = measurement;
    
    // Skip if measurement is explicitly marked as not visible
    if (visible === false) return;
    
    // Choose appropriate line material based on type
    let material;
    switch (type) {
      case 'skylight':
        material = skylightLineMaterial;
        break;
      case 'chimney':
        material = chimneyLineMaterial;
        break;
      case 'solar':
        material = solarLineMaterial;
        break;
      case 'vent':
      case 'hook':
      case 'other':
        material = penetrationLineMaterial;
        break;
      default:
        material = lineMaterial;
    }
    
    // Draw element markers for appropriate types
    if (['skylight', 'chimney', 'solar', 'vent', 'hook', 'other'].includes(type)) {
      const marker = createElementMarker(measurement);
      if (marker) {
        measurementsGroup.add(marker);
      }
    }
    
    // For point-based measurements (vent, hook, other), show a marker icon
    if (['vent', 'hook', 'other'].includes(type) && points.length > 0) {
      const position = points[0];
      
      // Create label to show what was measured
      const labelText = measurement.label || 
        (type === 'vent' ? 'Lüfter' : type === 'hook' ? 'Dachhaken' : 'Einbau');
      
      const labelSprite = createMeasurementLabel(labelText, {
        x: position.x,
        y: position.y + 0.2, // Position above the marker
        z: position.z
      });
      
      labelSprite.userData = { 
        measurementId: id,
        measurementType: type
      };
      
      labelsGroup.add(labelSprite);
      
      // No need to draw lines for point-based measurements
      return;
    }
    
    // Standard measurements (length, height, area, etc.)
    if (points.length >= 2) {
      let vertices: THREE.Vector3[];
      
      // For area measurements, close the loop
      if (['area', 'solar', 'skylight', 'chimney'].includes(type) && points.length >= 3) {
        vertices = [
          ...points.map(p => new THREE.Vector3(p.x, p.y, p.z)),
          new THREE.Vector3(points[0].x, points[0].y, points[0].z) // Close the loop
        ];
      } else {
        vertices = points.map(p => new THREE.Vector3(p.x, p.y, p.z));
      }
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(vertices);
      const line = new THREE.Line(lineGeometry, material);
      
      line.userData = { 
        measurementId: id,
        measurementType: type
      };
      
      measurementsGroup.add(line);
      
      // Add measurement label
      let labelPosition: Point;
      let labelText = '';
      
      if (type === 'length' || type === 'height' || type === 'gutter') {
        // For length/height/gutter, place label at midpoint
        const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
        const p2 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
        const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        
        labelPosition = { x: midpoint.x, y: midpoint.y, z: midpoint.z };
        
        // Include inclination in label if available
        if (inclination !== undefined && Math.abs(inclination) > 0.001) {
          labelText = `${value.toFixed(2)} ${unit || 'm'} (${Math.abs(inclination).toFixed(1)}°)`;
        } else {
          labelText = `${value.toFixed(2)} ${unit || 'm'}`;
        }
      } else if (type === 'area' || type === 'solar') {
        // For area/solar, place label at centroid
        labelPosition = calculateCentroid(points);
        labelText = `${value.toFixed(2)} ${unit || 'm²'}`;
      } else if (type === 'skylight' || type === 'chimney') {
        // For skylight/chimney, place label at centroid
        labelPosition = calculateCentroid(points);
        
        // Use the provided label or generate a default
        labelText = measurement.label || `${type === 'skylight' ? 'Dachfenster' : 'Kamin'}`;
      }
      
      // Create the label sprite
      const labelSprite = createMeasurementLabel(labelText, labelPosition);
      
      labelSprite.userData = { 
        measurementId: id,
        measurementType: type
      };
      
      labelsGroup.add(labelSprite);
      
      // Add segment labels for area measurements
      if (segmentLabelsGroup && (type === 'area' || type === 'solar') && segments) {
        segments.forEach((segment, index) => {
          const segmentMidpoint = calculateMidpoint(segment.start, segment.end);
          const segmentLabel = createMeasurementLabel(
            `${segment.length.toFixed(2)} m`,
            segmentMidpoint,
            0.6, // Smaller font size for segment labels
            0x000000, // Black text
            0xffffff, // White background
            0.7 // Lower opacity
          );
          
          segmentLabel.userData = {
            measurementId: id,
            segmentIndex: index,
            isSegmentLabel: true
          };
          
          segmentLabelsGroup.add(segmentLabel);
        });
      }
    }
  });
};
