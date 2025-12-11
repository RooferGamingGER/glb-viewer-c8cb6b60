import { useState, useEffect, useRef, useCallback } from 'react';

export type LoadingPhase = 
  | 'idle' 
  | 'downloading' 
  | 'parsing' 
  | 'processing' 
  | 'finalizing'
  | 'complete'
  | 'error';

export interface ProgressiveLoadState {
  phase: LoadingPhase;
  progress: number;           // 0-100 overall
  phaseProgress: number;      // 0-100 for current phase
  downloadedBytes: number;
  totalBytes: number;
  downloadSpeed: number;      // bytes per second
  estimatedTimeRemaining: number | null; // seconds
  error: string | null;
}

interface UseProgressiveModelLoaderOptions {
  onComplete?: () => void;
  onError?: (error: string) => void;
}

// Phase weights for overall progress calculation
const PHASE_WEIGHTS = {
  downloading: 60,
  parsing: 20,
  processing: 15,
  finalizing: 5,
};

export function useProgressiveModelLoader(
  fileUrl: string | null,
  options?: UseProgressiveModelLoaderOptions
) {
  const [state, setState] = useState<ProgressiveLoadState>({
    phase: 'idle',
    progress: 0,
    phaseProgress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    downloadSpeed: 0,
    estimatedTimeRemaining: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const speedSamplesRef = useRef<number[]>([]);
  const lastBytesRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const isCancelledRef = useRef(false);

  const calculateOverallProgress = useCallback((phase: LoadingPhase, phaseProgress: number): number => {
    let baseProgress = 0;
    
    switch (phase) {
      case 'downloading':
        return (phaseProgress / 100) * PHASE_WEIGHTS.downloading;
      case 'parsing':
        baseProgress = PHASE_WEIGHTS.downloading;
        return baseProgress + (phaseProgress / 100) * PHASE_WEIGHTS.parsing;
      case 'processing':
        baseProgress = PHASE_WEIGHTS.downloading + PHASE_WEIGHTS.parsing;
        return baseProgress + (phaseProgress / 100) * PHASE_WEIGHTS.processing;
      case 'finalizing':
        baseProgress = PHASE_WEIGHTS.downloading + PHASE_WEIGHTS.parsing + PHASE_WEIGHTS.processing;
        return baseProgress + (phaseProgress / 100) * PHASE_WEIGHTS.finalizing;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  }, []);

  const updateSpeed = useCallback((currentBytes: number) => {
    const now = Date.now();
    const timeDelta = (now - lastTimeRef.current) / 1000; // seconds
    
    if (timeDelta > 0.1) { // Update every 100ms minimum
      const bytesDelta = currentBytes - lastBytesRef.current;
      const speed = bytesDelta / timeDelta;
      
      speedSamplesRef.current.push(speed);
      if (speedSamplesRef.current.length > 5) {
        speedSamplesRef.current.shift();
      }
      
      lastBytesRef.current = currentBytes;
      lastTimeRef.current = now;
      
      // Return average speed
      const avgSpeed = speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length;
      return avgSpeed;
    }
    
    return state.downloadSpeed;
  }, [state.downloadSpeed]);

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    isCancelledRef.current = false;
    speedSamplesRef.current = [];
    lastBytesRef.current = 0;
    lastTimeRef.current = Date.now();
    setState({
      phase: 'idle',
      progress: 0,
      phaseProgress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      downloadSpeed: 0,
      estimatedTimeRemaining: null,
      error: null,
    });
  }, []);

  // Simulate progressive loading phases for blob URLs (already loaded)
  const simulateProgressForBlob = useCallback(async (blobUrl: string) => {
    if (isCancelledRef.current) return;
    
    try {
      // Get blob size
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const totalSize = blob.size;
      
      // Simulate download phase (instant for blob)
      setState(prev => ({
        ...prev,
        phase: 'downloading',
        phaseProgress: 100,
        progress: calculateOverallProgress('downloading', 100),
        totalBytes: totalSize,
        downloadedBytes: totalSize,
      }));
      
      await new Promise(r => setTimeout(r, 100));
      if (isCancelledRef.current) return;
      
      // Parsing phase
      setState(prev => ({
        ...prev,
        phase: 'parsing',
        phaseProgress: 0,
        progress: calculateOverallProgress('parsing', 0),
      }));
      
      // Simulate parsing progress based on file size
      const parsingTime = Math.min(totalSize / (10 * 1024 * 1024) * 1000, 3000); // ~1s per 10MB, max 3s
      const parsingSteps = 10;
      for (let i = 1; i <= parsingSteps; i++) {
        if (isCancelledRef.current) return;
        await new Promise(r => setTimeout(r, parsingTime / parsingSteps));
        const phaseProgress = (i / parsingSteps) * 100;
        setState(prev => ({
          ...prev,
          phaseProgress,
          progress: calculateOverallProgress('parsing', phaseProgress),
        }));
      }
      
      // Processing phase
      setState(prev => ({
        ...prev,
        phase: 'processing',
        phaseProgress: 0,
        progress: calculateOverallProgress('processing', 0),
      }));
      
      const processingTime = Math.min(totalSize / (20 * 1024 * 1024) * 1000, 2000);
      const processingSteps = 5;
      for (let i = 1; i <= processingSteps; i++) {
        if (isCancelledRef.current) return;
        await new Promise(r => setTimeout(r, processingTime / processingSteps));
        const phaseProgress = (i / processingSteps) * 100;
        setState(prev => ({
          ...prev,
          phaseProgress,
          progress: calculateOverallProgress('processing', phaseProgress),
        }));
      }
      
      // Finalizing
      setState(prev => ({
        ...prev,
        phase: 'finalizing',
        phaseProgress: 50,
        progress: calculateOverallProgress('finalizing', 50),
      }));
      
      await new Promise(r => setTimeout(r, 200));
      if (isCancelledRef.current) return;
      
      setState(prev => ({
        ...prev,
        phase: 'complete',
        phaseProgress: 100,
        progress: 100,
      }));
      
      options?.onComplete?.();
    } catch (error) {
      if (!isCancelledRef.current) {
        const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
        setState(prev => ({
          ...prev,
          phase: 'error',
          error: errorMsg,
        }));
        options?.onError?.(errorMsg);
      }
    }
  }, [calculateOverallProgress, options]);

  // Load with real progress tracking for HTTP URLs
  const loadWithProgress = useCallback(async (url: string) => {
    if (isCancelledRef.current) return;
    
    abortControllerRef.current = new AbortController();
    
    try {
      setState(prev => ({
        ...prev,
        phase: 'downloading',
        phaseProgress: 0,
        progress: 0,
      }));
      
      const response = await fetch(url, { 
        signal: abortControllerRef.current.signal 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      
      setState(prev => ({ ...prev, totalBytes }));
      
      if (!response.body) {
        // Fallback for browsers without streaming support
        const blob = await response.blob();
        setState(prev => ({
          ...prev,
          downloadedBytes: blob.size,
          phaseProgress: 100,
          progress: calculateOverallProgress('downloading', 100),
        }));
      } else {
        const reader = response.body.getReader();
        let downloadedBytes = 0;
        
        while (true) {
          if (isCancelledRef.current) {
            reader.cancel();
            return;
          }
          
          const { done, value } = await reader.read();
          
          if (done) break;
          
          downloadedBytes += value.length;
          const speed = updateSpeed(downloadedBytes);
          const phaseProgress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;
          const remainingBytes = totalBytes - downloadedBytes;
          const estimatedTimeRemaining = speed > 0 ? remainingBytes / speed : null;
          
          setState(prev => ({
            ...prev,
            downloadedBytes,
            phaseProgress,
            progress: calculateOverallProgress('downloading', phaseProgress),
            downloadSpeed: speed,
            estimatedTimeRemaining,
          }));
        }
      }
      
      // Continue with parsing phase simulation
      setState(prev => ({
        ...prev,
        phase: 'parsing',
        phaseProgress: 0,
        progress: calculateOverallProgress('parsing', 0),
        estimatedTimeRemaining: null,
      }));
      
      // Simulate remaining phases
      await new Promise(r => setTimeout(r, 500));
      if (isCancelledRef.current) return;
      
      setState(prev => ({
        ...prev,
        phase: 'processing',
        phaseProgress: 50,
        progress: calculateOverallProgress('processing', 50),
      }));
      
      await new Promise(r => setTimeout(r, 300));
      if (isCancelledRef.current) return;
      
      setState(prev => ({
        ...prev,
        phase: 'finalizing',
        phaseProgress: 50,
        progress: calculateOverallProgress('finalizing', 50),
      }));
      
      await new Promise(r => setTimeout(r, 200));
      if (isCancelledRef.current) return;
      
      setState(prev => ({
        ...prev,
        phase: 'complete',
        progress: 100,
        phaseProgress: 100,
      }));
      
      options?.onComplete?.();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Cancelled by user
      }
      
      if (!isCancelledRef.current) {
        const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
        setState(prev => ({
          ...prev,
          phase: 'error',
          error: errorMsg,
        }));
        options?.onError?.(errorMsg);
      }
    }
  }, [calculateOverallProgress, updateSpeed, options]);

  useEffect(() => {
    if (!fileUrl) {
      reset();
      return;
    }
    
    isCancelledRef.current = false;
    
    if (fileUrl.startsWith('blob:')) {
      simulateProgressForBlob(fileUrl);
    } else {
      loadWithProgress(fileUrl);
    }
    
    return () => {
      cancel();
    };
  }, [fileUrl]);

  return {
    ...state,
    cancel,
    reset,
    isLoading: state.phase !== 'idle' && state.phase !== 'complete' && state.phase !== 'error',
    isComplete: state.phase === 'complete',
    hasError: state.phase === 'error',
  };
}

// Helper to format bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Helper to format speed
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

// Helper to format time remaining
export function formatTimeRemaining(seconds: number | null): string {
  if (seconds === null || !isFinite(seconds)) return '';
  if (seconds < 1) return 'Weniger als 1 Sekunde';
  if (seconds < 60) return `Noch ca. ${Math.ceil(seconds)} Sekunden`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `Noch ca. ${minutes}:${remainingSeconds.toString().padStart(2, '0')} min`;
}
