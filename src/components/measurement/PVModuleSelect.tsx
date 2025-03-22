
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PVModuleSpec, PVModuleInfo } from '@/types/measurements';
import { PV_MODULE_TEMPLATES } from '@/utils/pvCalculations';
import { Settings, Ruler } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PVModuleSelectProps {
  onModuleSelect: (module: PVModuleSpec) => void;
  currentModule?: PVModuleSpec;
  onDimensionsChange?: (dimensions: {width: number, length: number}) => void;
  pvModuleInfo?: PVModuleInfo;
}

const PVModuleSelect: React.FC<PVModuleSelectProps> = ({ 
  onModuleSelect,
  currentModule,
  onDimensionsChange,
  pvModuleInfo
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    currentModule?.name || PV_MODULE_TEMPLATES[0].name
  );
  const [customModule, setCustomModule] = useState<PVModuleSpec>({
    name: "Benutzerdefiniert",
    width: currentModule?.width || 1.041,
    height: currentModule?.height || 1.767,
    power: currentModule?.power || 380,
    efficiency: currentModule?.efficiency || 19.5
  });
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("module");
  const [useManualDimensions, setUseManualDimensions] = useState<boolean>(
    pvModuleInfo?.manualDimensions || false
  );
  const [availableWidth, setAvailableWidth] = useState<number>(
    pvModuleInfo?.userDefinedWidth || pvModuleInfo?.availableWidth || 4.0
  );
  const [availableLength, setAvailableLength] = useState<number>(
    pvModuleInfo?.userDefinedLength || pvModuleInfo?.availableLength || 5.0
  );
  
  useEffect(() => {
    if (pvModuleInfo) {
      setUseManualDimensions(pvModuleInfo.manualDimensions || false);
      setAvailableWidth(pvModuleInfo.userDefinedWidth || pvModuleInfo.availableWidth || 4.0);
      setAvailableLength(pvModuleInfo.userDefinedLength || pvModuleInfo.availableLength || 5.0);
    }
  }, [pvModuleInfo]);
  
  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    setIsCustom(value === "custom");
  };
  
  const handleCustomChange = (field: keyof PVModuleSpec, value: number | string) => {
    setCustomModule(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleDimensionChange = (dimension: 'width' | 'length', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (dimension === 'width') {
        setAvailableWidth(numValue);
      } else {
        setAvailableLength(numValue);
      }
    }
  };
  
  const handleSubmit = () => {
    const selectedModule = isCustom 
      ? customModule 
      : PV_MODULE_TEMPLATES.find(m => m.name === selectedTemplate) || PV_MODULE_TEMPLATES[0];
    
    onModuleSelect(selectedModule);
    
    // If manual dimensions are enabled and the callback exists, send the dimensions
    if (useManualDimensions && onDimensionsChange) {
      onDimensionsChange({
        width: availableWidth,
        length: availableLength
      });
    }
    
    setDialogOpen(false);
  };
  
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto h-8">
          <Settings className="h-4 w-4 mr-1" />
          <span>PV-Modul</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PV-Modul auswählen</DialogTitle>
          <DialogDescription>
            Wählen Sie ein Modul aus den Vorlagen oder definieren Sie ein benutzerdefiniertes Modul.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="module">Modul</TabsTrigger>
            <TabsTrigger value="dimensions">Abmessungen</TabsTrigger>
          </TabsList>
          
          <TabsContent value="module" className="py-4">
            <div className="space-y-4">
              <RadioGroup 
                value={isCustom ? "custom" : selectedTemplate} 
                onValueChange={handleTemplateChange}
              >
                {PV_MODULE_TEMPLATES.map((template) => (
                  <div 
                    key={template.name} 
                    className="flex items-center justify-between space-x-2 border p-3 rounded-md"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={template.name} id={template.name.replace(/\s/g, '')} />
                      <Label htmlFor={template.name.replace(/\s/g, '')} className="flex-grow">
                        {template.name}
                      </Label>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {template.width.toFixed(2)}m × {template.height.toFixed(2)}m, {template.power}W
                    </div>
                  </div>
                ))}
                
                <div className="flex items-center space-x-2 border p-3 rounded-md">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">
                    Benutzerdefiniertes Modul
                  </Label>
                </div>
              </RadioGroup>
              
              {isCustom && (
                <div className="border p-3 rounded-md mt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="width">Breite (m)</Label>
                      <Input
                        id="width"
                        type="number"
                        step="0.001"
                        min="0.5"
                        max="2"
                        value={customModule.width}
                        onChange={(e) => handleCustomChange('width', parseFloat(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="height">Höhe (m)</Label>
                      <Input
                        id="height"
                        type="number"
                        step="0.001"
                        min="0.5"
                        max="2.5"
                        value={customModule.height}
                        onChange={(e) => handleCustomChange('height', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="power">Leistung (W)</Label>
                      <Input
                        id="power"
                        type="number"
                        step="5"
                        min="50"
                        max="1000"
                        value={customModule.power}
                        onChange={(e) => handleCustomChange('power', parseInt(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="efficiency">Wirkungsgrad (%)</Label>
                      <Input
                        id="efficiency"
                        type="number"
                        step="0.1"
                        min="10"
                        max="30"
                        value={customModule.efficiency}
                        onChange={(e) => handleCustomChange('efficiency', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="dimensions" className="py-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="useManualDimensions" 
                  checked={useManualDimensions}
                  onCheckedChange={(checked) => setUseManualDimensions(checked as boolean)}
                />
                <Label htmlFor="useManualDimensions" className="font-medium">
                  Manuelle Abmessungen verwenden
                </Label>
              </div>
              
              {useManualDimensions && (
                <div className="border p-3 rounded-md space-y-3">
                  <div className="flex items-center justify-start mb-2">
                    <Ruler className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="text-sm font-medium">Verfügbare Installationsfläche</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="availableWidth">Breite (m)</Label>
                      <Input
                        id="availableWidth"
                        type="number"
                        step="0.01"
                        min="0.5"
                        value={availableWidth}
                        onChange={(e) => handleDimensionChange('width', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="availableLength">Länge (m)</Label>
                      <Input
                        id="availableLength"
                        type="number"
                        step="0.01"
                        min="0.5"
                        value={availableLength}
                        onChange={(e) => handleDimensionChange('length', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mt-2 p-2 bg-blue-50/10 border border-blue-100 rounded">
                    <p>Geben Sie die exakten Abmessungen der nutzbaren Fläche an. Diese werden anstelle der automatisch berechneten Werte verwendet.</p>
                  </div>
                </div>
              )}
              
              {!useManualDimensions && pvModuleInfo && (
                <div className="p-3 border rounded-md bg-gray-50/30">
                  <h3 className="text-sm font-medium mb-2">Automatisch berechnete Abmessungen:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Breite:</strong> {pvModuleInfo.availableWidth?.toFixed(2) || "-"} m</div>
                    <div><strong>Länge:</strong> {pvModuleInfo.availableLength?.toFixed(2) || "-"} m</div>
                    <div><strong>Fläche:</strong> {pvModuleInfo.actualArea?.toFixed(2) || "-"} m²</div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button type="button" variant="default" onClick={handleSubmit}>
            Bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PVModuleSelect;
