
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PVModuleSpec } from '@/types/measurements';
import { PV_MODULE_TEMPLATES } from '@/utils/pvCalculations';
import { Settings } from 'lucide-react';

interface PVModuleSelectProps {
  onModuleSelect: (module: PVModuleSpec) => void;
  currentModule?: PVModuleSpec;
}

const PVModuleSelect: React.FC<PVModuleSelectProps> = ({ 
  onModuleSelect,
  currentModule
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
  
  const handleSubmit = () => {
    const selectedModule = isCustom 
      ? customModule 
      : PV_MODULE_TEMPLATES.find(m => m.name === selectedTemplate) || PV_MODULE_TEMPLATES[0];
    
    onModuleSelect(selectedModule);
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
        
        <div className="py-4">
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
        </div>
        
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
