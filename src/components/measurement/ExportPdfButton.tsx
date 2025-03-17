
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { Measurement } from '@/hooks/useMeasurements';
import { exportMeasurementsToPdf, CoverPageData } from '@/utils/pdfExport';
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface ExportPdfButtonProps {
  measurements: Measurement[];
}

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({ measurements }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  
  const form = useForm<CoverPageData>({
    defaultValues: {
      title: 'Vermessungsbericht',
      companyName: '',
      projectAddress: '',
      contactPerson: '',
      droneDate: new Date().toISOString().split('T')[0],
      notes: ''
    }
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
      const coverData = form.getValues();
      const success = await exportMeasurementsToPdf(measurements, coverData);
      setExportProgress(100);
      
      if (success) {
        toast.success('PDF wurde erfolgreich erstellt');
        // Auto-close dialog after successful export
        setTimeout(() => {
          dialogCloseRef.current?.click();
        }, 1000);
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

  // Calculate summary statistics
  const lengthCount = measurements.filter(m => m.type === 'length').length;
  const heightCount = measurements.filter(m => m.type === 'height').length;
  const areaCount = measurements.filter(m => m.type === 'area').length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-white" 
          title="Als PDF exportieren"
        >
          <FileDown className="h-4 w-4" />
          <span>PDF Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Als PDF exportieren</DialogTitle>
          <DialogDescription>
            Exportieren Sie Ihre Messungen als PDF-Dokument
          </DialogDescription>
        </DialogHeader>
        
        {measurements.length > 0 && (
          <div className="bg-muted/50 p-3 rounded-md mb-3">
            <h3 className="text-sm font-medium mb-2">Messdaten Übersicht:</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Messtyp</TableHead>
                  <TableHead>Anzahl</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Längen</TableCell>
                  <TableCell>{lengthCount}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Höhen</TableCell>
                  <TableCell>{heightCount}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Flächen</TableCell>
                  <TableCell>{areaCount}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Gesamt</TableCell>
                  <TableCell className="font-medium">{measurements.length}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
        
        <Form {...form}>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Deckblatt Informationen</h3>
            <Card>
              <CardContent className="pt-4 grid gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Überschrift</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Vermessungsbericht" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name des Betriebes</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Firma GmbH" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="projectAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Anschrift des Objekts</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Musterstraße 123, 12345 Musterstadt" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ansprechpartner</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Max Mustermann" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="droneDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Datum der Drohnenaufnahmen</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bemerkungen (optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Zusätzliche Informationen oder Notizen" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </Form>

        {isExporting && (
          <div className="mb-2">
            <Progress value={exportProgress} className="w-full" />
            <p className="text-xs text-center mt-1 text-muted-foreground">
              PDF wird erstellt...
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-between mt-4">
          <DialogClose ref={dialogCloseRef} asChild>
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
