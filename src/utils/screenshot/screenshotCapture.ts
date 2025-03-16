
import { toast } from 'sonner';
import { storeScreenshot, StoredScreenshot } from './screenshotStore';

export interface ScreenshotOptions {
  quality?: number;
  type?: 'image/png' | 'image/jpeg';
  storeResult?: boolean;
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
    storeResult = true
  } = options;

  try {
    // Create a blob URL from the canvas
    const url = await new Promise<string>((resolve, reject) => {
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
    });

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
