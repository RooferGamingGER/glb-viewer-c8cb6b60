
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Measurement, PVModuleInfo } from '@/types/measurements';
import PVModuleSelect from './PVModuleSelect';
import PVMaterialsList from './PVMaterialsList';
import PVModuleEfficiencyLegend from './PVModuleEfficiencyLegend';

interface SolarMeasurementContentProps {
  measurement: Measurement;
  updateMeasurement: (id: string, updates: Partial<Measurement>) => void;
  calculatePVMaterialsForMeasurement?: (id: string, inverterDistance?: number) => void;
  isCalculating?: boolean;
}

const SolarMeasurementContent: React.FC<SolarMeasurementContentProps> = ({
  measurement,
  updateMeasurement,
  calculatePVMaterialsForMeasurement,
  isCalculating
}) => {
  const [activeTab, setActiveTab] = useState('layout');
  const [inverterDistance, setInverterDistance] = useState(10);
  const [showOrientation, setShowOrientation] = useState(true);
  
  // Prüfe, ob pvModuleInfo vorhanden ist
  const pvModuleInfo = measurement.pvModuleInfo;
  
  if (!pvModuleInfo) {
    return (
      <div className="p-3">
        <div className="text-sm text-muted-foreground">
          Keine PV-Modul-Informationen verfügbar.
        </div>
      </div>
    );
  }
  
  // Handler für die manuelle Einstellung der verfügbaren Fläche
  const handleManualDimensionsToggle = (checked: boolean) => {
    // Toggle der manuellen Dimensionseinstellung
    updateMeasurement(measurement.id, {
      pvModuleInfo: {
        ...pvModuleInfo,
        manualDimensions: checked
      }
    });
  };
  
  // Handler für die Änderung der benutzerdefinierten Breite
  const handleUserDefinedWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = parseFloat(e.target.value);
    if (isNaN(width) || width <= 0) return;
    
    updateMeasurement(measurement.id, {
      pvModuleInfo: {
        ...pvModuleInfo,
        userDefinedWidth: width,
        manualDimensions: true
      }
    });
  };
  
  // Handler für die Änderung der benutzerdefinierten Länge
  const handleUserDefinedLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const length = parseFloat(e.target.value);
    if (isNaN(length) || length <= 0) return;
    
    updateMeasurement(measurement.id, {
      pvModuleInfo: {
        ...pvModuleInfo,
        userDefinedLength: length,
        manualDimensions: true
      }
    });
  };
  
  // Handler für die Änderung des Randabstands
  const handleEdgeDistanceChange = (values: number[]) => {
    const distance = values[0];
    
    updateMeasurement(measurement.id, {
      pvModuleInfo: {
        ...pvModuleInfo,
        edgeDistance: distance
      }
    });
  };
  
  // Handler für die Änderung des Modulabstands
  const handleModuleSpacingChange = (values: number[]) => {
    const spacing = values[0];
    
    updateMeasurement(measurement.id, {
      pvModuleInfo: {
        ...pvModuleInfo,
        moduleSpacing: spacing
      }
    });
  };
  
  // Handler für Berechnung der Materialliste
  const handleCalculateMaterials = () => {
    if (calculatePVMaterialsForMeasurement) {
      calculatePVMaterialsForMeasurement(measurement.id, inverterDistance);
    } else {
      toast.error("Materialberechnung nicht verfügbar");
    }
  };
  
  // Format für die Anzeige der Orientierung und Neigung
  const formatRoofDirection = () => {
    if (pvModuleInfo.roofDirection) {
      return `${pvModuleInfo.roofDirection} (${pvModuleInfo.roofAzimuth?.toFixed(0)}°)`;
    }
    return "Nicht verfügbar";
  };
  
  // Bestimme die Modulausrichtung für die Anzeige
  const moduleOrientation = pvModuleInfo.orientation === 'portrait' ? 'Hochformat' : 'Querformat';
  
  return (
    <div className="p-3">
      <Tabs defaultValue="layout" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="materials">Materialien</TabsTrigger>
          <TabsTrigger value="efficiency">Effizienz</TabsTrigger>
        </TabsList>
        
        <TabsContent value="layout" className="pt-3">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <div className="text-xs font-semibold mb-1">Module</div>
              <div className="text-sm">{pvModuleInfo.moduleCount} ({moduleOrientation})</div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1">Abdeckung</div>
              <div className="text-sm">{pvModuleInfo.coveragePercent.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1">Fläche</div>
              <div className="text-sm">{pvModuleInfo.actualArea?.toFixed(1)} m²</div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1">Leistung</div>
              <div className="text-sm">
                {(pvModuleInfo.moduleCount * (pvModuleInfo.pvModuleSpec?.power || 425) / 1000).toFixed(1)} kWp
              </div>
            </div>
          </div>
          
          {showOrientation && (
            <div className="mb-4">
              <div className="text-xs font-semibold mb-1">Dachausrichtung</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs">Richtung</div>
                  <div className="text-sm">{formatRoofDirection()}</div>
                </div>
                <div>
                  <div className="text-xs">Neigung</div>
                  <div className="text-sm">{pvModuleInfo.roofInclination?.toFixed(1) || "N/A"}°</div>
                </div>
              </div>
            </div>
          )}
          
          <Separator className="my-4" />
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="manualDimensions">Fläche manuell festlegen</Label>
              <Switch 
                id="manualDimensions"
                checked={pvModuleInfo.manualDimensions || false}
                onCheckedChange={handleManualDimensionsToggle}
              />
            </div>
            
            {pvModuleInfo.manualDimensions && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <div className="text-xs mb-1">Breite (m)</div>
                  <Input 
                    type="number" 
                    min="0.1" 
                    step="0.1"
                    value={pvModuleInfo.userDefinedWidth || pvModuleInfo.availableWidth?.toFixed(1) || ""}
                    onChange={handleUserDefinedWidthChange}
                  />
                </div>
                <div>
                  <div className="text-xs mb-1">Länge (m)</div>
                  <Input 
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={pvModuleInfo.userDefinedLength || pvModuleInfo.availableLength?.toFixed(1) || ""}
                    onChange={handleUserDefinedLengthChange}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="edgeDistance">Dachrandabstand</Label>
              <span className="text-xs">{pvModuleInfo.edgeDistance?.toFixed(2) || "0.10"} m</span>
            </div>
            <Slider 
              id="edgeDistance"
              min={0.05}
              max={1}
              step={0.01}
              value={[pvModuleInfo.edgeDistance || 0.1]}
              onValueChange={handleEdgeDistanceChange}
            />
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="moduleSpacing">Modulabstand</Label>
              <span className="text-xs">{pvModuleInfo.moduleSpacing?.toFixed(2) || "0.05"} m</span>
            </div>
            <Slider 
              id="moduleSpacing"
              min={0.01}
              max={0.2}
              step={0.01}
              value={[pvModuleInfo.moduleSpacing || 0.05]}
              onValueChange={handleModuleSpacingChange}
            />
          </div>
          
          <Separator className="my-4" />
          
          <div className="mb-4">
            <div className="text-xs font-semibold mb-2">Modul-Spezifikation</div>
            <PVModuleSelect 
              value={pvModuleInfo.pvModuleSpec}
              onChange={(spec) => {
                updateMeasurement(measurement.id, {
                  pvModuleInfo: {
                    ...pvModuleInfo,
                    pvModuleSpec: spec
                  }
                });
              }}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="materials" className="pt-3">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="inverterDistance">Entfernung zum Wechselrichter</Label>
              <span className="text-xs">{inverterDistance} m</span>
            </div>
            <Slider 
              id="inverterDistance"
              min={5}
              max={30}
              step={1}
              value={[inverterDistance]}
              onValueChange={(values) => setInverterDistance(values[0])}
            />
          </div>
          
          <div className="mb-4">
            <Button 
              onClick={handleCalculateMaterials}
              className="w-full"
              disabled={isCalculating}
            >
              {isCalculating ? "Berechne..." : "Materialberechnung"}
            </Button>
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <PVMaterialsList materials={pvModuleInfo.pvMaterials} />
          </div>
        </TabsContent>
        
        <TabsContent value="efficiency" className="pt-3">
          {pvModuleInfo.roofAzimuth && pvModuleInfo.roofInclination ? (
            <PVModuleEfficiencyLegend pvInfo={pvModuleInfo} />
          ) : (
            <div className="text-center p-4">
              <div className="text-sm text-muted-foreground mb-4">
                Dachausrichtungsdaten sind nicht verfügbar.
              </div>
              <Button 
                onClick={() => {
                  // Füge Beispieldaten für Demonstration hinzu
                  const updatedPvInfo: PVModuleInfo = {
                    ...pvModuleInfo,
                    roofAzimuth: 180, // Süden
                    roofDirection: 'S',
                    roofInclination: 30,
                    yieldFactor: 950
                  };
                  
                  updateMeasurement(measurement.id, {
                    pvModuleInfo: updatedPvInfo
                  });
                }}
                variant="outline"
              >
                Dachausrichtung analysieren
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SolarMeasurementContent;
