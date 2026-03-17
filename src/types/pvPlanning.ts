/**
 * pvPlanning.ts
 * Erweiterte Typen für PV-Planung: Wechselrichter, Stringplanung, Dachart-spezifische Materiallisten
 * Deutsche Hersteller: SMA, Fronius, Kostal, Huawei, SolarEdge, Enphase, Growatt, Deye, GoodWe
 */

// ============================================================================
// DACHTYPEN
// ============================================================================

export type RoofType = 'pitched' | 'flat' | 'green';

export type PitchedRoofSystem =
  | 'braas_rapid2plus'      // Braas Rapid² Plus – Universalhaken für Tonziegel
  | 'braas_clickfit_evo'    // Braas ClickFit Evo
  | 'bmi_ecobase'           // BMI Ecobase
  | 'bmi_klober_twist'      // BMI Klöber Twist
  | 'k2_systems_base'       // K2 Systems BASE
  | 'k2_systems_cross'      // K2 Systems Cross-Roof
  | 'mounting_systems_msr'  // Mounting Systems MSR
  | 'schletter_fm_ez'       // Schletter FM EZ
  | 'generic_hook_rail';    // Generisch Haken+Schiene

export type FlatRoofSystem =
  | 'k2_flat_ground'        // K2 Systems FlatFix Ground
  | 'k2_flat_evo_one'       // K2 Systems FlatFix EVO One
  | 'esdec_flatfix_wave'    // Esdec FlatFix Wave
  | 'schletter_freeform'    // Schletter FreeForm
  | 'renusol_cs60'          // Renusol CS60
  | 'mounting_systems_mpk'  // Mounting Systems MPK
  | 'conergy_ts'            // Conergy Top System
  | 'generic_ballast';      // Generisch Ballast

export type GreenRoofSystem =
  | 'soprema_soprasolar'    // Soprema Soprasolar Ballast
  | 'bauder_thermofin'      // Bauder Thermofin TE (Begrünung + PV)
  | 'vedag_vedagreen'       // Vedag VedaGreen Solar
  | 'icopal_solarbase'      // Icopal SolarBase Ballast
  | 'optigruen_type_f'      // Optigrün Typ F (flachgründig) + PV
  | 'laumanns_greenroof'    // Laumanns Gründach-Solar
  | 'soprema_pavatex'       // Soprema Pavatex integriert
  | 'generic_green_ballast'; // Generisch Gründach-Ballast

// ============================================================================
// WECHSELRICHTER
// ============================================================================

export type InverterTopology = 'string' | 'micro' | 'hybrid' | 'central';
export type InverterPhase = 1 | 3;
export type MPPTCount = 1 | 2 | 3 | 4 | 6;

export interface InverterSpec {
  id: string;
  manufacturer: string;      // z.B. "SMA", "Fronius", "Kostal"
  model: string;             // z.B. "Sunny Boy 5.0"
  topology: InverterTopology;
  phases: InverterPhase;
  nominalPowerAC: number;    // kW
  maxDCPower: number;        // kW (max. PV-Leistung)
  maxDCVoltage: number;      // V (max. Eingangsspannung DC)
  startVoltage: number;      // V (Einschaltspannung)
  mppVoltageMin: number;     // V (MPP-Spannungsbereich min)
  mppVoltageMax: number;     // V (MPP-Spannungsbereich max)
  mpptCount: MPPTCount;
  maxCurrentPerMPPT: number; // A (max. DC-Strom je MPPT)
  maxShortCircuitCurrent?: number; // A (max. Kurzschlussstrom)
  efficiency: number;        // % (Max-Wirkungsgrad)
  euroEfficiency: number;    // % (Euro-Wirkungsgrad)
  hasBatteryInput?: boolean;
  batteryVoltageMin?: number;
  batteryVoltageMax?: number;
  maxBatteryPower?: number;
  hasEMS?: boolean;
  ipRating?: string;
  dimensions?: { w: number; h: number; d: number }; // mm
  weight?: number;           // kg
  price?: number;            // EUR (Nettopreis ca.)
  datasheet?: string;        // URL
}

// ============================================================================
// WECHSELRICHTER-DATENBANK
// ============================================================================

