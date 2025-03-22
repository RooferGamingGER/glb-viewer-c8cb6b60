
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface PVModuleModelProps {
  width: number;
  height: number;
  position: THREE.Vector3;
  rotation?: THREE.Euler;
  color?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

const PVModuleModel: React.FC<PVModuleModelProps> = ({
  width,
  height,
  position,
  rotation = new THREE.Euler(),
  color = '#1EAEDB',
  isSelected = false,
  onClick
}) => {
  const moduleRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (!moduleRef.current) return;
    
    // Update module position and rotation
    moduleRef.current.position.copy(position);
    moduleRef.current.rotation.copy(rotation);
    
    // Handle selection state
    const glassPanel = moduleRef.current.getObjectByName('glass') as THREE.Mesh;
    if (glassPanel && glassPanel.material) {
      (glassPanel.material as THREE.MeshStandardMaterial).emissive = 
        isSelected ? new THREE.Color('#8E8EFF') : new THREE.Color('#000000');
      (glassPanel.material as THREE.MeshStandardMaterial).emissiveIntensity = 
        isSelected ? 0.3 : 0;
    }
    
    // Add interaction capabilities
    moduleRef.current.userData.isSelectable = true;
    moduleRef.current.userData.isSelected = isSelected;
    
    if (onClick) {
      moduleRef.current.userData.onClick = onClick;
    }
  }, [position, rotation, isSelected, onClick]);
  
  return (
    <group ref={moduleRef} name="pvModule">
      {/* Module Frame */}
      <mesh name="frame" position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[width, 0.04, height]} />
        <meshStandardMaterial 
          color="#8E9196" 
          roughness={0.5} 
          metalness={0.7}
        />
      </mesh>
      
      {/* Glass Panel (slightly smaller than frame) */}
      <mesh 
        name="glass" 
        position={[0, 0.021, 0]} 
        receiveShadow 
        castShadow
      >
        <boxGeometry args={[width - 0.05, 0.01, height - 0.05]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.9}
          emissive={isSelected ? "#8E8EFF" : "#000000"}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>
      
      {/* Solar Cells Grid */}
      <mesh 
        name="cells" 
        position={[0, 0.022, 0]} 
        receiveShadow
      >
        <boxGeometry args={[width - 0.1, 0.005, height - 0.1]} />
        <meshStandardMaterial 
          color="#1A1F2C"
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>
    </group>
  );
};

export default PVModuleModel;
