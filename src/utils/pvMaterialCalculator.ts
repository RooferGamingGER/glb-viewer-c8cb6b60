/**
 * pvMaterialCalculator.ts
 * Berechnung der vollständigen Materialliste für PV-Anlagen
 * nach Dachtyp: Steildach, Flachdach, Gründach
 */

import {
  RoofType,
  PitchedRoofSystem,
  FlatRoofSystem,
  GreenRoofSystem,
  MaterialItem,
  CompleteMaterialList,
  InverterSpec,
  getPitchedRoofMaterials,
  getFlatRoofMaterials,
  getGreenRoofMaterials,
  getElectricalMaterials,
  buildCompleteMaterialList,
} from '@/types/pvPlanning';
import { PVModuleInfo, PVModuleSpec, Measurement } from '@/types/measurements';

// Montagesystem-Konstanten
const ROOF_HOOK_SPACING_M = 1.20;

/**
 * Berechnet Montage-Kennwerte aus pvInfo
 */
const calcMountingMetrics = (pvInfo: PVModuleInfo): {
  railLengthTotal: number;
  roofHookCount: number;
  endClampCount: number;
  midClampCount: number;
  railConnectorCount: number;
} => {
  const moduleCount = pvInfo.moduleCount || 0;
  const cols = pvInfo.columns || Math.ceil(Math.sqrt(moduleCount));
  const rows = pvInfo.rows || Math.ceil(moduleCount / cols);
  const moduleWidth = pvInfo.moduleWidth || 1.134;
  const moduleSpacing = pvInfo.moduleSpacing || 0.02;

  const railsPerRow = 2;
  const railLength = cols * (moduleWidth + moduleSpacing);
  const railLengthTotal = railsPerRow * rows * railLength;

  const roofHookCount = Math.ceil(railLengthTotal / ROOF_HOOK_SPACING_M);
  const endClampCount = rows * 2 * railsPerRow;
  const midClampCount = (cols - 1) * rows * railsPerRow;
  const railConnectorCount = Math.max(0, Math.floor(railLengthTotal / 3.15) - rows * railsPerRow);

  return {
    railLengthTotal: Math.ceil(railLengthTotal * 10) / 10,
    roofHookCount: Math.max(roofHookCount, moduleCount * 2),
    endClampCount,
    midClampCount,
    railConnectorCount,
  };
};

const createModuleItems = (
  pvInfo: PVModuleInfo,
  moduleSpec: PVModuleSpec
): MaterialItem[] => {
  return [{
    id: 'pv_module',
    category: 'module',
    description: `PV-Modul ${moduleSpec.name} (${moduleSpec.power}W, ${moduleSpec.efficiency}% Effizienz)`,
    unit: 'Stk.',
    quantity: pvInfo.moduleCount,
    notes: `${moduleSpec.width * 1000}mm × ${moduleSpec.height * 1000}mm`,
  }];
};

const createSafetyItems = (pvInfo: PVModuleInfo): MaterialItem[] => {
  const items: MaterialItem[] = [];
  const isHighRoof = (pvInfo.roofInclination || 30) > 20;

  if (isHighRoof) {
    items.push({
      id: 'fall_protection',
      category: 'safety',
      description: 'Absturzsicherung / Sicherheitsgeschirr (Mietgerüst oder PSAgA)',
      unit: 'psch.',
      quantity: 1,
      notes: 'Bei geneigten Dächern > 20° Pflicht'
    });
    items.push({
      id: 'warning_signs',
      category: 'safety',
      description: 'Warnschilder PV-Anlage (VDE 0100-712)',
      unit: 'Set',
      quantity: 1,
      notes: 'Warnschild am WR, Zählerschrank, Einspeisung'
    });
  }

  items.push({
    id: 'fire_safety_label',
    category: 'safety',
    description: 'Feuerwehr-Laufkarte / Einspeiselabel nach DIN EN 62446',
    unit: 'Stk.',
    quantity: 1,
  });

  return items;
};

const createMiscItems = (pvInfo: PVModuleInfo): MaterialItem[] => {
  return [
    {
      id: 'cable_tie_weather',
      category: 'misc',
      description: 'UV-beständige Kabelbinder (Dachbereich)',
      unit: 'Pkg. (100 Stk.)',
      quantity: Math.ceil(pvInfo.moduleCount / 15),
    },
    {
      id: 'cable_conduit_roof',
      category: 'misc',
      description: 'Kabelschutzrohr / Wellrohr UV (Dachseite)',
      unit: 'm',
      quantity: Math.ceil(pvInfo.moduleCount * 0.5),
    },
    {
      id: 'roof_sealant',
      category: 'misc',
      description: 'Dachdurchdichtungsmasse / Silikonkartusche',
      unit: 'Stk.',
      quantity: 2,
    },
    {
      id: 'potential_equalization',
      category: 'misc',
      description: 'Potenzialausgleich-Set (PA-Leitung 16mm², Klemmen)',
      unit: 'Set',
      quantity: 1,
      notes: 'Pflicht nach VDE 0100-410'
    },
  ];
};

/**
 * Hauptfunktion: Vollständige Materialliste berechnen
 */
