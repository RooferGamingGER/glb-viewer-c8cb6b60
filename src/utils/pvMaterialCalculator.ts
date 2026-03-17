/**
 * pvMaterialCalculator.ts
 * Berechnung der vollständigen Materialliste für PV-Anlagen
 * nach Dachtyp: Steildach, Flachdach, Gründach
 *
 * Berücksichtigte Hersteller (DE-Markt):
 * Steildach: Braas, BMI, K2 Systems, Schletter, Mounting Systems
 * Flachdach: K2 Systems FlatFix, Esdec, Renusol, Schletter FreeForm
 * Gründach: Bauder, Soprema, Vedag, Icopal, Optigrün, Laumanns
 */

import {
  RoofType,
  PitchedRoofSystem,
  FlatRoofSystem,
  GreenRoofSystem,
  MaterialItem,
  CompleteMaterialList,
  StringPlan,
  InverterSpec,
  getPitchedRoofMaterials,
  getFlatRoofMaterials,
  getGreenRoofMaterials,
  getElectricalMaterials,
  buildCompleteMaterialList,
} from '@/types/pvPlanning';
import { PVModuleInfo, PVModuleSpec, Measurement } from '@/types/measurements';

// Montagesystem-Konstanten
const ROOF_HOOK_SPACING_M = 1.20;    // 1 Haken je 1,20m Schienenlänge
const RAIL_OVERLAP_M = 0.10;          // Überlappung bei Schienenverbindung
const MODULES_PER_ROW_ESTIMATE = 4;   // Durchschnitt für Kabelberechnung

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

  // 2 Schienen je Modulreihe, Länge = Spaltenanzahl * (Modulbreite + Abstand)
  const railsPerRow = 2;
  const railLength = cols * (moduleWidth + moduleSpacing);
  const railLengthTotal = railsPerRow * rows * railLength;

  // Dachhaken: je Schiene je 1,20m
  const roofHookCount = Math.ceil(railLengthTotal / ROOF_HOOK_SPACING_M);

  // Klemmen: 2 Endklemmen je Modul in Reihe + 1 Mittelklemme zwischen je 2 Modulen
  const endClampCount = rows * 2 * railsPerRow; // 2 Enden je Schiene * 2 Schienen * Reihen
  const midClampCount = (cols - 1) * rows * railsPerRow;

  // Schienenverbinder: je Stoß in der Schiene
  const railConnectorCount = Math.max(0, Math.floor(railLengthTotal / 3.15) - rows * railsPerRow);

  return {
    railLengthTotal: Math.ceil(railLengthTotal * 10) / 10,
    roofHookCount: Math.max(roofHookCount, moduleCount * 2), // min 2 Haken je Modul
    endClampCount,
    midClampCount,
    railConnectorCount,
  };
};

/**
 * Erstellt Modul-Positionsitems (die eigentlichen PV-Module)
 */
const createModuleItems = (
  pvInfo: PVModuleInfo,
  moduleSpec: PVModuleSpec
): MaterialItem[] => {
  const items: MaterialItem[] = [];

  items.push({
    id: 'pv_module',
    category: 'module',
    description: `PV-Modul ${moduleSpec.name} (${moduleSpec.power}W, ${moduleSpec.efficiency}% Effizienz)`,
    unit: 'Stk.',
    quantity: pvInfo.moduleCount,
    pricePerUnit: moduleSpec.power <= 420 ? 220 : moduleSpec.power <= 450 ? 240 : 280,
    notes: `${moduleSpec.width * 1000}mm × ${moduleSpec.height * 1000}mm`,
  });

  return items;
};

/**
 * Erstellt Sicherheits-Items
 */
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
      pricePerUnit: 150,
      notes: 'Bei geneigten Dächern > 20° Pflicht'
    });
    items.push({
      id: 'warning_signs',
      category: 'safety',
      description: 'Warnschilder PV-Anlage (VDE 0100-712)',
      unit: 'Set',
      quantity: 1,
      pricePerUnit: 25.00,
      notes: 'Warnschild am WR, Zählerschrank, Einspeisung'
    });
  }

  items.push({
    id: 'fire_safety_label',
    category: 'safety',
    description: 'Feuerwehr-Laufkarte / Einspeiselabel nach DIN EN 62446',
    unit: 'Stk.',
    quantity: 1,
    pricePerUnit: 15.00
  });

  return items;
};

/**
 * Erstellt Kleinmaterial-Items (alle Dachtypen)
 */
