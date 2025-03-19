
import { useContext } from 'react';
import { ThreeContext, ThreeContextProps } from '@/components/ModelViewer';
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';
import { renderPolygon2D } from '@/utils/renderPolygon2D';

export const useThreeContext = (): ThreeContextProps => {
  return useContext(ThreeContext);
};

// Helper function to safely cast camera to PerspectiveCamera
export const asPerspectiveCamera = (camera: THREE.Camera | null): THREE.PerspectiveCamera | null => {
  if (camera && camera instanceof THREE.PerspectiveCamera) {
    return camera;
  }
  return null;
};

// Helper function to generate 2D polygon renderings for measurements
export const generatePolygon2D = (measurement: Measurement): string | null => {
  if (!measurement || !measurement.points || measurement.points.length < 3) {
    return null;
  }
  
  try {
    return renderPolygon2D(measurement);
  } catch (error) {
    console.error('Error generating 2D polygon:', error);
    return null;
  }
};

// Helper to calculate optimal camera position for viewing a measurement
export const calculateOptimalCameraPosition = (
  measurement: Measurement,
  distanceMultiplier: number = 2.0
): { position: THREE.Vector3; target: THREE.Vector3 } | null => {
  if (!measurement || !measurement.points || measurement.points.length < 3) {
    return null;
  }

  try {
    // Calculate the center point
    const center = new THREE.Vector3();
    measurement.points.forEach(point => {
      center.add(new THREE.Vector3(point.x, point.y, point.z));
    });
    center.divideScalar(measurement.points.length);

    // Calculate a good camera position (above the center)
    const cameraPosition = center.clone().add(new THREE.Vector3(0, distanceMultiplier, 0));
    
    return {
      position: cameraPosition,
      target: center
    };
  } catch (error) {
    console.error('Error calculating optimal camera position:', error);
    return null;
  }
};