export const INVERTER_DATABASE: InverterSpec[] = [
  // SMA Sunny Boy (einphasig)
  { id: 'sma_sb3_0', manufacturer: 'SMA', model: 'Sunny Boy 3.0', topology: 'string', phases: 1, nominalPowerAC: 3.0, maxDCPower: 3.6, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 10, efficiency: 98.0, euroEfficiency: 97.1 },
  { id: 'sma_sb4_0', manufacturer: 'SMA', model: 'Sunny Boy 4.0', topology: 'string', phases: 1, nominalPowerAC: 4.0, maxDCPower: 4.8, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 10, efficiency: 98.0, euroEfficiency: 97.1 },
  { id: 'sma_sb5_0', manufacturer: 'SMA', model: 'Sunny Boy 5.0', topology: 'string', phases: 1, nominalPowerAC: 5.0, maxDCPower: 6.0, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 10, efficiency: 98.0, euroEfficiency: 97.1 },
  { id: 'sma_sb6_0', manufacturer: 'SMA', model: 'Sunny Boy 6.0', topology: 'string', phases: 1, nominalPowerAC: 6.0, maxDCPower: 7.5, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 98.1, euroEfficiency: 97.3 },
  // SMA Sunny Tripower (dreiphasig)
  { id: 'sma_stp5_0', manufacturer: 'SMA', model: 'Sunny Tripower 5.0', topology: 'string', phases: 3, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 98.4, euroEfficiency: 97.9 },
  { id: 'sma_stp8_0', manufacturer: 'SMA', model: 'Sunny Tripower 8.0', topology: 'string', phases: 3, nominalPowerAC: 8.0, maxDCPower: 12.0, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.5, euroEfficiency: 98.0 },
  { id: 'sma_stp10_0', manufacturer: 'SMA', model: 'Sunny Tripower 10.0', topology: 'string', phases: 3, nominalPowerAC: 10.0, maxDCPower: 15.0, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.5, euroEfficiency: 98.0 },
  { id: 'sma_stp15_0', manufacturer: 'SMA', model: 'Sunny Tripower 15.0', topology: 'string', phases: 3, nominalPowerAC: 15.0, maxDCPower: 22.5, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 3, maxCurrentPerMPPT: 20, efficiency: 98.6, euroEfficiency: 98.2 },
  { id: 'sma_stp20_0', manufacturer: 'SMA', model: 'Sunny Tripower 20.0', topology: 'string', phases: 3, nominalPowerAC: 20.0, maxDCPower: 30.0, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 3, maxCurrentPerMPPT: 25, efficiency: 98.7, euroEfficiency: 98.3 },
  // SMA Sunny Boy Storage (Hybrid)
  { id: 'sma_sbs3_7', manufacturer: 'SMA', model: 'Sunny Boy Storage 3.7', topology: 'hybrid', phases: 1, nominalPowerAC: 3.7, maxDCPower: 5.0, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 97.0, euroEfficiency: 96.0, hasBatteryInput: true, batteryVoltageMin: 42, batteryVoltageMax: 62, maxBatteryPower: 3.68 },
  { id: 'sma_sbs6_0', manufacturer: 'SMA', model: 'Sunny Boy Storage 6.0', topology: 'hybrid', phases: 1, nominalPowerAC: 6.0, maxDCPower: 8.0, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 97.3, euroEfficiency: 96.5, hasBatteryInput: true, batteryVoltageMin: 42, batteryVoltageMax: 62, maxBatteryPower: 6.0 },
  // Fronius Symo (dreiphasig)
  { id: 'fronius_symo3_0', manufacturer: 'Fronius', model: 'Symo 3.0-3-M', topology: 'string', phases: 3, nominalPowerAC: 3.0, maxDCPower: 4.5, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 9, efficiency: 98.1, euroEfficiency: 97.3 },
  { id: 'fronius_symo5_0', manufacturer: 'Fronius', model: 'Symo 5.0-3-M', topology: 'string', phases: 3, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 98.1, euroEfficiency: 97.5 },
  { id: 'fronius_symo8_2', manufacturer: 'Fronius', model: 'Symo 8.2-3-M', topology: 'string', phases: 3, nominalPowerAC: 8.2, maxDCPower: 12.3, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 18, efficiency: 98.1, euroEfficiency: 97.5 },
  { id: 'fronius_symo12_5', manufacturer: 'Fronius', model: 'Symo 12.5-3-M', topology: 'string', phases: 3, nominalPowerAC: 12.5, maxDCPower: 18.75, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 27, efficiency: 98.2, euroEfficiency: 97.6 },
  { id: 'fronius_symo20_0', manufacturer: 'Fronius', model: 'Symo 20.0-3-M', topology: 'string', phases: 3, nominalPowerAC: 20.0, maxDCPower: 30.0, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 27, efficiency: 98.3, euroEfficiency: 97.8 },
  // Fronius Primo (einphasig)
  { id: 'fronius_primo3_5', manufacturer: 'Fronius', model: 'Primo 3.5-1', topology: 'string', phases: 1, nominalPowerAC: 3.5, maxDCPower: 5.25, maxDCVoltage: 600, startVoltage: 80, mppVoltageMin: 80, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 98.0, euroEfficiency: 97.1 },
  { id: 'fronius_primo5_0', manufacturer: 'Fronius', model: 'Primo 5.0-1', topology: 'string', phases: 1, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 600, startVoltage: 80, mppVoltageMin: 80, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 98.1, euroEfficiency: 97.3 },
  { id: 'fronius_primo8_2', manufacturer: 'Fronius', model: 'Primo 8.2-1', topology: 'string', phases: 1, nominalPowerAC: 8.2, maxDCPower: 12.3, maxDCVoltage: 600, startVoltage: 80, mppVoltageMin: 80, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 16.6, efficiency: 98.1, euroEfficiency: 97.4 },
  // Kostal Plenticore Plus (einphasig Hybrid)
  { id: 'kostal_plenticore4_2', manufacturer: 'Kostal', model: 'Plenticore Plus 4.2', topology: 'hybrid', phases: 1, nominalPowerAC: 4.2, maxDCPower: 8.4, maxDCVoltage: 800, startVoltage: 150, mppVoltageMin: 120, mppVoltageMax: 750, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 97.9, euroEfficiency: 97.1, hasBatteryInput: true, batteryVoltageMin: 120, batteryVoltageMax: 750, maxBatteryPower: 4.2 },
  { id: 'kostal_plenticore5_5', manufacturer: 'Kostal', model: 'Plenticore Plus 5.5', topology: 'hybrid', phases: 1, nominalPowerAC: 5.5, maxDCPower: 11.0, maxDCVoltage: 800, startVoltage: 150, mppVoltageMin: 120, mppVoltageMax: 750, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 97.9, euroEfficiency: 97.1, hasBatteryInput: true, batteryVoltageMin: 120, batteryVoltageMax: 750, maxBatteryPower: 5.5 },
  { id: 'kostal_plenticore8_5', manufacturer: 'Kostal', model: 'Plenticore Plus 8.5', topology: 'hybrid', phases: 3, nominalPowerAC: 8.5, maxDCPower: 17.0, maxDCVoltage: 800, startVoltage: 150, mppVoltageMin: 120, mppVoltageMax: 750, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 98.0, euroEfficiency: 97.3, hasBatteryInput: true, batteryVoltageMin: 120, batteryVoltageMax: 750, maxBatteryPower: 8.5 },
  { id: 'kostal_plenticore10', manufacturer: 'Kostal', model: 'Plenticore Plus 10', topology: 'hybrid', phases: 3, nominalPowerAC: 10.0, maxDCPower: 20.0, maxDCVoltage: 800, startVoltage: 150, mppVoltageMin: 120, mppVoltageMax: 750, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 98.0, euroEfficiency: 97.3, hasBatteryInput: true, batteryVoltageMin: 120, batteryVoltageMax: 750, maxBatteryPower: 10.0 },
  // Huawei SUN2000 L1 (einphasig)
  { id: 'huawei_sun2000_3ktl_l1', manufacturer: 'Huawei', model: 'SUN2000-3KTL-L1', topology: 'string', phases: 1, nominalPowerAC: 3.0, maxDCPower: 4.5, maxDCVoltage: 600, startVoltage: 70, mppVoltageMin: 90, mppVoltageMax: 560, mpptCount: 2, maxCurrentPerMPPT: 11, efficiency: 98.8, euroEfficiency: 98.0 },
  { id: 'huawei_sun2000_5ktl_l1', manufacturer: 'Huawei', model: 'SUN2000-5KTL-L1', topology: 'string', phases: 1, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 600, startVoltage: 70, mppVoltageMin: 90, mppVoltageMax: 560, mpptCount: 2, maxCurrentPerMPPT: 11, efficiency: 98.8, euroEfficiency: 98.1 },
  { id: 'huawei_sun2000_6ktl_l1', manufacturer: 'Huawei', model: 'SUN2000-6KTL-L1', topology: 'string', phases: 1, nominalPowerAC: 6.0, maxDCPower: 9.0, maxDCVoltage: 600, startVoltage: 70, mppVoltageMin: 90, mppVoltageMax: 560, mpptCount: 2, maxCurrentPerMPPT: 13.5, efficiency: 98.9, euroEfficiency: 98.2 },
  // Huawei SUN2000 M1 (dreiphasig)
  { id: 'huawei_sun2000_5ktl_m1', manufacturer: 'Huawei', model: 'SUN2000-5KTL-M1', topology: 'string', phases: 3, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 1080, startVoltage: 140, mppVoltageMin: 200, mppVoltageMax: 950, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.8, euroEfficiency: 98.3 },
  { id: 'huawei_sun2000_8ktl_m2', manufacturer: 'Huawei', model: 'SUN2000-8KTL-M2', topology: 'string', phases: 3, nominalPowerAC: 8.0, maxDCPower: 12.0, maxDCVoltage: 1080, startVoltage: 140, mppVoltageMin: 200, mppVoltageMax: 950, mpptCount: 2, maxCurrentPerMPPT: 20, efficiency: 98.8, euroEfficiency: 98.3 },
  { id: 'huawei_sun2000_10ktl_m2', manufacturer: 'Huawei', model: 'SUN2000-10KTL-M2', topology: 'string', phases: 3, nominalPowerAC: 10.0, maxDCPower: 15.0, maxDCVoltage: 1080, startVoltage: 140, mppVoltageMin: 200, mppVoltageMax: 950, mpptCount: 2, maxCurrentPerMPPT: 25, efficiency: 98.8, euroEfficiency: 98.4 },
  { id: 'huawei_sun2000_15ktl_m2', manufacturer: 'Huawei', model: 'SUN2000-15KTL-M2', topology: 'string', phases: 3, nominalPowerAC: 15.0, maxDCPower: 22.5, maxDCVoltage: 1080, startVoltage: 140, mppVoltageMin: 200, mppVoltageMax: 950, mpptCount: 3, maxCurrentPerMPPT: 25, efficiency: 98.9, euroEfficiency: 98.5 },
  { id: 'huawei_sun2000_20ktl_m2', manufacturer: 'Huawei', model: 'SUN2000-20KTL-M2', topology: 'string', phases: 3, nominalPowerAC: 20.0, maxDCPower: 30.0, maxDCVoltage: 1080, startVoltage: 140, mppVoltageMin: 200, mppVoltageMax: 950, mpptCount: 4, maxCurrentPerMPPT: 25, efficiency: 98.9, euroEfficiency: 98.5 },
  // SolarEdge SE (einphasig, optimizerbasiert)
  { id: 'solaredge_se3k', manufacturer: 'SolarEdge', model: 'SE3K', topology: 'string', phases: 1, nominalPowerAC: 3.0, maxDCPower: 3.75, maxDCVoltage: 500, startVoltage: 120, mppVoltageMin: 100, mppVoltageMax: 460, mpptCount: 1, maxCurrentPerMPPT: 10, efficiency: 99.2, euroEfficiency: 98.8 },
  { id: 'solaredge_se5k', manufacturer: 'SolarEdge', model: 'SE5K', topology: 'string', phases: 1, nominalPowerAC: 5.0, maxDCPower: 6.15, maxDCVoltage: 500, startVoltage: 120, mppVoltageMin: 100, mppVoltageMax: 460, mpptCount: 1, maxCurrentPerMPPT: 15, efficiency: 99.2, euroEfficiency: 98.8 },
  { id: 'solaredge_se6k', manufacturer: 'SolarEdge', model: 'SE6K', topology: 'string', phases: 1, nominalPowerAC: 6.0, maxDCPower: 7.38, maxDCVoltage: 500, startVoltage: 120, mppVoltageMin: 100, mppVoltageMax: 460, mpptCount: 1, maxCurrentPerMPPT: 18, efficiency: 99.2, euroEfficiency: 98.8 },
  { id: 'solaredge_se8k', manufacturer: 'SolarEdge', model: 'SE8K', topology: 'string', phases: 1, nominalPowerAC: 8.0, maxDCPower: 9.69, maxDCVoltage: 500, startVoltage: 120, mppVoltageMin: 100, mppVoltageMax: 460, mpptCount: 1, maxCurrentPerMPPT: 22.5, efficiency: 99.2, euroEfficiency: 98.9 },
  // GoodWe GW (dreiphasig, günstig)
  { id: 'goodwe_gw5k_dt', manufacturer: 'GoodWe', model: 'GW5K-DT', topology: 'string', phases: 3, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 1000, startVoltage: 180, mppVoltageMin: 200, mppVoltageMax: 850, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.4, euroEfficiency: 97.7 },
  { id: 'goodwe_gw8k_dt', manufacturer: 'GoodWe', model: 'GW8K-DT', topology: 'string', phases: 3, nominalPowerAC: 8.0, maxDCPower: 12.0, maxDCVoltage: 1000, startVoltage: 180, mppVoltageMin: 200, mppVoltageMax: 850, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.4, euroEfficiency: 97.8 },
  { id: 'goodwe_gw10k_dt', manufacturer: 'GoodWe', model: 'GW10K-DT', topology: 'string', phases: 3, nominalPowerAC: 10.0, maxDCPower: 15.0, maxDCVoltage: 1000, startVoltage: 180, mppVoltageMin: 200, mppVoltageMax: 850, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.5, euroEfficiency: 97.9 },
  // Growatt MIN (einphasig)
  { id: 'growatt_min3000tl_x', manufacturer: 'Growatt', model: 'MIN 3000TL-X', topology: 'string', phases: 1, nominalPowerAC: 3.0, maxDCPower: 3.6, maxDCVoltage: 600, startVoltage: 80, mppVoltageMin: 100, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 11, efficiency: 97.7, euroEfficiency: 96.5 },
  { id: 'growatt_min5000tl_x', manufacturer: 'Growatt', model: 'MIN 5000TL-X', topology: 'string', phases: 1, nominalPowerAC: 5.0, maxDCPower: 6.0, maxDCVoltage: 600, startVoltage: 80, mppVoltageMin: 100, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 11, efficiency: 98.0, euroEfficiency: 96.8 },
  // Deye SUN (dreiphasig Hybrid)
  { id: 'deye_sun5k_sg03lp1', manufacturer: 'Deye', model: 'SUN-5K-SG03LP1', topology: 'hybrid', phases: 1, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 500, startVoltage: 70, mppVoltageMin: 120, mppVoltageMax: 430, mpptCount: 2, maxCurrentPerMPPT: 13, efficiency: 97.7, euroEfficiency: 97.0, hasBatteryInput: true, batteryVoltageMin: 40, batteryVoltageMax: 60, maxBatteryPower: 5.0 },
  { id: 'deye_sun8k_sg01hp3eu', manufacturer: 'Deye', model: 'SUN-8K-SG01HP3EU', topology: 'hybrid', phases: 3, nominalPowerAC: 8.0, maxDCPower: 12.0, maxDCVoltage: 850, startVoltage: 160, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 18.5, efficiency: 97.7, euroEfficiency: 97.0, hasBatteryInput: true, batteryVoltageMin: 160, batteryVoltageMax: 700, maxBatteryPower: 8.0 },
];

