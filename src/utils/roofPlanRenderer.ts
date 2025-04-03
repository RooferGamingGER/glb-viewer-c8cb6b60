import * as THREE from 'three';
import { Measurement, Point, Point2D } from '@/types/measurements';
import { projectPointsTo2D } from './renderPolygon2D';
import { calculateBoundingBox, calculateCentroid } from './measurementCalculations';
import { getMeasurementTypeDisplayName, getSegmentTypeDisplayName } from '@/utils/exportUtils';

/**
 * Projects all measurements to a common 2D coordinate system
 * @param measurements - Array of measurements to project
 * @param useTopDownView - If true, use a strict top-down projection (ignoring Y axis)
 * @returns Object with projected points and global bounds
 */
export const projectMeasurementsTo2D = (
  measurements: Measurement[], 
  useTopDownView = false
): {
  projectedMeasurements: Array<{
    measurement: Measurement;
    points2D: Point2D[];
    centroid: Point2D;
  }>;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
} => {
  // Include all relevant measurement types: area, solar, skylight, chimney, vent, hook, other
  const relevantMeasurements = measurements.filter(m => 
    ['area', 'solar', 'skylight', 'chimney', 'vent', 'hook', 'other'].includes(m.type) && 
    m.points && 
    m.points.length >= 3
  );
  
  if (relevantMeasurements.length === 0) {
    return {
      projectedMeasurements: [],
      bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }
    };
  }
  
  // If using top-down view, we'll simply use X and Z coordinates directly
  if (useTopDownView) {
    return projectMeasurementsTopDown(relevantMeasurements);
  }
  
  // Otherwise use the original projection method
  // Get the common normal vector for all measurements (assume they're on the same plane)
  // Use the first three points of the first measurement to determine the plane
  const firstMeasurement = relevantMeasurements[0];
  const p1 = new THREE.Vector3(firstMeasurement.points[0].x, firstMeasurement.points[0].y, firstMeasurement.points[0].z);
  const p2 = new THREE.Vector3(firstMeasurement.points[1].x, firstMeasurement.points[1].y, firstMeasurement.points[1].z);
  const p3 = new THREE.Vector3(firstMeasurement.points[2].x, firstMeasurement.points[2].y, firstMeasurement.points[2].z);
  
  const v1 = new THREE.Vector3().subVectors(p2, p1);
  const v2 = new THREE.Vector3().subVectors(p3, p1);
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  
  // Determine if the normal is pointing upwards (assume Y is up)
  const yAxis = new THREE.Vector3(0, 1, 0);
  const normalIsUp = normal.dot(yAxis) > 0;
  
  // If normal is pointing down, flip it
  if (!normalIsUp) {
    normal.negate();
  }
  
  // Create axes for our 2D coordinate system
  const xAxis = new THREE.Vector3(1, 0, 0);
  
  // Use the cross product to find the Z axis (perpendicular to both normal and X)
  const zAxis = new THREE.Vector3().crossVectors(xAxis, normal).normalize();
  
  // Now recalculate X axis to ensure it's perpendicular to both normal and Z
  xAxis.crossVectors(normal, zAxis).normalize();
  
  // Project all measurements to 2D
  const projectedMeasurements: Array<{
    measurement: Measurement;
    points2D: Point2D[];
    centroid: Point2D;
  }> = [];
  
  let minX = Number.MAX_VALUE;
  let minY = Number.MAX_VALUE;
  let maxX = Number.MIN_VALUE;
  let maxY = Number.MIN_VALUE;
  
  for (const measurement of relevantMeasurements) {
    const points2D: Point2D[] = [];
    
    // Project each point to our 2D coordinate system
    for (const point of measurement.points) {
      const p = new THREE.Vector3(point.x, point.y, point.z);
      
      // Project onto our 2D axes (using X and Z as our 2D coordinates)
      const x = p.dot(xAxis);
      const y = p.dot(zAxis);
      
      points2D.push({ x, y });
      
      // Update bounds
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    
    // Calculate centroid of the 2D points
    const centroidX = points2D.reduce((sum, p) => sum + p.x, 0) / points2D.length;
    const centroidY = points2D.reduce((sum, p) => sum + p.y, 0) / points2D.length;
    
    projectedMeasurements.push({
      measurement,
      points2D,
      centroid: { x: centroidX, y: centroidY }
    });
  }
  
  return {
    projectedMeasurements,
    bounds: { minX, minY, maxX, maxY }
  };
};

/**
 * Projects all measurements to a true top-down view (X, Z coordinates)
 * This ignores the Y axis completely for a strict overhead view
 */
