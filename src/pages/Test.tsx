
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ModelViewer from '@/components/ModelViewer';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload } from 'lucide-react';

const Test = () => {
  const navigate = useNavigate();
  // Use a permanent GLB model path - this should be placed in public/models/
  const testModelUrl = '/models/test-model.glb';
  const testModelName = 'Demo Modell';

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-b from-background to-background overflow-hidden">
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
          
          <h1 className="text-lg font-medium ml-4">Demo DrohnenGLB by RooferGaming®</h1>
        </div>
        
        <Button
          variant="default"
          size="sm"
          onClick={() => navigate('/')}
          className="glass-button"
        >
          <Upload className="h-4 w-4 mr-2" />
          Eigenes Modell hochladen
        </Button>
      </header>
      
      <div className="flex-1 relative flex overflow-hidden">
        <main className="flex-1 relative w-full h-full">
          {/* Display the permanent test model */}
          <ModelViewer fileUrl={testModelUrl} fileName={testModelName} />
        </main>
      </div>
      
      <footer className="glass-panel w-full py-2 px-4 border-t border-border/50 z-10 text-center text-xs text-muted-foreground">
        <p>Demo-Version mit fest installiertem 3D-Modell | DrohnenGLB by RooferGaming®</p>
      </footer>
    </div>
  );
};

export default Test;
