
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Download, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  downloadScreenshot, 
  StoredScreenshot,
  removeScreenshot
} from '@/utils/screenshot';

interface ScreenshotDialogProps {
  onTakeScreenshot: () => Promise<StoredScreenshot>;
}

const ScreenshotDialog: React.FC<ScreenshotDialogProps> = ({ onTakeScreenshot }) => {
  const [open, setOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<StoredScreenshot | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScreenshot = async () => {
    try {
      setLoading(true);
      // Take a new screenshot and store it
      const newScreenshot = await onTakeScreenshot();
      setScreenshot(newScreenshot);
      setLoading(false);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      toast.error('Fehler beim Erstellen des Screenshots');
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!screenshot) return;
    
    // Use our utility to download the screenshot
    downloadScreenshot(screenshot);
  };

  const handleClose = () => {
    setOpen(false);
    
    // Clear current screenshot reference
    setScreenshot(null);
    // We don't need to revoke the URL here as it's handled by the store
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="glass-button"
        onClick={() => setOpen(true)}
        title="Screenshot erstellen"
      >
        <Camera size={16} />
        <span className="sr-only">Screenshot erstellen</span>
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Screenshot</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen Screenshot der aktuellen Ansicht.
            </DialogDescription>
            <DialogClose className="absolute right-4 top-4">
              <X className="h-4 w-4" />
              <span className="sr-only">Schließen</span>
            </DialogClose>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-2">
            {screenshot ? (
              <div className="relative border border-border rounded-md overflow-hidden">
                <img 
                  src={screenshot.url} 
                  alt="Screenshot" 
                  className="max-w-full max-h-[400px] object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] w-full border border-dashed border-border rounded-md">
                <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {loading ? 'Screenshot wird erstellt...' : 'Hier wird Ihr Screenshot angezeigt'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {!screenshot ? (
              <Button 
                onClick={handleScreenshot} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                <Camera className="h-4 w-4 mr-2" />
                {loading ? 'Wird erstellt...' : 'Screenshot erstellen'}
              </Button>
            ) : (
              <Button 
                onClick={handleDownload}
                className="w-full sm:w-auto"
                variant="default"
              >
                <Download className="h-4 w-4 mr-2" />
                Herunterladen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScreenshotDialog;
