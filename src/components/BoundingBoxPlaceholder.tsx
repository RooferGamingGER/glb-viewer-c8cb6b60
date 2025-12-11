import React, { useMemo } from 'react';
import * as THREE from 'three';

interface BoundingBoxPlaceholderProps {
  estimatedSize?: number; // Estimated model size in meters
  visible?: boolean;
}

export const BoundingBoxPlaceholder: React.FC<BoundingBoxPlaceholderProps> = ({
  estimatedSize = 5,
  visible = true,
}) => {
  const geometry = useMemo(() => {
    return new THREE.BoxGeometry(estimatedSize, estimatedSize * 0.6, estimatedSize);
  }, [estimatedSize]);

  const edges = useMemo(() => {
    return new THREE.EdgesGeometry(geometry);
  }, [geometry]);

  if (!visible) return null;

  return (
    <group>
      {/* Wireframe box */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial 
          color="#6366f1" 
          transparent 
          opacity={0.4}
          linewidth={1}
        />
      </lineSegments>
      
      {/* Subtle filled box for depth perception */}
      <mesh geometry={geometry}>
        <meshBasicMaterial 
          color="#6366f1" 
          transparent 
          opacity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ground plane indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -estimatedSize * 0.3, 0]}>
        <planeGeometry args={[estimatedSize * 1.5, estimatedSize * 1.5]} />
        <meshBasicMaterial 
          color="#6366f1" 
          transparent 
          opacity={0.03}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Grid helper */}
      <gridHelper 
        args={[estimatedSize * 2, 10, '#6366f1', '#6366f1']} 
        position={[0, -estimatedSize * 0.3, 0]}
      >
        <lineBasicMaterial transparent opacity={0.1} />
      </gridHelper>
    </group>
  );
};

export default BoundingBoxPlaceholder;
