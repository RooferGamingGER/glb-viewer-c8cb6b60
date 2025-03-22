
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, ArrowRight } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { 
  DEFAULT_MODULE_WIDTH, 
  DEFAULT_MODULE_HEIGHT, 
  DEFAULT_EDGE_DISTANCE,
  DEFAULT_MODULE_SPACING
} from '@/utils/pvCalculations';
import { Measurement } from '@/types/measurements';

interface PVModuleSettingsProps {
  measurement: Measurement;
  onCalculate: (
    measurementId: string, 
    moduleWidth: number, 
    moduleHeight: number, 
    edgeDistance: number, 
    moduleSpacing: number
  ) => void;
}

const PVModuleSettings: React.FC<PVModuleSettingsProps> = ({
  measurement,
  onCalculate
}) => {
  // Initialize with default values or existing values if available
  const [moduleWidth, setModuleWidth] = useState<number>(
    measurement.pvModuleInfo?.moduleWidth || DEFAULT_MODULE_WIDTH
  );
  const [moduleHeight, setModuleHeight] = useState<number>(
    measurement.pvModuleInfo?.moduleHeight || DEFAULT_MODULE_HEIGHT
  );
  const [edgeDistance, setEdgeDistance] = useState<number>(
    measurement.pvModuleInfo?.edgeDistance || DEFAULT_EDGE_DISTANCE
  );
  const [moduleSpacing, setModuleSpacing] = useState<number>(
    measurement.pvModuleInfo?.moduleSpacing || DEFAULT_MODULE_SPACING
  );
  
  // Handle number input change with validation
  const handleNumberChange = (
    value: string, 
    setter: React.Dispatch<React.SetStateAction<number>>,
    min: number = 0,
    max: number = 10
  ) => {
    const numberValue = parseFloat(value);
    if (!isNaN(numberValue) && numberValue >= min && numberValue <= max) {
      setter(numberValue);
    }
  };
  
  const handleCalculate = () => {
    onCalculate(
      measurement.id,
      moduleWidth,
      moduleHeight,
      edgeDistance,
      moduleSpacing
    );
  };
  
  // Not available for non-area measurements
  if (measurement.type !== 'area') {
    return null;
  }
  
  return (
    <div className="p-2 bg-muted/20 rounded-md border border-border mt-2">
      <div className="flex items-center mb-2">
        <Zap className="h-4 w-4 mr-1 text-primary" />
        <h3 className="text-sm font-medium">PV-Modul-Einstellungen</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <Label htmlFor="moduleWidth" className="text-xs mb-1">Modulbreite (m)</Label>
          <Input 
            id="moduleWidth"
            type="number" 
            value={moduleWidth}
            onChange={(e) => handleNumberChange(e.target.value, setModuleWidth, 0.5, 2)} 
            step={0.001}
            min={0.5}
            max={2}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label htmlFor="moduleHeight" className="text-xs mb-1">Modulhöhe (m)</Label>
          <Input 
            id="moduleHeight"
            type="number" 
            value={moduleHeight}
            onChange={(e) => handleNumberChange(e.target.value, setModuleHeight, 0.5, 2)} 
            step={0.001}
            min={0.5}
            max={2}
            className="h-7 text-xs"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <Label htmlFor="edgeDistance" className="text-xs mb-1">Randabstand (m)</Label>
          <Input 
            id="edgeDistance"
            type="number" 
            value={edgeDistance}
            onChange={(e) => handleNumberChange(e.target.value, setEdgeDistance, 0, 1)} 
            step={0.01}
            min={0}
            max={1}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label htmlFor="moduleSpacing" className="text-xs mb-1">Modulabstand (m)</Label>
          <Input 
            id="moduleSpacing"
            type="number" 
            value={moduleSpacing}
            onChange={(e) => handleNumberChange(e.target.value, setModuleSpacing, 0, 0.5)} 
            step={0.01}
            min={0}
            max={0.5}
            className="h-7 text-xs"
          />
        </div>
      </div>
      
      <Button 
        variant="default" 
        size="sm" 
        className="w-full"
        onClick={handleCalculate}
      >
        Modulplatzierung berechnen
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};

export default PVModuleSettings;
