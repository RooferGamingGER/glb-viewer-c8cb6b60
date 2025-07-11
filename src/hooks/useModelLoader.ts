
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { validateModelFile, rotateAndExportModel, cleanupDracoLoader } from '@/utils/modelTransformer';

type ModelLoaderState = {
  processedUrl: string | null;
  loading: boolean;
  progress: number;
  error: string | null;
};

export const useModelLoader = (fileUrl: string, fileName: string, shouldRotate: boolean = true) => {
  const [state, setState] = useState<ModelLoaderState>({
    processedUrl: null,
    loading: true,
    progress: 0,
    error: null
  });
  
  useEffect(() => {
    // Reset state when file URL changes
    setState({
      processedUrl: null,
      loading: true,
      progress: 0,
      error: null
    });
    
    // If the URL is already a blob, we just need to validate it
    if (fileUrl.startsWith('blob:')) {
      // We can't validate a blob URL directly, 
      // but we can check if it's already processed
      setState({
        processedUrl: fileUrl,
        loading: false,
        progress: 100,
        error: null
      });
      return;
    }
    
    // Placeholder for file fetching - would need implementation for remote URLs
    const fetchAndProcessModel = async () => {
      try {
        // Mock progress updates
        const progressInterval = setInterval(() => {
          setState(prev => ({
            ...prev,
            progress: Math.min(prev.progress + 5, 95) // Cap at 95% until complete
          }));
        }, 500);
        
        // Clean up interval
        return () => clearInterval(progressInterval);
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: `Failed to load model: ${error.message || error}`
        }));
        toast.error(`Fehler beim Laden des Modells: ${error.message || error}`);
      }
    };
    
    fetchAndProcessModel();
    
    // Cleanup function
    return () => {
      if (state.processedUrl && !fileUrl.includes(state.processedUrl)) {
        // Revoke previous blob URL
        URL.revokeObjectURL(state.processedUrl);
      }
    };
  }, [fileUrl, fileName, shouldRotate]);
  
  return state;
};

// Export a utility function to fetch blob content from URL for diagnostics
export const fetchBlobDiagnostics = async (blobUrl: string): Promise<{
  size: number;
  type: string;
  success: boolean;
  error?: string;
}> => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    
    return {
      size: blob.size,
      type: blob.type,
      success: true
    };
  } catch (err) {
    return {
      size: 0,
      type: 'unknown',
      success: false,
      error: err.message || String(err)
    };
  }
};
