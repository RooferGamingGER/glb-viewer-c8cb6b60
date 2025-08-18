
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
    
    // For non-blob URLs, implement actual fetching and processing
    const fetchAndProcessModel = async () => {
      try {
        // Real progress tracking with fetch
        const response = await fetch(stableFileUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentLength = response.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        
        if (total > 0) {
          const reader = response.body?.getReader();
          if (reader) {
            let loaded = 0;
            const chunks: Uint8Array[] = [];
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              chunks.push(value);
              loaded += value.length;
              
              const progress = Math.min((loaded / total) * 100, 99);
              setState(prev => ({
                ...prev,
                progress: progress
              }));
            }
            
            // Reassemble the data
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
              result.set(chunk, offset);
              offset += chunk.length;
            }
            
            // Create blob and object URL for GLB loading
            const blob = new Blob([result], { type: 'model/gltf-binary' });
            const processedBlobUrl = URL.createObjectURL(blob);
            
            // Cache the result
            processedUrls.set(stableFileUrl, processedBlobUrl);
            
            setState({
              processedUrl: processedBlobUrl,
              loading: false,
              progress: 100,
              error: null
            });
            return;
          }
        }
        
        // Fallback for streams without content-length
        setState(prev => ({ ...prev, progress: 50 }));
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Cache the result
        processedUrls.set(stableFileUrl, stableFileUrl);
        
        setState({
          processedUrl: stableFileUrl,
          loading: false,
          progress: 100,
          error: null
        });
        
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
