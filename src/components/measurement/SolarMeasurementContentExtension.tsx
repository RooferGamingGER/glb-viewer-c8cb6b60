/**
 * SolarMeasurementContentExtension.tsx
 *
 * Erweiterung für SolarMeasurementContent.tsx:
 * Integriert Wechselrichter-Panel und Materialliste
 * als Tabs in der Solar-Seitenleiste.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Zap, Package } from 'lucide-react';

import { InverterPlanningPanel } from './InverterPlanningPanel';
import { MaterialListPanel } from './MaterialListPanel';

import {
  InverterSpec,
  INVERTER_DATABASE,
  RoofType,
  PitchedRoofSystem,
  FlatRoofSystem,
  GreenRoofSystem,
  CompleteMaterialList,
} from '@/types/pvPlanning';
import { calculateCompleteMaterialList } from '@/utils/pvMaterialCalculator';
import { PVModuleInfo, Measurement, PVModuleSpec } from '@/types/measurements';

// ============================================================================
// HILFSFUNKTION: Gesamtleistung aus pvInfoMap berechnen
// ============================================================================
const calcTotalKWp = (pvInfoMap: Map<string, PVModuleInfo>): number => {
  let total = 0;
  pvInfoMap.forEach(pvInfo => {
    if (pvInfo && pvInfo.moduleCount > 0) {
      const power = pvInfo.pvModuleSpec?.power || 420;
      total += (pvInfo.moduleCount * power) / 1000;
    }
  });
  return Math.round(total * 100) / 100;
};

const getFirstModuleSpec = (pvInfoMap: Map<string, PVModuleInfo>): PVModuleSpec | null => {
  for (const pvInfo of pvInfoMap.values()) {
    if (pvInfo?.pvModuleSpec) return pvInfo.pvModuleSpec;
  }
  return null;
};

// ============================================================================
// HAUPT-ERWEITERUNGS-KOMPONENTE
// ============================================================================

interface SolarPlanningExtensionProps {
  pvInfoMap: Map<string, PVModuleInfo>;
  measurements: Measurement[];
  onMaterialListChange?: (list: CompleteMaterialList | null) => void;
}

export const SolarPlanningExtension: React.FC<SolarPlanningExtensionProps> = ({
  pvInfoMap,
  measurements,
  onMaterialListChange,
}) => {
  const totalKWp = calcTotalKWp(pvInfoMap);
  const moduleSpec = getFirstModuleSpec(pvInfoMap);

  // Wechselrichter
  const [selectedInverter, setSelectedInverter] = useState<InverterSpec | null>(null);
  const [inverterDistance, setInverterDistance] = useState(15);

  // Materialliste
  const [roofType, setRoofType] = useState<RoofType>('pitched');
  const [mountingSystem, setMountingSystem] = useState<PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem>('braas_rapid2plus');
  const [greenRoofAreaM2, setGreenRoofAreaM2] = useState(0);
  const [materialList, setMaterialList] = useState<CompleteMaterialList | null>(null);
  const [isMaterialCalc, setIsMaterialCalc] = useState(false);

  // Auto-select empfohlenen WR wenn KWp bekannt
  useEffect(() => {
    if (totalKWp > 0 && !selectedInverter) {
      const phases = totalKWp > 6 ? 3 : 1;
      const candidates = INVERTER_DATABASE.filter(inv =>
        inv.phases === phases &&
        inv.nominalPowerAC >= totalKWp * 0.85 &&
        inv.nominalPowerAC <= totalKWp * 1.15
      );
      if (candidates.length > 0) {
        const preferred = candidates.find(c => ['SMA', 'Fronius', 'Kostal'].includes(c.manufacturer));
        setSelectedInverter(preferred || candidates[0]);
      }
    }
  }, [totalKWp]);

  // Materialliste berechnen
  const handleCalcMaterials = useCallback(() => {
    if (!moduleSpec || !selectedInverter) return;
    setIsMaterialCalc(true);
    try {
      const list = calculateCompleteMaterialList(
        pvInfoMap, measurements, moduleSpec, selectedInverter,
        roofType, mountingSystem, greenRoofAreaM2
      );
      setMaterialList(list);
      onMaterialListChange?.(list);
    } finally {
      setIsMaterialCalc(false);
    }
  }, [pvInfoMap, measurements, moduleSpec, selectedInverter, roofType, mountingSystem, greenRoofAreaM2]);

  // Warnung wenn keine PV-Flächen
  if (totalKWp === 0 || pvInfoMap.size === 0) {
    return (
      <Alert className="my-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs ml-1">
          Keine PV-Flächen geplant. Bitte zuerst Solarflächen mit Modulen belegen.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Tabs defaultValue="inverter" className="w-full">
      <TabsList className="grid grid-cols-2 h-8 w-full">
        <TabsTrigger value="inverter" className="text-xs gap-1">
          <Zap className="w-3 h-3" />
          WR
          {selectedInverter && <Badge variant="secondary" className="text-[9px] h-3.5 px-1 ml-0.5">✓</Badge>}
        </TabsTrigger>
        <TabsTrigger value="materials" className="text-xs gap-1">
          <Package className="w-3 h-3" />
          Material
          {materialList && <Badge variant="secondary" className="text-[9px] h-3.5 px-1 ml-0.5">✓</Badge>}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="inverter" className="mt-3">
        <InverterPlanningPanel
          totalPowerKWp={totalKWp}
          selectedInverter={selectedInverter}
          onInverterChange={inv => {
            setSelectedInverter(inv);
          }}
          inverterDistance={inverterDistance}
          onInverterDistanceChange={setInverterDistance}
        />
      </TabsContent>

      <TabsContent value="materials" className="mt-3">
        <MaterialListPanel
          materialList={materialList}
          roofType={roofType}
          mountingSystem={mountingSystem}
          greenRoofAreaM2={greenRoofAreaM2}
          onRoofTypeChange={t => {
            setRoofType(t);
            setMountingSystem(
              t === 'pitched' ? 'braas_rapid2plus' :
              t === 'flat' ? 'k2_flat_evo_one' : 'bauder_thermofin'
            );
          }}
          onMountingSystemChange={setMountingSystem}
          onGreenRoofAreaChange={setGreenRoofAreaM2}
          onRecalculate={handleCalcMaterials}
          isCalculating={isMaterialCalc}
        />
      </TabsContent>
    </Tabs>
  );
};

export default SolarPlanningExtension;
