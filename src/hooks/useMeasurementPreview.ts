import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Point, Measurement } from '@/types/measurements';
import { calculateDistance, calculateArea } from '@/utils/measurementCalculations';
import { formatMeasurement } from '@/constants/measurements';

/**
 * Hook for managing preview visualizations
 */
export const useMeasurementPreview = (scene: THREE.Scene | null) => {
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const previewGroupRef = useRef<THREE.Group | null>(null);
  
  // Clear preview visualization
  const clearPreviewGroup = useCallback(() => {
    if (!scene) return;
    
    // Find and remove existing preview group
    if (previewGroupRef.current) {
      scene.remove(previewGroupRef.current);
      previewGroupRef.current = null;
    }
  }, [scene]);
  
  // Create a new preview group
  const createPreviewGroup = useCallback(() => {
    if (!scene) return null;
    
    // Clear existing preview
    clearPreviewGroup();
    
    // Create a new group for preview
    const previewGroup = new THREE.Group();
    previewGroup.name = 'previewGroup';
    scene.add(previewGroup);
    
    previewGroupRef.current = previewGroup;
    return previewGroup;
  }, [scene, clearPreviewGroup]);
  
  // Update preview visualization
  const updatePreviewVisualization = useCallback((
    movingPointInfo: {
      measurementId: string;
      pointIndex: number;
      originalPoint: Point;
    } | null,
    measurements: Measurement[]
  ) => {
    if (!scene || !previewPoint) {
      clearPreviewGroup();
      return;
    }
    
    // Clear existing preview
    clearPreviewGroup();
    
    // Create a new group for preview
    const previewGroup = createPreviewGroup();
    if (!previewGroup) return;
    
    // If we're moving a point in an existing measurement
    if (movingPointInfo) {
      const { measurementId, pointIndex } = movingPointInfo;
      const measurement = measurements.find(m => m.id === measurementId);
      
      if (!measurement) return;
      
      // Create a copy of the points with the preview point
      const previewPoints = [...measurement.points];
      previewPoints[pointIndex] = previewPoint;
      
      // Create preview visualization based on measurement type
      if (measurement.type === 'length') {
        // For length measurements, show a line and distance label
        if (previewPoints.length === 2) {
          const [p1, p2] = previewPoints;
          
          // Create line
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(p1.x, p1.y, p1.z),
            new THREE.Vector3(p2.x, p2.y, p2.z)
          ]);
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,
            linewidth: 2
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData = { isUI: true, isPreview: true };
          previewGroup.add(line);
          
          // Create label
          const distance = calculateDistance(p1, p2);
          const labelText = formatMeasurement(distance, 'length');
          
          // Position label at midpoint
          const midpoint = {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2 + 0.2, // Offset slightly above
            z: (p1.z + p2.z) / 2
          };
          
          createTextLabel(labelText, midpoint, previewGroup);
        }
      } 
      else if (measurement.type === 'height') {
        // For height measurements, show a vertical line and height label
        if (previewPoints.length === 2) {
          const [p1, p2] = previewPoints;
          
          // Create vertical line
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(p1.x, p1.y, p1.z),
            new THREE.Vector3(p1.x, p2.y, p1.z) // Vertical projection
          ]);
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,
            linewidth: 2
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          line.userData = { isUI: true, isPreview: true };
          previewGroup.add(line);
          
          // Create label
          const height = Math.abs(p2.y - p1.y);
          const labelText = formatMeasurement(height, 'height');
          
          // Position label at midpoint of vertical line
          const midpoint = {
            x: p1.x,
            y: (p1.y + p2.y) / 2 + 0.2, // Offset slightly
            z: p1.z
          };
          
          createTextLabel(labelText, midpoint, previewGroup);
        }
      }
      else if (measurement.type === 'area' || measurement.type === 'solar') {
        // For area measurements, show a polygon and area label
        if (previewPoints.length >= 3) {
          // Create polygon shape
          const shape = new THREE.Shape();
          shape.moveTo(previewPoints[0].x, previewPoints[0].z);
          
          for (let i = 1; i < previewPoints.length; i++) {
            shape.lineTo(previewPoints[i].x, previewPoints[i].z);
          }
          
          shape.lineTo(previewPoints[0].x, previewPoints[0].z);
          
          // Create geometry from shape
          const geometry = new THREE.ShapeGeometry(shape);
          
          // Adjust vertices to match y-coordinates
          const positionAttribute = geometry.getAttribute('position');
          for (let i = 0; i < positionAttribute.count; i++) {
            const x = positionAttribute.getX(i);
            const z = positionAttribute.getZ(i);
            
            // Find the closest point to determine y
            let minDist = Infinity;
            let y = 0;
            
            for (const point of previewPoints) {
              const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(z - point.z, 2));
              if (dist < minDist) {
                minDist = dist;
                y = point.y;
              }
            }
            
            positionAttribute.setY(i, y);
          }
          
          geometry.computeVertexNormals();
          
          // Create mesh
          const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          mesh.userData = { isUI: true, isPreview: true };
          previewGroup.add(mesh);
          
          // Create wireframe
          const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x00ff00 })
          );
          wireframe.userData = { isUI: true, isPreview: true };
          previewGroup.add(wireframe);
          
          // Create label
          const area = calculateArea(previewPoints);
          const labelText = formatMeasurement(area, 'area');
          
          // Calculate centroid for label position
          const centroid = {
            x: previewPoints.reduce((sum, p) => sum + p.x, 0) / previewPoints.length,
            y: previewPoints.reduce((sum, p) => sum + p.y, 0) / previewPoints.length + 0.3, // Offset above
            z: previewPoints.reduce((sum, p) => sum + p.z, 0) / previewPoints.length
          };
          
          createTextLabel(labelText, centroid, previewGroup);
        }
      }
    }
  }, [scene, previewPoint, clearPreviewGroup, createPreviewGroup]);
  
  // Helper function to create a text label
  const createTextLabel = (text: string, position: Point, parent: THREE.Group) => {
    // Create a canvas for the text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.width = 256;
    canvas.height = 128;
    
    // Draw background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.font = 'bold 36px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.position.set(position.x, position.y, position.z);
    sprite.scale.set(1, 0.5, 1);
    sprite.userData = { isUI: true, isPreview: true };
    
    parent.add(sprite);
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearPreviewGroup();
    };
  }, [clearPreviewGroup]);
  
  return {
    previewPoint,
    setPreviewPoint,
    clearPreviewGroup,
    updatePreviewVisualization
  };
};
