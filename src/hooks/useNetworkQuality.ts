import { useCallback, useEffect, useState } from 'react';

export type NetworkQuality = 'high' | 'medium' | 'low' | 'offline';

interface NetworkInfo {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

declare global {
  interface Navigator {
    connection?: NetworkInfo & EventTarget;
  }
}

/**
 * Hook to detect network quality and adapt app behavior accordingly
 */
export const useNetworkQuality = () => {
  const [quality, setQuality] = useState<NetworkQuality>('high');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionInfo, setConnectionInfo] = useState<NetworkInfo | null>(null);

  const updateNetworkQuality = useCallback(() => {
    if (!navigator.onLine) {
      setQuality('offline');
      setIsOnline(false);
      return;
    }

    setIsOnline(true);

    if ('connection' in navigator && navigator.connection) {
      const conn = navigator.connection as NetworkInfo;
      setConnectionInfo(conn);

      // Check for data saver mode first
      if (conn.saveData) {
        setQuality('low');
        return;
      }

      // Determine quality based on effective type
      switch (conn.effectiveType) {
        case 'slow-2g':
        case '2g':
          setQuality('low');
          break;
        case '3g':
          setQuality('medium');
          break;
        case '4g':
        default:
          // Also check downlink speed for more accuracy
          if (conn.downlink && conn.downlink < 1.5) {
            setQuality('medium');
          } else if (conn.downlink && conn.downlink < 0.5) {
            setQuality('low');
          } else {
            setQuality('high');
          }
          break;
      }
    }
  }, []);

  useEffect(() => {
    updateNetworkQuality();

    // Listen for online/offline events
    window.addEventListener('online', updateNetworkQuality);
    window.addEventListener('offline', updateNetworkQuality);

    // Listen for connection changes
    if ('connection' in navigator && navigator.connection) {
      navigator.connection.addEventListener('change', updateNetworkQuality);
    }

    return () => {
      window.removeEventListener('online', updateNetworkQuality);
      window.removeEventListener('offline', updateNetworkQuality);
      
      if ('connection' in navigator && navigator.connection) {
        navigator.connection.removeEventListener('change', updateNetworkQuality);
      }
    };
  }, [updateNetworkQuality]);

  // Get recommended settings based on network quality
  const getRecommendedSettings = useCallback(() => {
    switch (quality) {
      case 'offline':
        return {
          loadHighResTextures: false,
          enableAnimations: false,
          maxModelSize: 5 * 1024 * 1024, // 5MB
          preloadAssets: false,
          imageQuality: 'low' as const,
        };
      case 'low':
        return {
          loadHighResTextures: false,
          enableAnimations: false,
          maxModelSize: 10 * 1024 * 1024, // 10MB
          preloadAssets: false,
          imageQuality: 'low' as const,
        };
      case 'medium':
        return {
          loadHighResTextures: false,
          enableAnimations: true,
          maxModelSize: 50 * 1024 * 1024, // 50MB
          preloadAssets: true,
          imageQuality: 'medium' as const,
        };
      case 'high':
      default:
        return {
          loadHighResTextures: true,
          enableAnimations: true,
          maxModelSize: 200 * 1024 * 1024, // 200MB
          preloadAssets: true,
          imageQuality: 'high' as const,
        };
    }
  }, [quality]);

  return {
    quality,
    isOnline,
    connectionInfo,
    getRecommendedSettings,
  };
};
