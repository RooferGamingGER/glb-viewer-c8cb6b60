import * as THREE from 'three';

// Global model cache that persists across component remounts
interface CachedModel {
  scene: THREE.Group;
  loadedAt: number;
  url: string;
  blobRef?: Blob;
}

const globalModelCache = new Map<string, CachedModel>();
const loadingPromises = new Map<string, Promise<void>>();
const loadedFlags = new Set<string>();

/**
 * Hook for managing a global, persistent model cache
 * Prevents multiple reloads of the same model
 */
export const useModelCache = () => {
  const getCachedModel = (url: string): CachedModel | undefined => {
    return globalModelCache.get(url);
  };

  const setCachedModel = (url: string, scene: THREE.Group, blobRef?: Blob) => {
    globalModelCache.set(url, {
      scene,
      loadedAt: Date.now(),
      url,
      blobRef
    });
  };

  const clearCache = (url?: string) => {
    if (url) {
      globalModelCache.delete(url);
      loadedFlags.delete(url);
      loadedFlags.delete(`${url}_preloaded`);
      loadedFlags.delete(`${url}_completed`);
      loadedFlags.delete(`${url}_success_shown`);
    } else {
      globalModelCache.clear();
      loadedFlags.clear();
    }
  };

  const hasBeenLoaded = (url: string, flag?: string): boolean => {
    const key = flag ? `${url}_${flag}` : url;
    return loadedFlags.has(key);
  };

  const markAsLoaded = (url: string, flag?: string) => {
    const key = flag ? `${url}_${flag}` : url;
    loadedFlags.add(key);
  };

  const isLoading = (url: string): boolean => {
    return loadingPromises.has(url);
  };

  const setLoading = (url: string, promise: Promise<void>) => {
    loadingPromises.set(url, promise);
    promise.finally(() => loadingPromises.delete(url));
  };

  return {
    getCachedModel,
    setCachedModel,
    clearCache,
    hasBeenLoaded,
    markAsLoaded,
    isLoading,
    setLoading
  };
};

// Export standalone functions for use outside React components
export const modelCacheHasBeenLoaded = (url: string, flag?: string): boolean => {
  const key = flag ? `${url}_${flag}` : url;
  return loadedFlags.has(key);
};

export const modelCacheMarkAsLoaded = (url: string, flag?: string) => {
  const key = flag ? `${url}_${flag}` : url;
  loadedFlags.add(key);
};

export const modelCacheClear = (url?: string) => {
  if (url) {
    globalModelCache.delete(url);
    loadedFlags.delete(url);
    loadedFlags.delete(`${url}_preloaded`);
    loadedFlags.delete(`${url}_completed`);
    loadedFlags.delete(`${url}_success_shown`);
  } else {
    globalModelCache.clear();
    loadedFlags.clear();
  }
};
