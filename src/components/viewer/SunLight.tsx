/**
 * SunLight — Sole light source for sun simulation
 * - Forces lit materials for GLB meshes (MeshBasic -> MeshStandard)
 * - Re-applies overrides for late-loaded meshes
 * - Keeps renderer shadowMap enabled while active
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface SunLightProps {
  active: boolean;
  position: THREE.Vector3;
  intensity: number;
  ambientIntensity: number;
  elevation: number; // Sun elevation in degrees, used for shadow frustum sizing
}

const materialBackups = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>();

const isModelMesh = (obj: THREE.Object3D): obj is THREE.Mesh => {
  if (!(obj instanceof THREE.Mesh)) return false;
  if (obj.userData?.isMeasurement || obj.parent?.userData?.isMeasurement) return false;
  const n = obj.name?.toLowerCase?.() ?? '';
  return !(n.includes('measurement') || n.includes('label') || n.includes('points') || n.includes('lines'));
};

const toLitMaterial = (mat: THREE.Material): THREE.Material => {
  if (mat instanceof THREE.MeshBasicMaterial) {
    const converted = new THREE.MeshStandardMaterial({
      color: mat.color.clone(),
      map: mat.map ?? null,
      transparent: mat.transparent,
      opacity: mat.opacity,
      side: mat.side,
      alphaTest: mat.alphaTest,
      depthTest: mat.depthTest,
      depthWrite: mat.depthWrite,
      wireframe: mat.wireframe,
      name: mat.name
    });
    converted.roughness = 0.95;
    converted.metalness = 0.0;
    converted.needsUpdate = true;
    return converted;
  }

  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
    mat.envMap = null;
    mat.envMapIntensity = 0;
    mat.needsUpdate = true;
    return mat;
  }

  if (mat instanceof THREE.MeshPhongMaterial) {
    mat.needsUpdate = true;
    return mat;
  }

  return mat;
};

const SunLight: React.FC<SunLightProps> = ({ active, position, intensity, ambientIntensity, elevation }) => {
  const { scene, gl } = useThree();
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const targetObject = useMemo(() => new THREE.Object3D(), []);
  const lastSyncRef = useRef(0);

  const getShadowMapSize = useCallback(() => {
    const maxSize = gl.capabilities.maxTextureSize;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    return isMobile ? Math.min(1024, maxSize) : Math.min(4096, maxSize);
  }, [gl]);

  const applyMeshOverrides = useCallback(() => {
    scene.traverse((obj) => {
      if (!isModelMesh(obj)) return;

      if (!materialBackups.has(obj)) {
        materialBackups.set(obj, obj.material);
      }

      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map((m) => toLitMaterial(m));
      } else {
        obj.material = toLitMaterial(obj.material);
      }

      obj.castShadow = true;
      obj.receiveShadow = true;
    });
  }, [scene]);

  const restoreMeshOverrides = useCallback(() => {
    scene.traverse((obj) => {
      if (!isModelMesh(obj)) return;

      const original = materialBackups.get(obj);
      if (original) {
        obj.material = original;
      }

      obj.castShadow = false;
      obj.receiveShadow = false;
    });
  }, [scene]);

  const configureShadowCamera = useCallback(() => {
    const light = directionalRef.current;
    if (!light) return;

    const box = new THREE.Box3();
    let found = false;

    scene.traverse((obj) => {
      if (!isModelMesh(obj)) return;
      box.expandByObject(obj);
      found = true;
    });

    if (!found || box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Dynamically scale frustum based on sun elevation:
    // Low sun (< 20°) produces very long shadows → enlarge frustum
    const elevClamped = Math.max(2, elevation);
    const elevFactor = elevClamped < 20 ? 1.5 + (20 - elevClamped) * 0.05 : 1.0;
    const frustum = Math.max(10, maxDim * 1.3 * elevFactor);

    const cam = light.shadow.camera as THREE.OrthographicCamera;
    cam.left = -frustum;
    cam.right = frustum;
    cam.top = frustum;
    cam.bottom = -frustum;
    cam.near = 0.1;
    // Increase far plane for low sun angles to capture long shadows
    cam.far = Math.max(50, maxDim * (elevClamped < 20 ? 10 : 6));
    cam.updateProjectionMatrix();

    targetObject.position.copy(center);
    targetObject.updateMatrixWorld();

    const shadowSize = getShadowMapSize();
    light.shadow.mapSize.set(shadowSize, shadowSize);
    // Tighter bias for sharper contact shadows
    light.shadow.bias = -0.001;
    light.shadow.normalBias = 0.02;

    if (light.shadow.map) {
      light.shadow.map.dispose();
      light.shadow.map = null as any;
    }
    gl.shadowMap.needsUpdate = true;
  }, [scene, targetObject, getShadowMapSize, gl, elevation]);

  useEffect(() => {
    if (!active) {
      restoreMeshOverrides();
      return;
    }

    // Only-sun mode: remove environment contribution
    scene.environment = null;

    // Make sure shadows stay enabled (even when low-memory optimization tries to disable)
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;

    applyMeshOverrides();
    configureShadowCamera();

    return () => {
      restoreMeshOverrides();
    };
  }, [active, scene, gl, applyMeshOverrides, configureShadowCamera, restoreMeshOverrides]);

  useEffect(() => {
    if (!directionalRef.current) return;
    directionalRef.current.target = targetObject;
  }, [targetObject]);

  useFrame((_, delta) => {
    if (!active || !directionalRef.current) return;

    const light = directionalRef.current;

    // Keep shadow system alive while active
    gl.shadowMap.enabled = true;

    light.position.copy(position);
    light.intensity = intensity;

    if (ambientRef.current) {
      ambientRef.current.intensity = ambientIntensity;
    }

    // Re-sync every 0.75s for late-loaded meshes/material swaps
    lastSyncRef.current += delta;
    if (lastSyncRef.current >= 0.75) {
      applyMeshOverrides();
      configureShadowCamera();
      lastSyncRef.current = 0;
    }
  });

  if (!active) return null;

  return (
    <>
      <directionalLight ref={directionalRef} castShadow color={0xfff4e0} intensity={intensity} position={[position.x, position.y, position.z]} />
      <primitive object={targetObject} />
      <ambientLight ref={ambientRef} color={0xe8f0ff} intensity={ambientIntensity} />
    </>
  );
};

export default SunLight;
