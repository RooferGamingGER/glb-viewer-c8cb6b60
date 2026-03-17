/**
 * SunLight — Sole light source for sun simulation
 * Removes envMaps from materials so only our directional light illuminates the scene.
 * Manages shadow mapping, frustum, and mesh shadow settings.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SunLightProps {
  active: boolean;
  position: THREE.Vector3;
  intensity: number;
  ambientIntensity: number;
  target?: THREE.Vector3;
}

// Store original envMaps so we can restore them
const savedEnvMaps = new WeakMap<THREE.Material, THREE.Texture | null>();

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
  const frustumConfiguredRef = useRef(false);

  // Determine shadow map resolution based on device
  const getShadowMapSize = useCallback(() => {
    const maxSize = gl.capabilities.maxTextureSize;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) return Math.min(1024, maxSize);
    return Math.min(2048, maxSize);
  }, [gl]);

  // Configure renderer shadow map
  useEffect(() => {
    if (!active) return;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.shadowMap.needsUpdate = true;
  }, [active, gl]);

  // Strip envMap from all materials when active (GLB models bake lighting via envMap)
  // This ensures only our directional light controls brightness & shadows
  useEffect(() => {
    if (!active) return;

    const strippedMaterials: THREE.MeshStandardMaterial[] = [];

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial && mat.envMap) {
            savedEnvMaps.set(mat, mat.envMap);
            mat.envMap = null;
            mat.envMapIntensity = 0;
            mat.needsUpdate = true;
            strippedMaterials.push(mat);
          }
        });
      }
    });

    return () => {
      // Restore envMaps when deactivated
      strippedMaterials.forEach((mat) => {
        const saved = savedEnvMaps.get(mat);
        if (saved !== undefined) {
          mat.envMap = saved;
          mat.envMapIntensity = 1;
          mat.needsUpdate = true;
        }
      });
    };
  }, [active, scene]);

  // Enable castShadow/receiveShadow on all model meshes
  useEffect(() => {
    if (!active) return;

    const meshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const isMeasurement = obj.userData?.isMeasurement ||
          obj.parent?.userData?.isMeasurement ||
          obj.name?.includes('measurement') ||
          obj.name?.includes('label') ||
          obj.name?.includes('points') ||
          obj.name?.includes('lines');

        if (!isMeasurement) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          meshes.push(obj);
        }
      }
    });

    return () => {
      meshes.forEach((obj) => {
        if (obj.parent) {
          obj.castShadow = false;
          obj.receiveShadow = false;
        }
      });
    };
  }, [active, scene]);

  // Configure shadow camera frustum from model bounding box
  const configureShadowCamera = useCallback(() => {
    const light = directionalRef.current;
    if (!light || !active) return;

    const box = new THREE.Box3();
    let hasMeshes = false;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && !obj.userData?.isMeasurement &&
        !obj.name?.includes('measurement') && !obj.name?.includes('label')) {
        box.expandByObject(obj);
        hasMeshes = true;
      }
    });

    if (!hasMeshes || box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const frustumSize = Math.max(maxDim * 1.5, 10);

    const cam = light.shadow.camera;
    cam.left = -frustumSize;
    cam.right = frustumSize;
    cam.top = frustumSize;
    cam.bottom = -frustumSize;
    cam.near = 0.1;
    cam.far = maxDim * 5;
    cam.updateProjectionMatrix();

    // Point light target at model center
    light.target.position.copy(center);
    light.target.updateMatrixWorld();

    const mapSize = getShadowMapSize();
    light.shadow.mapSize.set(mapSize, mapSize);
    light.shadow.bias = -0.001;
    light.shadow.normalBias = 0.05;

    // Force shadow map regeneration
    if (light.shadow.map) {
      light.shadow.map.dispose();
      light.shadow.map = null as any;
    }
    gl.shadowMap.needsUpdate = true;

    frustumConfiguredRef.current = true;
  }, [active, scene, gl, getShadowMapSize]);

  // Configure frustum once when activated
  useEffect(() => {
    if (!active) {
      frustumConfiguredRef.current = false;
      return;
    }
    // Delay to ensure model meshes are loaded
    const timer = setTimeout(() => configureShadowCamera(), 500);
    return () => clearTimeout(timer);
  }, [active, configureShadowCamera]);

  // Update light each frame
  useFrame(() => {
    if (!active || !directionalRef.current) return;

    const light = directionalRef.current;
    light.position.copy(position);
    light.intensity = intensity;

    if (!frustumConfiguredRef.current) {
      configureShadowCamera();
    }

    if (ambientRef.current) {
      ambientRef.current.intensity = ambientIntensity;
    }
  });

  if (!active) return null;

  return (
    <>
      <directionalLight
        ref={directionalRef}
        position={[position.x, position.y, position.z]}
        intensity={intensity}
        castShadow
        color={0xfff4e0}
      />
      {directionalRef.current && (
        <primitive object={directionalRef.current.target} />
      )}
      <ambientLight
        ref={ambientRef}
        intensity={ambientIntensity}
        color={0xe8f0ff}
      />
    </>
  );
};

export default SunLight;
