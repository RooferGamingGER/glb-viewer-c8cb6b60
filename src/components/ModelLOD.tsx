
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { GLTF } from 'three-stdlib';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier';
import { getDetailLevel, simplifyGeometry } from '@/utils/lodUtils';

type GLTFResult = GLTF & {
  nodes: { [key: string]: THREE.Mesh };
  materials: { [key: string]: THREE.Material };
};

interface ModelLODProps {
  url: string; 
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}

const ModelLOD: React.FC<ModelLODProps> = ({ 
  url, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  scale = 1
}) => {
  const { scene, camera } = useThree();
  const { scene: gltfScene } = useGLTF(url) as GLTFResult;
  const modelRef = useRef<THREE.Group>(null);
  const [lodLevel, setLodLevel] = useState<number>(1);
  const distanceRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  
  // Klone die Szene für Modifikationen
  const clonedScene = useRef<THREE.Group | null>(null);
  const lodModels = useRef<Map<number, THREE.Group>>(new Map());
  
  // Erstelle verschiedene LOD-Stufen des Modells
  useEffect(() => {
    if (!gltfScene) return;
    
    // Erstelle eine Kopie der Original-Szene für die höchste LOD-Stufe
    clonedScene.current = gltfScene.clone();
    lodModels.current.set(1.0, clonedScene.current);
    
    // Erstelle verschiedene vereinfachte Versionen für LOD
    const createLodModel = (level: number) => {
      const lodModel = gltfScene.clone();
      
      // Finde alle Meshes im Modell und vereinfache sie
      lodModel.traverse((object) => {
        if (object instanceof THREE.Mesh && object.geometry) {
          const simplifiedGeometry = simplifyGeometry(object.geometry, level);
          object.geometry = simplifiedGeometry;
          
          // Optional: Reduziere auch die Texturqualität bei niedrigen LOD-Stufen
          if (object.material) {
            const materials = Array.isArray(object.material) 
              ? object.material 
              : [object.material];
              
            materials.forEach(material => {
              if (material.map) {
                material.map.minFilter = THREE.LinearFilter;
                material.map.magFilter = THREE.LinearFilter;
              }
            });
          }
        }
      });
      
      return lodModel;
    };
    
    // Erzeuge verschiedene LOD-Stufen
    const lodLevels = [0.25, 0.5, 0.75];
    lodLevels.forEach(level => {
      const lodModel = createLodModel(level);
      lodModels.current.set(level, lodModel);
    });
    
    // Setze das Initial-Modell auf höchste Qualität
    setLodLevel(1.0);
    
  }, [gltfScene]);
  
  // Aktualisiere LOD basierend auf Kameradistanz
  useFrame(() => {
    if (!modelRef.current || !camera) return;
    
    const currentTime = performance.now();
    
    // LOD nur alle 500ms aktualisieren, um Leistungseinbußen zu vermeiden
    if (currentTime - lastUpdateTimeRef.current < 500) {
      return;
    }
    
    // Berechne Abstand zur Kamera
    const modelPosition = new THREE.Vector3();
    modelRef.current.getWorldPosition(modelPosition);
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const distance = modelPosition.distanceTo(cameraPosition);
    distanceRef.current = distance;
    
    // Bestimme optimales Detail-Level
    const newLodLevel = getDetailLevel(distance);
    
    // Wenn sich das LOD-Level geändert hat, aktualisiere das Modell
    if (Math.abs(newLodLevel - lodLevel) > 0.1) {
      setLodLevel(newLodLevel);
      lastUpdateTimeRef.current = currentTime;
    }
  });
  
  // Aktualisiere das Modell, wenn sich das LOD-Level ändert
  useEffect(() => {
    if (!modelRef.current) return;
    
    // Finde das nächste verfügbare LOD-Level
    const availableLevels = Array.from(lodModels.current.keys()).sort((a, b) => a - b);
    let closestLevel = availableLevels[0];
    
    for (const level of availableLevels) {
      if (level <= lodLevel) {
        closestLevel = level;
      } else {
        break;
      }
    }
    
    // Hole das entsprechende Modell
    const lodModel = lodModels.current.get(closestLevel);
    if (!lodModel) return;
    
    // Entferne alle Child-Objekte
    while (modelRef.current.children.length > 0) {
      modelRef.current.remove(modelRef.current.children[0]);
    }
    
    // Füge das neue LOD-Modell hinzu
    const modelCopy = lodModel.clone();
    modelRef.current.add(modelCopy);
    
  }, [lodLevel]);
  
  // Aufräumfunktion
  useEffect(() => {
    return () => {
      // Räume die gespeicherten LOD-Modelle auf
      lodModels.current.forEach((model) => {
        model.traverse((object) => {
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
      });
      
      lodModels.current.clear();
    };
  }, []);
  
  const scaleValue = Array.isArray(scale) ? scale : [scale, scale, scale];
  
  return (
    <group 
      ref={modelRef} 
      position={position as any} 
      rotation={rotation as any}
      scale={scaleValue as any} 
    />
  );
};

export default ModelLOD;
