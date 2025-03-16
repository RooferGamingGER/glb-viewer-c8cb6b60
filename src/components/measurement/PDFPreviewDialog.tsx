
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from 'lucide-react';
import { Measurement } from '@/hooks/useMeasurements';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { generateMeasurementsPDF } from '@/utils/pdfExport';
import { toast } from 'sonner';

interface PDFPreviewDialogProps {
  measurements: Measurement[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper function to format measurement types
const formatType = (type: string): string => {
  switch (type) {
    case 'length': return 'Länge';
    case 'height': return 'Höhe';
    case 'area': return 'Fläche';
    default: return type;
  }
};

// Helper to format values based on type
const formatValue = (value: number, type: string): string => {
  if (type === 'area') {
    return `${value.toFixed(2)} m²`;
  }
  return `${value.toFixed(2)} m`;
};

const PDFPreviewDialog: React.FC<PDFPreviewDialogProps> = ({
  measurements,
  open,
  onOpenChange,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await generateMeasurementsPDF(measurements, 'messungen-export.pdf');
      toast.success('PDF erfolgreich erstellt');
      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Fehler beim Erstellen des PDFs');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>PDF Vorschau</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[calc(100vh-200px)] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Messungstyp</TableHead>
                <TableHead>Bezeichnung</TableHead>
                <TableHead>Wert</TableHead>
                <TableHead>Neigung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurements.map((measurement) => (
                <TableRow key={measurement.id}>
                  <TableCell>{formatType(measurement.type)}</TableCell>
                  <TableCell>{measurement.description || '-'}</TableCell>
                  <TableCell>{formatValue(measurement.value, measurement.type)}</TableCell>
                  <TableCell>
                    {measurement.type === 'length' && measurement.inclination 
                      ? `${measurement.inclination.toFixed(1)}°` 
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Abbrechen
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Wird exportiert...' : 'PDF herunterladen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDFPreviewDialog;
