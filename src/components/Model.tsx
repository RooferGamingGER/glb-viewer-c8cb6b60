
import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import ModelLOD from './ModelLOD';

interface ModelProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  useLod?: boolean;
}

export const Model: React.FC<ModelProps> = ({ 
  url, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1,
  useLod = true
}) => {
  // Verwende LOD-Version, wenn aktiviert
  if (useLod) {
    return (
      <ModelLOD 
        url={url} 
        position={position} 
        rotation={rotation} 
        scale={scale}
      />
    );
  }
  
  // Alternativ: Original Modell ohne LOD
  const { scene: model } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  
  // Setze Modell-Eigenschaften
  useEffect(() => {
    if (groupRef.current) {
      // Eine bestehende Gruppe zurücksetzen
      while (groupRef.current.children.length > 0) {
        groupRef.current.remove(groupRef.current.children[0]);
      }
      
      // Kopie des originalen Modells hinzufügen
      const modelCopy = model.clone();
      groupRef.current.add(modelCopy);
    }
    
    return () => {
      // Ressourcen bereinigen
      if (groupRef.current) {
        groupRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            
            if (object.material) {
              const materials = Array.isArray(object.material) 
                ? object.material 
                : [object.material];
                
              materials.forEach(material => {
                material.dispose();
              });
            }
          }
        });
      }
    };
  }, [model, url]);
  
  const scaleValue = Array.isArray(scale) ? scale : [scale, scale, scale];
  
  return (
    <group 
      ref={groupRef} 
      position={position as any} 
      rotation={rotation as any} 
      scale={scaleValue as any} 
    />
  );
};
