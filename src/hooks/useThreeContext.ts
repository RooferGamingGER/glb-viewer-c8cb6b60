
import { useContext } from 'react';
import { ThreeContext, ThreeContextProps } from '@/components/ModelViewer';
import * as THREE from 'three';

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
