import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModelViewer from '@/components/ModelViewer';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Menu, X, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import OrientationWarning from '@/components/OrientationWarning';
import { SidebarProvider } from '@/components/ui/sidebar';
import PerformanceSettings from '@/components/PerformanceSettings';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Test = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isPortrait } = useScreenOrientation();
  const [menuOpen, setMenuOpen] = useState(false);
  
  const testModelUrl = '/models/test-model.glb';
  const testModelName = 'Demo Modell';

  useEffect(() => {
    setMenuOpen(false);
  }, [isPortrait]);

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
        
        <div className="flex items-center space-x-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Einstellungen</SheetTitle>
                <SheetDescription>
                  Passen Sie die Performance und Qualität an Ihr Gerät an.
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6">
                <PerformanceSettings />
              </div>
            </SheetContent>
          </Sheet>
          
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
              
              <div className="mt-6 border-t border-border pt-4">
                <h4 className="text-sm font-medium mb-3">Leistungseinstellungen</h4>
                <PerformanceSettings />
              </div>
            </div>
          </div>
        )}
        
        <SidebarProvider defaultOpen={!isMobile} open={!isMobile}>
          <main className="flex-1 relative w-full h-full">
            <ModelViewer 
              fileUrl={testModelUrl} 
              fileName={testModelName} 
            />
          </main>
        </SidebarProvider>
      </div>
      
      <footer className="glass-panel w-full py-2 px-4 border-t border-border/50 z-10 text-center text-xs text-muted-foreground">
        <p>Demo-Version mit fest installiertem 3D-Modell | DrohnenGLB by RooferGaming®</p>
      </footer>
    </div>
  );
};

export default Test;