// ============================================================================
// DACHART-SPEZIFISCHE MATERIALLISTEN
// ============================================================================

export interface MaterialItem {
  id: string;
  category: 'module' | 'mounting' | 'electrical' | 'roofing' | 'safety' | 'misc';
  manufacturer?: string;      // Hersteller (z.B. "Braas", "Bauder")
  articleNumber?: string;     // Artikelnummer
  description: string;        // Bezeichnung
  unit: string;               // Einheit (Stk., m, m², kg)
  quantity: number;
  pricePerUnit?: number;      // EUR netto
  totalPrice?: number;        // EUR netto
  notes?: string;
}

export interface RoofTypeMaterial {
  roofType: RoofType;
  mountingSystem: PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem;
  items: MaterialItem[];
}

// STEILDACH-Materialien (Braas / BMI / K2)
export const getPitchedRoofMaterials = (
  moduleCount: number,
  railLengthTotal: number,   // m gesamt Schienenlänge
  roofHookCount: number,
  endClampCount: number,
  midClampCount: number,
  connectorCount: number,
  system: PitchedRoofSystem = 'braas_rapid2plus'
): MaterialItem[] => {
  const items: MaterialItem[] = [];

  if (system === 'braas_rapid2plus') {
    // Braas Rapid² Plus System
    items.push({
      id: 'braas_rapid2_hook',
      category: 'mounting',
      manufacturer: 'Braas',
      articleNumber: 'RD2-H-UNI',
      description: 'Braas Rapid² Universaldachhaken (Rapid² Plus)',
      unit: 'Stk.',
      quantity: roofHookCount,
      pricePerUnit: 8.50,
      notes: 'Passend für alle gängigen Tondachziegel'
    });
    items.push({
      id: 'braas_rail_330',
      category: 'mounting',
      manufacturer: 'Braas',
      articleNumber: 'RD-SCHIENE-330',
      description: 'Braas Alu-Montageschiene 3,30m',
      unit: 'Stk.',
      quantity: Math.ceil(railLengthTotal / 3.30),
      pricePerUnit: 28.00,
      notes: 'Standard-Schienenmaß'
    });
    items.push({
      id: 'braas_midclamp',
      category: 'mounting',
      manufacturer: 'Braas',
      articleNumber: 'RD-MIDCLAMP-35',
      description: 'Braas Mittelklemme 35mm (Modulstärke 30-35mm)',
      unit: 'Stk.',
      quantity: midClampCount,
      pricePerUnit: 3.80
    });
    items.push({
      id: 'braas_endclamp',
      category: 'mounting',
      manufacturer: 'Braas',
      articleNumber: 'RD-ENDCLAMP-35',
      description: 'Braas Endklemme 35mm',
      unit: 'Stk.',
      quantity: endClampCount,
      pricePerUnit: 4.20
    });
    items.push({
      id: 'braas_rail_connector',
      category: 'mounting',
      manufacturer: 'Braas',
      articleNumber: 'RD-VERBINDER',
      description: 'Braas Schienenverbinder',
      unit: 'Stk.',
      quantity: connectorCount,
      pricePerUnit: 5.50
    });
  } else if (system === 'k2_systems_base') {
    // K2 Systems BASE
    items.push({
      id: 'k2_base_hook',
      category: 'mounting',
      manufacturer: 'K2 Systems',
      articleNumber: 'K2-BASE-HOOK-UNI',
      description: 'K2 Systems Dachhaken Universal BASE',
      unit: 'Stk.',
      quantity: roofHookCount,
      pricePerUnit: 9.20
    });
    items.push({
      id: 'k2_base_rail',
      category: 'mounting',
      manufacturer: 'K2 Systems',
      articleNumber: 'K2-RAIL-360',
      description: 'K2 Systems Alu-Montageschiene 3,60m',
      unit: 'Stk.',
      quantity: Math.ceil(railLengthTotal / 3.60),
      pricePerUnit: 32.00
    });
    items.push({
      id: 'k2_midclamp',
      category: 'mounting',
      manufacturer: 'K2 Systems',
      articleNumber: 'K2-MIDCLAMP-M',
      description: 'K2 Systems Mittelklemme M',
      unit: 'Stk.',
      quantity: midClampCount,
      pricePerUnit: 4.10
    });
    items.push({
      id: 'k2_endclamp',
      category: 'mounting',
      manufacturer: 'K2 Systems',
      articleNumber: 'K2-ENDCLAMP-M',
      description: 'K2 Systems Endklemme M',
      unit: 'Stk.',
      quantity: endClampCount,
      pricePerUnit: 4.60
    });
  } else if (system === 'bmi_ecobase') {
    // BMI Ecobase
    items.push({
      id: 'bmi_hook',
      category: 'mounting',
      manufacturer: 'BMI',
      articleNumber: 'BMI-ECOBASE-HOOK',
      description: 'BMI Ecobase Dachhaken (universal)',
      unit: 'Stk.',
      quantity: roofHookCount,
      pricePerUnit: 8.80
    });
    items.push({
      id: 'bmi_rail',
      category: 'mounting',
      manufacturer: 'BMI',
      articleNumber: 'BMI-RAIL-315',
      description: 'BMI Alu-Profil 3,15m',
      unit: 'Stk.',
      quantity: Math.ceil(railLengthTotal / 3.15),
      pricePerUnit: 27.50
    });
    items.push({
      id: 'bmi_midclamp',
      category: 'mounting',
      manufacturer: 'BMI',
      articleNumber: 'BMI-MIDCLAMP',
      description: 'BMI Mittelklemme',
      unit: 'Stk.',
      quantity: midClampCount,
      pricePerUnit: 3.60
    });
    items.push({
      id: 'bmi_endclamp',
      category: 'mounting',
      manufacturer: 'BMI',
      articleNumber: 'BMI-ENDCLAMP',
      description: 'BMI Endklemme',
      unit: 'Stk.',
      quantity: endClampCount,
      pricePerUnit: 4.00
    });
  }

  // Gemeinsame Schraub- und Kleinmaterialien (alle Steildach-Systeme)
  items.push({
    id: 'stainless_screws',
    category: 'mounting',
    description: 'Edelstahlschrauben M8 x 30 (Montagesatz)',
    unit: 'Pkg.',
    quantity: Math.ceil(roofHookCount / 10),
    pricePerUnit: 6.50,
    notes: 'Edelstahl A4'
  });

  return items;
};

