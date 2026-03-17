/**
 * pvStringPlanning.ts
 * Algorithmus für die elektrische Stringplanung von PV-Anlagen
 * Normkonform nach VDE 0100-712, IEC 62548, DIN EN 50548
 *
 * Berücksichtigt:
 * - Spannungsgrenzen (Voc bei -10°C, Vmpp bei 70°C)
 * - MPPT-Zuordnung
 * - Ost-West-Belegung auf getrennten Trackern
 * - Ausgeglichene Stringströme
 */

import {
  InverterSpec,
  ModuleElectricalSpec,
  StringPlan,
  PVString,
  MPPTTracker,
  StringPlanModule,
  DEFAULT_MODULE_ELECTRICAL,
} from '@/types/pvPlanning';
import { PVModuleInfo, PVModuleSpec, Measurement } from '@/types/measurements';

// Temperaturkorrekturfaktoren (DIN EN 61215 / IEC 61215)
const TEMP_MIN = -10;   // °C (kältester Tag Deutschland)
const TEMP_MAX = 70;    // °C (max. Modultemperatur)
const TEMP_STC = 25;    // °C (Standard Test Condition)

const STRING_COLORS = [
  '#2563eb', // Blau
  '#dc2626', // Rot
  '#16a34a', // Grün
  '#ea580c', // Orange
  '#7c3aed', // Lila
  '#0891b2', // Cyan
  '#c026d3', // Magenta
  '#65a30d', // Gelbgrün
  '#e11d48', // Pink
  '#0d9488', // Teal
  '#92400e', // Braun
  '#1d4ed8', // Dunkelblau
  '#15803d', // Dunkelgrün
  '#b91c1c', // Dunkelrot
  '#6d28d9', // Dunkellila
];

/**
 * Berechnet die temperaturkorrigierte Leerlaufspannung
 * Voc_korr = Voc_STC * (1 + tempCoeffVoc/100 * (T - T_STC))
 */
export const calcVocAtTemp = (
  voc: number,
  tempCoeffVoc: number, // %/°C (negativ)
  temp: number
): number => {
  return voc * (1 + (tempCoeffVoc / 100) * (temp - TEMP_STC));
};

/**
 * Berechnet die max. Stringlänge (Modulanzahl) basierend auf Spannungsgrenzen
 */
export const calcStringLimits = (
  inverter: InverterSpec,
  moduleElec: ModuleElectricalSpec
): { minModules: number; maxModules: number; optimalModules: number } => {
  // Max. Modulanzahl: Voc-Summe bei -10°C < maxDCVoltage
  const vocAtMinTemp = calcVocAtTemp(moduleElec.voc, moduleElec.tempCoeffVoc, TEMP_MIN);
  const maxByVoc = Math.floor(inverter.maxDCVoltage / vocAtMinTemp);

  // Min. Modulanzahl: Vmpp-Summe bei 70°C >= mppVoltageMin
  const vmppAtMaxTemp = moduleElec.vmpp * (1 + (moduleElec.tempCoeffVoc / 100) * (TEMP_MAX - TEMP_STC));
  const minByMpp = Math.ceil(inverter.mppVoltageMin / vmppAtMaxTemp);

  // Optimal: Vmpp bei STC ~80% des MPP-Spannungsbereichs
  const mppMid = (inverter.mppVoltageMin + inverter.mppVoltageMax) / 2;
  const optimalModules = Math.round(mppMid / moduleElec.vmpp);

  return {
    minModules: Math.max(minByMpp, 2),
    maxModules: maxByVoc,
    optimalModules: Math.min(Math.max(optimalModules, minByMpp), maxByVoc),
  };
};

/**
 * Prüft ob ein String die Spannungsgrenzen einhält
 */
