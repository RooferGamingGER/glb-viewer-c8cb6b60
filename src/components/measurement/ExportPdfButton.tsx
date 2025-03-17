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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import MeasurementTable from './MeasurementTable';

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
      projectNumber: '',
      projectAddress: '',
      clientName: '',
      contactPerson: '',
      droneDate: new Date().toISOString().split('T')[0],
      creationDate: new Date().toISOString().split('T')[0],
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
    setTimeout(() => setExportProgress(60), 600);
    
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
          className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-white w-full" 
          title="Als PDF exportieren"
          disabled={measurements.length === 0}
        >
          <FileDown className="h-4 w-4" />
          <span>PDF Export</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vermessungsbericht exportieren</DialogTitle>
          <DialogDescription>
            Erstellen Sie einen professionellen Vermessungsbericht als PDF
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="project">Projektdaten</TabsTrigger>
            <TabsTrigger value="preview">Datenvorschau</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4 flex flex-col items-center justify-center h-full">
                    <h3 className="text-lg font-semibold mb-2">Messungen</h3>
                    <div className="text-3xl font-bold">{measurements.length}</div>
                    <div className="text-muted-foreground text-sm mt-2">Messungen gesamt</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-lg font-semibold mb-2">Messtypen</h3>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20">
                        <div className="text-xl font-bold">{lengthCount}</div>
                        <div className="text-xs">Längen</div>
                      </div>
                      <div className="p-2 rounded-md bg-green-50 dark:bg-green-900/20">
                        <div className="text-xl font-bold">{heightCount}</div>
                        <div className="text-xs">Höhen</div>
                      </div>
                      <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/20">
                        <div className="text-xl font-bold">{areaCount}</div>
                        <div className="text-xs">Flächen</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardContent className="pt-4">
                  <h3 className="text-sm font-medium mb-2">Berichtsinhalt</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li className="text-sm">Deckblatt mit Projektinformationen</li>
                    <li className="text-sm">Detaillierte Messungstabellen</li>
                    <li className="text-sm">Statistiken zu Ihren Messungen</li>
                    <li className="text-sm">Aufschlüsselung nach Messtypen</li>
                    {areaCount > 0 && (
                      <li className="text-sm">Detailansicht der Flächenmessungen</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="project">
            <Form {...form}>
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4 grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Berichtstitel</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Vermessungsbericht" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="projectNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Projektnummer</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="z.B. PRJ-2023-001" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="projectAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Objektadresse</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Musterstraße 123, 12345 Musterstadt" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="clientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Auftraggeber</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Musterfirma GmbH" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ausführender Betrieb</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ihre Firma GmbH" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                    
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
          </TabsContent>
          
          <TabsContent value="preview">
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-sm font-medium mb-4">Vorschau der Messdaten</h3>
                <MeasurementTable measurements={measurements} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isExporting && (
          <div className="mb-2">
            <Progress value={exportProgress} className="w-full" />
            <p className="text-xs text-center mt-1 text-muted-foreground">
              PDF wird erstellt{exportProgress < 100 ? '...' : ' - Fertig!'}
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
            {isExporting ? 'Wird exportiert...' : 'PDF exportieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportPdfButton;
