
import React from 'react';
import { Maximize, RotateCw, ZoomIn, ZoomOut, Home, Move } from 'lucide-react';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';

interface TouchControlsProps {
  onResetCamera: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
  enableRotate: () => void;
  enablePan: () => void;
}

const TouchControls: React.FC<TouchControlsProps> = ({
  onResetCamera,
  onZoomIn,
  onZoomOut,
  onFitToView,
  enableRotate,
  enablePan
}) => {
  const { isTablet } = useScreenOrientation();
  
  return (
    <div className={`fixed ${isTablet ? 'bottom-8 right-8' : 'bottom-4 right-4'} z-30 flex flex-col gap-3`}>
      <div className="glass-panel rounded-full shadow-lg flex flex-col overflow-hidden">
        <button 
          className="p-3 flex items-center justify-center border-b border-border/30 hover:bg-primary/10 active:bg-primary/20 transition-colors touch-friendly-control"
          onClick={onZoomIn}
          aria-label="Vergrößern"
        >
          <ZoomIn className="w-6 h-6" />
        </button>
        
        <button 
          className="p-3 flex items-center justify-center border-b border-border/30 hover:bg-primary/10 active:bg-primary/20 transition-colors touch-friendly-control"
          onClick={onZoomOut}
          aria-label="Verkleinern"
        >
          <ZoomOut className="w-6 h-6" />
        </button>
        
        <button 
          className="p-3 flex items-center justify-center border-b border-border/30 hover:bg-primary/10 active:bg-primary/20 transition-colors touch-friendly-control"
          onClick={onResetCamera}
          aria-label="Kamera zurücksetzen"
        >
          <Home className="w-6 h-6" />
        </button>
        
        <button 
          className="p-3 flex items-center justify-center border-b border-border/30 hover:bg-primary/10 active:bg-primary/20 transition-colors touch-friendly-control"
          onClick={onFitToView}
          aria-label="An Bildschirm anpassen"
        >
          <Maximize className="w-6 h-6" />
        </button>
        
        <button 
          className="p-3 flex items-center justify-center border-b border-border/30 hover:bg-primary/10 active:bg-primary/20 transition-colors touch-friendly-control"
          onClick={enableRotate}
          aria-label="Rotieren"
        >
          <RotateCw className="w-6 h-6" />
        </button>
        
        <button 
          className="p-3 flex items-center justify-center hover:bg-primary/10 active:bg-primary/20 transition-colors touch-friendly-control"
          onClick={enablePan}
          aria-label="Verschieben"
        >
          <Move className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default TouchControls;