export const validateString = (
  string: PVString,
  inverter: InverterSpec,
  moduleElec: ModuleElectricalSpec
): { valid: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  const n = string.moduleCount;

  const vocCold = calcVocAtTemp(moduleElec.voc, moduleElec.tempCoeffVoc, TEMP_MIN) * n;
  const vmppHot = moduleElec.vmpp * (1 + (moduleElec.tempCoeffVoc / 100) * (TEMP_MAX - TEMP_STC)) * n;
  const vmppCold = calcVocAtTemp(moduleElec.vmpp, moduleElec.tempCoeffVoc, TEMP_MIN) * n;

  let valid = true;

  if (vocCold > inverter.maxDCVoltage) {
    warnings.push(`Voc bei -10°C: ${vocCold.toFixed(0)}V > max. ${inverter.maxDCVoltage}V — String zu lang!`);
    valid = false;
  }
  if (vmppHot < inverter.mppVoltageMin) {
    warnings.push(`Vmpp bei 70°C: ${vmppHot.toFixed(0)}V < min. ${inverter.mppVoltageMin}V MPP — String zu kurz!`);
    valid = false;
  }
  if (vmppCold > inverter.mppVoltageMax) {
    warnings.push(`Vmpp bei -10°C: ${vmppCold.toFixed(0)}V > max. ${inverter.mppVoltageMax}V MPP`);
    // Warnung, aber nicht zwingend ungültig (Inverter begrenzt)
  }
  if (moduleElec.isc > inverter.maxCurrentPerMPPT) {
    warnings.push(`Kurzschlussstrom ${moduleElec.isc}A > max. ${inverter.maxCurrentPerMPPT}A je MPPT`);
    valid = false;
  }

  return { valid, warnings };
};

/**
 * Hauptalgorithmus: Stringplanung
 *
 * Strategie:
 * 1. Module nach Dachfläche und Ausrichtung gruppieren
 * 2. Stringlänge berechnen (Spannungsgrenzen)
 * 3. Strings auf MPPT-Tracker verteilen (gleiche Ausrichtung je Tracker)
 * 4. Kabelmengen schätzen
 */
