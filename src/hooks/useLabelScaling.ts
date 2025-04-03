
import { useEffect } from 'react';
import * as THREE from 'three';
import { updateLabelScale } from '@/utils/textSprite';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';

/**
 * Custom hook to handle label scaling based on camera distance
 */
export const useLabelScaling = (
  camera: THREE.Camera | null,
  labelsRef: React.RefObject<THREE.Group>,
  segmentLabelsRef: React.RefObject<THREE.Group>,
  exportMode: boolean = false
) => {
  const { isTablet, isPhone } = useScreenOrientation();
  
  useEffect(() => {
    if (!camera || !labelsRef.current || !segmentLabelsRef.current) return;
    
    // Update function for animation loop
    const updateLabels = () => {
      if (labelsRef.current && camera) {
        labelsRef.current.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            // Basiswert für Skalierung
            let scaleFactor = exportMode ? 0.8 : 0.5;
            
            // Für Tablets ein etwas größerer Wert
            if (isTablet) scaleFactor *= 1.3;
            
            // Für Handys noch größer
            if (isPhone) scaleFactor *= 1.5;
            
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
            // Basiswert für Segmentbeschriftungen
            let scaleFactor = exportMode ? 0.7 : 0.35;
            
            // Für Tablets ein etwas größerer Wert
            if (isTablet) scaleFactor *= 1.3;
            
            // Für Handys noch größer
            if (isPhone) scaleFactor *= 1.5;
            
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
  }, [camera, labelsRef, segmentLabelsRef, exportMode, isTablet, isPhone]);
};
