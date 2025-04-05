
import React, { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useThreeJsOptimizations } from '@/hooks/useThreeJsOptimizations';
import { useInstancedMeshRenderer } from '@/hooks/useInstancedMeshRenderer';
import { useMeasurements } from '@/hooks/useMeasurements';
import { useThree } from '@react-three/fiber';

interface ThreeJsOptimizerProps {
  enabled?: boolean;
}

/**
 * Component that applies Three.js optimizations automatically
 */
const ThreeJsOptimizer: React.FC<ThreeJsOptimizerProps> = ({ enabled = true }) => {
  const { scene, camera, gl } = useThree();
  const { measurements } = useMeasurements();
  
  // Initialize optimization hooks
  const {
    updateFrustumCulling,
    applyOptimizations
  } = useThreeJsOptimizations(scene, camera, gl, enabled);
  
  const {
    createAllInstancedPVModules,
    updateInstancedMeshVisibility
  } = useInstancedMeshRenderer(scene, enabled, measurements);
  
  // Apply optimizations on initial render
  useEffect(() => {
    if (enabled && scene && camera && gl) {
      applyOptimizations();
      createAllInstancedPVModules();
    }
  }, [enabled, scene, camera, gl, applyOptimizations, createAllInstancedPVModules]);
  
  // Update optimizations when measurements change
  useEffect(() => {
    if (enabled) {
      updateInstancedMeshVisibility();
    }
  }, [enabled, measurements, updateInstancedMeshVisibility]);
  
  // Apply frustum culling on each frame
  useFrame(() => {
    if (enabled) {
      updateFrustumCulling();
    }
  });
  
  // This is a utility component with no visual elements
  return null;
};

export default ThreeJsOptimizer;
