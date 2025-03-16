
import { toast } from 'sonner';
import { storeScreenshot, StoredScreenshot } from './screenshotStore';

export interface ScreenshotOptions {
  quality?: number;
  type?: 'image/png' | 'image/jpeg';
  storeResult?: boolean;
  hideSidebar?: boolean;
}

/**
 * Takes a screenshot of a canvas element
 */
export const captureCanvasScreenshot = async (
  canvas: HTMLCanvasElement,
  options: ScreenshotOptions = {}
): Promise<StoredScreenshot | string> => {
  const { 
    quality = 1.0, 
    type = 'image/png',
    storeResult = true,
    hideSidebar = true // Default to hiding sidebar
  } = options;

  // Validate canvas before proceeding
  if (!canvas) {
    const error = new Error('Canvas element not found');
    console.error('Screenshot error:', error);
    toast.error('Fehler beim Erstellen des Screenshots: Canvas nicht gefunden');
    throw error;
  }

  // Check if canvas is valid (has dimensions and a valid context)
  if (canvas.width === 0 || canvas.height === 0) {
    const error = new Error('Canvas has no dimensions');
    console.error('Screenshot error:', error);
    toast.error('Fehler beim Erstellen des Screenshots: Canvas hat keine Dimensionen');
    throw error;
  }

  // Check if canvas context exists
  try {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get canvas context');
    }
  } catch (error) {
    console.error('Screenshot error:', error);
    toast.error('Fehler beim Erstellen des Screenshots: Canvas-Kontext nicht verfügbar');
    throw error;
  }

  try {
    // If sidebar should be hidden during screenshot, we need to find and hide it temporarily
    let sidebarElement: HTMLElement | null = null;
    if (hideSidebar) {
      sidebarElement = document.querySelector('[data-sidebar="true"]');
      if (sidebarElement) {
        sidebarElement.style.display = 'none';
      }
    }

    // Create a blob URL from the canvas
    const url = await new Promise<string>((resolve, reject) => {
      try {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }
            const url = URL.createObjectURL(blob);
            resolve(url);
          },
          type,
          quality
        );
      } catch (blobError) {
        reject(new Error(`Failed to create blob: ${blobError}`));
      }
    });

    // Restore sidebar visibility
    if (hideSidebar && sidebarElement) {
      sidebarElement.style.display = '';
    }

    // Either store the screenshot or just return the URL
    if (storeResult) {
      return storeScreenshot(url);
    } else {
      return url;
    }
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    toast.error('Fehler beim Erstellen des Screenshots');
    throw error;
  }
};
