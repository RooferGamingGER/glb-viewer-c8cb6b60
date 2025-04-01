import * as THREE from 'three';
import { Measurement, Point, Point2D, Segment } from '@/types/measurements';
import { projectPointsTo2D } from './renderPolygon2D';
import { calculatePolygonArea } from './measurementCalculations';

/**
 * Calculate the normal vector of a polygon
 */
function calculateNormalVector(points: Point[]): THREE.Vector3 {
  if (points.length < 3) {
    // Default to upward normal if not enough points
    return new THREE.Vector3(0, 1, 0);
  }
  
  // Create vectors from first point to second and third points
  const v1 = new THREE.Vector3(
    points[1].x - points[0].x,
    points[1].y - points[0].y,
    points[1].z - points[0].z
  );
  
  const v2 = new THREE.Vector3(
    points[2].x - points[0].x,
    points[2].y - points[0].y,
    points[2].z - points[0].z
  );
  
  // Calculate cross product to get normal vector
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  
  return normal;
}

/**
 * Calculate distance between two 3D points
 */
function calculateDistanceBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Get colors for different measurement types
 */
function getMeasurementColors(type: string): { fill: string; stroke: string; label: string } {
  switch (type) {
    case 'solar':
      return {
        fill: 'rgba(0, 128, 255, 0.3)',
        stroke: 'rgba(0, 128, 255, 0.8)',
        label: '#0066cc'
      };
    case 'skylight':
      return {
        fill: 'rgba(255, 165, 0, 0.3)',
        stroke: 'rgba(255, 165, 0, 0.8)',
        label: '#cc7000'
      };
    case 'chimney':
      return {
        fill: 'rgba(139, 69, 19, 0.3)',
        stroke: 'rgba(139, 69, 19, 0.8)',
        label: '#663300'
      };
    case 'area':
    default:
      return {
        fill: 'rgba(76, 175, 80, 0.3)',
        stroke: 'rgba(76, 175, 80, 0.8)',
        label: '#2e7d32'
      };
  }
}

/**
 * Renders a polygonal measurement to a 2D canvas with labels.
 */