const projectMeasurementsTopDown = (measurements: Measurement[]): {
  projectedMeasurements: Array<{
    measurement: Measurement;
    points2D: Point2D[];
    centroid: Point2D;
  }>;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
} => {
  const projectedMeasurements: Array<{
    measurement: Measurement;
    points2D: Point2D[];
    centroid: Point2D;
  }> = [];
  
  let minX = Number.MAX_VALUE;
  let minZ = Number.MAX_VALUE;
  let maxX = Number.MIN_VALUE;
  let maxZ = Number.MIN_VALUE;
  
  // First pass: get the global bounds across all measurements
  for (const measurement of measurements) {
    for (const point of measurement.points) {
      minX = Math.min(minX, point.x);
      minZ = Math.min(minZ, point.z);
      maxX = Math.max(maxX, point.x);
      maxZ = Math.max(maxZ, point.z);
    }
  }
  
  // Now project each measurement to 2D by using X and Z coordinates directly
  for (const measurement of measurements) {
    const points2D: Point2D[] = [];
    
    // For each point, use X as X and Z as Y in the 2D space
    for (const point of measurement.points) {
      points2D.push({ x: point.x, y: point.z });
    }
    
    // Calculate centroid of the 2D points
    const centroidX = points2D.reduce((sum, p) => sum + p.x, 0) / points2D.length;
    const centroidY = points2D.reduce((sum, p) => sum + p.y, 0) / points2D.length;
    
    projectedMeasurements.push({
      measurement,
      points2D,
      centroid: { x: centroidX, y: centroidY }
    });
  }
  
  return {
    projectedMeasurements,
    bounds: { minX, minY: minZ, maxX, maxY: maxZ }
  };
};

/**
 * Creates a combined 2D roof plan of all measurements
 * @param measurements - Array of measurements to include in the plan
 * @param width - Width of the output canvas in pixels
 * @param height - Height of the output canvas in pixels
 * @param padding - Padding around the plan in percentage (0-1)
 * @param useTopDownView - If true, use a strict top-down projection (ignoring Y axis)
 * @returns Base64 data URL of the rendered plan
 */
