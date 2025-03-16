
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, X } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      
      // First take a screenshot
      const screenshotUrl = await onTakeScreenshot();
      
      // Then generate and download the PDF
      await exportMeasurementsToPDF({
        title,
        screenshotUrl,
        measurements,
        filename: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
      });
      
      toast.success('PDF erfolgreich exportiert');
      setOpen(false);
      
      // Release the blob URL to free memory
      if (screenshotUrl.startsWith('blob:')) {
        URL.revokeObjectURL(screenshotUrl);
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Fehler beim PDF-Export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="glass-button"
        onClick={() => setOpen(true)}
        title="Als PDF exportieren"
        disabled={measurements.length === 0}
      >
        <FileText size={16} />
        <span className="sr-only">Als PDF exportieren</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
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
