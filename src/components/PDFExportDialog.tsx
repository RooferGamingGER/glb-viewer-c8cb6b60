
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, X, Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Measurement } from '@/hooks/useMeasurements';
import { exportMeasurementsToPDF } from '@/utils/pdfExport';

interface PDFExportDialogProps {
  onTakeScreenshot: () => Promise<string>;
  measurements: Measurement[];
}

const PDFExportDialog: React.FC<PDFExportDialogProps> = ({ 
  onTakeScreenshot,
  measurements 
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('3D Modell Messungen');
  const [fileName, setFileName] = useState('messungen.pdf');
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [loading, setLoading] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen && screenshotPreview) {
      // Release the blob URL to free memory when dialog closes
      URL.revokeObjectURL(screenshotPreview);
      setScreenshotPreview(null);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      
      let screenshotUrl = '';
      
      // Only take a screenshot if it's to be included
      if (includeScreenshot) {
        // If we don't have a preview yet, take a screenshot
        if (!screenshotPreview) {
          screenshotUrl = await onTakeScreenshot();
        } else {
          screenshotUrl = screenshotPreview;
        }
      }
      
      // Then generate and download the PDF
      await exportMeasurementsToPDF({
        title,
        screenshotUrl,
        measurements,
        filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
        includeScreenshot
      });
      
      toast.success('PDF erfolgreich exportiert');
      setOpen(false);
      
      // Release the blob URL to free memory
      if (screenshotUrl.startsWith('blob:')) {
        URL.revokeObjectURL(screenshotUrl);
      }
      setScreenshotPreview(null);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Fehler beim PDF-Export');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewScreenshot = async () => {
    try {
      setLoading(true);
      // Clear any existing preview first
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
      
      const screenshotUrl = await onTakeScreenshot();
      setScreenshotPreview(screenshotUrl);
    } catch (error) {
      console.error('Failed to take screenshot preview:', error);
      toast.error('Fehler beim Erstellen der Vorschau');
    } finally {
      setLoading(false);
    }
  };

  // Check if the button should be enabled
  const hasMeasurements = measurements.length > 0;

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="glass-button"
        onClick={() => setOpen(true)}
        title="Als PDF exportieren"
        disabled={!hasMeasurements}
      >
        <FileText size={16} />
        <span className="sr-only">Als PDF exportieren</span>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>PDF-Export</DialogTitle>
            <DialogDescription>
              Exportieren Sie Ihre Messungen als PDF-Dokument.
            </DialogDescription>
            <DialogClose className="absolute right-4 top-4">
              <X className="h-4 w-4" />
              <span className="sr-only">Schließen</span>
            </DialogClose>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel des PDF-Dokuments"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="fileName">Dateiname</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="messungen.pdf"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="includeScreenshot" 
                checked={includeScreenshot}
                onCheckedChange={(checked) => {
                  setIncludeScreenshot(checked === true);
                  // Clear screenshot preview if unchecked
                  if (checked === false && screenshotPreview) {
                    URL.revokeObjectURL(screenshotPreview);
                    setScreenshotPreview(null);
                  }
                }}
              />
              <Label htmlFor="includeScreenshot" className="cursor-pointer">
                Screenshot einbinden
              </Label>
            </div>

            {includeScreenshot && (
              <div className="mt-2">
                <div className="flex justify-between mb-2">
                  <Label>Screenshot-Vorschau</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePreviewScreenshot}
                    disabled={loading}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Vorschau erstellen
                  </Button>
                </div>
                
                <div className="border border-border rounded-md overflow-hidden bg-muted/20">
                  {screenshotPreview ? (
                    <img 
                      src={screenshotPreview} 
                      alt="Vorschau" 
                      className="max-h-[200px] w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground">
                      <Camera className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">
                        {loading ? 'Screenshot wird erstellt...' : 'Klicken Sie auf "Vorschau erstellen", um einen Screenshot zu generieren'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={handleExport}
              disabled={loading || !title || !fileName}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Exportiere...' : 'PDF exportieren'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PDFExportDialog;