// FLACHDACH-Materialien (K2 / Esdec / Renusol)
export const getFlatRoofMaterials = (
  moduleCount: number,
  roofAreaM2: number,
  tiltAngle: number,
  system: FlatRoofSystem = 'k2_flat_evo_one'
): MaterialItem[] => {
  const items: MaterialItem[] = [];
  const isEW = tiltAngle <= 15; // Ost-West-Anlage bei kleinem Neigungswinkel

  if (system === 'k2_flat_evo_one') {
    items.push({
      id: 'k2_flatfix_evo_base',
      category: 'mounting',
      manufacturer: 'K2 Systems',
      articleNumber: 'K2-FLATFIX-EVO-BASE',
      description: `K2 Systems FlatFix EVO One Basis (${isEW ? 'Ost-West' : 'Süd'})`,
      unit: 'Set/Modul',
      quantity: moduleCount,
      pricePerUnit: 35.00,
      notes: 'Inkl. Ballasttablett'
    });
    items.push({
      id: 'k2_flat_ballast_paving',
      category: 'mounting',
      manufacturer: 'K2 Systems',
      articleNumber: 'K2-PFLASTERSTEIN-40',
      description: 'Pflasterstein 400x400x40mm als Ballast',
      unit: 'Stk.',
      quantity: Math.ceil(moduleCount * 1.5),
      pricePerUnit: 4.20,
      notes: 'Anzahl abhängig von Windlastzone'
    });
  } else if (system === 'esdec_flatfix_wave') {
    items.push({
      id: 'esdec_wave_mount',
      category: 'mounting',
      manufacturer: 'Esdec',
      articleNumber: 'FF-WAVE-BASE',
      description: 'Esdec FlatFix Wave Montagesystem',
      unit: 'Set/Modul',
      quantity: moduleCount,
      pricePerUnit: 38.00,
      notes: 'Ballaststeine erforderlich'
    });
  } else if (system === 'renusol_cs60') {
    items.push({
      id: 'renusol_cs60_mount',
      category: 'mounting',
      manufacturer: 'Renusol',
      articleNumber: 'CS60-MOUNT',
      description: 'Renusol CS60 Montagesystem',
      unit: 'Set/Modul',
      quantity: moduleCount,
      pricePerUnit: 42.00
    });
  } else if (system === 'schletter_freeform') {
    items.push({
      id: 'schletter_ff_mount',
      category: 'mounting',
      manufacturer: 'Schletter',
      articleNumber: 'FF-BASE-SET',
      description: 'Schletter FreeForm Basis-Set',
      unit: 'Set/Modul',
      quantity: moduleCount,
      pricePerUnit: 40.00
    });
  }

  // Dachdurchdringungsschutz / Dachschutz
  items.push({
    id: 'protection_mat',
    category: 'roofing',
    description: 'Schutzunterlage / Schutzmatte unter Ballastelementen',
    unit: 'm²',
    quantity: Math.ceil(roofAreaM2 * 0.05),
    pricePerUnit: 12.00,
    notes: 'Schutz der Dachabdichtung'
  });

  return items;
};

