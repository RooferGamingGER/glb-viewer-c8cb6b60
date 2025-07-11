import { Measurement, Point, Point2D } from '../types/measurements';
import * as THREE from 'three';

/**
 * Projects 3D points onto a 2D plane
 * This creates a normalized 2D representation of a measurement
 */
export const projectPointsTo2D = (points: Point[]): Point2D[] => {
  if (points.length < 3) {
    console.error('Need at least 3 points to create a 2D projection');
    return [];
  }

  // Calculate the normal vector to determine the plane
  const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
  const p2 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
  const p3 = new THREE.Vector3(points[2].x, points[2].y, points[2].z);
  
  const v1 = new THREE.Vector3().subVectors(p2, p1);
  const v2 = new THREE.Vector3().subVectors(p3, p1);
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  
  // Define the projection plane
  // We'll use the first point as our origin
  const origin = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
  
  // Create primary axes for our 2D coordinate system
  // First axis: normalized vector from p1 to p2
  const xAxis = new THREE.Vector3().subVectors(p2, p1).normalize();
  
  // Second axis: perpendicular to both normal and xAxis
  const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();
  
  // Project all points onto this 2D coordinate system
  const projected2D: Point2D[] = [];
  
  // Find bounds for normalization
  let minX = Number.MAX_VALUE;
  let minY = Number.MAX_VALUE;
  let maxX = Number.MIN_VALUE;
  let maxY = Number.MIN_VALUE;
  
  // First pass: calculate raw 2D coordinates
  const raw2D: Point2D[] = [];
  for (const point of points) {
    const p = new THREE.Vector3(point.x, point.y, point.z);
    const relativePos = new THREE.Vector3().subVectors(p, origin);
    
    // Project onto our 2D axes
    const x = relativePos.dot(xAxis);
    const y = relativePos.dot(yAxis);
    
    raw2D.push({ x, y });
    
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  
  // Calculate ranges for normalization
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const maxRange = Math.max(rangeX, rangeY);
  
  // Second pass: normalize coordinates to 0-1 range
  // We'll scale based on the max dimension to keep aspect ratio
  for (const point of raw2D) {
    // Add a padding of 10%
    const x = (point.x - minX) / (maxRange * 1.2) + 0.1;
    const y = (point.y - minY) / (maxRange * 1.2) + 0.1;
    projected2D.push({ x, y });
  }
  
  return projected2D;
};

/**
 * Renders a measurement as a 2D polygon on a canvas
 * Returns a base64 data URL of the rendered polygon
 */
export const renderPolygon2D = (measurement: Measurement, width = 800, height = 600): string => {
  if (!measurement || !measurement.points || measurement.points.length < 3) {
    console.error('Invalid measurement for 2D rendering');
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
    
    // Project 3D points to 2D
    const points2D = projectPointsTo2D(measurement.points);
    
    if (points2D.length < 3) {
      console.error('Failed to project points to 2D');
      return '';
    }
    
    // Draw the polygon
    ctx.beginPath();
    
    // Start at the first point
    ctx.moveTo(points2D[0].x * width, points2D[0].y * height);
    
    // Connect all points
    for (let i = 1; i < points2D.length; i++) {
      ctx.lineTo(points2D[i].x * width, points2D[i].y * height);
    }
    
    // Close the polygon
    ctx.closePath();
    
    // Fill with a semi-transparent color
    ctx.fillStyle = 'rgba(0, 128, 255, 0.2)';
    ctx.fill();
    
    // Draw the outline
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0066cc';
    ctx.stroke();
    
    // Draw the segments and labels
    if (measurement.segments) {
      for (let i = 0; i < measurement.segments.length; i++) {
        const segment = measurement.segments[i];
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
          
          // Draw the segment line
          ctx.beginPath();
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ff6600';
          ctx.stroke();
          
          // Draw the length label
          const midX = (p1.x + p2.x) / 2 * width;
          const midY = (p1.y + p2.y) / 2 * height;
          
          ctx.font = '12px Arial';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${segment.length.toFixed(2)} m`, midX, midY - 10);
        }
      }
    }
    
    // Draw the area label
    const centerX = points2D.reduce((sum, p) => sum + p.x, 0) / points2D.length * width;
    const centerY = points2D.reduce((sum, p) => sum + p.y, 0) / points2D.length * height;
    
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Fläche: ${measurement.value.toFixed(2)} m²`, centerX, centerY);
    
    if (measurement.description) {
      ctx.font = '12px Arial';
      ctx.fillText(measurement.description, centerX, centerY + 20);
    }
    
    // Draw vertices
    points2D.forEach((point, index) => {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0066cc';
      ctx.fill();
      
      // Vertex numbers
      ctx.font = '10px Arial';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${index + 1}`, point.x * width, point.y * height - 10);
    });
    
    // Convert to base64
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error rendering 2D polygon:', error);
    return '';
  }
};