export const calculateStringPlan = (
  pvInfoMap: Map<string, PVModuleInfo>,
  measurements: Measurement[],
  inverter: InverterSpec,
  moduleElec: ModuleElectricalSpec = DEFAULT_MODULE_ELECTRICAL,
  inverterDistance: number = 15 // m vom WR zu den Modulen
): StringPlan => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Stringlängen-Limits
  const limits = calcStringLimits(inverter, moduleElec);

  // Alle Module sammeln, nach Dachfläche gruppiert
  type FaceGroup = {
    measurementId: string;
    azimuth: number;
    inclination: number;
    moduleIndices: number[];
    description?: string;
  };

  const faceGroups: FaceGroup[] = [];

  pvInfoMap.forEach((pvInfo, measurementId) => {
    const measurement = measurements.find(m => m.id === measurementId);
    if (!pvInfo || pvInfo.moduleCount === 0) return;

    const removedSet = new Set(pvInfo.removedModuleIndices || []);
    const totalModules = pvInfo.moduleCorners?.length || pvInfo.moduleCount || 0;
    const activeIndices: number[] = [];
    for (let i = 0; i < totalModules; i++) {
      if (!removedSet.has(i)) activeIndices.push(i);
    }
    if (activeIndices.length === 0) return;

    faceGroups.push({
      measurementId,
      azimuth: pvInfo.roofAzimuth || 180,
      inclination: pvInfo.roofInclination || 30,
      moduleIndices: activeIndices,
      description: measurement?.description || measurement?.label,
    });
  });

  if (faceGroups.length === 0) {
    return createEmptyStringPlan(inverter, errors, warnings);
  }

  const totalModuleCount = faceGroups.reduce((s, g) => s + g.moduleIndices.length, 0);

  // Ähnliche Ausrichtungen zusammenführen (±22.5° Azimuth)
  const orientationGroups: FaceGroup[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < faceGroups.length; i++) {
    if (used.has(i)) continue;
    const group = [faceGroups[i]];
    used.add(i);
    for (let j = i + 1; j < faceGroups.length; j++) {
      if (used.has(j)) continue;
      const azDiff = Math.abs(faceGroups[i].azimuth - faceGroups[j].azimuth);
      const incDiff = Math.abs(faceGroups[i].inclination - faceGroups[j].inclination);
      if (azDiff <= 22.5 && incDiff <= 5) {
        group.push(faceGroups[j]);
        used.add(j);
      }
    }
    orientationGroups.push(group);
  }

  // Strings erstellen
  const allStrings: PVString[] = [];
  let stringCounter = 0;
  let colorIndex = 0;

  // MPPT-Tracker-Zuordnung (gleiche Ausrichtung → gleicher Tracker)
  const mpptTrackers: MPPTTracker[] = [];
  let mpptIndex = 1;

  for (const oriGroup of orientationGroups) {
    if (mpptIndex > inverter.mpptCount) {
      warnings.push(`Mehr Ausrichtungsgruppen (${orientationGroups.length}) als MPPT-Tracker (${inverter.mpptCount}). Ausrichtungen werden zusammengelegt.`);
    }
    const trackerId = Math.min(mpptIndex, inverter.mpptCount);
    mpptIndex++;

    // Module dieser Ausrichtungsgruppe zusammenführen
    const allModulesForOrientation: StringPlanModule[] = [];
    for (const face of oriGroup) {
      for (const idx of face.moduleIndices) {
        allModulesForOrientation.push({
          moduleIndex: idx,
          row: 0, // vereinfacht
          col: 0,
          roofFaceId: face.measurementId,
        });
      }
    }

    // Strings aufteilen: priorisiere optimale Stringlänge
    const moduleCount = allModulesForOrientation.length;
    const optLen = limits.optimalModules;

    // Gleichmäßige Aufteilung
    let numStrings = Math.ceil(moduleCount / optLen);
    let modulesPerString = Math.ceil(moduleCount / numStrings);

    // Sicherstellen dass Limits eingehalten werden
    if (modulesPerString > limits.maxModules) {
      modulesPerString = limits.maxModules;
      numStrings = Math.ceil(moduleCount / modulesPerString);
    }
    if (modulesPerString < limits.minModules && moduleCount >= limits.minModules) {
      modulesPerString = limits.minModules;
      numStrings = Math.ceil(moduleCount / modulesPerString);
    }

    const trackerStrings: PVString[] = [];
    const avgAzimuth = oriGroup.reduce((s, g) => s + g.azimuth, 0) / oriGroup.length;
    const avgInclination = oriGroup.reduce((s, g) => s + g.inclination, 0) / oriGroup.length;

    for (let s = 0; s < numStrings; s++) {
      stringCounter++;
      const startIdx = s * modulesPerString;
      const endIdx = Math.min(startIdx + modulesPerString, moduleCount);
      const stringModules = allModulesForOrientation.slice(startIdx, endIdx);
      const n = stringModules.length;

      const vocCold = calcVocAtTemp(moduleElec.voc, moduleElec.tempCoeffVoc, TEMP_MIN) * n;
      const vmppSTC = moduleElec.vmpp * n;
      const color = STRING_COLORS[colorIndex % STRING_COLORS.length];
      colorIndex++;

      const roofFaceIds = [...new Set(stringModules.map(m => m.roofFaceId))];

      const pvString: PVString = {
        id: `S${stringCounter}`,
        mpptTracker: trackerId,
        modules: stringModules,
        moduleCount: n,
        uocTotal: vocCold,
        umppTotal: vmppSTC,
        impp: moduleElec.impp,
        isc: moduleElec.isc,
        color,
        valid: true,
        roofFaceIds,
        azimuth: avgAzimuth,
        inclination: avgInclination,
      };

      const validation = validateString(pvString, inverter, moduleElec);
      pvString.valid = validation.valid;
      if (validation.warnings.length > 0) {
        pvString.warning = validation.warnings.join('; ');
        warnings.push(...validation.warnings.map(w => `String ${pvString.id}: ${w}`));
      }

      trackerStrings.push(pvString);
      allStrings.push(pvString);
    }

    // MPPT-Tracker erstellen
    const totalTrackerModules = trackerStrings.reduce((s, str) => s + str.moduleCount, 0);
    const maxVoc = Math.max(...trackerStrings.map(str => str.uocTotal));
    const minVmpp = Math.min(...trackerStrings.map(str => str.umppTotal));
    const maxVmpp = Math.max(...trackerStrings.map(str => str.umppTotal));
    const currentBalance = trackerStrings.length > 1
      ? (Math.min(...trackerStrings.map(s => s.moduleCount)) / Math.max(...trackerStrings.map(s => s.moduleCount))) * 100
      : 100;

    mpptTrackers.push({
      trackerId,
      strings: trackerStrings,
      totalModules: totalTrackerModules,
      uocMax: maxVoc,
      umppRange: { min: minVmpp, max: maxVmpp },
      totalPower: totalTrackerModules * (moduleElec.impp * moduleElec.vmpp / 1000),
      currentBalance,
    });
  }

  // Gesamtprüfung
  const dcVoltageOk = allStrings.every(s => s.uocTotal <= inverter.maxDCVoltage);
  const mppRangeOk = allStrings.every(s => s.umppTotal >= inverter.mppVoltageMin);
  const currentOk = allStrings.every(s => s.isc <= inverter.maxCurrentPerMPPT);

  // Kabelschätzung
  const avgStringCableLength = inverterDistance + 5; // m pro Pol (vereinfacht)
  const totalDCCable = allStrings.length * avgStringCableLength * 2; // hin + rück
  const mainDCLength = inverterDistance;
  const acCableLength = 10; // m bis zur Übergabestelle (Schätzung)

  // Sicherheitsprüfungen
  const totalPower = totalModuleCount * (moduleElec.impp * moduleElec.vmpp / 1000);
  const dcDisconnectRequired = true; // immer nach VDE
  const surgeProtectionRequired = totalPower > 10; // bei > 10 kWp empfohlen

  // Anzahl Wechselrichter (bei großen Anlagen mehrere)
  const inverterCount = Math.ceil(totalPower / inverter.maxDCPower);
  if (inverterCount > 1) {
    warnings.push(`Bei ${totalPower.toFixed(1)} kWp und max. ${inverter.maxDCPower} kWp je WR werden ${inverterCount} Wechselrichter benötigt.`);
  }

  return {
    inverter,
    inverterCount,
    mpptTrackers,
    allStrings,
    totalModules: totalModuleCount,
    totalPower: Math.round(totalPower * 100) / 100,
    dcVoltageOk,
    mppRangeOk,
    currentOk,
    warnings,
    errors,
    stringCableLengthPerString: avgStringCableLength,
    mainDCCableLength: mainDCLength,
    acCableLength,
    totalCableLength: totalDCCable + mainDCLength + acCableLength,
    dcDisconnectRequired,
    surgeProtectionRequired,
    afciRequired: false, // derzeit nicht gesetzlich vorgeschrieben in DE
  };
};