// GRÜNDACH-Materialien (Bauder / Soprema / Vedag / Optigrün)
export const getGreenRoofMaterials = (
  moduleCount: number,
  roofAreaM2: number,
  greenRoofAreaM2: number,
  system: GreenRoofSystem = 'bauder_thermofin'
): MaterialItem[] => {
  const items: MaterialItem[] = [];

  if (system === 'bauder_thermofin') {
    items.push({
      id: 'bauder_thermofin_te',
      category: 'mounting',
      manufacturer: 'Bauder',
      articleNumber: 'BAUDER-THERMOFIN-TE',
      description: 'Bauder Thermofin TE Aufdach-Dämmplatte (kombiniert Begrünung + Solar)',
      unit: 'm²',
      quantity: roofAreaM2,
      pricePerUnit: 85.00,
      notes: 'Kombisystem Gründach + PV-Fundament'
    });
    items.push({
      id: 'bauder_pv_mount_green',
      category: 'mounting',
      manufacturer: 'Bauder',
      articleNumber: 'BAUDER-PV-BALLAST',
      description: 'Bauder PV-Ballast-Aufnahme für Thermofin',
      unit: 'Set/Modul',
      quantity: moduleCount,
      pricePerUnit: 55.00,
      notes: 'Keine Dachdurchdringung erforderlich'
    });
    items.push({
      id: 'bauder_sedum_extensive',
      category: 'roofing',
      manufacturer: 'Bauder',
      articleNumber: 'BAUDER-SEDUM-EXT',
      description: 'Bauder Sedum-Matte extensiv (4-8cm Aufbau)',
      unit: 'm²',
      quantity: greenRoofAreaM2,
      pricePerUnit: 45.00,
      notes: 'Extensive Begrünung rund um PV-Module'
    });
  } else if (system === 'soprema_soprasolar') {
    items.push({
      id: 'soprema_soprasolar_ballast',
      category: 'mounting',
      manufacturer: 'Soprema',
      articleNumber: 'SOPRASOLAR-BALLAST',
      description: 'Soprema Soprasolar Ballast-Befestigung',
      unit: 'Set/Modul',
      quantity: moduleCount,
      pricePerUnit: 48.00,
      notes: 'Geeignet für bituminöse und synthetische Abdichtungen'
    });
    items.push({
      id: 'soprema_protection_layer',
      category: 'roofing',
      manufacturer: 'Soprema',
      articleNumber: 'SOPRAFLOR-PV',
      description: 'Soprema Sopraflor PV Schutzlage unter Ballastsystem',
      unit: 'm²',
      quantity: roofAreaM2,
      pricePerUnit: 18.00
    });
    items.push({
      id: 'soprema_sedum',
      category: 'roofing',
      manufacturer: 'Soprema',
      articleNumber: 'SOPREMA-SEDUM-EXT',
      description: 'Soprema Sedum-Matte extensiv',
      unit: 'm²',
      quantity: greenRoofAreaM2,
      pricePerUnit: 42.00
    });
  } else if (system === 'vedag_vedagreen') {
    items.push({
      id: 'vedag_vedagreen_solar',
      category: 'mounting',
      manufacturer: 'Vedag',
      articleNumber: 'VEDAGREEN-SOLAR',
      description: 'Vedag VedaGreen Solar Montagesystem (Ballast)',
      unit: 'Set/Modul',
      quantity: moduleCount,
      pricePerUnit: 50.00
    });
    items.push({
      id: 'vedag_protection',
      category: 'roofing',
      manufacturer: 'Vedag',
      articleNumber: 'VEDAFLOR-PROTECT',
      description: 'Vedag VedaFlor Schutzlage',
      unit: 'm²',
      quantity: roofAreaM2,
      pricePerUnit: 15.00
    });
  } else if (system === 'icopal_solarbase') {
    items.push({
      id: 'icopal_solarbase_mount',
      category: 'mounting',
      manufacturer: 'Icopal',
      articleNumber: 'ICOPAL-SOLARBASE',
      description: 'Icopal SolarBase Ballast-Unterkonstruktion',
      unit: 'Set/Modul',
      quantity: moduleCount,
      pricePerUnit: 47.00
    });
  } else if (system === 'optigruen_type_f') {
    items.push({
      id: 'optigruen_f_substrate',
      category: 'roofing',
      manufacturer: 'Optigrün',
      articleNumber: 'OG-SUBSTRAT-F',
      description: 'Optigrün Leichtsubstrat Typ F (extensiv, 8-10cm)',
      unit: 'm²',
      quantity: greenRoofAreaM2,
      pricePerUnit: 55.00,
      notes: 'Inkl. Vlies und Drainmatte'
    });
    items.push({
      id: 'optigruen_pv_support',
      category: 'mounting',
      manufacturer: 'Optigrün',
      articleNumber: 'OG-PV-STANDER',
      description: 'Optigrün PV-Ständer für Gründachkonstruktion',
      unit: 'Set/Modul',
      quantity: moduleCount,
      pricePerUnit: 62.00
    });
  } else if (system === 'laumanns_greenroof') {
    items.push({
      id: 'laumanns_substrate',
      category: 'roofing',
      manufacturer: 'Laumanns',
      articleNumber: 'LA-SUBSTRAT-EXT',
      description: 'Laumanns Extensiv-Substrat (6-8cm)',
      unit: 'm²',
      quantity: greenRoofAreaM2,
      pricePerUnit: 48.00
    });
    items.push({
      id: 'laumanns_pv_tray',
      category: 'mounting',
      manufacturer: 'Laumanns',
      articleNumber: 'LA-PV-TRAY',
      description: 'Laumanns PV-Aufständerung Gründach',
      unit: 'Set/Modul',
      quantity: moduleCount,
      pricePerUnit: 58.00
    });
  }

  // Allgemeine Gründach-Items
  items.push({
    id: 'green_protection_membrane',
    category: 'roofing',
    description: 'Wurzelschutzbahn (nach DIN 4062)',
    unit: 'm²',
    quantity: roofAreaM2,
    pricePerUnit: 8.00,
    notes: 'Pflicht bei Gründach mit bituminöser Abdichtung'
  });
  items.push({
    id: 'green_drain_layer',
    category: 'roofing',
    description: 'Drainmatte / Filtervlies',
    unit: 'm²',
    quantity: greenRoofAreaM2,
    pricePerUnit: 6.50
  });

  return items;
};

