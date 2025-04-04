
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PVModuleInfo, PVModuleSpec } from '@/types/measurements';
import { PV_MODULE_TEMPLATES, DEFAULT_EDGE_DISTANCE, DEFAULT_MODULE_SPACING } from '@/utils/pvCalculations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface PVModuleSelectProps {
  onModuleSelect: (moduleSpec: PVModuleSpec) => void;
  currentModule?: PVModuleSpec;
  onDimensionsChange?: (dimensions: { width: number, length: number }) => void;
  pvModuleInfo?: PVModuleInfo;
  onSpacingChange?: (spacing: { edgeDistance: number, moduleSpacing: number }) => void;
  onOptimalRectangleToggle?: (enabled: boolean) => void;
  onCalculateMaterials?: (inverterDistance?: number) => void;
  disabled?: boolean;
}

const PVModuleSelect: React.FC<PVModuleSelectProps> = ({
  onModuleSelect,
  currentModule,
  onDimensionsChange,
  pvModuleInfo,
  onSpacingChange,
  onOptimalRectangleToggle,
  onCalculateMaterials,
  disabled = false
}) => {
  const [selectedModule, setSelectedModule] = useState<PVModuleSpec>(
    currentModule || PV_MODULE_TEMPLATES[0]
  );
  
  const [manualWidth, setManualWidth] = useState<number>(
    pvModuleInfo?.userDefinedWidth || 0
  );
  
  const [manualLength, setManualLength] = useState<number>(
    pvModuleInfo?.userDefinedLength || 0
  );
  
  const [useManualDimensions, setUseManualDimensions] = useState<boolean>(
    pvModuleInfo?.manualDimensions || false
  );
  
  const [edgeDistance, setEdgeDistance] = useState<number>(
    pvModuleInfo?.edgeDistance || DEFAULT_EDGE_DISTANCE
  );
  
  const [moduleSpacing, setModuleSpacing] = useState<number>(
    pvModuleInfo?.moduleSpacing || DEFAULT_MODULE_SPACING
  );

  const [useOptimalRectangle, setUseOptimalRectangle] = useState<boolean>(true);
  
  const handleModuleSelect = (value: string) => {
    const selectedModuleSpec = PV_MODULE_TEMPLATES.find(m => m.name === value) || PV_MODULE_TEMPLATES[0];
    setSelectedModule(selectedModuleSpec);
    onModuleSelect(selectedModuleSpec);
  };
  
  const handleDimensionsSubmit = () => {
    if (onDimensionsChange && useManualDimensions) {
      onDimensionsChange({ 
        width: parseFloat(manualWidth.toString()) || 0, 
        length: parseFloat(manualLength.toString()) || 0 
      });
    }
    
    if (onSpacingChange) {
      onSpacingChange({
        edgeDistance: parseFloat(edgeDistance.toString()) || DEFAULT_EDGE_DISTANCE,
        moduleSpacing: parseFloat(moduleSpacing.toString()) || DEFAULT_MODULE_SPACING
      });
    }

    if (onOptimalRectangleToggle) {
      onOptimalRectangleToggle(useOptimalRectangle);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={disabled}>
          <Settings2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PV-Modul Einstellungen</DialogTitle>
          <DialogDescription>
            Konfigurieren Sie die Parameter für die PV-Modulberechnung.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Modultyp</Label>
            <Select
              value={selectedModule.name}
              onValueChange={handleModuleSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Modul auswählen" />
              </SelectTrigger>
              <SelectContent>
                {PV_MODULE_TEMPLATES.map((module) => (
                  <SelectItem key={module.name} value={module.name}>
                    {module.name} - {module.power}W ({module.width.toFixed(3)}m × {module.height.toFixed(3)}m)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Manuelle Abmessungen</Label>
              <Switch 
                checked={useManualDimensions}
                onCheckedChange={setUseManualDimensions}
              />
            </div>
            
            {useManualDimensions && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="manualWidth" className="text-xs">
                    Breite (m)
                  </Label>
                  <Input 
                    id="manualWidth" 
                    type="number" 
                    value={manualWidth || ''}
                    onChange={(e) => setManualWidth(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.1}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manualLength" className="text-xs">
                    Länge (m)
                  </Label>
                  <Input 
                    id="manualLength" 
                    type="number" 
                    value={manualLength || ''}
                    onChange={(e) => setManualLength(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.1}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Optimal-Rechteck verwenden</Label>
              <Switch 
                checked={useOptimalRectangle}
                onCheckedChange={setUseOptimalRectangle}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Berechnet automatisch die optimale rechteckige Fläche bei komplexen Dachformen
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Abstände</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="edgeDistance" className="text-xs">
                  Randabstand (m)
                </Label>
                <Input 
                  id="edgeDistance" 
                  type="number" 
                  value={edgeDistance}
                  onChange={(e) => setEdgeDistance(parseFloat(e.target.value) || DEFAULT_EDGE_DISTANCE)}
                  min={0}
                  step={0.02}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="moduleSpacing" className="text-xs">
                  Modulabstand (m)
                </Label>
                <Input 
                  id="moduleSpacing" 
                  type="number" 
                  value={moduleSpacing}
                  onChange={(e) => setModuleSpacing(parseFloat(e.target.value) || DEFAULT_MODULE_SPACING)}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={handleDimensionsSubmit}>
            Anwenden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PVModuleSelect;
