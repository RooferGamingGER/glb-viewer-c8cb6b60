
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from 'lucide-react';
import { generateMeasurementsPDF } from '@/utils/pdfExport';
import { Measurement } from '@/hooks/useMeasurements';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";

interface PDFExportButtonProps {
  measurements: Measurement[];
  disabled?: boolean;
}

const PDFExportButton: React.FC<PDFExportButtonProps> = ({ 
  measurements,
  disabled = false
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      if (measurements.length === 0) {
        toast.error('Keine Messungen zum Exportieren vorhanden');
        return;
      }
      
      setIsExporting(true);
      toast.info('PDF wird erstellt...', {
        duration: 3000
      });
      
      const success = await generateMeasurementsPDF(measurements, 'messungen-export.pdf');
      
      if (success) {
        toast.success('PDF erfolgreich erstellt');
      } else {
        // User cancelled the operation
        toast.info('PDF-Export abgebrochen');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Fehler beim Erstellen des PDFs. Bitte versuchen Sie es erneut.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || measurements.length === 0 || isExporting}
      variant="outline"
      size="sm"
      className="h-7 w-7"
      title="Als PDF exportieren"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      <span className="sr-only">Als PDF exportieren</span>
    </Button>
  );
};

export default PDFExportButton;
