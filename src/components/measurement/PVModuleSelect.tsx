
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
import { DEFAULT_EDGE_DISTANCE, DEFAULT_MODULE_SPACING } from '@/utils/pvCalculations';
import { PV_MODULE_DATABASE, ExtendedPVModuleSpec, getModuleManufacturers, cellTypeLabel, getModuleCellTypes } from '@/data/germanPVCatalog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  onModuleSizeChange?: (size: { moduleWidth: number; moduleHeight: number }) => void;
  onOrientationChange?: (mode: 'auto' | 'portrait' | 'landscape') => void;
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
  onModuleSizeChange,
  onOrientationChange,
  disabled = false
}) => {
  const [selectedModule, setSelectedModule] = useState<PVModuleSpec>(
    currentModule || PV_MODULE_DATABASE[0]
  );
  
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');
  const [filterCellType, setFilterCellType] = useState<string>('all');
  
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
  const [moduleWidthInput, setModuleWidthInput] = useState<number>(pvModuleInfo?.moduleWidth || 1.14);
  const [moduleHeightInput, setModuleHeightInput] = useState<number>(pvModuleInfo?.moduleHeight || 1.77);
  const [orientationMode, setOrientationMode] = useState<'auto' | 'portrait' | 'landscape'>(
    pvModuleInfo?.orientation === 'landscape' ? 'landscape' : 'portrait'
  );

  // Filter modules
  const filteredModules = PV_MODULE_DATABASE.filter(m => {
    if (filterManufacturer !== 'all' && m.manufacturer !== filterManufacturer) return false;
    if (filterCellType !== 'all' && m.cellType !== filterCellType) return false;
    return true;
  });

  // Group by manufacturer
  const groupedModules = filteredModules.reduce<Record<string, ExtendedPVModuleSpec[]>>((acc, m) => {
    if (!acc[m.manufacturer]) acc[m.manufacturer] = [];
    acc[m.manufacturer].push(m);
    return acc;
  }, {});
  
  const handleModuleSelect = (value: string) => {
    const selectedModuleSpec = PV_MODULE_DATABASE.find(m => m.name === value) || PV_MODULE_DATABASE[0];
    setSelectedModule(selectedModuleSpec);
    setModuleWidthInput(selectedModuleSpec.width);
    setModuleHeightInput(selectedModuleSpec.height);
    onModuleSelect(selectedModuleSpec);
  };
  
  const handleDimensionsSubmit = () => {
    if (onModuleSizeChange) {
      onModuleSizeChange({
        moduleWidth: parseFloat(moduleWidthInput.toString()) || (selectedModule?.width ?? 1.14),
        moduleHeight: parseFloat(moduleHeightInput.toString()) || (selectedModule?.height ?? 1.77)
      });
    }

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

    if (onOrientationChange) {
      onOrientationChange(orientationMode);
    }
  };

  const manufacturers = getModuleManufacturers();
  const cellTypes = getModuleCellTypes();

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
          {/* Filter row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Hersteller</Label>
              <Select value={filterManufacturer} onValueChange={setFilterManufacturer}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Hersteller</SelectItem>
                  {manufacturers.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Zelltyp</Label>
              <Select value={filterCellType} onValueChange={setFilterCellType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  {cellTypes.map(ct => (
                    <SelectItem key={ct} value={ct}>{cellTypeLabel(ct)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                {Object.entries(groupedModules).map(([manufacturer, modules]) => (
                  <SelectGroup key={manufacturer}>
                    <SelectLabel className="text-xs font-bold text-primary">{manufacturer}</SelectLabel>
                    {modules.map((module) => (
                      <SelectItem key={module.name} value={module.name}>
                        <div className="flex flex-col">
                          <span className="text-xs">{module.name} — {module.power}W</span>
                          <span className="text-[10px] text-muted-foreground">
                            {module.width.toFixed(3)}×{module.height.toFixed(3)}m · {module.efficiency}% · {cellTypeLabel(module.cellType)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
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
            <Label>Modulgröße</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="moduleWidth" className="text-xs">Modulbreite (m)</Label>
                <Input
                  id="moduleWidth"
                  type="number"
                  value={moduleWidthInput}
                  onChange={(e) => setModuleWidthInput(parseFloat(e.target.value) || 0)}
                  min={0.5}
                  step={0.01}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="moduleHeight" className="text-xs">Modulhöhe (m)</Label>
                <Input
                  id="moduleHeight"
                  type="number"
                  value={moduleHeightInput}
                  onChange={(e) => setModuleHeightInput(parseFloat(e.target.value) || 0)}
                  min={0.5}
                  step={0.01}
                />
              </div>
            </div>
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
            <Label>Orientierung</Label>
            <Select value={orientationMode} onValueChange={(v) => setOrientationMode(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Orientierung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Hochkant (Standard)</SelectItem>
                <SelectItem value="landscape">Quer</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
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
