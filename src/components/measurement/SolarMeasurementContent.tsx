
import React, { useState, useEffect, useCallback } from 'react';
import { Measurement, PVMaterials } from '@/types/measurements';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  formatPVModuleInfo, 
  calculatePVModulePlacement, 
  calculatePVPower, 
  calculateAnnualYield,
  calculateAnnualYieldWithOrientation,
  updatePVModuleInfoWithOrientation,
  extractExclusionZones,
  generatePVModuleGrid
} from '@/utils/pvCalculations';
import PVModuleSelect from './PVModuleSelect';
import { Zap, ListTodo, Compass, Move, RotateCcw, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

interface SolarMeasurementContentProps {
  measurement: Measurement;
  updateMeasurement: (id: string, updatedData: Partial<Measurement>) => void;
  allMeasurements?: Measurement[];
}

const SolarMeasurementContent: React.FC<SolarMeasurementContentProps> = ({ 
  measurement, 
  updateMeasurement,
  allMeasurements = []
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const exclusionZones = React.useMemo(() => extractExclusionZones(allMeasurements), [allMeasurements]);
  
  useEffect(() => {
    if (measurement.pvModuleInfo && measurement.points && measurement.points.length >= 3) {
      if (measurement.pvModuleInfo.roofAzimuth === undefined) {
        const updatedPVInfo = updatePVModuleInfoWithOrientation(
          measurement.pvModuleInfo,
          measurement.points
        );
        updateMeasurement(measurement.id, { pvModuleInfo: updatedPVInfo });
        toast.success(`Dachausrichtung erkannt: ${updatedPVInfo.roofDirection} (${Math.round(updatedPVInfo.roofAzimuth || 0)}°)`);
      }
    }
  }, [measurement.id, measurement.pvModuleInfo, measurement.points, updateMeasurement]);
  
  useEffect(() => {
    if (measurement.type === 'solar' && !measurement.pvModuleInfo && measurement.points && measurement.points.length >= 3) {
      const pvModuleInfo = calculatePVModulePlacement(measurement.points, undefined, undefined, undefined, undefined, undefined, undefined, true, 'auto', exclusionZones);
      if (pvModuleInfo.moduleCount > 0) {
        updateMeasurement(measurement.id, { pvModuleInfo });
        toast.success(`PV-Module automatisch berechnet: ${pvModuleInfo.moduleCount} Module`);
      }
    }
  }, [measurement.id, measurement.type, measurement.pvModuleInfo, measurement.points, updateMeasurement]);
  
  const handleModuleSelect = (moduleSpec: any) => {
    if (!measurement.pvModuleInfo) return;
    updateMeasurement(measurement.id, {
      pvModuleInfo: { ...measurement.pvModuleInfo, pvModuleSpec: moduleSpec }
    });
  };
  
  const handleDimensionsChange = (dimensions: {width: number, length: number}) => {
    if (!measurement.pvModuleInfo) return;
    const recalculated = calculatePVModulePlacement(
      measurement.points,
      measurement.pvModuleInfo.moduleWidth,
      measurement.pvModuleInfo.moduleHeight,
      measurement.pvModuleInfo.edgeDistance,
      measurement.pvModuleInfo.moduleSpacing,
      dimensions,
      undefined, true, 'auto', exclusionZones
    );
    updateMeasurement(measurement.id, {
      pvModuleInfo: {
        ...recalculated,
        manualDimensions: true,
        userDefinedWidth: dimensions.width,
        userDefinedLength: dimensions.length,
        pvModuleSpec: measurement.pvModuleInfo.pvModuleSpec || recalculated.pvModuleSpec,
        roofAzimuth: measurement.pvModuleInfo.roofAzimuth,
        roofDirection: measurement.pvModuleInfo.roofDirection,
        roofInclination: measurement.pvModuleInfo.roofInclination,
        yieldFactor: measurement.pvModuleInfo.yieldFactor
      }
    });
  };
  
  const handleSpacingChange = (spacing: {edgeDistance: number, moduleSpacing: number}) => {
    if (!measurement.pvModuleInfo) return;
    const recalculated = calculatePVModulePlacement(
      measurement.points,
      measurement.pvModuleInfo.moduleWidth,
      measurement.pvModuleInfo.moduleHeight,
      spacing.edgeDistance,
      spacing.moduleSpacing,
      measurement.pvModuleInfo.manualDimensions ? {
        width: measurement.pvModuleInfo.userDefinedWidth || 0,
        length: measurement.pvModuleInfo.userDefinedLength || 0
      } : undefined,
      undefined, true, 'auto', exclusionZones
    );
    updateMeasurement(measurement.id, {
      pvModuleInfo: {
        ...recalculated,
        edgeDistance: spacing.edgeDistance,
        moduleSpacing: spacing.moduleSpacing,
        manualDimensions: measurement.pvModuleInfo.manualDimensions,
        userDefinedWidth: measurement.pvModuleInfo.userDefinedWidth,
        userDefinedLength: measurement.pvModuleInfo.userDefinedLength,
        pvModuleSpec: measurement.pvModuleInfo.pvModuleSpec || recalculated.pvModuleSpec,
        roofAzimuth: measurement.pvModuleInfo.roofAzimuth,
        roofDirection: measurement.pvModuleInfo.roofDirection,
        roofInclination: measurement.pvModuleInfo.roofInclination,
        yieldFactor: measurement.pvModuleInfo.yieldFactor
      }
    });
  };
  
  
  if (!measurement.pvModuleInfo) {
    return (
      <div className="p-3">
        <p className="text-xs text-muted-foreground mb-2">
          Keine PV-Modul-Informationen verfügbar.
        </p>
        <Button 
          variant="outline" 
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => {
            const pvModuleInfo = calculatePVModulePlacement(measurement.points, undefined, undefined, undefined, undefined, undefined, undefined, true, 'auto', exclusionZones);
            updateMeasurement(measurement.id, { pvModuleInfo });
            toast.success(`PV-Module berechnet: ${pvModuleInfo.moduleCount} Module`);
          }}
        >
          <Zap className="h-3 w-3 mr-1" />
          PV-Module berechnen
        </Button>
      </div>
    );
  }
  
  const annualYield = measurement.pvModuleInfo.roofAzimuth && measurement.pvModuleInfo.roofInclination
    ? calculateAnnualYieldWithOrientation(
        calculatePVPower(
          measurement.pvModuleInfo.moduleCount, 
          measurement.pvModuleInfo.pvModuleSpec?.power || 425
        ),
        measurement.pvModuleInfo
      )
    : calculateAnnualYield(
        calculatePVPower(
          measurement.pvModuleInfo.moduleCount, 
          measurement.pvModuleInfo.pvModuleSpec?.power || 425
        ),
        measurement.pvModuleInfo.orientation === 'portrait' ? 'hochformat' : 'querformat'
      );

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between mb-1 px-2">
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
          onCalculateMaterials={() => {}}
          onModuleSizeChange={({ moduleWidth, moduleHeight }) => {
            if (!measurement.pvModuleInfo) return;
            const recalculated = calculatePVModulePlacement(
              measurement.points, moduleWidth, moduleHeight,
              measurement.pvModuleInfo.edgeDistance,
              measurement.pvModuleInfo.moduleSpacing,
              measurement.pvModuleInfo.manualDimensions ? {
                width: measurement.pvModuleInfo.userDefinedWidth || 0,
                length: measurement.pvModuleInfo.userDefinedLength || 0
              } : undefined,
              undefined, true, 'auto', exclusionZones
            );
            updateMeasurement(measurement.id, { pvModuleInfo: {
              ...recalculated,
              pvModuleSpec: measurement.pvModuleInfo.pvModuleSpec || recalculated.pvModuleSpec,
              roofAzimuth: measurement.pvModuleInfo.roofAzimuth,
              roofDirection: measurement.pvModuleInfo.roofDirection,
              roofInclination: measurement.pvModuleInfo.roofInclination,
              yieldFactor: measurement.pvModuleInfo.yieldFactor
            }});
          }}
          onOrientationChange={(mode) => {
            if (!measurement.pvModuleInfo) return;
            const forced = mode === 'auto' ? undefined : (mode as 'portrait'|'landscape');
            const recalculated = calculatePVModulePlacement(
              measurement.points,
              measurement.pvModuleInfo.moduleWidth,
              measurement.pvModuleInfo.moduleHeight,
              measurement.pvModuleInfo.edgeDistance,
              measurement.pvModuleInfo.moduleSpacing,
              measurement.pvModuleInfo.manualDimensions ? {
                width: measurement.pvModuleInfo.userDefinedWidth || 0,
                length: measurement.pvModuleInfo.userDefinedLength || 0
              } : undefined,
              undefined, true,
              (forced as any) || 'auto',
              exclusionZones
            );
            updateMeasurement(measurement.id, { pvModuleInfo: {
              ...recalculated,
              pvModuleSpec: measurement.pvModuleInfo.pvModuleSpec || recalculated.pvModuleSpec,
              roofAzimuth: measurement.pvModuleInfo.roofAzimuth,
              roofDirection: measurement.pvModuleInfo.roofDirection,
              roofInclination: measurement.pvModuleInfo.roofInclination,
              yieldFactor: measurement.pvModuleInfo.yieldFactor
            }});
          }}
          disabled={false}
        />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">
            <Zap className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Übersicht</span>
          </TabsTrigger>
          <TabsTrigger value="details">
            <ListTodo className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Details</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="pt-2">
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className="text-muted-foreground">Modulgröße:</div>
              <div>{measurement.pvModuleInfo.moduleWidth.toFixed(2)} × {measurement.pvModuleInfo.moduleHeight.toFixed(2)} m</div>
              
              <div className="text-muted-foreground">Anzahl Module:</div>
              <div className="font-medium">{measurement.pvModuleInfo.moduleCount}</div>
              
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
              
              <div className="text-muted-foreground">Ausrichtung:</div>
              <div className="flex items-center">
                {measurement.pvModuleInfo.roofDirection || "Süd"} 
                {measurement.pvModuleInfo.roofAzimuth && (
                  <span className="ml-1 text-muted-foreground">
                    ({Math.round(measurement.pvModuleInfo.roofAzimuth)}°)
                  </span>
                )}
              </div>
              
              <div className="text-muted-foreground">Dachneigung:</div>
              <div>
                {measurement.pvModuleInfo.roofInclination 
                  ? `${Math.round(measurement.pvModuleInfo.roofInclination)}°` 
                  : "30°"}
              </div>
              
              <div className="text-muted-foreground">Jahresertrag:</div>
              <div className="font-medium">
                {annualYield.toFixed(0)} kWh/Jahr
              </div>
            </div>
            
            {/* Grid Position & Rotation Controls */}
            <div className="mt-2 pt-2 border-t space-y-2">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Move className="h-3 w-3" /> Verschiebung & Drehung
              </Label>
              
              {/* Offset U (horizontal) */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-6">↔</span>
                <Slider
                  min={-2}
                  max={2}
                  step={0.05}
                  value={[measurement.pvModuleInfo.gridOffsetU || 0]}
                  onValueChange={([val]) => {
                    updateMeasurement(measurement.id, {
                      pvModuleInfo: { ...measurement.pvModuleInfo!, gridOffsetU: val }
                    });
                  }}
                  className="flex-1"
                />
                <span className="text-[10px] w-10 text-right">{(measurement.pvModuleInfo.gridOffsetU || 0).toFixed(2)}m</span>
              </div>
              
              {/* Offset W (vertical) */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-6">↕</span>
                <Slider
                  min={-2}
                  max={2}
                  step={0.05}
                  value={[measurement.pvModuleInfo.gridOffsetW || 0]}
                  onValueChange={([val]) => {
                    updateMeasurement(measurement.id, {
                      pvModuleInfo: { ...measurement.pvModuleInfo!, gridOffsetW: val }
                    });
                  }}
                  className="flex-1"
                />
                <span className="text-[10px] w-10 text-right">{(measurement.pvModuleInfo.gridOffsetW || 0).toFixed(2)}m</span>
              </div>
              
              {/* Rotation */}
              <div className="flex items-center gap-2">
                <RotateCw className="h-3 w-3 text-muted-foreground shrink-0" />
                <Slider
                  min={-45}
                  max={45}
                  step={1}
                  value={[measurement.pvModuleInfo.gridRotation || 0]}
                  onValueChange={([val]) => {
                    updateMeasurement(measurement.id, {
                      pvModuleInfo: { ...measurement.pvModuleInfo!, gridRotation: val }
                    });
                  }}
                  className="flex-1"
                />
                <span className="text-[10px] w-10 text-right">{(measurement.pvModuleInfo.gridRotation || 0)}°</span>
              </div>
              
              {/* Reset button */}
              {(measurement.pvModuleInfo.gridOffsetU || measurement.pvModuleInfo.gridOffsetW || measurement.pvModuleInfo.gridRotation) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-6 text-[10px]"
                  onClick={() => {
                    updateMeasurement(measurement.id, {
                      pvModuleInfo: { ...measurement.pvModuleInfo!, gridOffsetU: 0, gridOffsetW: 0, gridRotation: 0 }
                    });
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Zurücksetzen
                </Button>
              ) : null}
            </div>
            
            <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
              💡 Klicken Sie auf ein Modul im 3D-Modell um es zu entfernen.
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
              
              <div className="text-muted-foreground">Dachausrichtung:</div>
              <div className="flex items-center">
                {measurement.pvModuleInfo.roofDirection || "Süd"}
                <Compass className="h-3 w-3 ml-1 text-muted-foreground" />
              </div>
              
              <div className="text-muted-foreground">Azimut:</div>
              <div>
                {measurement.pvModuleInfo.roofAzimuth 
                  ? `${Math.round(measurement.pvModuleInfo.roofAzimuth)}°` 
                  : "180° (Süd)"}
              </div>
              
              <div className="text-muted-foreground">Dachneigung:</div>
              <div>
                {measurement.pvModuleInfo.roofInclination 
                  ? `${Math.round(measurement.pvModuleInfo.roofInclination)}°` 
                  : "30°"}
              </div>
              
              <div className="text-muted-foreground">Ertragsfaktor:</div>
              <div>
                {measurement.pvModuleInfo.yieldFactor || 950} kWh/kWp
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SolarMeasurementContent;
