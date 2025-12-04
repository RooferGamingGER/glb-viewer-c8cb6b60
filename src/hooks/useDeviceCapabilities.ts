import { useEffect, useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export type DeviceTier = 'low' | 'medium' | 'high';

interface DeviceCapabilities {
  tier: DeviceTier;
  deviceMemory: number | null;
  hardwareConcurrency: number;
  maxTouchPoints: number;
  isTouch: boolean;
  supportsWebGL2: boolean;
  supportsOffscreenCanvas: boolean;
  pixelRatio: number;
  screenSize: { width: number; height: number };
}

interface RenderSettings {
  pixelRatio: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  antialias: boolean;
  maxLights: number;
  useEnvironmentMap: boolean;
  lodBias: number;
  maxTextureSize: number;
}

declare global {
  interface Navigator {
    deviceMemory?: number;
  }
}

/**
 * Hook to detect device capabilities and provide optimized render settings
 */
export const useDeviceCapabilities = () => {
  const isMobile = useIsMobile();
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);

  useEffect(() => {
    const detectCapabilities = (): DeviceCapabilities => {
      // Check WebGL2 support
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      const supportsWebGL2 = !!gl;

      // Check OffscreenCanvas support
      const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

      // Get device memory (Chrome only)
      const deviceMemory = navigator.deviceMemory || null;

      // Get hardware concurrency (CPU cores)
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;

      // Touch detection
      const maxTouchPoints = navigator.maxTouchPoints || 0;
      const isTouch = maxTouchPoints > 0 || 'ontouchstart' in window;

      // Screen info
      const pixelRatio = window.devicePixelRatio || 1;
      const screenSize = {
        width: window.screen.width,
        height: window.screen.height,
      };

      // Determine device tier
      let tier: DeviceTier = 'high';

      if (isMobile) {
        // Mobile defaults to medium, can be upgraded/downgraded
        tier = 'medium';
        
        if (deviceMemory && deviceMemory < 4) {
          tier = 'low';
        } else if (deviceMemory && deviceMemory >= 8 && hardwareConcurrency >= 8) {
          tier = 'high';
        }
      } else {
        // Desktop tier detection
        if (deviceMemory) {
          if (deviceMemory < 4) {
            tier = 'low';
          } else if (deviceMemory < 8) {
            tier = 'medium';
          } else {
            tier = 'high';
          }
        }

        // Adjust based on CPU cores
        if (hardwareConcurrency < 4) {
          tier = tier === 'high' ? 'medium' : 'low';
        }
      }

      // Check for low-end indicators
      if (!supportsWebGL2) {
        tier = 'low';
      }

      return {
        tier,
        deviceMemory,
        hardwareConcurrency,
        maxTouchPoints,
        isTouch,
        supportsWebGL2,
        supportsOffscreenCanvas,
        pixelRatio,
        screenSize,
      };
    };

    setCapabilities(detectCapabilities());

    // Update on resize (for screen size changes)
    const handleResize = () => {
      setCapabilities(prev => prev ? {
        ...prev,
        screenSize: {
          width: window.screen.width,
          height: window.screen.height,
        },
        pixelRatio: window.devicePixelRatio || 1,
      } : null);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Generate render settings based on device capabilities
  const renderSettings = useMemo((): RenderSettings => {
    if (!capabilities) {
      // Default settings until capabilities are detected
      return {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        shadowsEnabled: true,
        shadowMapSize: 1024,
        antialias: true,
        maxLights: 4,
        useEnvironmentMap: true,
        lodBias: 0,
        maxTextureSize: 2048,
      };
    }

    switch (capabilities.tier) {
      case 'low':
        return {
          pixelRatio: 1,
          shadowsEnabled: false,
          shadowMapSize: 256,
          antialias: false,
          maxLights: 2,
          useEnvironmentMap: false,
          lodBias: 2, // Use lower LOD levels
          maxTextureSize: 512,
        };
      case 'medium':
        return {
          pixelRatio: Math.min(capabilities.pixelRatio, 1.5),
          shadowsEnabled: true,
          shadowMapSize: 512,
          antialias: true,
          maxLights: 3,
          useEnvironmentMap: false,
          lodBias: 1,
          maxTextureSize: 1024,
        };
      case 'high':
      default:
        return {
          pixelRatio: Math.min(capabilities.pixelRatio, 2),
          shadowsEnabled: true,
          shadowMapSize: 1024,
          antialias: true,
          maxLights: 4,
          useEnvironmentMap: true,
          lodBias: 0,
          maxTextureSize: 2048,
        };
    }
  }, [capabilities]);

  // Check if device should use reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return {
    capabilities,
    renderSettings,
    prefersReducedMotion,
    isLowEndDevice: capabilities?.tier === 'low',
    isMidRangeDevice: capabilities?.tier === 'medium',
    isHighEndDevice: capabilities?.tier === 'high',
  };
};