export const createCombinedRoofPlan = (
  measurements: Measurement[],
  width = 1800,
  height = 1300,
  padding = 0.05,
  useTopDownView = false
): string => {
  if (measurements.length === 0) {
    console.warn('No measurements to create roof plan');
    return '';
  }
  
  try {
    // Create a temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context');
      return '';
    }
    
    // Set the background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Project all measurements to a common 2D coordinate system
    const { projectedMeasurements, bounds } = projectMeasurementsTo2D(measurements, useTopDownView);
    
    if (projectedMeasurements.length === 0) {
      console.warn('No valid measurements to render in roof plan');
      
      // Draw a message on the canvas
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Keine gültigen Flächen zum Rendern vorhanden', width / 2, height / 2);
      
      return canvas.toDataURL('image/png');
    }
    
    // Calculate the range with padding
    const rangeX = bounds.maxX - bounds.minX;
    const rangeY = bounds.maxY - bounds.minY;
    
    const paddedMinX = bounds.minX - rangeX * padding;
    const paddedMaxX = bounds.maxX + rangeX * padding;
    const paddedMinY = bounds.minY - rangeY * padding;
    const paddedMaxY = bounds.maxY + rangeY * padding;
    
    const paddedRangeX = paddedMaxX - paddedMinX;
    const paddedRangeY = paddedMaxY - paddedMinY;
    
    // Define title area height (space for the title)
    const titleAreaHeight = 60;
    
    // Adjust the available height for the plan (subtract title area)
    const availableHeight = height - titleAreaHeight;
    
    // Determine the scale factor to fit the plan to the canvas while maintaining aspect ratio
    const scaleX = width / paddedRangeX;
    const scaleY = availableHeight / paddedRangeY;
    const scale = Math.min(scaleX, scaleY) * 0.90; // Keep 90% scale factor
    
    // Calculate the centered position
    const offsetX = (width - paddedRangeX * scale) / 2;
    const offsetY = titleAreaHeight + (availableHeight - paddedRangeY * scale) / 2;
    
    // Helper function to convert 2D coordinates to canvas coordinates
    const toCanvasX = (x: number) => offsetX + (x - paddedMinX) * scale;
    const toCanvasY = (y: number) => offsetY + (y - paddedMinY) * scale;
    
    // Add a title
    ctx.font = 'bold 44px Arial';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Dachplan (Draufsicht)', width / 2, 15);
    
    // Draw scale indicator
    drawScaleIndicator(ctx, width, height, scale, rangeX);
    
    // Define colors for different measurement types - improved with more distinct colors
    const colors: Record<string, { fill: string; stroke: string }> = {
      'area': { fill: 'rgba(240, 240, 240, 0.3)', stroke: '#666666' },
      'solar': { fill: 'rgba(0, 180, 0, 0.2)', stroke: '#006600' },
      'skylight': { fill: 'rgba(255, 165, 0, 0.3)', stroke: '#cc7000' }, // More vivid for skylights
      'chimney': { fill: 'rgba(180, 0, 0, 0.2)', stroke: '#990000' },
      'vent': { fill: 'rgba(0, 0, 255, 0.2)', stroke: '#0000cc' },  // Added vent
      'hook': { fill: 'rgba(128, 0, 128, 0.2)', stroke: '#800080' }, // Added hook
      'other': { fill: 'rgba(100, 100, 100, 0.2)', stroke: '#555555' }, // Added other
      'default': { fill: 'rgba(200, 200, 200, 0.2)', stroke: '#888888' }
    };
    
    // Define segment type colors - similar to the reference image
    const segmentColors: Record<string, string> = {
      'ridge': '#FF0000', // First - Red
      'first': '#FF0000', // First - Red (alternative name)
      'hip': '#800080',   // Grat - Purple
      'grat': '#800080',  // Grat - Purple (alternative name)
      'valley': '#FF8C00', // Kehle - Orange
      'kehle': '#FF8C00',  // Kehle - Orange (alternative name)
      'eave': '#0000FF',   // Traufe - Blue
      'traufe': '#0000FF', // Traufe - Blue (alternative name)
      'verge': '#008000',  // Ortgang - Green
      'ortgang': '#008000', // Ortgang - Green (alternative name)
      'default': '#666666'  // Default - Gray
    };
    
    // Track all segment types used for the legend
    const usedSegmentTypes = new Set<string>();
    
    // Track all measurement types used for the legend
    const usedMeasurementTypes = new Set<string>();
    
    // First pass: Draw all roof areas (sorted with basic areas first, special elements later)
    const sortOrder = ['area', 'solar', 'skylight', 'chimney', 'vent', 'hook', 'other'];
    
    // Sort the measurements by type
    const sortedMeasurements = [...projectedMeasurements].sort((a, b) => {
      const aIndex = sortOrder.indexOf(a.measurement.type);
      const bIndex = sortOrder.indexOf(b.measurement.type);
      return aIndex - bIndex;
    });
    
    // First pass: Draw all base roof areas
    sortedMeasurements.forEach(({ measurement, points2D }) => {
      if (measurement.type !== 'area') return;
      
      const colorSet = colors[measurement.type] || colors.default;
      usedMeasurementTypes.add(measurement.type);
      
      // Draw the polygon
      ctx.beginPath();
      ctx.moveTo(toCanvasX(points2D[0].x), toCanvasY(points2D[0].y));
      
      for (let i = 1; i < points2D.length; i++) {
        ctx.lineTo(toCanvasX(points2D[i].x), toCanvasY(points2D[i].y));
      }
      
      ctx.closePath();
      
      // Fill with the type-specific color
      ctx.fillStyle = colorSet.fill;
      ctx.fill();
      
      // Draw the outline
      ctx.lineWidth = 2;
      ctx.strokeStyle = colorSet.stroke;
      ctx.stroke();
    });
    
    // Second pass: Draw all special areas (solar, skylight, chimney, etc.)
    sortedMeasurements.forEach(({ measurement, points2D }) => {
      if (measurement.type === 'area') return; // Skip regular areas, already drawn
      
      const colorSet = colors[measurement.type] || colors.default;
      usedMeasurementTypes.add(measurement.type);
      
      // Draw the polygon
      ctx.beginPath();
      ctx.moveTo(toCanvasX(points2D[0].x), toCanvasY(points2D[0].y));
      
      for (let i = 1; i < points2D.length; i++) {
        ctx.lineTo(toCanvasX(points2D[i].x), toCanvasY(points2D[i].y));
      }
      
      ctx.closePath();
      
      // Fill with the type-specific color
      ctx.fillStyle = colorSet.fill;
      ctx.fill();
      
      // Draw the outline - thicker for special elements
      ctx.lineWidth = 3;
      ctx.strokeStyle = colorSet.stroke;
      ctx.stroke();
      
      // Add a hatch pattern for special elements to make them more visible
      if (['skylight', 'chimney', 'vent', 'hook'].includes(measurement.type)) {
        drawHatchPattern(
          ctx, 
          points2D.map(p => ({ x: toCanvasX(p.x), y: toCanvasY(p.y) })),
          colorSet.stroke
        );
      }
    });
    
    // Third pass: Draw all measurement segments
    sortedMeasurements.forEach(({ measurement, points2D }) => {
      if (!measurement.segments) return;
      
      // Draw each segment with type-specific color
      for (let i = 0; i < measurement.segments.length; i++) {
        const segment = measurement.segments[i];
        
        // Find the points in the 2D array
        const p1Index = measurement.points.findIndex(p => 
          p.x === segment.points[0].x && 
          p.y === segment.points[0].y && 
          p.z === segment.points[0].z
        );
        
        const p2Index = measurement.points.findIndex(p => 
          p.x === segment.points[1].x && 
          p.y === segment.points[1].y && 
          p.z === segment.points[1].z
        );
        
        if (p1Index >= 0 && p2Index >= 0 && p1Index < points2D.length && p2Index < points2D.length) {
          const p1 = points2D[p1Index];
          const p2 = points2D[p2Index];
          
          // Draw the segment with type-specific color
          ctx.beginPath();
          ctx.moveTo(toCanvasX(p1.x), toCanvasY(p1.y));
          ctx.lineTo(toCanvasX(p2.x), toCanvasY(p2.y));
          
          // Use segment type color or default
          const segmentType = segment.type?.toLowerCase() || 'default';
          usedSegmentTypes.add(segmentType);
          ctx.strokeStyle = segmentColors[segmentType] || segmentColors.default;
          ctx.lineWidth = 4; // Thicker line for segments
          ctx.stroke();
          
          // Calculate the midpoint of the segment
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          
          // Draw the segment type label if it exists
          if (segment.type) {
            const segmentTypeDisplayName = getSegmentTypeDisplayName(segment.type);
            
            // Draw the segment type with background
            ctx.font = 'bold 14px Arial';
            const typeTextWidth = ctx.measureText(segmentTypeDisplayName).width;
            
            // White background for segment type
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(
              toCanvasX(midX) - typeTextWidth / 2 - 6, 
              toCanvasY(midY) - 28, 
              typeTextWidth + 12,
              20
            );
            
            // Type text
            ctx.fillStyle = segmentColors[segmentType] || segmentColors.default;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(segmentTypeDisplayName, toCanvasX(midX), toCanvasY(midY) - 18);
          }
          
          // Always show length, even if no type or inclination
          const lengthText = segment.inclination !== undefined && Math.abs(segment.inclination) >= 2.0
            ? `${segment.length.toFixed(2)}m / ${Math.abs(segment.inclination).toFixed(1)}°`
            : `${segment.length.toFixed(2)}m`;
          
          ctx.font = 'bold 16px Arial'; // Increased from 14px to 16px for better readability
          const textWidth = ctx.measureText(lengthText).width;
          
          // White background for text
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(
            toCanvasX(midX) - textWidth / 2 - 6, 
            toCanvasY(midY) + 4, 
            textWidth + 12,
            24 // Increased height for larger font
          );
          
          // Draw text with segment color for better visibility
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(lengthText, toCanvasX(midX), toCanvasY(midY) + 16); // Adjusted y position
        }
      }
    });
    
    // Fourth pass: Draw measurement labels, points and areas in the center
    sortedMeasurements.forEach(({ measurement, points2D, centroid }) => {
      // Draw the vertices - INCREASED SIZE for better visibility on A4
      points2D.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(toCanvasX(point.x), toCanvasY(point.y), 10, 0, Math.PI * 2); // Increased from 8 to 10
        ctx.fillStyle = '#666666';
        ctx.fill();
        
        // Add index numbers to vertices - INCREASED SIZE
        ctx.font = 'bold 24px Arial'; // Increased from 20px to 24px
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), toCanvasX(point.x), toCanvasY(point.y));
      });
      
      // Draw the measurement ID/label in the center
      const labelText = measurement.description || getMeasurementTypeDisplayName(measurement.type);
      const valueText = `${measurement.value.toFixed(2)} m²`;
      
      // INCREASED font size for better readability
      ctx.font = 'bold 26px Arial'; // Increased from 24px to 26px
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add a white background behind text for better readability
      const labelWidth = ctx.measureText(labelText).width;
      const valueWidth = ctx.measureText(valueText).width;
      const maxWidth = Math.max(labelWidth, valueWidth);
      
      // Draw white background for label text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(
        toCanvasX(centroid.x) - maxWidth / 2 - 5,
        toCanvasY(centroid.y) - 20,
        maxWidth + 10,
        44  // Increased height for larger font
      );
      
      // Draw label text
      ctx.fillStyle = '#222222';
      ctx.fillText(labelText, toCanvasX(centroid.x), toCanvasY(centroid.y));
      
      // Draw white background for value text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(
        toCanvasX(centroid.x) - maxWidth / 2 - 5,
        toCanvasY(centroid.y) + 24,
        maxWidth + 10,
        36  // Increased height for larger font
      );
      
      // Draw value text - INCREASED SIZE
      ctx.font = 'bold 24px Arial'; // Increased from 22px to 24px
      ctx.fillStyle = '#222222';
      ctx.fillText(valueText, toCanvasX(centroid.x), toCanvasY(centroid.y) + 42); // Adjusted position for larger text
    });
    
    // Add a disclaimer below the plan
    drawDisclaimer(ctx, width, height);
    
    // Convert to base64 with high quality
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Error creating combined roof plan:', error);
    return '';
  }
};

