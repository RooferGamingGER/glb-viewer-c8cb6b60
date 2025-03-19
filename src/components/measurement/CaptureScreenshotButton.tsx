
import React from 'react';
import { Button } from "@/components/ui/button";
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useThreeContext } from '@/hooks/useThreeContext';
import { captureViewScreenshot } from '@/utils/captureViewScreenshot';

interface CaptureScreenshotButtonProps {
  measurementId: string;
  onScreenshotCaptured: (measurementId: string, screenshot: string) => void;
}

const CaptureScreenshotButton: React.FC<CaptureScreenshotButtonProps> = ({
  measurementId,
  onScreenshotCaptured
}) => {
  const { scene, camera, renderer } = useThreeContext();
  
  const handleCapture = () => {
    if (!scene || !camera || !renderer) {
      toast.error('3D-Ansicht nicht verfügbar');
      return;
    }
    
    const screenshot = captureViewScreenshot(renderer, scene, camera);
    if (screenshot) {
      onScreenshotCaptured(measurementId, screenshot);
      toast.success('Screenshot erfolgreich aufgenommen');
    } else {
      toast.error('Fehler beim Aufnehmen des Screenshots');
    }
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="flex items-center gap-1"
      onClick={handleCapture}
    >
      <Camera className="h-4 w-4" />
      <span>Screenshot aufnehmen</span>
    </Button>
  );
};

export default CaptureScreenshotButton;
