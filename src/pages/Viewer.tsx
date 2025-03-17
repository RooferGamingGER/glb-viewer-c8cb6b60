
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModelViewer from '@/components/ModelViewer';
import { useRequiredURLParam } from '@/hooks/useURLState';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';

const Viewer = () => {
  const navigate = useNavigate();
  
  // Get the file URL and name from the URL parameters
  const fileUrl = useRequiredURLParam('fileUrl', '/', 'Keine Datei ausgewählt');
  const fileName = useRequiredURLParam('fileName', '/', 'Unbekannte Datei');
  
  useEffect(() => {
    // Check if the URL is a valid blob URL
    if (!fileUrl.startsWith('blob:')) {
      toast.error('Ungültige Datei-URL');
      navigate('/');
    }
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

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-b from-background to-background overflow-hidden">
      <header className="glass-panel w-full py-3 px-4 border-b border-border/50 z-50 flex items-center">
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
