import { useEffect } from 'react';
import * as THREE from 'three';

// Global storage for original file blobs
const originalFileStorage = new Map<string, Blob>();

/**
 * Store original file blob for a model URL
 */
export const storeOriginalFile = (url: string, blob: Blob) => {
  originalFileStorage.set(url, blob);
};

/**
 * Get original file blob for a model URL
 */
export const getOriginalFile = (url: string): Blob | null => {
  return originalFileStorage.get(url) || null;
};

/**
 * Clear original file storage for a URL
 */
export const clearOriginalFile = (url: string) => {
  originalFileStorage.delete(url);
};

/**
 * Hook to attach original file blob to scene userData
 */
export const useOriginalFileStorage = (
  scene: THREE.Scene | THREE.Group | null,
  fileUrl: string
) => {
  useEffect(() => {
    if (!scene || !fileUrl) return;

    // Get the original file from storage
    const originalFile = getOriginalFile(fileUrl);
    
    if (originalFile) {
      // Store in scene userData for easy access during export
      scene.userData.originalFile = originalFile;
      
      // Also traverse and add to children if they don't have it
      scene.traverse((child) => {
        if (!child.userData.originalFile) {
          child.userData.originalFile = originalFile;
        }
      });
    }
  }, [scene, fileUrl]);
};

/**
 * Fetch and store original file from URL
 */
export const fetchAndStoreOriginalFile = async (url: string): Promise<void> => {
  try {
    // Only fetch if we don't already have it
    if (originalFileStorage.has(url)) {
      return;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    storeOriginalFile(url, blob);
  } catch (error) {
    console.warn('Failed to fetch and store original file:', error);
  }
};