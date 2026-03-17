/**
 * germanPVCatalog.ts
 * Umfassender Katalog deutscher/europäischer PV-Module und Montagesysteme
 * für die PV-Planungssoftware. Alle technischen Daten basieren auf
 * öffentlich verfügbaren Datenblättern (Stand 2024).
 */

import { PVModuleSpec } from '@/types/measurements';

// ============================================================================
// ERWEITERTE PV-MODUL-SPEZIFIKATION
// ============================================================================

export interface ExtendedPVModuleSpec extends PVModuleSpec {
  manufacturer: string;
  voc: number;          // Open-circuit voltage (V)
  isc: number;          // Short-circuit current (A)
  vmpp: number;         // Voltage at max power point (V)
  impp: number;         // Current at max power point (A)
  weight: number;       // Weight in kg
  frameColor: 'black' | 'silver' | 'none';
  cellType: 'mono-PERC' | 'mono-TOPCon' | 'mono-HJT' | 'mono-IBC';
  warrantyYears: number;
  performanceWarrantyPercent: number; // % after warranty years
  tempCoeffPmax: number;  // %/°C (negative value)
}

// ============================================================================
// PV-MODUL-DATENBANK — Deutsche & europäische Hersteller
// ============================================================================

export const PV_MODULE_DATABASE: ExtendedPVModuleSpec[] = [
  // --- Solarwatt ---
  {
    name: 'Solarwatt Panel vision M 4.0 pure',
    manufacturer: 'Solarwatt',
    width: 1.134, height: 1.722, power: 420, efficiency: 21.4,
    voc: 41.2, isc: 13.2, vmpp: 34.5, impp: 12.17,
    weight: 21.0, frameColor: 'black', cellType: 'mono-PERC',
    warrantyYears: 30, performanceWarrantyPercent: 87.5,
    tempCoeffPmax: -0.34,
  },
  {
    name: 'Solarwatt Panel vision AM 4.0',
    manufacturer: 'Solarwatt',
    width: 1.134, height: 1.722, power: 430, efficiency: 22.0,
    voc: 41.8, isc: 13.4, vmpp: 35.0, impp: 12.29,
    weight: 21.5, frameColor: 'black', cellType: 'mono-TOPCon',
    warrantyYears: 30, performanceWarrantyPercent: 88.0,
    tempCoeffPmax: -0.30,
  },
  // --- Heckert Solar ---
  {
    name: 'Heckert NeMo 4.2 80M 420',
    manufacturer: 'Heckert Solar',
    width: 1.134, height: 1.722, power: 420, efficiency: 21.5,
    voc: 41.0, isc: 13.3, vmpp: 34.2, impp: 12.28,
    weight: 21.2, frameColor: 'silver', cellType: 'mono-PERC',
    warrantyYears: 25, performanceWarrantyPercent: 86.0,
    tempCoeffPmax: -0.35,
  },
  // --- IBC Solar ---
  {
    name: 'IBC MonoSol 440 MS10-HC',
    manufacturer: 'IBC Solar',
    width: 1.134, height: 1.762, power: 440, efficiency: 22.1,
    voc: 42.5, isc: 13.6, vmpp: 35.8, impp: 12.29,
    weight: 22.0, frameColor: 'black', cellType: 'mono-TOPCon',
    warrantyYears: 25, performanceWarrantyPercent: 87.0,
    tempCoeffPmax: -0.30,
  },
  // --- Energetica ---
  {
    name: 'Energetica e.Classic M HC 415',
    manufacturer: 'Energetica',
    width: 1.134, height: 1.722, power: 415, efficiency: 21.2,
    voc: 40.8, isc: 13.2, vmpp: 34.0, impp: 12.21,
    weight: 21.0, frameColor: 'black', cellType: 'mono-PERC',
    warrantyYears: 25, performanceWarrantyPercent: 85.0,
    tempCoeffPmax: -0.36,
  },
  // --- Meyer Burger ---
  {
    name: 'Meyer Burger White 400',
    manufacturer: 'Meyer Burger',
    width: 1.134, height: 1.722, power: 400, efficiency: 20.6,
    voc: 42.0, isc: 12.6, vmpp: 35.0, impp: 11.43,
    weight: 20.5, frameColor: 'silver', cellType: 'mono-HJT',
    warrantyYears: 30, performanceWarrantyPercent: 92.0,
    tempCoeffPmax: -0.26,
  },
  {
    name: 'Meyer Burger Black 395',
    manufacturer: 'Meyer Burger',
    width: 1.134, height: 1.722, power: 395, efficiency: 20.3,
    voc: 41.5, isc: 12.5, vmpp: 34.5, impp: 11.45,
    weight: 20.5, frameColor: 'black', cellType: 'mono-HJT',
    warrantyYears: 30, performanceWarrantyPercent: 92.0,
    tempCoeffPmax: -0.26,
  },
  // --- Aleo Solar ---
  {
    name: 'Aleo LEO 430W',
    manufacturer: 'Aleo Solar',
    width: 1.134, height: 1.762, power: 430, efficiency: 21.5,
    voc: 42.0, isc: 13.4, vmpp: 35.5, impp: 12.11,
    weight: 22.5, frameColor: 'black', cellType: 'mono-TOPCon',
    warrantyYears: 25, performanceWarrantyPercent: 87.0,
    tempCoeffPmax: -0.30,
  },
  // --- JA Solar ---
  {
    name: 'JA Solar JAM54D40 440/LB',
    manufacturer: 'JA Solar',
    width: 1.134, height: 1.762, power: 440, efficiency: 22.3,
    voc: 42.8, isc: 13.5, vmpp: 36.0, impp: 12.22,
    weight: 21.8, frameColor: 'black', cellType: 'mono-TOPCon',
    warrantyYears: 25, performanceWarrantyPercent: 87.4,
    tempCoeffPmax: -0.29,
  },
  // --- LONGi ---
  {
    name: 'LONGi Hi-MO 6 Explorer',
    manufacturer: 'LONGi',
    width: 1.134, height: 1.722, power: 425, efficiency: 21.8,
    voc: 41.5, isc: 13.3, vmpp: 34.8, impp: 12.21,
    weight: 21.0, frameColor: 'black', cellType: 'mono-PERC',
    warrantyYears: 25, performanceWarrantyPercent: 87.4,
    tempCoeffPmax: -0.34,
  },
  {
    name: 'LONGi Hi-MO X6 450',
    manufacturer: 'LONGi',
    width: 1.134, height: 1.762, power: 450, efficiency: 22.5,
    voc: 43.5, isc: 13.6, vmpp: 36.5, impp: 12.33,
    weight: 22.0, frameColor: 'black', cellType: 'mono-TOPCon',
    warrantyYears: 30, performanceWarrantyPercent: 88.9,
    tempCoeffPmax: -0.29,
  },
  // --- Hochleistungsmodul (Standard-Referenz) ---
  {
    name: 'Standard 500W (2094mm)',
    manufacturer: 'Generisch',
    width: 1.134, height: 2.094, power: 500, efficiency: 22.3,
    voc: 48.5, isc: 13.8, vmpp: 41.0, impp: 12.20,
    weight: 26.0, frameColor: 'black', cellType: 'mono-TOPCon',
    warrantyYears: 25, performanceWarrantyPercent: 86.0,
    tempCoeffPmax: -0.30,
  },
];

