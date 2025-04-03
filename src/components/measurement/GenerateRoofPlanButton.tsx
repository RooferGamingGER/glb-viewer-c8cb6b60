
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Maximize, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Measurement } from '@/hooks/useMeasurements';
import { createCombinedRoofPlan } from '@/utils/roofPlanRenderer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogTabs,
  DialogTabsList,
  DialogTabsTrigger,
  DialogTabsContent
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GenerateRoofPlanButtonProps {
  measurements: Measurement[];
}

const GenerateRoofPlanButton: React.FC<GenerateRoofPlanButtonProps> = ({ measurements }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [roofPlan, setRoofPlan] = useState<string | null>(null);
  const [segmentPlan, setSegmentPlan] = useState<string | null>(null);
  const [areaPlan, setAreaPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("combined");
  
  const handleGenerateRoofPlan = () => {
    if (measurements.length === 0) {
      toast.error('Keine Messungen für den Dachplan vorhanden');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Generate combined plan
      const combined = createCombinedRoofPlan(measurements, 2000, 1400, 0.1, true);
      setRoofPlan(combined);
      
      // Generate segments only plan
      const segments = createCombinedRoofPlan(measurements, 2000, 1400, 0.1, true, true, false);
      setSegmentPlan(segments);
      
      // Generate areas only plan
      const areas = createCombinedRoofPlan(measurements, 2000, 1400, 0.1, true, false, true);
      setAreaPlan(areas);
      
      if (!combined) {
        toast.error('Fehler beim Erstellen des Dachplans');
      } else {
        toast.success('Dachplan erfolgreich erstellt');
      }
    } catch (error) {
      console.error('Error generating roof plan:', error);
      toast.error('Ein Fehler ist beim Erstellen des Dachplans aufgetreten');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const getActivePlan = () => {
    switch(activeTab) {
      case "segments": return segmentPlan;
      case "areas": return areaPlan;
      default: return roofPlan;
    }
  };
  
  const handleDownload = () => {
    const activePlan = getActivePlan();
    if (!activePlan) return;
    
    const link = document.createElement('a');
    link.href = activePlan;
    
    // Name based on the type of plan
    const planType = activeTab === "segments" ? "Segmente" : 
                     activeTab === "areas" ? "Flaechen" : "Komplett";
    
    link.download = `Dachplan_${planType}_${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Dachplan wurde heruntergeladen');
  };
  
  const handleOpenInNewTab = () => {
    const activePlan = getActivePlan();
    if (!activePlan) return;
    
    const planTitle = activeTab === "segments" ? "Dachplan - Segmente" : 
                      activeTab === "areas" ? "Dachplan - Flächen" : 
                      "Dachplan - Komplett";
    
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`
        <html>
          <head>
            <title>${planTitle}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; background-color: #f5f5f5; }
              img { max-width: 100%; max-height: 100vh; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <img src="${activePlan}" alt="${planTitle}" />
          </body>
        </html>
      `);
    }
  };
  
  // Count the number of roof surfaces and segments available
  const areaCount = measurements.filter(m => 
    ['area', 'solar'].includes(m.type) && m.points && m.points.length >= 3
  ).length;
  
  const segmentCount = measurements.reduce((total, m) => total + (m.segments?.length || 0), 0);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline" 
          size="sm"
          className="w-full"
          disabled={measurements.length === 0}
        >
          <Maximize className="h-4 w-4 mr-1" />
          Dachplan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Dachplan - Draufsicht</DialogTitle>
          <DialogDescription>
            {areaCount > 0 
              ? `Erstelle einen 2D Dachplan mit ${areaCount} Dachflächen und ${segmentCount} Segmenten in der Draufsicht.`
              : 'Keine Dachflächen für den Plan vorhanden. Bitte füge zuerst Flächenmessungen hinzu.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {(!roofPlan && !segmentPlan && !areaPlan) ? (
            <div className="flex justify-center items-center h-[500px] border rounded-md bg-muted/20">
              <Button 
                onClick={handleGenerateRoofPlan}
                disabled={isGenerating || areaCount === 0}
              >
                {isGenerating ? 'Wird generiert...' : 'Dachplan erstellen'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3 mb-2">
                  <TabsTrigger value="combined">Komplett</TabsTrigger>
                  <TabsTrigger value="segments">Segmente</TabsTrigger>
                  <TabsTrigger value="areas">Flächen</TabsTrigger>
                </TabsList>
                
                <TabsContent value="combined">
                  <div className="border rounded-md p-2 overflow-hidden bg-white">
                    <img 
                      src={roofPlan || ""} 
                      alt="Vollständiger Dachplan" 
                      className="w-full object-contain"
                      style={{ maxHeight: '500px' }} 
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="segments">
                  <div className="border rounded-md p-2 overflow-hidden bg-white">
                    <img 
                      src={segmentPlan || ""} 
                      alt="Dachplan - Segmente" 
                      className="w-full object-contain"
                      style={{ maxHeight: '500px' }} 
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="areas">
                  <div className="border rounded-md p-2 overflow-hidden bg-white">
                    <img 
                      src={areaPlan || ""} 
                      alt="Dachplan - Flächen" 
                      className="w-full object-contain"
                      style={{ maxHeight: '500px' }} 
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-center gap-4">
                <Button onClick={handleDownload} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Herunterladen</span>
                </Button>
                <Button onClick={handleOpenInNewTab} variant="outline" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  <span>In neuem Tab öffnen</span>
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              Schließen
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateRoofPlanButton;
