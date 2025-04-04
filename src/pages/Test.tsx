
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModelViewer from '@/components/ModelViewer';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Menu, X, Sun } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import OrientationWarning from '@/components/OrientationWarning';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Measurement } from '@/types/measurements';
import { useMeasurementContext } from '@/contexts/MeasurementContext';
import { toast } from '@/components/ui/use-toast';

const Test = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isPortrait } = useScreenOrientation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pvMeasurementAdded, setPvMeasurementAdded] = useState(false);

  // Get measurement context for testing PV modules
  const { addMeasurement } = useMeasurementContext();
  
  // Use a permanent GLB model path - this should be placed in public/models/
  const testModelUrl = '/models/test-model.glb';
  const testModelName = 'Demo Modell';

  // Close mobile menu when orientation changes
  useEffect(() => {
    setMenuOpen(false);
  }, [isPortrait]);

  // Function to add a test PV measurement
  const addTestPVMeasurement = () => {
    if (pvMeasurementAdded) {
      toast({
        title: "PV Module bereits hinzugefügt",
        description: "Ein Test-PV-Modul wurde bereits zum Modell hinzugefügt.",
        variant: "default",
      });
      return;
    }

    // Create a test PV measurement
    const testPVMeasurement: Measurement = {
      id: "test-pv-module-" + Date.now(),
      type: "solar",
      points: [
        { x: 1, y: 0.5, z: 1 },
        { x: 1, y: 0.5, z: 2 },
        { x: 2, y: 0.5, z: 2 },
        { x: 2, y: 0.5, z: 1 }
      ],
      value: 4.0, // 4 square meters
      label: "Test PV Module",
      visible: true,
      labelVisible: true,
      pvModuleInfo: {
        moduleCount: 4,
        moduleWidth: 1.0,
        moduleHeight: 0.5,
        orientation: "landscape",
        pvModuleSpec: {
          name: "Standard Solar Module",
          power: 380,
          width: 1.0,
          height: 0.5,
          depth: 0.04,
          frameThickness: 0.04
        }
      }
    };

    // Add the measurement
    addMeasurement(testPVMeasurement);
    setPvMeasurementAdded(true);
    
    toast({
      title: "Test PV Module hinzugefügt",
      description: "Ein Test-PV-Modul wurde zum Modell hinzugefügt. Prüfen Sie den Reiter 'Messungen' für Details.",
      variant: "default",
    });
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-b from-background to-background overflow-hidden">
      {isPortrait && <OrientationWarning />}
      
      <header className="glass-panel w-full py-3 px-4 border-b border-border/50 z-10 flex items-center justify-between">
        <div className="flex items-center">
          {isMobile ? (
            <Button 
              variant="outline" 
              size="icon"
              className="glass-button mr-2 h-8 w-8"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          ) : null}
          
          <Button 
            variant="outline" 
            size="sm" 
            className="glass-button"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className={isMobile ? "sr-only" : ""}>Zurück</span>
          </Button>
          
          <h1 className={`font-medium ml-4 ${isMobile ? "text-sm" : "text-lg"}`}>
            {isMobile ? "Demo DrohnenGLB" : "Demo DrohnenGLB by RooferGaming®"}
          </h1>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addTestPVMeasurement}
            className="glass-button"
          >
            <Sun className="h-4 w-4 mr-2" />
            <span className={isMobile ? "sr-only" : ""}>Test PV-Modul</span>
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate('/')}
            className="glass-button"
          >
            <Upload className="h-4 w-4 mr-2" />
            <span className={isMobile ? "sr-only" : ""}>Eigenes Modell hochladen</span>
          </Button>
        </div>
      </header>
      
      <div className="flex-1 relative flex overflow-hidden">
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
                  variant="outline" 
                  className="justify-start"
                  onClick={addTestPVMeasurement}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Test PV-Modul hinzufügen
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
        
        {/* Modified SidebarProvider to use a container with flex-1 and pb-0, 
            ensuring it doesn't overlap with the footer */}
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <SidebarProvider defaultOpen={!isMobile} open={!isMobile}>
            <main className="flex-1 relative w-full h-full">
              {/* Display the permanent test model with touch-friendly controls */}
              <ModelViewer 
                fileUrl={testModelUrl} 
                fileName={testModelName} 
              />
            </main>
          </SidebarProvider>
        </div>
      </div>
      
      <footer className="glass-panel w-full py-2 px-4 border-t border-border/50 z-10 text-center text-xs text-muted-foreground">
        <p>Demo-Version mit fest installiertem 3D-Modell | DrohnenGLB by RooferGaming®</p>
      </footer>
    </div>
  );
};

export default Test;