/**
 * Draws a hatch pattern inside a polygon for better visibility of special elements
 */
function drawHatchPattern(
  ctx: CanvasRenderingContext2D,
  points: {x: number, y: number}[],
  color: string,
  spacing = 8
): void {
  if (points.length < 3) return;
  
  // Find the bounding box of the polygon
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  
  // Draw diagonal lines
  ctx.save();
  
  // Create a clipping region for the polygon
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.clip();
  
  // Draw the hatch lines
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  
  const width = maxX - minX;
  const height = maxY - minY;
  const diagonal = Math.sqrt(width * width + height * height);
  
  for (let i = -diagonal; i <= diagonal * 2; i += spacing) {
    ctx.moveTo(minX - height + i, minY - width);
    ctx.lineTo(minX + i, minY + height);
  }
  
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a scale indicator on the canvas
 */
function drawScaleIndicator(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  rangeX: number
): void {
  // Calculate a nice round number for the scale bar (e.g., 1m, 5m, 10m)
  let scaleBarRealLength = 1; // Start with 1 meter
  const idealPixelLength = 100; // Aim for around 100 pixels for the scale bar
  
  const pixelsPerMeter = scale;
  
  // Find a nice round number that makes the scale bar close to the ideal length
  while (scaleBarRealLength * pixelsPerMeter < idealPixelLength / 2) {
    scaleBarRealLength *= 2;
  }
  
  while (scaleBarRealLength * pixelsPerMeter > idealPixelLength * 2) {
    scaleBarRealLength /= 2;
  }
  
  // Round to a nice number (1, 2, 5, 10, etc.)
  const niceNumbers = [1, 2, 5, 10, 20, 50, 100];
  let niceScaleLength = scaleBarRealLength;
  
  for (const num of niceNumbers) {
    if (Math.abs(Math.log(scaleBarRealLength / num)) < Math.abs(Math.log(scaleBarRealLength / niceScaleLength))) {
      niceScaleLength = num;
    }
  }
  
  const scaleBarPixelLength = niceScaleLength * pixelsPerMeter;
  
  // Draw the scale bar - positioned in bottom left corner with less space
  const scaleBarX = 40; // Reduced from 50 to 40
  const scaleBarY = height - 30; // Reduced from 50 to 30
  
  // Draw background with improved opacity
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Increased opacity from 0.8 to 0.9
  ctx.fillRect(scaleBarX - 10, scaleBarY - 25, scaleBarPixelLength + 20, 40); // More compact
  
  // Draw border
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.strokeRect(scaleBarX - 10, scaleBarY - 25, scaleBarPixelLength + 20, 40);
  
  // Draw scale bar
  ctx.beginPath();
  ctx.moveTo(scaleBarX, scaleBarY);
  ctx.lineTo(scaleBarX + scaleBarPixelLength, scaleBarY);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Add tick marks
  for (let i = 0; i <= niceScaleLength; i++) {
    const tickX = scaleBarX + (i / niceScaleLength) * scaleBarPixelLength;
    ctx.beginPath();
    ctx.moveTo(tickX, scaleBarY - 5);
    ctx.lineTo(tickX, scaleBarY + 5);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  
  // Add label with increased font size
  ctx.font = 'bold 16px Arial'; // Increased from 14px to 16px
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${niceScaleLength} m`, scaleBarX + scaleBarPixelLength / 2, scaleBarY + 8);
  
  // Add "Maßstab" label with increased font size
  ctx.font = 'bold 16px Arial'; // Increased from 14px to 16px
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Maßstab:', scaleBarX, scaleBarY - 8);
}

/**
 * Draw a disclaimer note at the bottom of the plan
 */
function drawDisclaimer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const disclaimerText = "Hinweis: Alle Maße dienen der Orientierung und sind vor Ort zu prüfen.";
  
  ctx.font = '14px Arial';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(disclaimerText, width / 2, height - 10);
}
