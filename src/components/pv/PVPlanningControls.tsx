
import React, { useState } from 'react';
import { Measurement, PVModuleSpec } from '@/types/measurements';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  RotateCw,
  MoveHorizontal,
  Maximize2,
  Minimize2,
  Grid,
  Settings,
  RefreshCw,
  Save,
  X
} from 'lucide-react';
import { PV_MODULE_TEMPLATES } from '@/utils/pvCalculations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface PVPlanningControlsProps {
  activeMeasurement: Measurement | null;
  orientation: 'portrait' | 'landscape';
  edgeDistance: number;
  moduleSpacing: number;
  selectedModuleSpec?: PVModuleSpec;
  onToggleOrientation: () => void;
  onEdgeDistanceChange: (value: number) => void;
  onModuleSpacingChange: (value: number) => void;
  onGenerateOptimalLayout: () => void;
  onFinishPlanning: () => void;
  onCancelPlanning: () => void;
}

const PVPlanningControls: React.FC<PVPlanningControlsProps> = ({
  activeMeasurement,
  orientation,
  edgeDistance,
  moduleSpacing,
  selectedModuleSpec = PV_MODULE_TEMPLATES[0],
  onToggleOrientation,
  onEdgeDistanceChange,
  onModuleSpacingChange,
  onGenerateOptimalLayout,
  onFinishPlanning,
  onCancelPlanning
}) => {
  const [showSettings, setShowSettings] = useState(false);
  
  // Calculate some metrics
  const moduleCount = activeMeasurement?.pvModuleInfo?.moduleCount || 0;
  const powerOutput = moduleCount * (selectedModuleSpec?.power || 400);
  const coveragePercent = activeMeasurement?.pvModuleInfo?.coveragePercent || 0;
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>PV-Modul Planung</span>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            onClick={onCancelPlanning}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Module platzieren und optimieren
        </CardDescription>
      </CardHeader>
      
      {activeMeasurement && (
        <>
          <CardContent>
            <div className="space-y-4">
              {/* Module metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-md p-2 text-center">
                  <div className="text-sm text-muted-foreground">Module</div>
                  <div className="text-xl font-semibold">{moduleCount}</div>
                </div>
                <div className="bg-muted/50 rounded-md p-2 text-center">
                  <div className="text-sm text-muted-foreground">Leistung</div>
                  <div className="text-xl font-semibold">{(powerOutput / 1000).toFixed(2)} kWp</div>
                </div>
                <div className="bg-muted/50 rounded-md p-2 text-center">
                  <div className="text-sm text-muted-foreground">Dachfläche</div>
                  <div className="text-xl font-semibold">{activeMeasurement.value?.toFixed(1)} m²</div>
                </div>
                <div className="bg-muted/50 rounded-md p-2 text-center">
                  <div className="text-sm text-muted-foreground">Nutzung</div>
                  <div className="text-xl font-semibold">{coveragePercent.toFixed(1)}%</div>
                </div>
              </div>
              
              <Separator />
              
              {/* Layout controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Modulausrichtung:</span>
                  <Toggle 
                    aria-label="Toggle orientation" 
                    pressed={orientation === 'landscape'}
                    onPressedChange={onToggleOrientation}
                  >
                    {orientation === 'portrait' ? (
                      <span className="flex items-center gap-1">
                        <Maximize2 className="h-4 w-4" />
                        Hochformat
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <MoveHorizontal className="h-4 w-4" />
                        Querformat
                      </span>
                    )}
                  </Toggle>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Dachrandabstand:</span>
                    <span className="text-sm font-medium">{edgeDistance.toFixed(1)} m</span>
                  </div>
                  <Slider
                    value={[edgeDistance]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={(val) => onEdgeDistanceChange(val[0])}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Modulabstand:</span>
                    <span className="text-sm font-medium">{moduleSpacing.toFixed(2)} m</span>
                  </div>
                  <Slider
                    value={[moduleSpacing]}
                    min={0}
                    max={0.3}
                    step={0.01}
                    onValueChange={(val) => onModuleSpacingChange(val[0])}
                  />
                </div>
                
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={onGenerateOptimalLayout}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Layout optimieren
                </Button>
              </div>
              
              {/* Module information */}
              <div className="bg-muted/30 rounded-md p-2 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Modultyp:</span>
                  <span>{selectedModuleSpec.name || 'Standard'}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Abmessungen:</span>
                  <span>{selectedModuleSpec.width.toFixed(2)} × {selectedModuleSpec.height.toFixed(2)} m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Leistung pro Modul:</span>
                  <span>{selectedModuleSpec.power}W</span>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground mt-2">
                <p>Klicken Sie auf ein Modul, um es auszuwählen.</p>
                <p>Interaktionsmodus wird folgen...</p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between gap-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={onFinishPlanning}
            >
              <Save className="h-4 w-4 mr-2" />
              Planung speichern
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-none"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Erweiterte Einstellungen</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Diese Funktionen werden bald verfügbar sein:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-2">
                    <li>Modulauswahl aus Katalog</li>
                    <li>Individuelle Modulpositionierung</li>
                    <li>Ertragsberechnung</li>
                    <li>Verschattungsanalyse</li>
                  </ul>
                </div>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default PVPlanningControls;
