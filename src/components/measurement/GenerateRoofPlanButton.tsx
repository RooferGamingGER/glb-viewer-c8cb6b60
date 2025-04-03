
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Maximize, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Measurement, Segment } from '@/types/measurements';
import { createCombinedRoofPlan } from '@/utils/roofPlanRenderer';
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

interface GenerateRoofPlanButtonProps {
  measurements: Measurement[];
}

const GenerateRoofPlanButton: React.FC<GenerateRoofPlanButtonProps> = ({ measurements }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [roofPlan, setRoofPlan] = useState<string | null>(null);
  
  const handleGenerateRoofPlan = () => {
    if (measurements.length === 0) {
      toast.error('Keine Messungen für den Dachplan vorhanden');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Higher resolution for better quality
      const plan = createCombinedRoofPlan(measurements, 3000, 2400, 0.1, true);
      setRoofPlan(plan);
      
      if (!plan) {
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
  
  const handleDownload = () => {
    if (!roofPlan) return;
    
    const link = document.createElement('a');
    link.href = roofPlan;
    link.download = `Dachplan_${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Dachplan wurde heruntergeladen');
  };
  
  const handleOpenInNewTab = () => {
    if (!roofPlan) return;
    
    const newTab = window.open();
    if (newTab) {
      newTab.document.write(`
        <html>
          <head>
            <title>Dachplan</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; background-color: #f5f5f5; }
              img { max-width: 100%; max-height: 100vh; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <img src="${roofPlan}" alt="Dachplan" />
          </body>
        </html>
      `);
    }
  };
  
  // Count the number of roof surfaces and special elements available
  const areaCount = measurements.filter(m => 
    ['area'].includes(m.type) && m.points && m.points.length >= 3
  ).length;
  
  const specialElementCount = measurements.filter(m => 
    ['solar', 'skylight', 'chimney', 'vent', 'hook', 'other'].includes(m.type) && 
    m.points && 
    m.points.length >= 3
  ).length;
  
  // Count segments, considering shared segments only once
  const uniqueSegmentCount = (() => {
    // Collect all segments
    const allSegments = measurements.reduce((total, m) => {
      if (m.segments && m.segments.length > 0) {
        return [...total, ...m.segments];
      }
      return total;
    }, [] as (Segment | undefined)[]);
    
    // Filter out segments that are marked as shared but not original
    const uniqueSegments = allSegments.filter(segment => 
      !segment?.shared || (segment.shared && segment.isOriginal)
    );
    
    return uniqueSegments.length;
  })();
  
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
              ? `Erstelle einen 2D Dachplan mit ${areaCount} Dachflächen, ${specialElementCount} Einbauten und ${uniqueSegmentCount} Segmenten in der Draufsicht.`
              : 'Keine Dachflächen für den Plan vorhanden. Bitte füge zuerst Flächenmessungen hinzu.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {!roofPlan ? (
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
              <div className="border rounded-md p-2 overflow-hidden bg-white">
                <img 
                  src={roofPlan} 
                  alt="Dachplan" 
                  className="w-full object-contain"
                  style={{ maxHeight: '650px' }}
                />
              </div>
              
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
