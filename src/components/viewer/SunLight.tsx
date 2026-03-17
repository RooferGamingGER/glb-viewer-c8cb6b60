/**
 * SunLight — Controllable directional light for sun simulation
 * Manages shadow mapping, frustum, and mesh shadow settings
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SunLightProps {
  active: boolean;
  position: THREE.Vector3;
  intensity: number;
  ambientIntensity: number;
  target?: THREE.Vector3;
}

const SunLight: React.FC<SunLightProps> = ({
  active,
  position,
  intensity,
  ambientIntensity,
  target
}) => {
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const { scene, gl } = useThree();
  const shadowConfiguredRef = useRef(false);

  // Configure shadow map on renderer
  useEffect(() => {
    if (active && !shadowConfiguredRef.current) {
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
      shadowConfiguredRef.current = true;
    }
  }, [active, gl]);

  // Calculate shadow camera frustum from scene bounding box
  const shadowFrustum = useMemo(() => {
    if (!active) return null;
    
    const box = new THREE.Box3();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !obj.userData?.isMeasurement) {
        box.expandByObject(obj);
      }
    });

    if (box.isEmpty()) {
      return { size: 20, near: 0.5, far: 100 };
    }

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const frustumSize = maxDim * 1.5;
    
    return { 
      size: Math.max(frustumSize, 10), 
      near: 0.1, 
      far: maxDim * 4 
    };
  }, [active, scene]);

  // Determine shadow map resolution based on device
  const shadowMapSize = useMemo(() => {
    if (!active) return 1024;
    const maxSize = gl.capabilities.maxTextureSize;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) return Math.min(1024, maxSize);
    return Math.min(2048, maxSize);
  }, [active, gl]);

  // Enable castShadow/receiveShadow on all model meshes
  useEffect(() => {
    if (!active) return;
    
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const isMeasurement = obj.userData?.isMeasurement || 
          obj.parent?.userData?.isMeasurement ||
          obj.name?.includes('measurement') ||
          obj.name?.includes('label');
        
        if (!isMeasurement) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      }
    });

    return () => {
      // Restore when deactivated
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = false;
          obj.receiveShadow = false;
        }
      });
    };
  }, [active, scene]);

  // Update light position smoothly
  useFrame(() => {
    if (!active || !directionalRef.current) return;
    
    const light = directionalRef.current;
    light.position.lerp(position, 0.1);
    light.intensity = THREE.MathUtils.lerp(light.intensity, intensity, 0.1);
    
    if (target) {
      light.target.position.copy(target);
    }
    
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity, 
        ambientIntensity, 
        0.1
      );
    }
  });

  if (!active || !shadowFrustum) return null;

  return (
    <>
      <directionalLight
        ref={directionalRef}
        position={[position.x, position.y, position.z]}
        intensity={intensity}
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-shadowFrustum.size}
        shadow-camera-right={shadowFrustum.size}
        shadow-camera-top={shadowFrustum.size}
        shadow-camera-bottom={-shadowFrustum.size}
        shadow-camera-near={shadowFrustum.near}
        shadow-camera-far={shadowFrustum.far}
        shadow-bias={-0.0005}
        color={new THREE.Color(0xfff4e0)} // warm sunlight
      />
      <ambientLight
        ref={ambientRef}
        intensity={ambientIntensity}
        color={new THREE.Color(0xe8f0ff)} // cool sky ambient
      />
    </>
  );
};

export default SunLight;
