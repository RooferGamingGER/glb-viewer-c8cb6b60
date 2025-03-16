
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { Measurement } from '@/hooks/useMeasurements';
import { exportMeasurementsToPdf, PdfExportOptions } from '@/utils/pdfExport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";

interface ExportPdfButtonProps {
  measurements: Measurement[];
}

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ measurements }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportOptions, setExportOptions] = useState<PdfExportOptions>({
    title: 'Messungen',
    includeDateTime: true,
    showLogo: true,
    pageSize: 'a4',
    orientation: 'portrait'
  });

  const handleExport = async () => {
    if (measurements.length === 0) {
      toast.error('Keine Messungen zum Exportieren vorhanden');
      return;
    }

    setIsExporting(true);
    setExportProgress(10);
    
    setTimeout(() => setExportProgress(30), 300);
    setTimeout(() => setExportProgress(50), 600);
    
    try {
      const success = await exportMeasurementsToPdf(measurements, exportOptions);
      setExportProgress(100);
      
      if (success) {
        toast.success('PDF wurde erfolgreich erstellt');
      } else {
        toast.error('Fehler beim Erstellen des PDFs');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ein Fehler ist beim Exportieren aufgetreten');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  const handleOptionChange = (key: keyof PdfExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1" 
          title="Als PDF exportieren"
        >
          <FileDown className="h-4 w-4" />
          <span>PDF Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Als PDF exportieren</DialogTitle>
          <DialogDescription>
            Exportieren Sie Ihre Messungen als PDF-Dokument
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">PDF-Titel</h3>
            <input
              type="text"
              value={exportOptions.title}
              onChange={(e) => handleOptionChange('title', e.target.value)}
              className="w-full border border-input bg-background px-3 py-2 text-sm rounded-md"
              placeholder="Titel des PDFs"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="includeDateTime" 
              checked={exportOptions.includeDateTime}
              onCheckedChange={(checked) => handleOptionChange('includeDateTime', checked)}
            />
            <Label htmlFor="includeDateTime">Datum und Uhrzeit anzeigen</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="showLogo" 
              checked={exportOptions.showLogo}
              onCheckedChange={(checked) => handleOptionChange('showLogo', checked)}
            />
            <Label htmlFor="showLogo">Logo anzeigen</Label>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Papiergröße</h3>
            <RadioGroup 
              value={exportOptions.pageSize} 
              onValueChange={(value) => handleOptionChange('pageSize', value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="a4" id="a4" />
                <Label htmlFor="a4">A4</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="letter" id="letter" />
                <Label htmlFor="letter">Letter</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Ausrichtung</h3>
            <RadioGroup 
              value={exportOptions.orientation} 
              onValueChange={(value) => handleOptionChange('orientation', value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="portrait" id="portrait" />
                <Label htmlFor="portrait">Hochformat</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="landscape" id="landscape" />
                <Label htmlFor="landscape">Querformat</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {isExporting && (
          <div className="mb-2">
            <Progress value={exportProgress} className="w-full" />
            <p className="text-xs text-center mt-1 text-muted-foreground">
              PDF wird erstellt...
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Abbrechen
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={handleExport}
            disabled={isExporting || measurements.length === 0}
          >
            {isExporting ? 'Wird exportiert...' : 'Exportieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportPdfButton;
