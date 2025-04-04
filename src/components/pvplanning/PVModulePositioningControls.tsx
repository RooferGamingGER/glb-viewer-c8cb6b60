
import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { PVModuleInfo } from '@/types/measurements';
import { ArrowDown, ArrowUp, RotateCcw, RotateCw, MoveHorizontal, MoveVertical } from 'lucide-react';
import ArrowLeft from './ArrowLeft';
import ArrowRight from './ArrowRight';

interface PVModulePositioningControlsProps {
  pvModuleInfo: PVModuleInfo;
  onUpdate: (updates: Partial<PVModuleInfo>) => void;
}

const PVModulePositioningControls: React.FC<PVModulePositioningControlsProps> = ({
  pvModuleInfo,
  onUpdate
}) => {
  // Get current positioning values with defaults
  const heightOffset = pvModuleInfo.moduleHeightOffset ?? 0.3;
  const rotation = pvModuleInfo.moduleRotation ?? 0;
  const positionX = pvModuleInfo.modulePositionX ?? 0;
  const positionZ = pvModuleInfo.modulePositionZ ?? 0;

  // Handle height offset changes
  const handleHeightChange = (value: number[]) => {
    onUpdate({ moduleHeightOffset: value[0] });
  };

  const handleHeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      onUpdate({ moduleHeightOffset: value });
    }
  };

  // Handle rotation changes
  const handleRotate = (direction: 'cw' | 'ccw') => {
    const step = direction === 'cw' ? 5 : -5;
    const newRotation = ((rotation + step) % 360 + 360) % 360;
    onUpdate({ moduleRotation: newRotation });
  };

  // Handle position changes
  const handlePosition = (axis: 'x' | 'z', direction: 1 | -1) => {
    const step = 0.1 * direction;
    if (axis === 'x') {
      onUpdate({ modulePositionX: (positionX + step) });
    } else {
      onUpdate({ modulePositionZ: (positionZ + step) });
    }
  };

  return (
    <div className="space-y-3 pt-2 pb-2 px-1">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Label className="text-xs flex items-center cursor-help">
                Modulhöhe
                <ArrowUp className="h-3 w-3 ml-1" />
              </Label>
            </HoverCardTrigger>
            <HoverCardContent className="text-xs">
              Passt den Abstand der Module zur Dachfläche an
            </HoverCardContent>
          </HoverCard>
          <div className="flex items-center gap-2">
            <Slider
              value={[heightOffset]}
              min={0}
              max={1}
              step={0.05}
              className="w-24"
              onValueChange={handleHeightChange}
            />
            <Input
              type="number"
              value={heightOffset.toFixed(2)}
              onChange={handleHeightInputChange}
              min={0}
              max={1}
              step={0.05}
              className="w-14 h-6 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Label className="text-xs block mb-1 cursor-help">Rotation</Label>
            </HoverCardTrigger>
            <HoverCardContent className="text-xs">
              Dreht die Module um ihre vertikale Achse
            </HoverCardContent>
          </HoverCard>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => handleRotate('ccw')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs w-8 text-center">{rotation}°</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => handleRotate('cw')}
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Label className="text-xs block mb-1 cursor-help">Position</Label>
            </HoverCardTrigger>
            <HoverCardContent className="text-xs">
              Verschiebt die Module auf der Dachfläche
            </HoverCardContent>
          </HoverCard>
          <div className="flex gap-1">
            <div className="flex flex-col gap-1 items-center">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handlePosition('x', -1)}
              >
                <MoveHorizontal className="h-3.5 w-3.5" />
                <ArrowLeft className="h-2 w-2 absolute" />
              </Button>
              <span className="text-xs">{positionX.toFixed(1)}</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handlePosition('x', 1)}
              >
                <MoveHorizontal className="h-3.5 w-3.5" />
                <ArrowRight className="h-2 w-2 absolute" />
              </Button>
              <span className="text-xs">X</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handlePosition('z', -1)}
              >
                <MoveVertical className="h-3.5 w-3.5" />
                <ArrowUp className="h-2 w-2 absolute" />
              </Button>
              <span className="text-xs">{positionZ.toFixed(1)}</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handlePosition('z', 1)}
              >
                <MoveVertical className="h-3.5 w-3.5" />
                <ArrowDown className="h-2 w-2 absolute" />
              </Button>
              <span className="text-xs">Z</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PVModulePositioningControls;
