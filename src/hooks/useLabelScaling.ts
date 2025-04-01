
import { useEffect } from 'react';
import * as THREE from 'three';
import { updateLabelScale } from '@/utils/textSprite';

/**
 * Custom hook to handle label scaling based on camera distance
 */
export const useLabelScaling = (
  camera: THREE.Camera | null,
  labelsRef: React.RefObject<THREE.Group>,
  segmentLabelsRef: React.RefObject<THREE.Group>,
  exportMode: boolean = false
) => {
  useEffect(() => {
    if (!camera || !labelsRef.current || !segmentLabelsRef.current) return;
    
    // Update function for animation loop
    const updateLabels = () => {
      if (labelsRef.current && camera) {
        labelsRef.current.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            // Regular labels use standard scaling
            // Use larger scale when in export mode
            const scaleFactor = exportMode ? 0.8 : 0.5;
            updateLabelScale(child, camera, scaleFactor);
            
            // Ensure labels render on top
            child.renderOrder = 100;
            
            // Do not force opacity - respect the value set elsewhere
            if (child.material instanceof THREE.SpriteMaterial) {
              child.material.needsUpdate = true;
            }
          }
        });
      }
      
      if (segmentLabelsRef.current && camera) {
        segmentLabelsRef.current.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            // Segment labels are adjusted for better readability
            // Use larger scale when in export mode
            const scaleFactor = exportMode ? 0.7 : 0.35;
            updateLabelScale(child, camera, scaleFactor);
            
            // Ensure labels render on top
            child.renderOrder = 100;
            
            // Do not force opacity - respect the value set elsewhere
            if (child.material instanceof THREE.SpriteMaterial) {
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
  }, [camera, labelsRef, segmentLabelsRef, exportMode]);
};
