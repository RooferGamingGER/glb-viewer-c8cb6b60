
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

type ModelLoaderState = {
  processedUrl: string | null;
  loading: boolean;
  progress: number;
  error: string | null;
};

// Cache to track processed URLs to prevent duplicate processing
const processedUrls = new Map<string, string>();

export const useModelLoader = (fileUrl: string, fileName: string, shouldRotate: boolean = true) => {
  const [state, setState] = useState<ModelLoaderState>({
    processedUrl: null,
    loading: true,
    progress: 0,
    error: null
  });
  
  // Stable URL reference to prevent unnecessary re-processing
  const stableFileUrl = useMemo(() => fileUrl, [fileUrl]);
  
  useEffect(() => {
    // Check if we already processed this URL
    if (processedUrls.has(stableFileUrl)) {
      setState({
        processedUrl: processedUrls.get(stableFileUrl)!,
        loading: false,
        progress: 100,
        error: null
      });
      return;
    }
    
    // Reset state only when URL actually changes
    setState({
      processedUrl: null,
      loading: true,
      progress: 0,
      error: null
    });
    
    // If the URL is already a blob, we just need to validate it
    if (stableFileUrl.startsWith('blob:')) {
      // Cache the processed URL
      processedUrls.set(stableFileUrl, stableFileUrl);
      
      setState({
        processedUrl: stableFileUrl,
        loading: false,
        progress: 100,
        error: null
      });
      return;
    }
    
    // For non-blob URLs, validate and process
    const fetchAndProcessModel = async () => {
      try {
        setState(prev => ({ ...prev, progress: 20 }));
        
        // Validate URL is reachable before passing to Three.js
        const response = await fetch(stableFileUrl, { method: 'HEAD' });
        
        if (!response.ok) {
          throw new Error(`Model not found (${response.status})`);
        }
        
        setState(prev => ({ ...prev, progress: 80 }));
        
        // Cache the result
        processedUrls.set(stableFileUrl, stableFileUrl);
        
        setState({
          processedUrl: stableFileUrl,
          loading: false,
          progress: 100,
          error: null
        });
        
      } catch (error: any) {
        console.warn('Model loading failed:', error.message);
        setState({
          processedUrl: null,
          loading: false,
          progress: 0,
          error: `Model nicht verfügbar: ${error.message || error}`
        });
      }
    };
    
    fetchAndProcessModel();
    
  }, [stableFileUrl]);
  
  // Cleanup processed URLs cache when component unmounts
  useEffect(() => {
    return () => {
      // Only cleanup if this is the last reference to this URL
      if (processedUrls.has(stableFileUrl)) {
        processedUrls.delete(stableFileUrl);
      }
    };
  }, []);
  
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

// Utility to clear the cache manually if needed
export const clearModelLoaderCache = () => {
  processedUrls.clear();
};
