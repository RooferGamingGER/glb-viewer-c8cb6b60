import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, Image } from 'lucide-react';
import { toast } from 'sonner';
import { Measurement } from '@/hooks/useMeasurements';
import { exportMeasurementsToPdf, CoverPageData } from '@/utils/pdfExport';
import { consolidatePenetrations } from '@/utils/exportUtils';
import { useThreeContext, asPerspectiveCamera, generatePolygon2D } from '@/hooks/useThreeContext';
import { captureAreaMeasurement } from '@/utils/captureScreenshot';
import { createCombinedRoofPlan } from '@/utils/roofPlanRenderer';
import * as THREE from 'three';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import MeasurementTable from './MeasurementTable';
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
interface ExportPdfButtonProps {
  measurements: Measurement[];
}
const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({
  measurements
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [use2DRendering, setUse2DRendering] = useState(true);
  const [includeRoofPlan, setIncludeRoofPlan] = useState(true);
  const [generatedRoofPlan, setGeneratedRoofPlan] = useState<string | null>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const {
    scene,
    camera,
    renderer,
    canvas
  } = useThreeContext();
  const form = useForm<CoverPageData>({
    defaultValues: {
      title: 'Vermessungsbericht',
      companyName: 'DrohnenGLB by RooferGaming',
      projectNumber: '',
      projectAddress: '',
      clientName: '',
      contactPerson: '',
      creationDate: new Date().toISOString().split('T')[0],
      notes: ''
    }
  });

  // Auto-generate roof plan when dialog opens or when measurements change
  useEffect(() => {
    if (measurements.length > 0 && includeRoofPlan) {
      generateRoofPlan();
    }
  }, [measurements, includeRoofPlan]);
  const generateRoofPlan = () => {
    if (measurements.length === 0) return;
    try {
      // Always use top-down view (useTopDownView=true) for consistent roof plans
      const roofPlan = createCombinedRoofPlan(measurements, 1200, 900, 0.1, true);
      setGeneratedRoofPlan(roofPlan);
    } catch (error) {
      console.error('Error generating roof plan:', error);
    }
  };
  const hasCustomScreenshots = measurements.some(m => m.customScreenshots && m.customScreenshots.length > 0);
  const lengthCount = measurements.filter(m => m.type === 'length').length;
  const heightCount = measurements.filter(m => m.type === 'height').length;
  const areaCount = measurements.filter(m => m.type === 'area').length;
  const previewMeasurements = consolidatePenetrations(measurements);
  const screenshotCount = measurements.reduce((total, m) => total + (m.customScreenshots?.length || 0), 0);
  const handleExport = async () => {
    if (measurements.length === 0) {
      toast.error('Keine Messungen zum Exportieren vorhanden');
      return;
    }
    setIsExporting(true);
    setExportProgress(10);
    try {
      const areaMeasurements = measurements.filter(m => m.type === 'area');
      const solarMeasurements = measurements.filter(m => m.type === 'solar');
      const measurementsWithVisuals = [...measurements];
      const perspCamera = asPerspectiveCamera(camera);
      setExportProgress(20);
      for (let i = 0; i < areaMeasurements.length; i++) {
        const measurement = areaMeasurements[i];
        if (use2DRendering) {
          const polygon2D = generatePolygon2D(measurement);
          if (polygon2D) {
            const index = measurementsWithVisuals.findIndex(m => m.id === measurement.id);
            if (index !== -1) {
              measurementsWithVisuals[index] = {
                ...measurementsWithVisuals[index],
                polygon2D,
                screenshot: polygon2D
              };
            }
          }
        } else if (scene && perspCamera && renderer && canvas) {
          const screenshot = await captureAreaMeasurement(scene, perspCamera, renderer, measurement, canvas, false);
          if (screenshot) {
            const index = measurementsWithVisuals.findIndex(m => m.id === measurement.id);
            if (index !== -1) {
              measurementsWithVisuals[index] = {
                ...measurementsWithVisuals[index],
                screenshot
              };
            }
          }
        }
        setExportProgress(20 + Math.floor(i / areaMeasurements.length * 30));
      }
      for (let i = 0; i < solarMeasurements.length; i++) {
        const measurement = solarMeasurements[i];
        if (use2DRendering) {
          const polygon2D = generatePolygon2D(measurement);
          if (polygon2D) {
            const index = measurementsWithVisuals.findIndex(m => m.id === measurement.id);
            if (index !== -1) {
              measurementsWithVisuals[index] = {
                ...measurementsWithVisuals[index],
                polygon2D,
                screenshot: polygon2D
              };
            }
          }
        } else if (scene && perspCamera && renderer && canvas) {
          const screenshot = await captureAreaMeasurement(scene, perspCamera, renderer, measurement, canvas, false);
          if (screenshot) {
            const index = measurementsWithVisuals.findIndex(m => m.id === measurement.id);
            if (index !== -1) {
              measurementsWithVisuals[index] = {
                ...measurementsWithVisuals[index],
                screenshot
              };
            }
          }
        }
      }
      setExportProgress(50);
      if (includeRoofPlan) {
        // Use the pre-generated roof plan or generate it if needed
        if (!generatedRoofPlan) {
          // Always use top-down view for the roof plan
          const roofPlan = createCombinedRoofPlan(measurements, 1200, 900, 0.1, true);
          if (roofPlan) {
            (measurementsWithVisuals as any).roofPlan = roofPlan;
          }
        } else {
          // Use the pre-generated roof plan
          (measurementsWithVisuals as any).roofPlan = generatedRoofPlan;
        }
      }
      setExportProgress(70);
      const coverData = form.getValues();
      const success = await exportMeasurementsToPdf(measurementsWithVisuals, coverData);
      setExportProgress(100);
      if (success) {
        toast.success('PDF wurde erfolgreich erstellt');
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
  return <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full flex items-center gap-2">
          <FileDown className="h-4 w-4" />
          <span>PDF exportieren</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Vermessungsbericht exportieren</DialogTitle>
          <DialogDescription>
            Bitte fülle die folgenden Informationen aus, um den Bericht zu erstellen.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="info">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="info">Berichtsinfos</TabsTrigger>
            <TabsTrigger value="preview">
              Messungen ({measurements.length})
            </TabsTrigger>
            {hasCustomScreenshots && <TabsTrigger value="screenshots">
                Screenshots ({screenshotCount})
              </TabsTrigger>}
          </TabsList>
          
          <TabsContent value="info">
            <Form {...form}>
              <div className="grid gap-4 py-2">
                <FormField control={form.control} name="title" render={({
                field
              }) => <FormItem>
                      <FormLabel>Berichtstitel</FormLabel>
                      <FormControl>
                        <Input placeholder="Vermessungsbericht" {...field} />
                      </FormControl>
                    </FormItem>} />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="projectNumber" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Projektnummer</FormLabel>
                        <FormControl>
                          <Input placeholder="z.B. P2023-001" {...field} />
                        </FormControl>
                      </FormItem>} />
                  
                  <FormField control={form.control} name="creationDate" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Erstellungsdatum</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>} />
                </div>
                
                <FormField control={form.control} name="projectAddress" render={({
                field
              }) => <FormItem>
                      <FormLabel>Objektadresse</FormLabel>
                      <FormControl>
                        <Input placeholder="Straße, PLZ Ort" {...field} />
                      </FormControl>
                    </FormItem>} />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="clientName" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Auftraggeber</FormLabel>
                        <FormControl>
                          <Input placeholder="Name des Auftraggebers" {...field} />
                        </FormControl>
                      </FormItem>} />
                  
                  <FormField control={form.control} name="contactPerson" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Ansprechpartner</FormLabel>
                        <FormControl>
                          <Input placeholder="Name des Ansprechpartners" {...field} />
                        </FormControl>
                      </FormItem>} />
                </div>
                
                <FormField control={form.control} name="companyName" render={({
                field
              }) => <FormItem>
                      <FormLabel>Ausführender Betrieb</FormLabel>
                      <FormControl>
                        <Input placeholder="Name des Betriebs" {...field} />
                      </FormControl>
                    </FormItem>} />
                
                <FormField control={form.control} name="notes" render={({
                field
              }) => <FormItem>
                      <FormLabel>Bemerkungen</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Zusätzliche Informationen zum Projekt..." className="resize-none h-20" {...field} />
                      </FormControl>
                    </FormItem>} />
                
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="use-2d-rendering" checked={use2DRendering} onCheckedChange={setUse2DRendering} />
                    <label htmlFor="use-2d-rendering" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      2D-Rendering für Flächendarstellung verwenden
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="include-roof-plan" checked={includeRoofPlan} onCheckedChange={value => {
                    setIncludeRoofPlan(value);
                    if (value && !generatedRoofPlan) {
                      generateRoofPlan();
                    }
                  }} />
                    <label htmlFor="include-roof-plan" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Dachplan als Draufsicht hinzufügen
                    </label>
                  </div>
                </div>
              </div>
            </Form>
          </TabsContent>
          
          <TabsContent value="preview">
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-secondary/40 p-3 rounded-md text-center">
                    <div className="text-lg font-semibold">{lengthCount}</div>
                    <div className="text-xs">Längenmessungen</div>
                  </div>
                  <div className="bg-secondary/40 p-3 rounded-md text-center">
                    <div className="text-lg font-semibold">{heightCount}</div>
                    <div className="text-xs">Höhenmessungen</div>
                  </div>
                  <div className="bg-secondary/40 p-3 rounded-md text-center">
                    <div className="text-lg font-semibold">{areaCount}</div>
                    <div className="text-xs">Flächenmessungen</div>
                  </div>
                </div>
                
                <ScrollArea className="h-[300px]">
                  <MeasurementTable measurements={previewMeasurements} />
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          {hasCustomScreenshots && <TabsContent value="screenshots">
              <Card>
                <CardContent className="pt-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Benutzerdefinierte Screenshots</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Die folgenden Screenshots werden im PDF-Bericht als zusätzliche Visualisierungen angezeigt.
                    </p>
                    
                    <ScrollArea className="h-[300px] border rounded-md p-4">
                      <div className="grid grid-cols-2 gap-4">
                        {measurements.map(measurement => {
                      if (!measurement.customScreenshots || measurement.customScreenshots.length === 0) {
                        return null;
                      }
                      return <div key={measurement.id} className="space-y-2">
                              <h4 className="text-xs font-medium">
                                {measurement.description || `Messung ${measurement.id.substring(0, 5)}`}
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                {measurement.customScreenshots.map((screenshot, index) => <div key={index} className="border rounded-md overflow-hidden">
                                    <img src={screenshot} alt={`Screenshot ${index + 1}`} className="w-full h-32 object-cover" />
                                  </div>)}
                              </div>
                            </div>;
                    })}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>}
        </Tabs>
        
        {isExporting && <div className="mt-4">
            <Progress value={exportProgress} className="w-full" />
            <p className="text-xs text-muted-foreground text-center mt-2">
              {exportProgress < 100 ? 'PDF wird erstellt...' : 'PDF fertiggestellt!'}
            </p>
          </div>}
        
        <DialogFooter>
          <DialogClose asChild>
            <Button ref={dialogCloseRef} variant="outline" disabled={isExporting}>
              Abbrechen
            </Button>
          </DialogClose>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Wird exportiert...' : 'PDF exportieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};
export default ExportPdfButton;