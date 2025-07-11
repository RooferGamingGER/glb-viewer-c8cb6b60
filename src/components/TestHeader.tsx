import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Menu, X, HelpCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTutorial } from '@/contexts/TutorialContext';
import EturnityExportButton from '@/components/EturnityExportButton';
import { useScene } from '@/components/SceneProvider';

interface TestHeaderProps {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

const TestHeader: React.FC<TestHeaderProps> = ({ menuOpen, setMenuOpen }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setShowTutorial } = useTutorial();
  const { scene } = useScene();

  const handleOpenTutorial = () => {
    setShowTutorial(true);
  };

  return (
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
        <EturnityExportButton fileName="demo-model" isMobile={isMobile} scene={scene} />
        
        <Button
          variant="outline" 
          size="sm" 
          className="glass-button"
          onClick={handleOpenTutorial}
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          <span className={isMobile ? "sr-only" : ""}>Tutorial</span>
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
  );
};

export default TestHeader;