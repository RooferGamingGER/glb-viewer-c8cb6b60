
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Menu,
  Maximize,
  ChevronRight,
  ChevronLeft,
  Share2,
  Download,
  Info
} from 'lucide-react';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';

interface TabletOptimizedControlsProps {
  onToggleSidebar: () => void;
  onToggleInfo: () => void;
  onFitToView: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  sidebarVisible: boolean;
}

const TabletOptimizedControls: React.FC<TabletOptimizedControlsProps> = ({
  onToggleSidebar,
  onToggleInfo,
  onFitToView,
  onDownload,
  onShare,
  sidebarVisible
}) => {
  const { isTablet, isLandscape } = useScreenOrientation();
  const [infoVisible, setInfoVisible] = useState(false);
  
  if (!isTablet) return null;
  
  // Für Tablets in Landscape-Modus optimierte Kontrollelemente
  return (
    <>
      {/* Hauptsteuerelemente am oberen Rand */}
      <div className="fixed top-4 left-4 z-30 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="glass-button rounded-full h-12 w-12 shadow-md"
          aria-label={sidebarVisible ? "Seitenleiste ausblenden" : "Seitenleiste einblenden"}
        >
          {sidebarVisible ? <ChevronLeft className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        
        <div className="glass-panel px-4 py-2 rounded-full flex items-center shadow-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={onFitToView}
            className="rounded-full"
            aria-label="An Bildschirm anpassen"
          >
            <Maximize className="h-5 w-5 mr-1" />
            <span className="hidden md:inline">Anpassen</span>
          </Button>
          
          {onShare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="rounded-full ml-1"
              aria-label="Teilen"
            >
              <Share2 className="h-5 w-5 mr-1" />
              <span className="hidden md:inline">Teilen</span>
            </Button>
          )}
          
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              className="rounded-full ml-1"
              aria-label="Herunterladen"
            >
              <Download className="h-5 w-5 mr-1" />
              <span className="hidden md:inline">Download</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Info-Button rechts oben */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setInfoVisible(!infoVisible);
          onToggleInfo();
        }}
        className="glass-button fixed top-4 right-4 z-30 rounded-full h-12 w-12 shadow-md"
        aria-label="Informationen"
      >
        <Info className="h-6 w-6" />
      </Button>
      
      {/* Seitenleiste ein-/ausblenden Button für Hochformatmodus */}
      {!isLandscape && !sidebarVisible && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="glass-button fixed bottom-4 left-4 z-30 rounded-full h-12 w-12 shadow-md"
          aria-label="Seitenleiste einblenden"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}
    </>
  );
};

export default TabletOptimizedControls;
