import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Measurement, PVModuleInfo } from '@/types/measurements';
import { Sun, Info, Settings } from 'lucide-react';
import {
  calculatePVModulePlacement,
  calculatePVPower,
  calculateAnnualYieldWithOrientation,
  updatePVModuleInfoWithOrientation,
  calculatePVMaterials,
  extractRoofEdgeMeasurements
} from '@/utils/pvCalculations';
import { formatCurrency, formatNumber } from '@/utils/formatting';
import PVModuleSelect from './PVModuleSelect';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import PVModulePositioningControls from '../pvplanning/PVModulePositioningControls';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SolarMeasurementContentProps {
  measurement: Measurement;
  onUpdate: (updatedMeasurement: Measurement) => void;
  allMeasurements: Measurement[];
  isMetric: boolean;
}

const SolarMeasurementContent: React.FC<SolarMeasurementContentProps> = ({
  measurement,
  onUpdate,
  allMeasurements,
  isMetric
}) => {
  const [pvModuleInfo, setPvModuleInfo] = useState<PVModuleInfo | undefined>(
    measurement.pvModuleInfo
  );
  
  // Default values if not present
  const moduleHeightOffset = pvModuleInfo?.moduleHeightOffset !== undefined ? pvModuleInfo.moduleHeightOffset : 0.05;
  const moduleRotation = pvModuleInfo?.moduleRotation !== undefined ? pvModuleInfo.moduleRotation : 0;
  const modulePositionX = pvModuleInfo?.modulePositionX !== undefined ? pvModuleInfo.modulePositionX : 0;
  const modulePositionZ = pvModuleInfo?.modulePositionZ !== undefined ? pvModuleInfo.modulePositionZ : 0;
  
  const [activeTab, setActiveTab] = useState("module");

  // Calculate PV module placement if not already calculated
  useEffect(() => {
    if (!measurement.pvModuleInfo && measurement.points.length >= 3) {
      // Get roof edge measurements
      const edgeInfo = extractRoofEdgeMeasurements(allMeasurements);
      
      // Calculate initial PV module placement
      const initialPvInfo = calculatePVModulePlacement(
        measurement.points, 
        undefined, 
        undefined,
        undefined,
        undefined,
        undefined,
        edgeInfo
      );
      
      // Add default positioning values
      const pvInfoWithPositioning: PVModuleInfo = {
        ...initialPvInfo,
        moduleHeightOffset: 0.05,
        moduleRotation: 0,
        modulePositionX: 0,
        modulePositionZ: 0
      };
      
      // Add orientation data
      const pvInfoWithOrientation = updatePVModuleInfoWithOrientation(
        pvInfoWithPositioning,
        measurement.points
      );
      
      // Calculate materials
      const materials = calculatePVMaterials(pvInfoWithOrientation);
      pvInfoWithOrientation.pvMaterials = materials;
      
      // Update the measurement
      const updatedMeasurement = {
        ...measurement,
        pvModuleInfo: pvInfoWithOrientation
      };
      
      onUpdate(updatedMeasurement);
      setPvModuleInfo(pvInfoWithOrientation);
    }
  }, [measurement, allMeasurements, onUpdate]);
  
  // Update measurement when pvModuleInfo changes
  useEffect(() => {
    if (pvModuleInfo && JSON.stringify(pvModuleInfo) !== JSON.stringify(measurement.pvModuleInfo)) {
      const updatedMeasurement = {
        ...measurement,
        pvModuleInfo
      };
      onUpdate(updatedMeasurement);
    }
  }, [pvModuleInfo, measurement, onUpdate]);
  
  // Handle module selection
  const handleModuleSelect = (moduleSpec) => {
    if (pvModuleInfo) {
      const updatedPvInfo = {
        ...pvModuleInfo,
        pvModuleSpec: moduleSpec
      };
      
      // Recalculate materials
      const materials = calculatePVMaterials(updatedPvInfo);
      updatedPvInfo.pvMaterials = materials;
      
      setPvModuleInfo(updatedPvInfo);
    }
  };
  
  // Handle dimension changes
  const handleDimensionsChange = (dimensions) => {
    if (pvModuleInfo) {
      const updatedPvInfo = calculatePVModulePlacement(
        measurement.points,
        pvModuleInfo.moduleWidth,
        pvModuleInfo.moduleHeight,
        pvModuleInfo.edgeDistance,
        pvModuleInfo.moduleSpacing,
        dimensions
      );
      
      // Preserve positioning parameters
      updatedPvInfo.moduleHeightOffset = pvModuleInfo.moduleHeightOffset;
      updatedPvInfo.moduleRotation = pvModuleInfo.moduleRotation;
      updatedPvInfo.modulePositionX = pvModuleInfo.modulePositionX;
      updatedPvInfo.modulePositionZ = pvModuleInfo.modulePositionZ;
      
      // Preserve orientation data
      updatedPvInfo.roofAzimuth = pvModuleInfo.roofAzimuth;
      updatedPvInfo.roofDirection = pvModuleInfo.roofDirection;
      updatedPvInfo.roofInclination = pvModuleInfo.roofInclination;
      updatedPvInfo.yieldFactor = pvModuleInfo.yieldFactor;
      
      // Calculate materials
      const materials = calculatePVMaterials(updatedPvInfo);
      updatedPvInfo.pvMaterials = materials;
      
      setPvModuleInfo(updatedPvInfo);
    }
  };
  
  // Handle spacing changes
  const handleSpacingChange = (spacing) => {
    if (pvModuleInfo) {
      const updatedPvInfo = calculatePVModulePlacement(
        measurement.points,
        pvModuleInfo.moduleWidth,
        pvModuleInfo.moduleHeight,
        spacing.edgeDistance,
        spacing.moduleSpacing,
        pvModuleInfo.manualDimensions ? {
          width: pvModuleInfo.userDefinedWidth,
          length: pvModuleInfo.userDefinedLength
        } : undefined
      );
      
      // Preserve positioning parameters
      updatedPvInfo.moduleHeightOffset = pvModuleInfo.moduleHeightOffset;
      updatedPvInfo.moduleRotation = pvModuleInfo.moduleRotation;
      updatedPvInfo.modulePositionX = pvModuleInfo.modulePositionX;
      updatedPvInfo.modulePositionZ = pvModuleInfo.modulePositionZ;
      
      // Preserve orientation data
      updatedPvInfo.roofAzimuth = pvModuleInfo.roofAzimuth;
      updatedPvInfo.roofDirection = pvModuleInfo.roofDirection;
      updatedPvInfo.roofInclination = pvModuleInfo.roofInclination;
      updatedPvInfo.yieldFactor = pvModuleInfo.yieldFactor;
      
      // Calculate materials
      const materials = calculatePVMaterials(updatedPvInfo);
      updatedPvInfo.pvMaterials = materials;
      
      setPvModuleInfo(updatedPvInfo);
    }
  };

  // Handle positioning changes
  const handlePositioningChange = (changes: Partial<PVModuleInfo>) => {
    if (pvModuleInfo) {
      setPvModuleInfo({
        ...pvModuleInfo,
        ...changes
      });
    }
  };
  
  // Handle materials calculation
  const handleCalculateMaterials = (inverterDistance) => {
    if (pvModuleInfo) {
      const materials = calculatePVMaterials(pvModuleInfo, inverterDistance);
      
      const updatedPvInfo = {
        ...pvModuleInfo,
        pvMaterials: materials
      };
      
      setPvModuleInfo(updatedPvInfo);
    }
  };
  
  if (!pvModuleInfo) return null;
  
  // Calculate power and yield
  const power = calculatePVPower(pvModuleInfo.moduleCount, pvModuleInfo.pvModuleSpec?.power || 380);
  const annualYield = calculateAnnualYieldWithOrientation(power, pvModuleInfo);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">PV-Anlagenplanung</h3>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Einstellungen
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <h4 className="font-medium mb-2">PV-Modul Einstellungen</h4>
            <Tabs defaultValue="module" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="module">Modul</TabsTrigger>
                <TabsTrigger value="position">Position</TabsTrigger>
                <TabsTrigger value="dimensions">Fläche</TabsTrigger>
              </TabsList>
              
              <TabsContent value="module" className="space-y-4 pt-2">
                <PVModuleSelect 
                  onModuleSelect={handleModuleSelect} 
                  currentModule={pvModuleInfo.pvModuleSpec} 
                  pvModuleInfo={pvModuleInfo}
                  onSpacingChange={handleSpacingChange}
                  onDimensionsChange={handleDimensionsChange}
                  onCalculateMaterials={handleCalculateMaterials}
                />
              </TabsContent>
              
              <TabsContent value="position" className="space-y-4 pt-2">
                <PVModulePositioningControls 
                  pvModuleInfo={pvModuleInfo}
                  onChange={handlePositioningChange}
                />
              </TabsContent>
              
              <TabsContent value="dimensions" className="space-y-4 pt-2">
                <div className="space-y-3">
                  {/* Manual dimension settings would go here */}
                </div>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>
      </div>
      
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Module</Label>
              <p className="font-medium">{pvModuleInfo.moduleCount} Module</p>
              <p className="text-sm text-muted-foreground">{pvModuleInfo.orientation === 'portrait' ? 'Hochformat' : 'Querformat'}</p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Leistung</Label>
              <p className="font-medium">{power.toFixed(1)} kWp</p>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <p className="text-sm text-muted-foreground flex items-center cursor-help">
                    ca. {formatNumber(annualYield)} kWh/Jahr <Info className="h-3 w-3 ml-1" />
                  </p>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <p className="text-sm">
                    Diese Schätzung basiert auf der Dachausrichtung ({pvModuleInfo.roofDirection || 'Süd'}) 
                    und Neigung ({pvModuleInfo.roofInclination?.toFixed(0) || '30'}°).
                  </p>
                </HoverCardContent>
              </HoverCard>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Dachfläche</Label>
              <p className="font-medium">{pvModuleInfo.actualArea?.toFixed(1)} m²</p>
              <p className="text-sm text-muted-foreground">{pvModuleInfo.coveragePercent.toFixed(1)}% belegt</p>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Ausrichtung</Label>
              <p className="font-medium">{pvModuleInfo.roofDirection || 'Süd'}</p>
              <p className="text-sm text-muted-foreground">{pvModuleInfo.roofInclination?.toFixed(0) || '30'}° Neigung</p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Sun className="h-4 w-4 text-amber-500" />
              <h4 className="font-medium">Wirtschaftlichkeit</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Investition (ca.)</Label>
                <p className="font-medium">{formatCurrency(power * 1800)}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(power * 1800 / pvModuleInfo.moduleCount)} pro Modul</p>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Jährlicher Ertrag (ca.)</Label>
                <p className="font-medium">{formatCurrency(annualYield * 0.12)}</p>
                <p className="text-sm text-muted-foreground">bei {formatCurrency(0.12)}/kWh</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SolarMeasurementContent;