// Gemeinsame Elektromaterialien (alle Dachtypen)
export const getElectricalMaterials = (
  totalModules: number,
  inverterSpec: InverterSpec,
  inverterDistance: number = 15
): MaterialItem[] => {
  const items: MaterialItem[] = [];
  const estimatedStrings = Math.ceil(totalModules / (Math.floor(inverterSpec.maxDCVoltage / 41.5) || 10));
  const dcCableLength = totalModules * 1.5 + inverterDistance * estimatedStrings;
  const acCableLength = inverterDistance + 5;

  items.push({
    id: 'dc_cable_4mm',
    category: 'electrical',
    description: 'PV-Kabel 6mm² (schwarz/rot) H1Z2Z2-K',
    unit: 'm',
    quantity: Math.ceil(dcCableLength * 1.1),
    notes: 'Geprüft nach EN 50618'
  });
  items.push({
    id: 'mc4_connectors',
    category: 'electrical',
    description: 'MC4-Steckverbinder Pärchen (IP67)',
    unit: 'Paar',
    quantity: Math.ceil(totalModules / 2) + estimatedStrings * 4,
  });
  items.push({
    id: 'dc_disconnect',
    category: 'electrical',
    description: 'DC-Trennschalter 1000V / 32A (je Wechselrichter)',
    unit: 'Stk.',
    quantity: 1,
    notes: 'Vorgeschrieben nach VDE 0100-712'
  });

  // Wechselrichter
  items.push({
    id: 'inverter',
    category: 'electrical',
    manufacturer: inverterSpec.manufacturer,
    description: `Wechselrichter ${inverterSpec.manufacturer} ${inverterSpec.model} (${inverterSpec.nominalPowerAC} kW, ${inverterSpec.phases}-phasig)`,
    unit: 'Stk.',
    quantity: 1,
    notes: `${inverterSpec.mpptCount} MPPT-Tracker, η=${inverterSpec.efficiency}%`
  });

  // AC-Seite
  items.push({
    id: 'ac_cable',
    category: 'electrical',
    description: inverterSpec.phases === 1 ? 'NYM-J 3x6mm² (AC-Kabel einphasig)' : 'NYM-J 5x6mm² (AC-Kabel dreiphasig)',
    unit: 'm',
    quantity: Math.ceil(acCableLength * 1.1),
  });
  items.push({
    id: 'ac_protection',
    category: 'electrical',
    description: 'AC-Schutzeinrichtung LS-Schalter + FI (AC-seitig)',
    unit: 'Stk.',
    quantity: 1,
  });

  // Überspannungsschutz
  items.push({
    id: 'surge_dc',
    category: 'electrical',
    description: 'DC-Überspannungsschutz Typ 2 (1000V)',
    unit: 'Stk.',
    quantity: 1,
    notes: 'Empfohlen nach IEC 61643-32'
  });
  items.push({
    id: 'surge_ac',
    category: 'electrical',
    description: 'AC-Überspannungsschutz Typ 2',
    unit: 'Stk.',
    quantity: 1,
  });

  // Einspeisezähler
  items.push({
    id: 'smart_meter',
    category: 'electrical',
    description: 'Bidirektionaler Smart Meter (Eigenverbrauchsoptimierung)',
    unit: 'Stk.',
    quantity: 1,
    notes: 'Pflicht für EEG-Einspeisung'
  });

  // Monitoring
  items.push({
    id: 'monitoring',
    category: 'electrical',
    description: 'Monitoring-System / Datenlogger (inkl. 12 Monate Cloud)',
    unit: 'Stk.',
    quantity: 1,
  });

  // Kabelkanal
  items.push({
    id: 'cable_duct',
    category: 'mounting',
    description: 'Kabelkanal / Kabelschutz (Dach und Innen)',
    unit: 'm',
    quantity: Math.ceil(dcCableLength * 0.5),
  });

  return items;
};

