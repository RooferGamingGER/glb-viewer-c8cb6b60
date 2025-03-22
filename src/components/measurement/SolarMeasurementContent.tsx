
import React, { useState, useEffect } from 'react';
import { Measurement, PVMaterials } from '@/types/measurements';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPVModuleInfo, calculatePVModulePlacement } from '@/utils/pvCalculations';
import PVModuleSelect from './PVModuleSelect';
import PVMaterialsList from './PVMaterialsList';
import { useMeasurements } from '@/hooks/useMeasurements';
import { Zap, ListTodo, PackageIcon } from 'lucide-react';

interface SolarMeasurementContentProps {
  measurement: Measurement;
  updateMeasurement: (id: string, updatedData: Partial<Measurement>) => void;
}

const SolarMeasurementContent: React.FC<SolarMeasurementContentProps> = ({ 
  measurement, 
  updateMeasurement 
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { calculatePVMaterialsForMeasurement } = useMeasurements();
  
  // When component loads, check if materials calculation is needed
  useEffect(() => {
    if (measurement.pvModuleInfo && !measurement.pvModuleInfo.pvMaterials && measurement.pvModuleInfo.moduleCount > 0) {
      console.log("No materials found, calculating automatically");
      handleCalculateMaterials();
    }
  }, [measurement.id]);
  
  const handleModuleSelect = (moduleSpec: any) => {
    if (!measurement.pvModuleInfo) return;
    
    // Update PV module info with the selected module
    const updatedPVInfo = {
      ...measurement.pvModuleInfo,
      pvModuleSpec: moduleSpec
    };
    
    // Update the measurement with the new PV info
    updateMeasurement(measurement.id, {
      pvModuleInfo: updatedPVInfo
    });
    
    // Recalculate materials with the new module spec
    setTimeout(() => handleCalculateMaterials(), 300);
  };
  
  const handleDimensionsChange = (dimensions: {width: number, length: number}) => {
    if (!measurement.pvModuleInfo) return;
    
    // Create updated PV info with manual dimensions
    const updatedPVInfo = {
      ...measurement.pvModuleInfo,
      manualDimensions: true,
      userDefinedWidth: dimensions.width,
      userDefinedLength: dimensions.length
    };
    
    // Recalculate PV module placement with the new dimensions
    const recalculatedPVInfo = calculatePVModulePlacement(
      measurement.points,
      measurement.pvModuleInfo.moduleWidth,
      measurement.pvModuleInfo.moduleHeight,
      measurement.pvModuleInfo.edgeDistance,
      measurement.pvModuleInfo.moduleSpacing,
      dimensions
    );
    
    // Merge the recalculated info with our updated info
    const finalPVInfo = {
      ...recalculatedPVInfo,
      manualDimensions: true,
      userDefinedWidth: dimensions.width,
      userDefinedLength: dimensions.length,
      pvModuleSpec: measurement.pvModuleInfo.pvModuleSpec || recalculatedPVInfo.pvModuleSpec,
      pvMaterials: measurement.pvModuleInfo.pvMaterials
    };
    
    // Update the measurement
    updateMeasurement(measurement.id, {
      pvModuleInfo: finalPVInfo
    });
    
    // Recalculate materials with new dimensions
    setTimeout(() => handleCalculateMaterials(), 300);
  };
  
  const handleSpacingChange = (spacing: {edgeDistance: number, moduleSpacing: number}) => {
    if (!measurement.pvModuleInfo) return;
    
    // Update spacing values
    const updatedPVInfo = {
      ...measurement.pvModuleInfo,
      edgeDistance: spacing.edgeDistance,
      moduleSpacing: spacing.moduleSpacing
    };
    
    // Recalculate with new spacing
    const recalculatedPVInfo = calculatePVModulePlacement(
      measurement.points,
      measurement.pvModuleInfo.moduleWidth,
      measurement.pvModuleInfo.moduleHeight,
      spacing.edgeDistance,
      spacing.moduleSpacing,
      measurement.pvModuleInfo.manualDimensions ? {
        width: measurement.pvModuleInfo.userDefinedWidth || 0,
        length: measurement.pvModuleInfo.userDefinedLength || 0
      } : undefined
    );
    
    // Merge the updates
    const finalPVInfo = {
      ...recalculatedPVInfo,
      edgeDistance: spacing.edgeDistance,
      moduleSpacing: spacing.moduleSpacing,
      manualDimensions: measurement.pvModuleInfo.manualDimensions,
      userDefinedWidth: measurement.pvModuleInfo.userDefinedWidth,
      userDefinedLength: measurement.pvModuleInfo.userDefinedLength,
      pvModuleSpec: measurement.pvModuleInfo.pvModuleSpec || recalculatedPVInfo.pvModuleSpec,
      pvMaterials: measurement.pvModuleInfo.pvMaterials
    };
    
    // Update the measurement
    updateMeasurement(measurement.id, {
      pvModuleInfo: finalPVInfo
    });
    
    // Recalculate materials with new spacing
    setTimeout(() => handleCalculateMaterials(), 300);
  };
  
  const handleCalculateMaterials = (inverterDistance: number = 10) => {
    // Call the hook function to calculate materials
    const materials = calculatePVMaterialsForMeasurement(measurement.id, inverterDistance);
    console.log("Calculated materials:", materials);
    
    // Switch to the materials tab
    setActiveTab("materials");
  };
  
  if (!measurement.pvModuleInfo) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          Keine PV-Modul-Informationen verfügbar. Bitte neu berechnen.
        </p>
      </div>
    );
  }
  
  // Check if materials are available
  const hasMaterials = !!measurement.pvModuleInfo.pvMaterials;
  
  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2 px-2">
        <Label className="text-xs">
          <span className="text-muted-foreground">Layout:</span>{' '}
          {formatPVModuleInfo(measurement.pvModuleInfo)}
        </Label>
        
        <PVModuleSelect 
          onModuleSelect={handleModuleSelect}
          currentModule={measurement.pvModuleInfo.pvModuleSpec}
          pvModuleInfo={measurement.pvModuleInfo}
          onDimensionsChange={handleDimensionsChange}
          onSpacingChange={handleSpacingChange}
          onCalculateMaterials={handleCalculateMaterials}
        />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-2">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <Zap className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Übersicht</span>
          </TabsTrigger>
          <TabsTrigger value="details">
            <ListTodo className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Details</span>
          </TabsTrigger>
          <TabsTrigger value="materials">
            <PackageIcon className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Material</span>
            {hasMaterials && <span className="ml-1 w-1.5 h-1.5 bg-green-500 rounded-full"></span>}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="pt-2">
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="text-muted-foreground">Modulgröße:</div>
              <div>{measurement.pvModuleInfo.moduleWidth.toFixed(2)} × {measurement.pvModuleInfo.moduleHeight.toFixed(2)} m</div>
              
              <div className="text-muted-foreground">Anzahl Module:</div>
              <div>{measurement.pvModuleInfo.moduleCount}</div>
              
              <div className="text-muted-foreground">Raster:</div>
              <div>{measurement.pvModuleInfo.columns || 0} × {measurement.pvModuleInfo.rows || 0}</div>
              
              <div className="text-muted-foreground">Dachfläche:</div>
              <div>{measurement.pvModuleInfo.actualArea?.toFixed(2) || "?"} m²</div>
              
              <div className="text-muted-foreground">Flächennutzung:</div>
              <div>{measurement.pvModuleInfo.coveragePercent.toFixed(1)}%</div>
              
              <div className="text-muted-foreground">Leistung:</div>
              <div>
                {((measurement.pvModuleInfo.moduleCount * 
                  (measurement.pvModuleInfo.pvModuleSpec?.power || 425)) / 1000).toFixed(1)} kWp
              </div>
            </div>
            
            <div className="mt-2 pt-2 border-t text-xs">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-7"
                onClick={() => handleCalculateMaterials()}
              >
                <PackageIcon className="h-3 w-3 mr-1" />
                {hasMaterials ? "Materialliste aktualisieren" : "Materialliste berechnen"}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="pt-2">
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="text-muted-foreground">Modultyp:</div>
              <div>{measurement.pvModuleInfo.pvModuleSpec?.name || "Standard"}</div>
              
              <div className="text-muted-foreground">Modulleistung:</div>
              <div>{measurement.pvModuleInfo.pvModuleSpec?.power || 425} Wp</div>
              
              <div className="text-muted-foreground">Orientierung:</div>
              <div>{measurement.pvModuleInfo.orientation === 'portrait' ? 'Hochformat' : 'Querformat'}</div>
              
              <div className="text-muted-foreground">Randabstand:</div>
              <div>{measurement.pvModuleInfo.edgeDistance?.toFixed(2) || "0.10"} m</div>
              
              <div className="text-muted-foreground">Modulabstand:</div>
              <div>{measurement.pvModuleInfo.moduleSpacing?.toFixed(2) || "0.05"} m</div>
              
              <div className="text-muted-foreground">Verfügbare Breite:</div>
              <div>{measurement.pvModuleInfo.availableWidth?.toFixed(2) || "?"} m</div>
              
              <div className="text-muted-foreground">Verfügbare Länge:</div>
              <div>{measurement.pvModuleInfo.availableLength?.toFixed(2) || "?"} m</div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="materials" className="pt-2">
          {measurement.pvModuleInfo.pvMaterials ? (
            <PVMaterialsList 
              materials={measurement.pvModuleInfo.pvMaterials}
              onCalculate={() => handleCalculateMaterials()}
            />
          ) : (
            <div className="p-4 text-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleCalculateMaterials()}
              >
                <PackageIcon className="h-4 w-4 mr-1" />
                Materialliste berechnen
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SolarMeasurementContent;
