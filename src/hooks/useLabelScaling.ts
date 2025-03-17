
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
            
            // Ensure sprite is visible
            child.visible = true;
          }
        });
      }
      
      if (segmentLabelsRef.current && camera) {
        segmentLabelsRef.current.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            // Segment labels are made smaller for less visual clutter
            updateLabelScale(child, camera, 0.35);
            
            // Ensure sprite is visible
            child.visible = true;
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
