
import React from 'react';
import { PVModuleInfo } from '@/types/measurements';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowDown, RotateCcw, MoveHorizontal } from 'lucide-react';

interface PVModulePositioningControlsProps {
  pvModuleInfo: PVModuleInfo;
  onChange: (changes: Partial<PVModuleInfo>) => void;
}

const PVModulePositioningControls: React.FC<PVModulePositioningControlsProps> = ({ 
  pvModuleInfo, 
  onChange 
}) => {
  // Default values if not set
  const moduleHeightOffset = pvModuleInfo.moduleHeightOffset !== undefined ? pvModuleInfo.moduleHeightOffset : 0.2;
  const moduleRotation = pvModuleInfo.moduleRotation !== undefined ? pvModuleInfo.moduleRotation : 0;
  const modulePositionX = pvModuleInfo.modulePositionX !== undefined ? pvModuleInfo.modulePositionX : 0;
  const modulePositionZ = pvModuleInfo.modulePositionZ !== undefined ? pvModuleInfo.modulePositionZ : 0;

  const handleHeightChange = (value: number[]) => {
    onChange({
      moduleHeightOffset: value[0]
    });
  };

  const handleHeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onChange({
        moduleHeightOffset: value
      });
    }
  };

  const handleRotationChange = (value: number[]) => {
    onChange({
      moduleRotation: value[0]
    });
  };

  const handleXPositionChange = (value: number[]) => {
    onChange({
      modulePositionX: value[0]
    });
    
    onChange({
      modulePositionZ: modulePositionZ // Keep Z position the same
    });
  };

  const handleZPositionChange = (value: number[]) => {
    onChange({
      modulePositionZ: value[0]
    });
  };

  const resetPosition = () => {
    onChange({
      moduleHeightOffset: 0.05,
      moduleRotation: 0,
      modulePositionX: 0,
      modulePositionZ: 0
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="module-height" className="text-xs flex items-center gap-1">
            <ArrowDown className="h-3 w-3" />
            Höhe über Dach
          </Label>
          <Input 
            id="module-height-input"
            type="number" 
            value={moduleHeightOffset}
            onChange={handleHeightInputChange}
            className="h-6 w-16 text-xs"
            step={0.01}
            min={0}
            max={1}
          />
        </div>
        <Slider 
          id="module-height"
          value={[moduleHeightOffset]} 
          min={0.01} 
          max={0.5} 
          step={0.01} 
          onValueChange={handleHeightChange} 
        />
      </div>

      <Separator className="my-2" />

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="module-rotation" className="text-xs flex items-center gap-1">
            <RotateCcw className="h-3 w-3" />
            Rotation
          </Label>
          <span className="text-xs">{moduleRotation.toFixed(0)}°</span>
        </div>
        <Slider 
          id="module-rotation"
          value={[moduleRotation]} 
          min={-180} 
          max={180} 
          step={1} 
          onValueChange={handleRotationChange} 
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="module-position-x" className="text-xs flex items-center gap-1">
            <MoveHorizontal className="h-3 w-3" />
            Position X
          </Label>
          <span className="text-xs">{modulePositionX.toFixed(2)}m</span>
        </div>
        <Slider 
          id="module-position-x"
          value={[modulePositionX]} 
          min={-2} 
          max={2} 
          step={0.1} 
          onValueChange={handleXPositionChange} 
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="module-position-z" className="text-xs flex items-center gap-1">
            <MoveHorizontal className="h-3 w-3 rotate-90" />
            Position Z
          </Label>
          <span className="text-xs">{modulePositionZ.toFixed(2)}m</span>
        </div>
        <Slider 
          id="module-position-z"
          value={[modulePositionZ]} 
          min={-2} 
          max={2} 
          step={0.1} 
          onValueChange={handleZPositionChange} 
        />
      </div>
      
      <button 
        onClick={resetPosition} 
        className="text-xs text-blue-600 hover:underline mt-2 flex items-center gap-1"
      >
        <RotateCcw className="h-3 w-3" />
        Position zurücksetzen
      </button>
    </div>
  );
};

export default PVModulePositioningControls;
