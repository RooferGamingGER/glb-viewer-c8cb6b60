import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Layers, Grid3X3, Image, Ruler } from 'lucide-react';

export interface LayerVisibility {
  showMesh: boolean;      // Wireframe mode
  showTexture: boolean;   // Show textures
  showMeasurements: boolean; // Show measurements
}

interface LayerControlsProps {
  layerVisibility: LayerVisibility;
  onLayerChange: (layer: keyof LayerVisibility, value: boolean) => void;
}

const LayerControls: React.FC<LayerControlsProps> = ({
  layerVisibility,
  onLayerChange
}) => {
  return (
    <div className="p-3 border-b border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium">Ansicht</h4>
      </div>
      
      <div className="flex flex-col gap-3">
        {/* Wireframe toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="layer-mesh" className="text-sm cursor-pointer">
              Wireframe
            </Label>
          </div>
          <Switch 
            id="layer-mesh"
            checked={layerVisibility.showMesh}
            onCheckedChange={(checked) => onLayerChange('showMesh', checked)}
          />
        </div>
        
        {/* Texture toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="layer-texture" className="text-sm cursor-pointer">
              Textur
            </Label>
          </div>
          <Switch 
            id="layer-texture"
            checked={layerVisibility.showTexture}
            onCheckedChange={(checked) => onLayerChange('showTexture', checked)}
          />
        </div>
        
        {/* Measurements toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="layer-measurements" className="text-sm cursor-pointer">
              Bemassungen
            </Label>
          </div>
          <Switch 
            id="layer-measurements"
            checked={layerVisibility.showMeasurements}
            onCheckedChange={(checked) => onLayerChange('showMeasurements', checked)}
          />
        </div>
      </div>
    </div>
  );
};

export default LayerControls;
