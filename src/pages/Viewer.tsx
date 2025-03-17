
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModelViewer from '@/components/ModelViewer';
import { useRequiredURLParam } from '@/hooks/useURLState';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import OrientationWarning from '@/components/OrientationWarning';

const Viewer = () => {
  const navigate = useNavigate();
  const { isPortrait } = useScreenOrientation();
  const [isFullscreen, setIsFullscreen] = useState(true);
  
  // Get the file URL and name from the URL parameters
  const fileUrl = useRequiredURLParam('fileUrl', '/', 'Keine Datei ausgewählt');
  const fileName = useRequiredURLParam('fileName', '/', 'Unbekannte Datei');
  
  useEffect(() => {
    // Check if the URL is a valid blob URL
    if (!fileUrl.startsWith('blob:')) {
      toast.error('Ungültige Datei-URL');
      navigate('/');
    }
    
    // Enable fullscreen on component mount
    const enterFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error("Error attempting to enable fullscreen:", err);
        });
      }
    };
    
    // Enter fullscreen on component mount
    enterFullscreen();
    
    // Listen for fullscreen change events
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', fullscreenChangeHandler);
    
    return () => {
      // Clean up event listener on unmount
      document.removeEventListener('fullscreenchange', fullscreenChangeHandler);
      
      // Exit fullscreen if needed
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error("Error attempting to exit fullscreen:", err);
        });
      }
    };
  }, [fileUrl, navigate]);

  // Add font preloading for the Inter font we use in text sprites
  useEffect(() => {
    // Preload the Inter font for text sprites
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(fontLink);
    
    return () => {
      // Clean up the font link when component unmounts
      document.head.removeChild(fontLink);
    };
  }, []);
  
  // Exit fullscreen function
  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-b from-background to-background overflow-hidden">
      {isPortrait && <OrientationWarning />}
      
      <header className="glass-panel w-full py-3 px-4 border-b border-border/50 z-10 flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="outline" 
            size="sm" 
            className="glass-button"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          
          <h1 className="text-lg font-medium ml-4">3D-Viewer</h1>
        </div>
        
        {isFullscreen && (
          <Button
            variant="outline"
            size="sm"
            className="glass-button"
            onClick={exitFullscreen}
            title="Vollbildmodus beenden"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </header>
      
      <div className="flex-1 relative flex overflow-hidden">
        <SidebarProvider defaultOpen={true} open={true}>
          <main className="flex-1 relative w-full h-full">
            {fileUrl && (
              <ModelViewer fileUrl={fileUrl} fileName={fileName} />
            )}
          </main>
        </SidebarProvider>
      </div>
    </div>
  );
};

export default Viewer;