const createMiscItems = (pvInfo: PVModuleInfo): MaterialItem[] => {
  const items: MaterialItem[] = [];

  items.push({
    id: 'cable_tie_weather',
    category: 'misc',
    description: 'UV-beständige Kabelbinder (Dachbereich)',
    unit: 'Pkg. (100 Stk.)',
    quantity: Math.ceil(pvInfo.moduleCount / 15),
    pricePerUnit: 8.00
  });
  items.push({
    id: 'cable_conduit_roof',
    category: 'misc',
    description: 'Kabelschutzrohr / Wellrohr UV (Dachseite)',
    unit: 'm',
    quantity: Math.ceil(pvInfo.moduleCount * 0.5),
    pricePerUnit: 1.80
  });
  items.push({
    id: 'roof_sealant',
    category: 'misc',
    description: 'Dachdurchdichtungsmasse / Silikonkartusche',
    unit: 'Stk.',
    quantity: 2,
    pricePerUnit: 9.50
  });
  items.push({
    id: 'potential_equalization',
    category: 'misc',
    description: 'Potenzialausgleich-Set (PA-Leitung 16mm², Klemmen)',
    unit: 'Set',
    quantity: 1,
    pricePerUnit: 45.00,
    notes: 'Pflicht nach VDE 0100-410'
  });

  return items;
};

/**
 * Hauptfunktion: Vollständige Materialliste berechnen
 */
export const calculateCompleteMaterialList = (
  pvInfoMap: Map<string, PVModuleInfo>,
  measurements: Measurement[],
  moduleSpec: PVModuleSpec,
  stringPlan: StringPlan,
  roofType: RoofType = 'pitched',
  mountingSystem: PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem = 'braas_rapid2plus',
  greenRoofAreaM2: number = 0
): CompleteMaterialList => {

  // Gesamt-pvInfo aggregieren
  let totalModuleCount = 0;
  let totalRoofAreaM2 = 0;
  let avgTiltAngle = 30;
  const allMountingItems: MaterialItem[] = [];
  const allModuleItems: MaterialItem[] = [];

  pvInfoMap.forEach((pvInfo, measurementId) => {
    if (!pvInfo || pvInfo.moduleCount === 0) return;

    const measurement = measurements.find(m => m.id === measurementId);
    totalModuleCount += pvInfo.moduleCount;
    totalRoofAreaM2 += pvInfo.actualArea || 0;
    avgTiltAngle = pvInfo.roofInclination || avgTiltAngle;

    // Modul-Items je Dachfläche
    allModuleItems.push(...createModuleItems(pvInfo, moduleSpec));

    // Montage-Items für Steildach
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

  // Doppelte Einträge konsolidieren (gleiche id → Mengen addieren)
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

  // Elektrische Materialien aus dem Stringplan
  const electricalItems = getElectricalMaterials(stringPlan, stringPlan.inverter);

  // Sicherheit
  const pvInfoFirst = pvInfoMap.values().next().value as PVModuleInfo | undefined;
  const safetyItems = pvInfoFirst ? createSafetyItems(pvInfoFirst) : [];

  // Kleinmaterial
  const miscItems = pvInfoFirst ? createMiscItems(pvInfoFirst) : [];

  // Roofing-Items (nur bei Flach/Grün)
  const roofingItems: MaterialItem[] = [];
  if (roofType === 'flat' || roofType === 'green') {
    roofingItems.push({
      id: 'inspection_report',
      category: 'roofing',
      description: 'Dachabdichtungsgutachten / Lastnachweis (Statik)',
      unit: 'psch.',
      quantity: 1,
      pricePerUnit: 350,
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
 * Formatiert eine Materialliste als lesbaren Text für Export/Druck
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
    lines.push('Pos. | Bezeichnung | Einheit | Menge | EP (€) | GP (€)');
    lines.push('---- | ----------- | ------- | ----- | ------- | ------');
    section.items.forEach((item, i) => {
      const ep = item.pricePerUnit !== undefined ? item.pricePerUnit.toFixed(2) : '–';
      const gp = item.totalPrice !== undefined ? item.totalPrice.toFixed(2) : '–';
      lines.push(
        `${String(i + 1).padEnd(4)} | ${item.description.padEnd(40)} | ${item.unit.padEnd(8)} | ${String(item.quantity).padEnd(5)} | ${ep.padEnd(7)} | ${gp}`
      );
      if (item.notes) {
        lines.push(`     | Hinweis: ${item.notes}`);
      }
    });
    lines.push('');
  });

  lines.push('---');
  lines.push(`Gesamtpreis netto: ${list.totalNetPrice.toFixed(2)} €`);
  lines.push(`MwSt. (19%): ${(list.totalGrossPrice - list.totalNetPrice).toFixed(2)} €`);
  lines.push(`Gesamtpreis brutto: ${list.totalGrossPrice.toFixed(2)} €`);
  lines.push('');
  lines.push('Hinweis: Preise sind Richtwerte (Netto) und können je nach Lieferant abweichen. Montagekosten sind nicht enthalten.');

  return lines.join('\n');
};

export type { MaterialItem, CompleteMaterialList, RoofType };
