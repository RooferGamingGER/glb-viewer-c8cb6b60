
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

interface ScreenshotDialogProps {
  onTakeScreenshot: () => Promise<string>;
}

const ScreenshotDialog: React.FC<ScreenshotDialogProps> = ({ onTakeScreenshot }) => {
  const [open, setOpen] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScreenshot = async () => {
    try {
      setLoading(true);
      const url = await onTakeScreenshot();
      setScreenshotUrl(url);
      setLoading(false);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      toast.error('Fehler beim Erstellen des Screenshots');
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!screenshotUrl) return;
    
    const link = document.createElement('a');
    link.href = screenshotUrl;
    link.download = `screenshot-${new Date().toISOString().replace(/:/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Screenshot heruntergeladen');
  };

  const handleClose = () => {
    setOpen(false);
    // Revoke the blob URL when closing to free up memory
    if (screenshotUrl && screenshotUrl.startsWith('blob:')) {
      URL.revokeObjectURL(screenshotUrl);
    }
    setScreenshotUrl(null);
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
            {screenshotUrl ? (
              <div className="relative border border-border rounded-md overflow-hidden">
                <img 
                  src={screenshotUrl} 
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
            {!screenshotUrl ? (
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