export function render2DPolygonToCanvas(
  ctx: CanvasRenderingContext2D, 
  measurement: Measurement,
  points2D: Point2D[],
  width: number,
  height: number,
  options: {
    fillColor?: string;
    strokeColor?: string;
    labelColor?: string;
    drawPoints?: boolean;
    drawSegmentLabels?: boolean;
    drawAreaLabel?: boolean;
    drawPointLabels?: boolean;
    pointSize?: number;
  } = {}
): void {
  if (!points2D || points2D.length < 3) return;
  
  // Set default options
  const defaultOptions = {
    fillColor: 'rgba(76, 175, 80, 0.3)',
    strokeColor: 'rgba(76, 175, 80, 0.8)',
    labelColor: '#333333',
    drawPoints: true,
    drawSegmentLabels: true,
    drawAreaLabel: true,
    drawPointLabels: false,
    pointSize: 3
  };
  
  // Merge with provided options
  options = { ...defaultOptions, ...options };
  
  // Find the range of coordinates
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  points2D.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  
  // Apply padding to ensure all elements are visible within canvas
  const padding = 0.1; // 10% padding
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  
  const paddedMinX = minX - rangeX * padding;
  const paddedMinY = minY - rangeY * padding;
  const paddedMaxX = maxX + rangeX * padding;
  const paddedMaxY = maxY + rangeY * padding;
  
  const paddedRangeX = paddedMaxX - paddedMinX;
  const paddedRangeY = paddedMaxY - paddedMinY;
  
  // Calculate scale to fit in canvas
  const scaleX = width / paddedRangeX;
  const scaleY = height / paddedRangeY;
  const scale = Math.min(scaleX, scaleY);
  
  // Helper functions to convert coordinates
  const toCanvasX = (x: number) => ((x - paddedMinX) / paddedRangeX) * width;
  const toCanvasY = (y: number) => ((y - paddedMinY) / paddedRangeY) * height;
  
  // Draw the polygon
  ctx.beginPath();
  ctx.moveTo(toCanvasX(points2D[0].x), toCanvasY(points2D[0].y));
  
  for (let i = 1; i < points2D.length; i++) {
    ctx.lineTo(toCanvasX(points2D[i].x), toCanvasY(points2D[i].y));
  }
  
  ctx.closePath();
  
  // Fill the polygon
  ctx.fillStyle = options.fillColor || 'rgba(76, 175, 80, 0.3)';
  ctx.fill();
  
  // Stroke the polygon
  ctx.strokeStyle = options.strokeColor || 'rgba(76, 175, 80, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw the points
  if (options.drawPoints) {
    const pointSize = options.pointSize || 3;
    
    for (let i = 0; i < points2D.length; i++) {
      const point = points2D[i];
      const canvasX = toCanvasX(point.x);
      const canvasY = toCanvasY(point.y);
      
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, pointSize, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
    }
  }
  
  // Draw segment labels (distances between consecutive points)
  if (options.drawSegmentLabels && measurement.segments) {
    ctx.fillStyle = options.labelColor || '#333333';
    // Increase the font size for segment measurements from 12px to 16px
    ctx.font = 'bold 16px Arial';
    
    for (let i = 0; i < measurement.segments.length; i++) {
      const segment = measurement.segments[i];
      
      // Check if we have points in this segment
      if (!segment.points || segment.points.length !== 2) continue;
      
      // Get the start and end points
      const start2D = points2D.find(
        p => p.x === segment.points[0].x && p.y === segment.points[0].y
      );
      const end2D = points2D.find(
        p => p.x === segment.points[1].x && p.y === segment.points[1].y
      );
      
      // Skip if we can't find the points
      if (!start2D || !end2D) continue;
      
      const midX = toCanvasX((start2D.x + end2D.x) / 2);
      const midY = toCanvasY((start2D.y + end2D.y) / 2);
      
      // Calculate offset direction to prevent labels from appearing directly on the line
      const dx = end2D.x - start2D.x;
      const dy = end2D.y - start2D.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length === 0) continue; // Skip zero-length segments
      
      // Create perpendicular vector for offset
      const offsetX = -dy / length * 15; // Increase offset slightly from 10 to 15
      const offsetY = dx / length * 15;
      
      // Format the measurement value (round to 2 decimal places)
      let labelText;
      if (segment.length) {
        // Use provided segment length if available
        labelText = `${segment.length.toFixed(2)}m`;
      } else if (segment.length !== undefined) {
        // Otherwise use the calculated length
        labelText = `${segment.length.toFixed(2)}m`;
      } else {
        // Fallback to calculating distance
        const distance = calculateDistanceBetweenPoints(
          segment.points[0],
          segment.points[1]
        );
        labelText = `${distance.toFixed(2)}m`;
      }
      
      // If segment has a label, use it
      if (segment.label) {
        labelText = `${segment.label}: ${labelText}`;
      }
      
      // Draw the text with offset to not overlap the line
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, midX + offsetX, midY + offsetY);
    }
  }
  
  // Draw area label
  if (options.drawAreaLabel) {
    let labelText = '';
    
    // Use the measurement's value if available
    if (measurement.value !== undefined) {
      labelText = `Fläche: ${measurement.value.toFixed(2)}m²`;
    } else {
      // Calculate area from 3D points
      const area = calculatePolygonArea(measurement.points);
      labelText = `Fläche: ${area.toFixed(2)}m²`;
    }
    
    // Add material information for solar measurements
    if (measurement.type === 'solar' && measurement.label) {
      labelText += `\nMaterial: ${measurement.label}`;
    }
    
    const centerX = points2D.reduce((sum, p) => sum + p.x, 0) / points2D.length;
    const centerY = points2D.reduce((sum, p) => sum + p.y, 0) / points2D.length;
    
    ctx.fillStyle = options.labelColor || '#333333';
    // Increase the font size for area measurements from 14px to 18px
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Handle multiline text
    if (labelText.includes('\n')) {
      const lines = labelText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], toCanvasX(centerX), toCanvasY(centerY) + (i - 0.5) * 20);
      }
    } else {
      ctx.fillText(labelText, toCanvasX(centerX), toCanvasY(centerY));
    }
  }
  
  // Draw point labels (coordinates or indices)
  if (options.drawPointLabels) {
    ctx.fillStyle = options.labelColor || '#333333';
    // Increase the font size for point labels from 10px to 14px
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    
    for (let i = 0; i < points2D.length; i++) {
      const point = points2D[i];
      const canvasX = toCanvasX(point.x);
      const canvasY = toCanvasY(point.y);
      
      // Draw point index with small offset
      ctx.fillText(`${i + 1}`, canvasX + 10, canvasY - 5);
    }
  }
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
  // Calculate scale bar length (aim for a reasonable fraction of canvas width)
  let scaleBarMeters = 1; // Default 1 meter
  
  // Adjust scale bar length based on the range of the roof
  if (rangeX > 20) {
    scaleBarMeters = 5;
  } else if (rangeX > 10) {
    scaleBarMeters = 2;
  }
  
  const scaleBarLengthPixels = scaleBarMeters * scale;
  
  // Position in bottom right with some padding
  const startX = width - 30 - scaleBarLengthPixels;
  const endX = width - 30;
  const barY = height - 30;
  
  // Draw the scale bar
  ctx.beginPath();
  ctx.moveTo(startX, barY);
  ctx.lineTo(endX, barY);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000000';
  ctx.stroke();
  
  // Draw small vertical lines at the ends
  ctx.beginPath();
  ctx.moveTo(startX, barY - 5);
  ctx.lineTo(startX, barY + 5);
  ctx.moveTo(endX, barY - 5);
  ctx.lineTo(endX, barY + 5);
  ctx.stroke();
  
  // Label the scale bar
  ctx.fillStyle = '#000000';
  // Increase font size for scale indicator from 12px to 16px
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${scaleBarMeters}m`, (startX + endX) / 2, barY + 8);
}

/**
 * Renders a roof plan from measurements to a canvas
 */
export function renderRoofPlanToCanvas(
  canvas: HTMLCanvasElement,
  measurements: Measurement[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Filter out measurements to display on the roof plan
  const roofMeasurements = measurements.filter(m => 
    ['area', 'solar', 'skylight', 'chimney'].includes(m.type) && m.points.length >= 3
  );
  
  if (roofMeasurements.length === 0) {
    // Display message if no valid measurements
    ctx.fillStyle = '#666666';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Keine Dachmessungen vorhanden', width / 2, height / 2);
    return;
  }
  
  // Get the normal vector of the first measurement to use for projecting all measurements
  const firstMeasurement = roofMeasurements[0];
  const normal = calculateNormalVector(firstMeasurement.points);
  
  // Project all measurements to 2D using the same normal
  const allProjectedMeasurements = roofMeasurements.map(m => ({
    measurement: m,
    points2D: projectPointsTo2D(m.points, normal)
  }));
  
  // Find the overall bounds of all projected measurements
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  allProjectedMeasurements.forEach(({ points2D }) => {
    points2D.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
  });
  
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  
  // Add padding around the plan
  const padding = 0.1; // 10% padding
  const paddedMinX = minX - rangeX * padding;
  const paddedMinY = minY - rangeY * padding;
  const paddedMaxX = maxX + rangeX * padding;
  const paddedMaxY = maxY + rangeY * padding;
  
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
  
  // Render each measurement
  allProjectedMeasurements.forEach(({ measurement, points2D }) => {
    const colors = getMeasurementColors(measurement.type);
    
    render2DPolygonToCanvas(ctx, measurement, points2D, width, height, {
      fillColor: colors.fill,
      strokeColor: colors.stroke,
      labelColor: colors.label,
      drawPoints: true,
      drawSegmentLabels: true,
      drawAreaLabel: true,
      pointSize: 4 // Increased from 3 to 4 for better visibility
    });
  });
}

/**
 * Renders a roof plan to a data URL
 */
export function renderRoofPlanToDataURL(
  measurements: Measurement[],
  width: number = 800,
  height: number = 600
): string {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  // Render the roof plan to the canvas
  renderRoofPlanToCanvas(canvas, measurements);
  
  // Convert the canvas to a data URL
  return canvas.toDataURL('image/png');
}

/**
 * Creates a combined roof plan image with optimized dimensions for PDF export
 */
export function createCombinedRoofPlan(
  measurements: Measurement[],
  width: number = 1200,
  height: number = 900,
  padding: number = 0.1,
  topDown: boolean = true
): string {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  // Render the roof plan to the canvas
  renderRoofPlanToCanvas(canvas, measurements);
  
  // Convert the canvas to a data URL
  return canvas.toDataURL('image/png');
}
