
import { useCallback, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useThreeJs } from '@/contexts/ThreeJsContext';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';

/**
 * Hook that provides simplified access to Three.js objects and management functions
 */
export const useThreeObjectsManager = (scene: THREE.Scene | null, enabled: boolean) => {
  // Get Three.js context
  const {
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    initializeGroups,
    cleanupGroups,
    getAllGroups
  } = useThreeJs();
  
  const { isTablet, isPhone } = useScreenOrientation();
  
  // Optimierter Rendering-Modus für Touch-Geräte
  const [touchOptimized, setTouchOptimized] = useState(false);
  
  // Erkennen von Touch-Geräten und optimierte Einstellungen anwenden
  useEffect(() => {
    if (isTablet || isPhone) {
      setTouchOptimized(true);
    } else {
      setTouchOptimized(false);
    }
  }, [isTablet, isPhone]);

  // Initialize groups if scene is available
  const initialize = useCallback(() => {
    if (scene && enabled) {
      initializeGroups(scene);
      
      // Anpassen der Visualisierung für Touch-Geräte
      if (touchOptimized && pointsRef.current) {
        // Größere Punkte für einfachere Touch-Interaktion
        pointsRef.current.children.forEach(point => {
          if (point instanceof THREE.Mesh) {
            // Punktgröße anpassen für bessere Touch-Ziele
            const scale = isTablet ? 1.5 : 2.0; // Tablets brauchen nicht so große Punkte wie Handys
            point.scale.set(scale, scale, scale);
          }
        });
      }
      
      // Auch die Labels für Touch-Geräte optimieren
      if (touchOptimized && labelsRef.current) {
        labelsRef.current.children.forEach(label => {
          if (label instanceof THREE.Sprite) {
            // Größere Labels für Touch-Geräte
            const scale = isTablet ? 1.2 : 1.5;
            label.scale.multiplyScalar(scale);
          }
        });
      }
    }
  }, [scene, enabled, initializeGroups, touchOptimized, pointsRef, labelsRef, isTablet]);

  // Cleanup function for components
  const cleanup = useCallback(() => {
    if (!enabled) {
      cleanupGroups();
    }
  }, [enabled, cleanupGroups]);

  return {
    // Group references
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    
    // Management functions
    initialize,
    cleanup,
    getAllGroups,
    
    // Touch optimization flags
    touchOptimized,
    isTablet,
    isPhone
  };
};
