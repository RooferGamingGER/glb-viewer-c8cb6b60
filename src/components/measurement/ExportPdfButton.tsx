
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, Image } from 'lucide-react';
import { toast } from 'sonner';
import { Measurement } from '@/types/measurements';
import { exportMeasurementsToPdf, CoverPageData } from '@/utils/pdfExport';
import { consolidatePenetrations, calculateRoofPlanScaleFactor, getRoofElementsSummary } from '@/utils/exportUtils';
import { useThreeContext, asPerspectiveCamera, generatePolygon2D } from '@/hooks/useThreeContext';
import { captureAreaMeasurement } from '@/utils/captureScreenshot';
import { captureViewScreenshot, captureTopDownView } from '@/utils/captureViewScreenshot';
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
  measurementGroups?: THREE.Group[];
}

const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({
  measurements,
  measurementGroups
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [use2DRendering, setUse2DRendering] = useState(true);
  const [includeRoofPlan, setIncludeRoofPlan] = useState(true);
  const [generatedRoofPlan, setGeneratedRoofPlan] = useState<string | null>(null);
  const [topDownScreenshot, setTopDownScreenshot] = useState<string | null>(null);
  const [optimizedRoofPlanDimensions, setOptimizedRoofPlanDimensions] = useState<{width: number, height: number}>({width: 0, height: 0});
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
      contactEmail: '',
      contactPhone: '',
      creationDate: new Date().toISOString().split('T')[0],
      notes: ''
    }
  });

  useEffect(() => {
    if (measurements.length > 0 && includeRoofPlan) {
      generateRoofPlan();
    }
  }, [measurements, includeRoofPlan]);

  useEffect(() => {
    if (scene && camera && renderer) {
      const screenshot = captureTopDownView(renderer, scene, camera, measurementGroups);
      if (screenshot) {
        setTopDownScreenshot(screenshot);
      }
    }
  }, [scene, camera, renderer, measurementGroups]);

  const generateRoofPlan = () => {
    if (measurements.length === 0) return;
    try {
      const width = 3000; // Increased from 2480
      const height = 2400; // Adjusted from 3508 for more appropriate aspect ratio
      
      setOptimizedRoofPlanDimensions({width, height});
      
      const roofPlan = createCombinedRoofPlan(measurements, width, height, 0.05, true);
      setGeneratedRoofPlan(roofPlan);
    } catch (error) {
      console.error('Error generating roof plan:', error);
    }
  };

  const hasCustomScreenshots = measurements.some(m => m.customScreenshots && m.customScreenshots.length > 0);
  const lengthCount = measurements.filter(m => m.type === 'length').length;
  const heightCount = measurements.filter(m => m.type === 'height').length;
  const areaCount = measurements.filter(m => m.type === 'area').length;
  const deductionAreaCount = measurements.filter(m => m.type === 'deductionarea').length;
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
      const deductionAreaMeasurements = measurements.filter(m => m.type === 'deductionarea');
      const solarMeasurements = measurements.filter(m => m.type === 'solar');
      const measurementsWithVisuals = [...measurements];
      const perspCamera = asPerspectiveCamera(camera);
      setExportProgress(20);
      
      // Ensure that skylight measurements have proper dimensions
      const skylightMeasurements = measurements.filter(m => m.type === 'skylight');
      skylightMeasurements.forEach(skylight => {
        // If dimensions are missing, try to calculate them from the area
        if (!skylight.dimensions || (!skylight.dimensions.width && !skylight.dimensions.height)) {
          // Assuming a square skylight if dimensions are missing
          const estimatedDimension = Math.sqrt(skylight.value);
          const index = measurementsWithVisuals.findIndex(m => m.id === skylight.id);
          if (index !== -1) {
            measurementsWithVisuals[index] = {
              ...measurementsWithVisuals[index],
              dimensions: {
                width: estimatedDimension,
                height: estimatedDimension
              }
            };
          }
        }
      });
      
      if (!topDownScreenshot && scene && camera && renderer) {
        const screenshot = captureTopDownView(renderer, scene, camera, measurementGroups);
        if (screenshot) {
          (measurementsWithVisuals as any).topDownScreenshot = screenshot;
        }
      } else if (topDownScreenshot) {
        (measurementsWithVisuals as any).topDownScreenshot = topDownScreenshot;
      }
      
      // Process area measurements
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
          const screenshot = await captureAreaMeasurement(scene, perspCamera, renderer, measurement, canvas, false, true);
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
        setExportProgress(20 + Math.floor(i / areaMeasurements.length * 20));
      }

      // Process deduction area measurements
      for (let i = 0; i < deductionAreaMeasurements.length; i++) {
        const measurement = deductionAreaMeasurements[i];
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
          const screenshot = await captureAreaMeasurement(scene, perspCamera, renderer, measurement, canvas, false, true);
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
        setExportProgress(40 + Math.floor(i / deductionAreaMeasurements.length * 10));
      }
      
      // Process solar measurements
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
          const screenshot = await captureAreaMeasurement(scene, perspCamera, renderer, measurement, canvas, false, true);
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
        setExportProgress(50 + Math.floor(i / solarMeasurements.length * 10));
      }
      
      if (includeRoofPlan) {
        if (!generatedRoofPlan) {
          const width = 3000; // Increased from 2480
          const height = 2400; // Adjusted for appropriate aspect ratio
          const roofPlan = createCombinedRoofPlan(measurements, width, height, 0.05, true);
          if (roofPlan) {
            (measurementsWithVisuals as any).roofPlan = roofPlan;
            (measurementsWithVisuals as any).roofPlanDimensions = {width, height};
          }
        } else {
          (measurementsWithVisuals as any).roofPlan = generatedRoofPlan;
          (measurementsWithVisuals as any).roofPlanDimensions = optimizedRoofPlanDimensions;
        }
        
        (measurementsWithVisuals as any).placeRoofPlanOnPage2 = true;
        (measurementsWithVisuals as any).showRoofPlanWithoutHeader = true;
      }
      
      setExportProgress(70);
      
      const summary = getRoofElementsSummary(measurements);
      (measurementsWithVisuals as any).summary = summary;
      
      // Add flag to skip table of contents
      (measurementsWithVisuals as any).skipTableOfContents = true;
      
      // Make sure the cover image is included
      (measurementsWithVisuals as any).includeCoverImage = true;
      
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
          <span>PDF </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] fixed max-h-[90vh] overflow-y-auto">
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
                
                <h3 className="text-base font-medium mt-2">Kundendaten</h3>
                
                <FormField control={form.control} name="clientName" render={({
                field
              }) => <FormItem>
                      <FormLabel>Auftraggeber</FormLabel>
                      <FormControl>
                        <Input placeholder="Name des Auftraggebers" {...field} />
                      </FormControl>
                    </FormItem>} />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactPerson" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Ansprechpartner</FormLabel>
                        <FormControl>
                          <Input placeholder="Name des Ansprechpartners" {...field} />
                        </FormControl>
                      </FormItem>} />
                  
                  <FormField control={form.control} name="contactPhone" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Telefon</FormLabel>
                        <FormControl>
                          <Input placeholder="Telefonnummer" {...field} />
                        </FormControl>
                      </FormItem>} />
                </div>
                
                <FormField control={form.control} name="contactEmail" render={({
                field
              }) => <FormItem>
                      <FormLabel>E-Mail</FormLabel>
                      <FormControl>
                        <Input placeholder="E-Mail-Adresse" {...field} />
                      </FormControl>
                    </FormItem>} />
                
                <FormField control={form.control} name="notes" render={({
                field
              }) => <FormItem>
                      <FormLabel>Bemerkungen (erscheint auf separater Seite)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Zusätzliche Informationen zum Projekt..." 
                          className="resize-none h-24" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>} />
                
                <div className="flex flex-col space-y-4 mt-2">
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
                      Dachplan auf eigener Seite darstellen
                    </label>
                  </div>
                </div>
              </div>
            </Form>
          </TabsContent>
          
          <TabsContent value="preview">
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-4 gap-2 mb-4">
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
                  <div className="bg-secondary/40 p-3 rounded-md text-center">
                    <div className="text-lg font-semibold">{deductionAreaCount}</div>
                    <div className="text-xs">Abzugsflächen</div>
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
              {exportProgress === 100 ? 'PDF fertiggestellt!' : 'PDF wird erstellt...'}
            </p>
          </div>}
        
        <DialogFooter className="mt-4">
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