const createEmptyStringPlan = (
  inverter: InverterSpec,
  errors: string[],
  warnings: string[]
): StringPlan => ({
  inverter,
  inverterCount: 0,
  mpptTrackers: [],
  allStrings: [],
  totalModules: 0,
  totalPower: 0,
  dcVoltageOk: true,
  mppRangeOk: true,
  currentOk: true,
  warnings,
  errors: [...errors, 'Keine Module für Stringplanung gefunden'],
  stringCableLengthPerString: 0,
  mainDCCableLength: 0,
  acCableLength: 0,
  totalCableLength: 0,
  dcDisconnectRequired: false,
  surgeProtectionRequired: false,
  afciRequired: false,
});

/**
 * Generiert einen lesbaren Stringplan-Text für die Dokumentation
 */
export const generateStringPlanText = (plan: StringPlan): string => {
  const lines: string[] = [];

  lines.push('# Stringplanung PV-Anlage');
  lines.push(`\nWechselrichter: ${plan.inverter.manufacturer} ${plan.inverter.model}`);
  lines.push(`Anzahl Wechselrichter: ${plan.inverterCount}`);
  lines.push(`Gesamtleistung DC: ${plan.totalPower.toFixed(2)} kWp`);
  lines.push(`Gesamtanzahl Module: ${plan.totalModules}`);
  lines.push(`Strings gesamt: ${plan.allStrings.length}`);
  lines.push('');

  lines.push('## Technische Prüfung');
  lines.push(`DC-Spannungsprüfung: ${plan.dcVoltageOk ? '✓ OK' : '✗ FEHLER'}`);
  lines.push(`MPP-Spannungsbereich: ${plan.mppRangeOk ? '✓ OK' : '✗ FEHLER'}`);
  lines.push(`Strombegrenzung: ${plan.currentOk ? '✓ OK' : '✗ FEHLER'}`);

  if (plan.warnings.length > 0) {
    lines.push('\n## Warnhinweise');
    plan.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  if (plan.errors.length > 0) {
    lines.push('\n## Fehler');
    plan.errors.forEach(e => lines.push(`✗ ${e}`));
  }

  lines.push('\n## Stringbelegung');
  lines.push('String-ID | MPPT | Anzahl Module | Voc(-10°C) | Vmpp(STC) | Bemerkung');
  lines.push('--------- | ---- | -------------- | ---------- | --------- | ---------');

  plan.allStrings.forEach(s => {
    const warning = s.valid ? '' : '⚠ Grenze überschritten';
    lines.push(
      `${s.id.padEnd(9)} | T${s.mpptTracker}   | ${String(s.moduleCount).padEnd(14)} | ${s.uocTotal.toFixed(0).padEnd(10)}V | ${s.umppTotal.toFixed(0).padEnd(9)}V | ${warning || s.warning || ''}`
    );
  });

  lines.push('\n## Kabelplanung (Schätzung)');
  lines.push(`DC-Kabel gesamt: ${plan.totalCableLength.toFixed(0)} m`);
  lines.push(`Ø je String: ${plan.stringCableLengthPerString.toFixed(0)} m`);
  lines.push(`AC-Kabel: ${plan.acCableLength.toFixed(0)} m`);

  lines.push('\n## Sicherheitstechnik');
  lines.push(`DC-Trenner: ${plan.dcDisconnectRequired ? 'Erforderlich (VDE 0100-712)' : 'Nicht erforderlich'}`);
  lines.push(`Überspannungsschutz DC: ${plan.surgeProtectionRequired ? 'Empfohlen (> 10 kWp)' : 'Optional'}`);
  lines.push(`AFCI: ${plan.afciRequired ? 'Erforderlich' : 'Optional'}`);

  return lines.join('\n');
};

/**
 * Exportiert den Stringplan als JSON für die Supabase-Funktion
 */
export const exportStringPlanForAI = (
  plan: StringPlan,
  pvInfoMap: Map<string, PVModuleInfo>,
  moduleSpec: PVModuleSpec,
  moduleElec: ModuleElectricalSpec = DEFAULT_MODULE_ELECTRICAL
): object => {
  const roofFaces = Array.from(pvInfoMap.entries()).map(([id, info]) => ({
    id,
    azimuth: info.roofAzimuth,
    inclination: info.roofInclination,
    moduleCount: info.moduleCount,
    roofType: info.roofType || 'pitched',
  }));

  return {
    moduleLayout: {
      totalModules: plan.totalModules,
      totalPowerKWp: plan.totalPower,
      roofFaces,
      moduleSpec: {
        name: moduleSpec.name,
        power: moduleSpec.power,
        uoc: moduleElec.voc,
        umpp: moduleElec.vmpp,
        isc: moduleElec.isc,
        impp: moduleElec.impp,
        tempCoeffVoc: moduleElec.tempCoeffVoc,
      },
      inverterSpec: {
        manufacturer: plan.inverter.manufacturer,
        model: plan.inverter.model,
        nominalPowerKW: plan.inverter.nominalPowerAC,
        maxDCVoltage: plan.inverter.maxDCVoltage,
        mppVoltageMin: plan.inverter.mppVoltageMin,
        mppVoltageMax: plan.inverter.mppVoltageMax,
        mpptCount: plan.inverter.mpptCount,
        maxCurrentPerMPPT: plan.inverter.maxCurrentPerMPPT,
      },
      calculatedStrings: plan.allStrings.map(s => ({
        id: s.id,
        mpptTracker: s.mpptTracker,
        moduleCount: s.moduleCount,
        uocTotal: Math.round(s.uocTotal),
        umppTotal: Math.round(s.umppTotal),
        valid: s.valid,
        warning: s.warning,
        roofFaceIds: s.roofFaceIds,
      })),
    },
  };
};