export const calculateCompleteMaterialList = (
  pvInfoMap: Map<string, PVModuleInfo>,
  measurements: Measurement[],
  moduleSpec: PVModuleSpec,
  inverterSpec: InverterSpec,
  roofType: RoofType = 'pitched',
  mountingSystem: PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem = 'braas_rapid2plus',
  greenRoofAreaM2: number = 0
): CompleteMaterialList => {

  let totalModuleCount = 0;
  let totalRoofAreaM2 = 0;
  let avgTiltAngle = 30;
  const allMountingItems: MaterialItem[] = [];
  const allModuleItems: MaterialItem[] = [];

  pvInfoMap.forEach((pvInfo) => {
    if (!pvInfo || pvInfo.moduleCount === 0) return;

    totalModuleCount += pvInfo.moduleCount;
    totalRoofAreaM2 += pvInfo.actualArea || 0;
    avgTiltAngle = pvInfo.roofInclination || avgTiltAngle;

    allModuleItems.push(...createModuleItems(pvInfo, moduleSpec));

    if (roofType === 'pitched') {
      const metrics = calcMountingMetrics(pvInfo);
      const pitchedItems = getPitchedRoofMaterials(
        pvInfo.moduleCount,
        metrics.railLengthTotal,
        metrics.roofHookCount,
        metrics.endClampCount,
        metrics.midClampCount,
        metrics.railConnectorCount,
        mountingSystem as PitchedRoofSystem
      );
      allMountingItems.push(...pitchedItems);
    }
  });

  const consolidate = (items: MaterialItem[]): MaterialItem[] => {
    const map = new Map<string, MaterialItem>();
    items.forEach(item => {
      if (map.has(item.id)) {
        map.get(item.id)!.quantity += item.quantity;
      } else {
        map.set(item.id, { ...item });
      }
    });
    return Array.from(map.values());
  };

  const moduleItems = consolidate(allModuleItems);
  let mountingItems: MaterialItem[] = [];

  if (roofType === 'pitched') {
    mountingItems = consolidate(allMountingItems);
  } else if (roofType === 'flat') {
    mountingItems = getFlatRoofMaterials(
      totalModuleCount,
      totalRoofAreaM2,
      avgTiltAngle,
      mountingSystem as FlatRoofSystem
    );
  } else if (roofType === 'green') {
    mountingItems = getGreenRoofMaterials(
      totalModuleCount,
      totalRoofAreaM2,
      greenRoofAreaM2 || totalRoofAreaM2 * 0.5,
      mountingSystem as GreenRoofSystem
    );
  }

  const electricalItems = getElectricalMaterials(totalModuleCount, inverterSpec);

  const pvInfoFirst = pvInfoMap.values().next().value as PVModuleInfo | undefined;
  const safetyItems = pvInfoFirst ? createSafetyItems(pvInfoFirst) : [];
  const miscItems = pvInfoFirst ? createMiscItems(pvInfoFirst) : [];

  const roofingItems: MaterialItem[] = [];
  if (roofType === 'flat' || roofType === 'green') {
    roofingItems.push({
      id: 'inspection_report',
      category: 'roofing',
      description: 'Dachabdichtungsgutachten / Lastnachweis (Statik)',
      unit: 'psch.',
      quantity: 1,
      notes: 'Pflicht bei Flachdach, Nachweis Windlast und Ballastgewichte'
    });
  }

  return buildCompleteMaterialList(
    roofType,
    mountingSystem,
    moduleItems,
    mountingItems,
    electricalItems,
    roofingItems,
    safetyItems,
    miscItems
  );
};

/**
 * Formatiert eine Materialliste als lesbaren Text für Export/Druck (ohne Preise)
 */
export const formatMaterialListAsText = (list: CompleteMaterialList): string => {
  const lines: string[] = [];

  const roofTypeLabels: Record<RoofType, string> = {
    pitched: 'Steildach',
    flat: 'Flachdach',
    green: 'Gründach',
  };

  lines.push('# Materialliste PV-Anlage');
  lines.push(`Dachtyp: ${roofTypeLabels[list.roofType]}`);
  lines.push(`Montagesystem: ${list.mountingSystem}`);
  lines.push('');

  list.sections.forEach(section => {
    if (section.items.length === 0) return;
    lines.push(`## ${section.title}`);
    lines.push('Pos. | Bezeichnung | Einheit | Menge');
    lines.push('---- | ----------- | ------- | -----');
    section.items.forEach((item, i) => {
      lines.push(
        `${String(i + 1).padEnd(4)} | ${item.description.padEnd(40)} | ${item.unit.padEnd(8)} | ${String(item.quantity)}`
      );
      if (item.notes) {
        lines.push(`     | Hinweis: ${item.notes}`);
      }
    });
    lines.push('');
  });

  lines.push('---');
  lines.push('Hinweis: Diese Materialliste dient als Orientierung und kann Fehler enthalten.');
  lines.push('Mengen und Kompatibilität müssen durch einen Fachbetrieb geprüft werden.');

  return lines.join('\n');
};

export type { MaterialItem, CompleteMaterialList, RoofType };
