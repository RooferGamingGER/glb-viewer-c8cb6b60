
import { toast } from 'sonner';

// Define the stored screenshot type
export interface StoredScreenshot {
  id: string;
  url: string;
  timestamp: number;
  filename: string;
}

// In-memory store for screenshots
let screenshots: StoredScreenshot[] = [];

/**
 * Adds a screenshot to the store
 */
export const storeScreenshot = (url: string): StoredScreenshot => {
  // Generate a unique ID using timestamp and random string
  const id = `screenshot-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = Date.now();
  const filename = `screenshot-${new Date(timestamp).toISOString().replace(/:/g, '-')}.png`;
  
  const screenshot: StoredScreenshot = {
    id,
    url,
    timestamp,
    filename
  };
  
  // Add to store
  screenshots = [screenshot, ...screenshots];
  
  return screenshot;
};

/**
 * Get a screenshot by ID
 */
export const getScreenshot = (id: string): StoredScreenshot | undefined => {
  return screenshots.find(s => s.id === id);
};

/**
 * Get the most recent screenshot
 */
export const getLatestScreenshot = (): StoredScreenshot | undefined => {
  if (screenshots.length === 0) return undefined;
  return screenshots[0]; // Array is sorted with newest first
};

/**
 * Get all stored screenshots
 */
export const getAllScreenshots = (): StoredScreenshot[] => {
  return [...screenshots]; // Return copy to prevent external modification
};

/**
 * Remove a screenshot from the store and revoke its URL
 */
export const removeScreenshot = (id: string): boolean => {
  const screenshot = getScreenshot(id);
  if (!screenshot) return false;
  
  // Revoke the blob URL to free memory
  if (screenshot.url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(screenshot.url);
    } catch (error) {
      console.error('Failed to revoke blob URL:', error);
    }
  }
  
  // Remove from store
  screenshots = screenshots.filter(s => s.id !== id);
  return true;
};

/**
 * Clear all screenshots from the store and revoke all URLs
 */
export const clearAllScreenshots = (): void => {
  // Revoke all blob URLs to free memory
  screenshots.forEach(screenshot => {
    if (screenshot.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(screenshot.url);
      } catch (error) {
        console.error('Failed to revoke blob URL:', error);
      }
    }
  });
  
  // Clear store
  screenshots = [];
};
