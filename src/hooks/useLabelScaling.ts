
import { useEffect } from 'react';
import * as THREE from 'three';
import { updateLabelScale } from '@/utils/textSprite';

/**
 * Custom hook to handle label scaling based on camera distance
 */
export const useLabelScaling = (
  camera: THREE.Camera | null,
  labelsRef: React.RefObject<THREE.Group>,
  segmentLabelsRef: React.RefObject<THREE.Group>
) => {
  useEffect(() => {
    if (!camera || !labelsRef.current || !segmentLabelsRef.current) return;
    
    // Update function for animation loop
    const updateLabels = () => {
      if (labelsRef.current && camera) {
        labelsRef.current.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            // Regular labels use standard scaling
            updateLabelScale(child, camera, 0.5);
            
            // Force sprite to be always visible
            child.visible = true;
            
            // Ensure labels render on top
            child.renderOrder = 100;
            
            // Force label material to be opaque
            if (child.material instanceof THREE.SpriteMaterial) {
              child.material.opacity = 1.0;
              child.material.needsUpdate = true;
            }
          }
        });
      }
      
      if (segmentLabelsRef.current && camera) {
        segmentLabelsRef.current.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            // Segment labels are made smaller for less visual clutter
            updateLabelScale(child, camera, 0.35);
            
            // Force sprite to be always visible
            child.visible = true;
            
            // Ensure labels render on top
            child.renderOrder = 100;
            
            // Force label material to be opaque
            if (child.material instanceof THREE.SpriteMaterial) {
              child.material.opacity = 1.0;
              child.material.needsUpdate = true;
            }
          }
        });
      }
    };
    
    // Setup animation loop with request animation frame
    const animate = () => {
      updateLabels();
      animationId = requestAnimationFrame(animate);
    };
    
    // Start animation
    let animationId = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [camera, labelsRef, segmentLabelsRef]);
};
