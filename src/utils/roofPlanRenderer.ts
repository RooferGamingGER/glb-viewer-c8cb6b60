import * as THREE from 'three';
import { Measurement, Point, Point2D } from '@/types/measurements';
import { projectPointsTo2D } from './renderPolygon2D';
import { calculateBoundingBox, calculateCentroid } from './measurementCalculations';
import { getMeasurementTypeDisplayName } from '@/constants/measurements';

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
  // Only include area measurements and other relevant types
  const relevantMeasurements = measurements.filter(m => 
    ['area', 'solar', 'skylight', 'chimney'].includes(m.type) && 
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
    const titleAreaHeight = 60; // Increased from ~30px to give more space for larger title
    
    // Adjust the available height for the plan (subtract title area)
    const availableHeight = height - titleAreaHeight;
    
    // Determine the scale factor to fit the plan to the canvas while maintaining aspect ratio
    // Only use the available height after subtracting the title area
    const scaleX = width / paddedRangeX;
    const scaleY = availableHeight / paddedRangeY;
    const scale = Math.min(scaleX, scaleY) * 0.90; // Keep 90% scale factor
    
    // Calculate the centered position
    // For X: center horizontally
    // For Y: push down by titleAreaHeight and then center in remaining space
    const offsetX = (width - paddedRangeX * scale) / 2;
    const offsetY = titleAreaHeight + (availableHeight - paddedRangeY * scale) / 2;
    
    // Helper function to convert 2D coordinates to canvas coordinates
    const toCanvasX = (x: number) => offsetX + (x - paddedMinX) * scale;
    const toCanvasY = (y: number) => offsetY + (y - paddedMinY) * scale;
    
    // Add a title - increased font size for better readability
    ctx.font = 'bold 40px Arial'; // Increased from 30px to 40px
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Dachplan (Draufsicht)', width / 2, 15); // Positioned at top with margin
    
    // Draw scale indicator - made more compact for PDF export
    drawScaleIndicator(ctx, width, height, scale, rangeX);
    
    // Define colors for different measurement types
    const colors: Record<string, { fill: string; stroke: string }> = {
      'area': { fill: 'rgba(0, 128, 255, 0.2)', stroke: '#0066cc' },
      'solar': { fill: 'rgba(0, 180, 0, 0.2)', stroke: '#006600' },
      'skylight': { fill: 'rgba(255, 165, 0, 0.2)', stroke: '#cc7000' },
      'chimney': { fill: 'rgba(180, 0, 0, 0.2)', stroke: '#990000' },
      'default': { fill: 'rgba(200, 200, 200, 0.2)', stroke: '#666666' }
    };
    
    // Draw each measurement
    projectedMeasurements.forEach(({ measurement, points2D, centroid }) => {
      const colorSet = colors[measurement.type] || colors.default;
      
      // Draw the polygon
      ctx.beginPath();
      
      // Start at the first point
      ctx.moveTo(toCanvasX(points2D[0].x), toCanvasY(points2D[0].y));
      
      // Connect all points
      for (let i = 1; i < points2D.length; i++) {
        ctx.lineTo(toCanvasX(points2D[i].x), toCanvasY(points2D[i].y));
      }
      
      // Close the polygon
      ctx.closePath();
      
      // Fill with the type-specific color
      ctx.fillStyle = colorSet.fill;
      ctx.fill();
      
      // Draw the outline
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = colorSet.stroke;
      ctx.stroke();
      
      // Draw the vertices
      points2D.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(toCanvasX(point.x), toCanvasY(point.y), 5, 0, Math.PI * 2);
        ctx.fillStyle = colorSet.stroke;
        ctx.fill();
        
        // Add index numbers to vertices for clearer identification
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), toCanvasX(point.x), toCanvasY(point.y));
      });
      
      // Draw the measurement ID/label in the center
      const labelText = measurement.description || getMeasurementTypeDisplayName(measurement.type);
      const valueText = `${measurement.value.toFixed(2)} m²`;
      
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, toCanvasX(centroid.x), toCanvasY(centroid.y));
      ctx.font = '12px Arial';
      ctx.fillText(valueText, toCanvasX(centroid.x), toCanvasY(centroid.y) + 20);
      
      // Draw length for each segment
      if (measurement.segments) {
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
            
            // Calculate the midpoint of the segment
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            
            // Draw the length value with a background for better readability
            const lengthText = `${segment.length.toFixed(2)}m`;
            
            ctx.font = '12px Arial';
            const textMetrics = ctx.measureText(lengthText);
            const textWidth = textMetrics.width;
            
            // Draw white background box for text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(
              toCanvasX(midX) - textWidth / 2 - 4, 
              toCanvasY(midY) - 8, 
              textWidth + 8, 
              16
            );
            
            // Draw text
            ctx.fillStyle = '#333333';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(lengthText, toCanvasX(midX), toCanvasY(midY));
          }
        }
      }
    });
    
    // Add a legend - more compact for PDF export
    drawLegend(ctx, width, height, colors);
    
    // Convert to base64 with high quality
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    console.error('Error creating combined roof plan:', error);
    return '';
  }
};

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
  
  // Draw background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
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
  
  // Add label
  ctx.font = '12px Arial';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${niceScaleLength} m`, scaleBarX + scaleBarPixelLength / 2, scaleBarY + 8);
  
  // Add "Maßstab" label
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Maßstab:', scaleBarX, scaleBarY - 8);
}

/**
 * Draw a legend for the different measurement types - more compact for PDF export
 */
function drawLegend(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: Record<string, { fill: string; stroke: string }>
): void {
  const legendX = width - 180; // More compact, moved left
  const legendY = 40; // Moved up from 60 to 40
  const itemHeight = 20; // Reduced from 25 to 20
  const legendWidth = 160; // Reduced from 180 to 160
  
  // Define legend items
  const legendItems = [
    { type: 'area', label: 'Dachfläche' },
    { type: 'solar', label: 'Solaranlage' },
    { type: 'skylight', label: 'Dachfenster' },
    { type: 'chimney', label: 'Kamin' }
  ];
  
  const legendHeight = legendItems.length * itemHeight + 30; // Reduced padding
  
  // Draw legend background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
  
  // Draw border
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
  
  // Draw legend title
  ctx.font = 'bold 13px Arial'; // Reduced from 14px to 13px
  ctx.fillStyle = '#333333';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Legende', legendX + legendWidth / 2, legendY + 8); // Reduced top padding
  
  // Draw legend items
  let currentY = legendY + 28; // Reduced spacing
  
  legendItems.forEach(item => {
    const colorSet = colors[item.type] || colors.default;
    
    // Draw color box
    ctx.fillStyle = colorSet.fill;
    ctx.strokeStyle = colorSet.stroke;
    ctx.lineWidth = 1;
    
    ctx.fillRect(legendX + 10, currentY, 18, 14); // Smaller color boxes
    ctx.strokeRect(legendX + 10, currentY, 18, 14);
    
    // Draw label
    ctx.font = '11px Arial'; // Smaller font
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label, legendX + 38, currentY + 7);
    
    currentY += itemHeight;
  });
}
