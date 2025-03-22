
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Measurement } from '@/types/measurements';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SolarModuleControlsProps {
  measurement: Measurement;
  togglePVModulesVisibility: (id: string) => void;
}

const SolarModuleControls: React.FC<SolarModuleControlsProps> = ({
  measurement,
  togglePVModulesVisibility
}) => {
  if (measurement.type !== 'solar' || !measurement.pvModuleInfo) {
    return null;
  }

  const { 
    moduleCount = 0, 
    moduleWidth = 0, 
    moduleHeight = 0,
    rows = 0,
    columns = 0,
    orientation = 'landscape',
    modulesVisible = true
  } = measurement.pvModuleInfo;
  
  const totalPower = moduleCount * (measurement.pvModuleInfo.pvModuleSpec?.power || 0);
  
  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Sun className="h-4 w-4 mr-2 text-primary" />
            <h4 className="text-sm font-medium">PV-Module</h4>
          </div>
          
          <Badge variant="outline" className="bg-primary/10 text-xs">
            {moduleCount} Module
          </Badge>
        </div>
        
        {moduleCount > 0 && (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
              <div className="text-muted-foreground">Anordnung:</div>
              <div>{columns}x{rows} ({orientation === 'landscape' ? 'Querformat' : 'Hochformat'})</div>
              
              <div className="text-muted-foreground">Modul-Größe:</div>
              <div>{moduleWidth.toFixed(2)} m × {moduleHeight.toFixed(2)} m</div>
              
              {measurement.pvModuleInfo.pvModuleSpec?.power && (
                <>
                  <div className="text-muted-foreground">Leistung/Modul:</div>
                  <div>{measurement.pvModuleInfo.pvModuleSpec.power} W</div>
                  
                  <div className="text-muted-foreground">Gesamtleistung:</div>
                  <div>{totalPower.toFixed(0)} W ({(totalPower / 1000).toFixed(1)} kWp)</div>
                </>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <Label htmlFor={`show-modules-${measurement.id}`} className="text-xs">
                Module anzeigen
              </Label>
              <Switch
                id={`show-modules-${measurement.id}`}
                checked={modulesVisible}
                onCheckedChange={() => togglePVModulesVisibility(measurement.id)}
              />
            </div>
          </>
        )}
        
        {moduleCount === 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            Keine Module konfiguriert. Verwenden Sie die PV-Planung, um Module anzuordnen.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SolarModuleControls;
