
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModelViewer from '@/components/ModelViewer';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Menu, X, HelpCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import OrientationWarning from '@/components/OrientationWarning';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Measurement } from '@/types/measurements';
import { useMeasurementContext } from '@/contexts/MeasurementContext';
import { toast } from '@/components/ui/use-toast';
import { PointSnappingProvider } from '@/contexts/PointSnappingContext';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';
import { useTutorial } from '@/contexts/TutorialContext';
import EturnityExportButton from '@/components/EturnityExportButton';
import { SceneProvider, useScene } from '@/components/SceneProvider';
import TestHeader from '@/components/TestHeader';
import ModelViewerWrapper from '@/components/ModelViewerWrapper';

const Test = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isPortrait } = useScreenOrientation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { showTutorial, setShowTutorial } = useTutorial();
  
  // Use a permanent GLB model path - this should be placed in public/models/
  const testModelUrl = '/models/test-model.glb';
  const testModelName = 'Demo Modell';

  // Close mobile menu when orientation changes
  useEffect(() => {
    setMenuOpen(false);
  }, [isPortrait]);

  return (
    <SceneProvider>
      <div className="flex flex-col h-screen w-full bg-gradient-to-b from-background to-background overflow-hidden">
        {isPortrait && <OrientationWarning />}
        
        <TestHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        
        {/* Main content area - takes full remaining height */}
        <div className="flex-1 flex overflow-hidden">
          {/* Mobile menu overlay */}
          {isMobile && menuOpen && (
            <div 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20"
              onClick={() => setMenuOpen(false)}
            >
              <div 
                className="w-64 h-full bg-background border-r border-border/50 p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-medium mb-4">Menü</h3>
                <div className="flex flex-col space-y-2">
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => navigate('/')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Zurück zur Startseite
                  </Button>
                  <Button 
                    variant="default" 
                    className="justify-start"
                    onClick={() => navigate('/')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Eigenes Modell hochladen
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* SidebarProvider with full height */}
          <SidebarProvider defaultOpen={!isMobile} open={!isMobile} className="h-full">
            <main className="flex-1 relative w-full h-full">
              <ModelViewerWrapper 
                fileUrl={testModelUrl} 
                fileName={testModelName} 
              />
            </main>
          </SidebarProvider>
        </div>

        {/* Tutorial Overlay with showButton set to false */}
        <TutorialOverlay showButton={false} />
      </div>
    </SceneProvider>
  );
};

export default Test;
