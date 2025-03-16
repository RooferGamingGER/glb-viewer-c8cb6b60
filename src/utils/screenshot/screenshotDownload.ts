
import { toast } from 'sonner';
import { StoredScreenshot, getScreenshot } from './screenshotStore';

/**
 * Download a screenshot by URL or from the store by ID
 */
export const downloadScreenshot = (screenshotOrId: string | StoredScreenshot): void => {
  try {
    let url: string;
    let filename: string;
    
    if (typeof screenshotOrId === 'string') {
      // Check if it's an ID from store
      const screenshot = getScreenshot(screenshotOrId);
      if (screenshot) {
        url = screenshot.url;
        filename = screenshot.filename;
      } else {
        // Assume it's a direct URL
        url = screenshotOrId;
        filename = `screenshot-${new Date().toISOString().replace(/:/g, '-')}.png`;
      }
    } else {
      // It's a StoredScreenshot object
      url = screenshotOrId.url;
      filename = screenshotOrId.filename;
    }
    
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    
    // Trigger the download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    
    toast.success('Screenshot heruntergeladen');
  } catch (error) {
    console.error('Failed to download screenshot:', error);
    toast.error('Fehler beim Herunterladen des Screenshots');
  }
};
