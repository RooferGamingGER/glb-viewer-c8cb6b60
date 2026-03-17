/**
 * SolarMeasurementContentExtension.tsx
 *
 * Erweiterung für SolarMeasurementContent.tsx:
 * Integriert Wechselrichter-Panel, Stringplanung und Materialliste
 * als neue Tabs in der Solar-Seitenleiste.
 *
 * INTEGRATION:
 * In SolarMeasurementContent.tsx die Tabs um diese drei ergänzen:
 *   <TabsTrigger value="inverter">Wechselrichter</TabsTrigger>
 *   <TabsTrigger value="stringplan">Stringplan</TabsTrigger>
 *   <TabsTrigger value="materials">Materialliste</TabsTrigger>
 *
 * Und den SolarPlanningExtension-Block in den TabsContent einfügen.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Zap, Package, Cable } from 'lucide-react';

import { InverterPlanningPanel } from './InverterPlanningPanel';
import { StringPlanPanel } from './StringPlanPanel';
import { MaterialListPanel } from './MaterialListPanel';

import {
  InverterSpec,
  INVERTER_DATABASE,
  RoofType,
  PitchedRoofSystem,
  FlatRoofSystem,
  GreenRoofSystem,
  StringPlan,
  CompleteMaterialList,
  ModuleElectricalSpec,
  DEFAULT_MODULE_ELECTRICAL,
} from '@/types/pvPlanning';
import { calculateStringPlan, exportStringPlanForAI } from '@/utils/pvStringPlanning';
import { calculateCompleteMaterialList } from '@/utils/pvMaterialCalculator';
import { PVModuleInfo, Measurement, PVModuleSpec } from '@/types/measurements';
import { supabase } from '@/integrations/supabase/client';

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
  /** Callback: Wenn Stringplan oder Materialliste aktualisiert wurden */
  onStringPlanChange?: (plan: StringPlan | null) => void;
  onMaterialListChange?: (list: CompleteMaterialList | null) => void;
}

export const SolarPlanningExtension: React.FC<SolarPlanningExtensionProps> = ({
  pvInfoMap,
  measurements,
  onStringPlanChange,
  onMaterialListChange,
}) => {
  const totalKWp = calcTotalKWp(pvInfoMap);
  const moduleSpec = getFirstModuleSpec(pvInfoMap);

  // Wechselrichter
  const [selectedInverter, setSelectedInverter] = useState<InverterSpec | null>(null);
  const [inverterDistance, setInverterDistance] = useState(15);

  // Stringplanung
  const [stringPlan, setStringPlan] = useState<StringPlan | null>(null);
  const [isStringCalc, setIsStringCalc] = useState(false);
  const [aiPlanText, setAiPlanText] = useState<string | undefined>(undefined);
  const [aiPlanLoading, setAiPlanLoading] = useState(false);

  // Materialliste
  const [roofType, setRoofType] = useState<RoofType>('pitched');
  const [mountingSystem, setMountingSystem] = useState<PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem>('braas_rapid2plus');
  const [greenRoofAreaM2, setGreenRoofAreaM2] = useState(0);
  const [materialList, setMaterialList] = useState<CompleteMaterialList | null>(null);
  const [isMaterialCalc, setIsMaterialCalc] = useState(false);

  // Modul-Elektrikdaten (optional erweiterbar mit eigenen Werten)
  const moduleElec: ModuleElectricalSpec = DEFAULT_MODULE_ELECTRICAL;

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
        // Präferenz: SMA, Fronius, Kostal
        const preferred = candidates.find(c => ['SMA', 'Fronius', 'Kostal'].includes(c.manufacturer));
        setSelectedInverter(preferred || candidates[0]);
      }
    }
  }, [totalKWp]);

  // Stringplanung berechnen
  const handleCalcStringPlan = useCallback(() => {
    if (!selectedInverter) return;
    setIsStringCalc(true);
    try {
      const plan = calculateStringPlan(
        pvInfoMap,
        measurements,
        selectedInverter,
        moduleElec,
        inverterDistance
      );
      setStringPlan(plan);
      onStringPlanChange?.(plan);
      // Wenn Materialliste existiert, neu berechnen
      if (materialList && moduleSpec) {
        const newList = calculateCompleteMaterialList(
          pvInfoMap, measurements, moduleSpec, plan,
          roofType, mountingSystem, greenRoofAreaM2
        );
        setMaterialList(newList);
        onMaterialListChange?.(newList);
      }
    } finally {
      setIsStringCalc(false);
    }
  }, [selectedInverter, pvInfoMap, measurements, moduleElec, inverterDistance, materialList, moduleSpec, roofType, mountingSystem, greenRoofAreaM2]);

  // Auto-Berechnung bei WR-Wechsel
  useEffect(() => {
    if (selectedInverter && pvInfoMap.size > 0) {
      handleCalcStringPlan();
    }
  }, [selectedInverter, inverterDistance]);

  // Materialliste berechnen
  const handleCalcMaterials = useCallback(() => {
    if (!moduleSpec || !stringPlan) return;
    setIsMaterialCalc(true);
    try {
      const list = calculateCompleteMaterialList(
        pvInfoMap, measurements, moduleSpec, stringPlan,
        roofType, mountingSystem, greenRoofAreaM2
      );
      setMaterialList(list);
      onMaterialListChange?.(list);
    } finally {
      setIsMaterialCalc(false);
    }
  }, [pvInfoMap, measurements, moduleSpec, stringPlan, roofType, mountingSystem, greenRoofAreaM2]);

  // KI-Stringplanung (Supabase Edge Function)
  const handleRequestAIPlan = useCallback(async () => {
    if (!stringPlan || !moduleSpec) return;
    setAiPlanLoading(true);
    setAiPlanText(undefined);
    try {
      const payload = exportStringPlanForAI(stringPlan, pvInfoMap, moduleSpec, moduleElec);
      const { data, error } = await supabase.functions.invoke('solar-string-planning', {
        body: payload,
      });
      if (error) throw error;
      if (data?.stringPlan) {
        setAiPlanText(data.stringPlan);
      }
    } catch (err) {
      console.error('KI-Stringplanung Fehler:', err);
      setAiPlanText('Fehler bei der KI-Stringplanung. Bitte erneut versuchen.');
    } finally {
      setAiPlanLoading(false);
    }
  }, [stringPlan, pvInfoMap, moduleSpec, moduleElec]);

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
      <TabsList className="grid grid-cols-3 h-8 w-full">
        <TabsTrigger value="inverter" className="text-xs gap-1">
          <Zap className="w-3 h-3" />
          WR
          {selectedInverter && <Badge variant="secondary" className="text-[9px] h-3.5 px-1 ml-0.5">✓</Badge>}
        </TabsTrigger>
        <TabsTrigger value="stringplan" className="text-xs gap-1">
          <Cable className="w-3 h-3" />
          Strings
          {stringPlan && !stringPlan.errors.length && (
            <Badge variant="secondary" className={`text-[9px] h-3.5 px-1 ml-0.5 ${stringPlan.warnings.length ? 'bg-orange-200 text-orange-700' : ''}`}>
              {stringPlan.warnings.length ? '⚠' : '✓'}
            </Badge>
          )}
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

      <TabsContent value="stringplan" className="mt-3">
        <StringPlanPanel
          stringPlan={stringPlan}
          pvInfoMap={pvInfoMap}
          isCalculating={isStringCalc}
          onRecalculate={handleCalcStringPlan}
          onRequestAIPlan={handleRequestAIPlan}
          aiPlanText={aiPlanText}
          aiPlanLoading={aiPlanLoading}
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
            // Reset mounting system
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
