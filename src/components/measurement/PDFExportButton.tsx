
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText } from 'lucide-react';
import { generateMeasurementsPDF } from '@/utils/pdfExport';
import { Measurement } from '@/hooks/useMeasurements';
import { toast } from 'sonner';

interface PDFExportButtonProps {
  measurements: Measurement[];
  disabled?: boolean;
}

const PDFExportButton: React.FC<PDFExportButtonProps> = ({ 
  measurements,
  disabled = false
}) => {
  const handleExport = () => {
    try {
      if (measurements.length === 0) {
        toast.error('Keine Messungen zum Exportieren vorhanden');
        return;
      }
      
      generateMeasurementsPDF(measurements, 'messungen-export.pdf');
      toast.success('PDF erfolgreich erstellt');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Fehler beim Erstellen des PDFs');
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || measurements.length === 0}
      variant="outline"
      size="sm"
      className="h-7 w-7"
      title="Als PDF exportieren"
    >
      <FileText className="h-4 w-4" />
      <span className="sr-only">Als PDF exportieren</span>
    </Button>
  );
};

export default PDFExportButton;
