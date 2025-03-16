
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X, FileText, Loader2 } from 'lucide-react';
import { Measurement } from '@/hooks/useMeasurements';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { generateMeasurementsPDF } from '@/utils/pdfExport';
import { toast } from 'sonner';
import ProjectDataForm, { ProjectDataType } from './ProjectDataForm';
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [activeTab, setActiveTab] = useState("preview");
  const [projectData, setProjectData] = useState<ProjectDataType | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.info('PDF wird erstellt...', {
        duration: 3000
      });
      
      const success = await generateMeasurementsPDF(measurements, 'messungen-export.pdf', projectData);
      
      if (success) {
        toast.success('PDF erfolgreich erstellt');
        setTimeout(() => {
          onOpenChange(false);
        }, 500);
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

  const handleSubmitProjectData = (data: ProjectDataType) => {
    setProjectData(data);
    setActiveTab("preview");
    toast.success('Projektdaten gespeichert');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>PDF Exportieren</DialogTitle>
          <DialogDescription>
            Vorschau der Messungen und Angabe von Projektdaten für den PDF-Export
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Vorschau</TabsTrigger>
            <TabsTrigger value="projectData">Projektdaten</TabsTrigger>
          </TabsList>
          
          <TabsContent value="preview">
            <div className="max-h-[calc(100vh-300px)] overflow-auto my-4">
              {projectData && (
                <div className="mb-4 p-4 border rounded-md bg-muted/30">
                  <h3 className="font-medium mb-2">Projektinformationen</h3>
                  <p><strong>Projekt:</strong> {projectData.projectName || '-'}</p>
                  <p><strong>Vorgang:</strong> {projectData.currentProcess || '-'}</p>
                  <p><strong>Erstellt von:</strong> {projectData.creator || '-'}</p>
                  {projectData.contactInfo && (
                    <p><strong>Kontakt:</strong> {projectData.contactInfo}</p>
                  )}
                </div>
              )}
              
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
          </TabsContent>
          
          <TabsContent value="projectData">
            <div className="py-4">
              <ProjectDataForm 
                onSubmit={handleSubmitProjectData} 
                initialData={projectData || {}}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Alert variant="info" className="mb-4 text-xs">
            <AlertDescription>
              Auf mobilen Geräten wird die PDF-Datei automatisch zum Download angeboten oder im Browser geöffnet.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Abbrechen
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="relative"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird exportiert...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  PDF herunterladen
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDFPreviewDialog;