// ============================================================================
// VOLLSTÄNDIGE MATERIALLISTE
// ============================================================================

export interface CompleteMaterialList {
  roofType: RoofType;
  mountingSystem: PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem;
  sections: {
    title: string;
    items: MaterialItem[];
  }[];
  totalNetPrice: number;
  totalGrossPrice: number; // 19% MwSt.
  moduleItems: MaterialItem[];
  mountingItems: MaterialItem[];
  electricalItems: MaterialItem[];
  roofingItems: MaterialItem[];
  safetyItems: MaterialItem[];
  miscItems: MaterialItem[];
}

export const buildCompleteMaterialList = (
  roofType: RoofType,
  mountingSystem: PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem,
  moduleItems: MaterialItem[],
  mountingItems: MaterialItem[],
  electricalItems: MaterialItem[],
  roofingItems: MaterialItem[],
  safetyItems: MaterialItem[] = [],
  miscItems: MaterialItem[] = []
): CompleteMaterialList => {
  const allItems = [...moduleItems, ...mountingItems, ...electricalItems, ...roofingItems, ...safetyItems, ...miscItems];
  
  // Berechne Gesamtpreise
  allItems.forEach(item => {
    if (item.pricePerUnit !== undefined) {
      item.totalPrice = Math.round(item.pricePerUnit * item.quantity * 100) / 100;
    }
  });

  const totalNetPrice = allItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  return {
    roofType,
    mountingSystem,
    sections: [
      { title: 'PV-Module', items: moduleItems },
      { title: 'Montagesystem', items: mountingItems },
      { title: 'Elektrik & Wechselrichter', items: electricalItems },
      { title: 'Dachaufbau & Abdichtung', items: roofingItems },
      { title: 'Sicherheitstechnik', items: safetyItems },
      { title: 'Sonstiges / Kleinmaterial', items: miscItems },
    ].filter(s => s.items.length > 0),
    totalNetPrice: Math.round(totalNetPrice * 100) / 100,
    totalGrossPrice: Math.round(totalNetPrice * 1.19 * 100) / 100,
    moduleItems,
    mountingItems,
    electricalItems,
    roofingItems,
    safetyItems,
    miscItems,
  };
};

