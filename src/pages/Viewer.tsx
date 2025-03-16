
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

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen w-full flex flex-col bg-gradient-to-b from-background to-background overflow-hidden">
        <header className="glass-panel w-full py-3 px-4 border-b border-border/50 z-10 flex items-center">
          <Button 
            variant="outline" 
            size="sm" 
            className="glass-button mr-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          
          <h1 className="text-lg font-medium">3D-Viewer</h1>
        </header>
        
        <main className="flex-1 relative">
          {fileUrl && (
            <ModelViewer fileUrl={fileUrl} fileName={fileName} />
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Viewer;