// ============================================================================
// MONTAGESYSTEM-SPEZIFIKATION
// ============================================================================

export interface MountingSystemSpec {
  id: string;
  manufacturer: string;
  name: string;
  roofType: 'pitched' | 'flat' | 'green';
  description: string;
  hookType?: string;          // Only for pitched
  railType?: string;
  ballastRequired?: boolean;  // For flat/green
  maxTiltAngle?: number;      // For flat roof systems
  windZoneMax?: number;       // Max wind zone (1-4 Germany)
  certifications?: string[];
}

export const MOUNTING_SYSTEMS: MountingSystemSpec[] = [
  // --- Steildach ---
  {
    id: 'braas_rapid2plus', manufacturer: 'Braas', name: 'Rapid² Plus',
    roofType: 'pitched', description: 'Universalhaken für Tonziegel',
    hookType: 'Universal', railType: 'Alu 40×40mm',
    certifications: ['EN 1991-1-4', 'DIBt'],
  },
  {
    id: 'braas_clickfit_evo', manufacturer: 'Braas', name: 'ClickFit Evo',
    roofType: 'pitched', description: 'Schnellmontagesystem ohne Schrauben',
    hookType: 'Click', railType: 'Alu Schnellschiene',
    certifications: ['EN 1991-1-4'],
  },
  {
    id: 'k2_systems_base', manufacturer: 'K2 Systems', name: 'BASE',
    roofType: 'pitched', description: 'Flexible Alu-Schienenlösung',
    hookType: 'Variabel', railType: 'SingleRail 36',
    certifications: ['EN 1991-1-4', 'MCS012'],
  },
  {
    id: 'k2_systems_cross', manufacturer: 'K2 Systems', name: 'Cross-Roof',
    roofType: 'pitched', description: 'Kreuzschienensystem für maximale Flexibilität',
    hookType: 'Universal', railType: 'CrossRail 36',
    certifications: ['EN 1991-1-4'],
  },
  {
    id: 'schletter_fm_ez', manufacturer: 'Schletter', name: 'FM EZ',
    roofType: 'pitched', description: 'Aluminium-Profilschiene mit EcoZinc-Haken',
    hookType: 'EcoZinc', railType: 'Eco Rapid Rail',
    certifications: ['EN 1991-1-4', 'DIBt'],
  },
  {
    id: 'mounting_systems_msr', manufacturer: 'Mounting Systems', name: 'MSR',
    roofType: 'pitched', description: 'Montageschienensystem für Steildach',
    hookType: 'Universal', railType: 'MSR Profilschiene',
    certifications: ['EN 1991-1-4'],
  },
  {
    id: 'bmi_ecobase', manufacturer: 'BMI', name: 'Ecobase',
    roofType: 'pitched', description: 'Komplett-System für Betondachsteine',
    hookType: 'Betondachstein', railType: 'Alu 40×40mm',
    certifications: ['DIBt'],
  },
  {
    id: 'bmi_klober_twist', manufacturer: 'BMI', name: 'Klöber Twist',
    roofType: 'pitched', description: 'Drehbarer Solarhaken',
    hookType: 'Twist-Lock', railType: 'Standard-Schiene',
    certifications: ['DIBt'],
  },
  {
    id: 'generic_hook_rail', manufacturer: 'Generisch', name: 'Haken + Schiene',
    roofType: 'pitched', description: 'Standard Dachhaken mit Alu-Montageschiene',
    hookType: 'Universal', railType: 'Alu 40×40mm',
  },
  // --- Flachdach ---
  {
    id: 'k2_flat_ground', manufacturer: 'K2 Systems', name: 'FlatFix Ground',
    roofType: 'flat', description: 'Ballastiertes Montagesystem Süd-Aufständerung',
    ballastRequired: true, maxTiltAngle: 30, windZoneMax: 4,
    certifications: ['EN 1991-1-4'],
  },
  {
    id: 'k2_flat_evo_one', manufacturer: 'K2 Systems', name: 'FlatFix EVO One',
    roofType: 'flat', description: 'Ost-West System mit Windleitblech',
    ballastRequired: true, maxTiltAngle: 15, windZoneMax: 4,
    certifications: ['EN 1991-1-4'],
  },
  {
    id: 'esdec_flatfix_wave', manufacturer: 'Esdec', name: 'FlatFix Wave',
    roofType: 'flat', description: 'Wellenförmige Ost-West Aufständerung',
    ballastRequired: true, maxTiltAngle: 15, windZoneMax: 3,
    certifications: ['EN 1991-1-4'],
  },
  {
    id: 'schletter_freeform', manufacturer: 'Schletter', name: 'FreeForm',
    roofType: 'flat', description: 'Modularer Ballast-Rahmen',
    ballastRequired: true, maxTiltAngle: 30, windZoneMax: 3,
    certifications: ['EN 1991-1-4'],
  },
  {
    id: 'renusol_cs60', manufacturer: 'Renusol', name: 'CS60',
    roofType: 'flat', description: 'Kunststoffwanne mit Ballast',
    ballastRequired: true, maxTiltAngle: 25, windZoneMax: 3,
    certifications: ['EN 1991-1-4'],
  },
  {
    id: 'generic_ballast', manufacturer: 'Generisch', name: 'Ballastsystem',
    roofType: 'flat', description: 'Standard-Ballastregal für Flachdach',
    ballastRequired: true, maxTiltAngle: 25, windZoneMax: 2,
  },
  // --- Gründach ---
  {
    id: 'soprema_soprasolar', manufacturer: 'Soprema', name: 'Soprasolar Ballast',
    roofType: 'green', description: 'Kombiniertes Gründach-PV-System',
    ballastRequired: true, maxTiltAngle: 20, windZoneMax: 3,
    certifications: ['FLL-Richtlinie'],
  },
  {
    id: 'bauder_thermofin', manufacturer: 'Bauder', name: 'Thermofin TE',
    roofType: 'green', description: 'Begrünung + PV mit Thermoschweißbahnen',
    ballastRequired: true, maxTiltAngle: 20, windZoneMax: 3,
    certifications: ['FLL-Richtlinie', 'DIBt'],
  },
  {
    id: 'optigruen_type_f', manufacturer: 'Optigrün', name: 'Typ F Solar',
    roofType: 'green', description: 'Extensivbegrünung mit PV-Integration',
    ballastRequired: true, maxTiltAngle: 15, windZoneMax: 3,
    certifications: ['FLL-Richtlinie'],
  },
  {
    id: 'generic_green_ballast', manufacturer: 'Generisch', name: 'Gründach-Ballast',
    roofType: 'green', description: 'Standard Gründach-PV-Ballastsystem',
    ballastRequired: true, maxTiltAngle: 15, windZoneMax: 2,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Get unique manufacturers from the module database */
export const getModuleManufacturers = (): string[] => {
  return [...new Set(PV_MODULE_DATABASE.map(m => m.manufacturer))];
};

/** Get unique cell types from the module database */
export const getModuleCellTypes = (): string[] => {
  return [...new Set(PV_MODULE_DATABASE.map(m => m.cellType))];
};

/** Filter modules by manufacturer and/or cell type */
export const filterModules = (
  manufacturer?: string,
  cellType?: string
): ExtendedPVModuleSpec[] => {
  return PV_MODULE_DATABASE.filter(m => {
    if (manufacturer && m.manufacturer !== manufacturer) return false;
    if (cellType && m.cellType !== cellType) return false;
    return true;
  });
};

/** Get mounting systems filtered by roof type */
export const getMountingSystemsByRoofType = (
  roofType: 'pitched' | 'flat' | 'green'
): MountingSystemSpec[] => {
  return MOUNTING_SYSTEMS.filter(s => s.roofType === roofType);
};

/** Map cell type to German label */
export const cellTypeLabel = (ct: string): string => {
  const map: Record<string, string> = {
    'mono-PERC': 'Mono PERC',
    'mono-TOPCon': 'Mono TOPCon',
    'mono-HJT': 'Mono HJT',
    'mono-IBC': 'Mono IBC',
  };
  return map[ct] || ct;
};