// ============================================================================
// WECHSELRICHTER-AUSWAHL-LOGIK
// ============================================================================

export interface InverterSelectionResult {
  recommended: InverterSpec[];
  suitable: InverterSpec[];
  reason: string;
  warnings: string[];
}

export const selectInverter = (
  totalPowerKWp: number,
  phases: InverterPhase,
  hasBattery: boolean,
  preferredManufacturer?: string
): InverterSelectionResult => {
  const warnings: string[] = [];
  
  // Filterlogik: Wechselrichter soll ca. 100-120% der DC-Peakleistung können
  const minACPower = totalPowerKWp * 0.80;
  const maxACPower = totalPowerKWp * 1.20;

  let candidates = INVERTER_DATABASE.filter(inv => {
    if (inv.phases !== phases) return false;
    if (hasBattery && !inv.hasBatteryInput) return false;
    if (inv.nominalPowerAC >= minACPower && inv.nominalPowerAC <= maxACPower) return true;
    return false;
  });

  // Fallback: leicht größere Wechselrichter zulassen
  if (candidates.length === 0) {
    candidates = INVERTER_DATABASE.filter(inv => {
      if (inv.phases !== phases) return false;
      if (hasBattery && !inv.hasBatteryInput) return false;
      return inv.nominalPowerAC >= minACPower && inv.nominalPowerAC <= totalPowerKWp * 1.5;
    });
  }

  // Bevorzugter Hersteller vorne
  if (preferredManufacturer) {
    candidates.sort((a, b) => {
      if (a.manufacturer === preferredManufacturer && b.manufacturer !== preferredManufacturer) return -1;
      if (b.manufacturer === preferredManufacturer && a.manufacturer !== preferredManufacturer) return 1;
      return a.nominalPowerAC - b.nominalPowerAC;
    });
  } else {
    candidates.sort((a, b) => a.nominalPowerAC - b.nominalPowerAC);
  }

  const recommended = candidates.slice(0, 3);
  const suitable = candidates.slice(3, 8);

  if (phases === 1 && totalPowerKWp > 10) {
    warnings.push('Bei mehr als 10 kWp empfiehlt sich ein dreiphasiger Wechselrichter.');
  }
  if (totalPowerKWp > 30) {
    warnings.push('Für Anlagen > 30 kWp ggf. mehrere Wechselrichter oder Zentralwechselrichter prüfen.');
  }

  return {
    recommended,
    suitable,
    reason: `${totalPowerKWp.toFixed(1)} kWp DC-Leistung, ${phases}-phasig${hasBattery ? ', Speicherkopplung' : ''}`,
    warnings,
  };
};
