import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Point } from '@/types/measurements';

// Hook to manage a small crosshair reticle for precise touch placement
export const usePlacementReticle = (scene: THREE.Scene | null) => {
  const reticleGroupRef = useRef<THREE.Group | null>(null);
  const horizRef = useRef<THREE.Line | null>(null);
  const vertRef = useRef<THREE.Line | null>(null);

  // Create reticle on scene attach
  useEffect(() => {
    if (!scene) return;

    const group = new THREE.Group();
    group.name = 'placementReticle';
    group.visible = false;
    group.renderOrder = 1000;

    const createLine = () => {
      const material = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9, depthTest: false });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 1000;
      return line;
    };

    const horiz = createLine();
    const vert = createLine();

    group.add(horiz);
    group.add(vert);

    scene.add(group);

    reticleGroupRef.current = group;
    horizRef.current = horiz;
    vertRef.current = vert;

    return () => {
      if (reticleGroupRef.current) {
        scene.remove(reticleGroupRef.current);
        reticleGroupRef.current = null;
      }
      if (horizRef.current) {
        (horizRef.current.geometry as THREE.BufferGeometry).dispose();
        (horizRef.current.material as THREE.Material).dispose();
        horizRef.current = null;
      }
      if (vertRef.current) {
        (vertRef.current.geometry as THREE.BufferGeometry).dispose();
        (vertRef.current.material as THREE.Material).dispose();
        vertRef.current = null;
      }
    };
  }, [scene]);

  const showReticleAt = useCallback((p: Point) => {
    if (!reticleGroupRef.current || !horizRef.current || !vertRef.current) return;
    const size = 0.25; // world units length of each arm

    reticleGroupRef.current.position.set(p.x, p.y, p.z);

    const hPos = horizRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    hPos.setXYZ(0, -size, 0, 0);
    hPos.setXYZ(1, size, 0, 0);
    hPos.needsUpdate = true;

    const vPos = vertRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    vPos.setXYZ(0, 0, -size, 0);
    vPos.setXYZ(1, 0, size, 0);
    vPos.needsUpdate = true;

    reticleGroupRef.current.visible = true;
  }, []);

  const hideReticle = useCallback(() => {
    if (reticleGroupRef.current) {
      reticleGroupRef.current.visible = false;
    }
  }, []);

  return { showReticleAt, hideReticle };
};
