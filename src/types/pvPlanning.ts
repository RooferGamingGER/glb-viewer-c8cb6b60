/**
 * pvPlanning.ts
 * Erweiterte Typen für PV-Planung: Wechselrichter, Stringplanung, Dachart-spezifische Materiallisten
 * Deutsche Hersteller: SMA, Fronius, Kostal, Huawei, SolarEdge, Enphase, Growatt, Deye, GoodWe,
 * KACO new energy, RCT Power, REFU Elektronik
 */

// ============================================================================
// DACHTYPEN
// ============================================================================

export type RoofType = 'pitched' | 'flat' | 'green';

export type PitchedRoofSystem =
  | 'braas_rapid2plus'
  | 'braas_clickfit_evo'
  | 'bmi_ecobase'
  | 'bmi_klober_twist'
  | 'k2_systems_base'
  | 'k2_systems_cross'
  | 'mounting_systems_msr'
  | 'schletter_fm_ez'
  | 'schletter_group_rapid'
  | 'renusol_rs'
  | 'sl_rack_sr_30'
  | 'altec_pv_pro'
  | 'novotegra_baywre'
  | 'profiness_solar'
  | 'diconal_steildach'
  | 'generic_hook_rail';

export type FlatRoofSystem =
  | 'k2_flat_ground'
  | 'k2_flat_evo_one'
  | 'esdec_flatfix_wave'
  | 'schletter_freeform'
  | 'renusol_cs60'
  | 'mounting_systems_mpk'
  | 'sl_rack_fr_10'
  | 'altec_flat_alu'
  | 'novotegra_flat'
  | 'profiness_flat'
  | 'diconal_flachdach'
  | 'ekv_nord_flat'
  | 'sflex_flat'
  | 'conergy_ts'
  | 'generic_ballast';

export type GreenRoofSystem =
  | 'soprema_soprasolar'
  | 'bauder_thermofin'
  | 'vedag_vedagreen'
  | 'icopal_solarbase'
  | 'optigruen_type_f'
  | 'laumanns_greenroof'
  | 'soprema_pavatex'
  | 'bauder_solardach'
  | 'optigruen_intensive'
  | 'bmi_solar_green'
  | 'generic_green_ballast';

// ============================================================================
// WECHSELRICHTER
// ============================================================================

export type InverterTopology = 'string' | 'micro' | 'hybrid' | 'central';
export type InverterPhase = 1 | 3;
export type MPPTCount = 1 | 2 | 3 | 4 | 6;

export interface InverterSpec {
  id: string;
  manufacturer: string;
  model: string;
  topology: InverterTopology;
  phases: InverterPhase;
  nominalPowerAC: number;
  maxDCPower: number;
  maxDCVoltage: number;
  startVoltage: number;
  mppVoltageMin: number;
  mppVoltageMax: number;
  mpptCount: MPPTCount;
  maxCurrentPerMPPT: number;
  maxShortCircuitCurrent?: number;
  efficiency: number;
  euroEfficiency: number;
  hasBatteryInput?: boolean;
  batteryVoltageMin?: number;
  batteryVoltageMax?: number;
  maxBatteryPower?: number;
  hasEMS?: boolean;
  ipRating?: string;
  dimensions?: { w: number; h: number; d: number };
  weight?: number;
  price?: number;
  datasheet?: string;
}

// ============================================================================
// NUTZERDEFINIERTE SYSTEME
// ============================================================================

export interface UserDefinedMountingSystem {
  id: string;
  manufacturer: string;
  systemName: string;
  roofType: RoofType;
  description?: string;
  createdBy?: string;
  isPublic: boolean;
}

export interface UserDefinedInverter {
  id: string;
  manufacturer: string;
  model: string;
  nominalPowerAC: number;
  phases: 1 | 3;
  hasBatteryInput?: boolean;
  description?: string;
  createdBy?: string;
  isPublic: boolean;
}

// ============================================================================
// WECHSELRICHTER-DATENBANK
// ============================================================================

export const INVERTER_DATABASE: InverterSpec[] = [
  // ── SMA ──────────────────────────────────────────────────────────────────
  // Sunny Boy (einphasig)
  { id: 'sma_sb3_0', manufacturer: 'SMA', model: 'Sunny Boy 3.0', topology: 'string', phases: 1, nominalPowerAC: 3.0, maxDCPower: 3.6, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 10, efficiency: 98.0, euroEfficiency: 97.1 },
  { id: 'sma_sb4_0', manufacturer: 'SMA', model: 'Sunny Boy 4.0', topology: 'string', phases: 1, nominalPowerAC: 4.0, maxDCPower: 4.8, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 10, efficiency: 98.0, euroEfficiency: 97.1 },
  { id: 'sma_sb5_0', manufacturer: 'SMA', model: 'Sunny Boy 5.0', topology: 'string', phases: 1, nominalPowerAC: 5.0, maxDCPower: 6.0, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 10, efficiency: 98.0, euroEfficiency: 97.1 },
  { id: 'sma_sb6_0', manufacturer: 'SMA', model: 'Sunny Boy 6.0', topology: 'string', phases: 1, nominalPowerAC: 6.0, maxDCPower: 7.5, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 98.1, euroEfficiency: 97.3 },
  // Sunny Tripower (dreiphasig)
  { id: 'sma_stp5_0', manufacturer: 'SMA', model: 'Sunny Tripower 5.0', topology: 'string', phases: 3, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 98.4, euroEfficiency: 97.9 },
  { id: 'sma_stp8_0', manufacturer: 'SMA', model: 'Sunny Tripower 8.0', topology: 'string', phases: 3, nominalPowerAC: 8.0, maxDCPower: 12.0, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.5, euroEfficiency: 98.0 },
  { id: 'sma_stp10_0', manufacturer: 'SMA', model: 'Sunny Tripower 10.0', topology: 'string', phases: 3, nominalPowerAC: 10.0, maxDCPower: 15.0, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.5, euroEfficiency: 98.0 },
  { id: 'sma_stp15_0', manufacturer: 'SMA', model: 'Sunny Tripower 15.0', topology: 'string', phases: 3, nominalPowerAC: 15.0, maxDCPower: 22.5, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 3, maxCurrentPerMPPT: 20, efficiency: 98.6, euroEfficiency: 98.2 },
  { id: 'sma_stp20_0', manufacturer: 'SMA', model: 'Sunny Tripower 20.0', topology: 'string', phases: 3, nominalPowerAC: 20.0, maxDCPower: 30.0, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 3, maxCurrentPerMPPT: 25, efficiency: 98.7, euroEfficiency: 98.3 },
  // Sunny Boy Storage (Hybrid)
  { id: 'sma_sbs3_7', manufacturer: 'SMA', model: 'Sunny Boy Storage 3.7', topology: 'hybrid', phases: 1, nominalPowerAC: 3.7, maxDCPower: 5.0, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 97.0, euroEfficiency: 96.0, hasBatteryInput: true, batteryVoltageMin: 42, batteryVoltageMax: 62, maxBatteryPower: 3.68 },
  { id: 'sma_sbs6_0', manufacturer: 'SMA', model: 'Sunny Boy Storage 6.0', topology: 'hybrid', phases: 1, nominalPowerAC: 6.0, maxDCPower: 8.0, maxDCVoltage: 600, startVoltage: 50, mppVoltageMin: 125, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 97.3, euroEfficiency: 96.5, hasBatteryInput: true, batteryVoltageMin: 42, batteryVoltageMax: 62, maxBatteryPower: 6.0 },

  // ── Fronius ──────────────────────────────────────────────────────────────
  // Symo (dreiphasig)
  { id: 'fronius_symo3_0', manufacturer: 'Fronius', model: 'Symo 3.0-3-M', topology: 'string', phases: 3, nominalPowerAC: 3.0, maxDCPower: 4.5, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 9, efficiency: 98.1, euroEfficiency: 97.3 },
  { id: 'fronius_symo5_0', manufacturer: 'Fronius', model: 'Symo 5.0-3-M', topology: 'string', phases: 3, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 98.1, euroEfficiency: 97.5 },
  { id: 'fronius_symo8_2', manufacturer: 'Fronius', model: 'Symo 8.2-3-M', topology: 'string', phases: 3, nominalPowerAC: 8.2, maxDCPower: 12.3, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 18, efficiency: 98.1, euroEfficiency: 97.5 },
  { id: 'fronius_symo12_5', manufacturer: 'Fronius', model: 'Symo 12.5-3-M', topology: 'string', phases: 3, nominalPowerAC: 12.5, maxDCPower: 18.75, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 27, efficiency: 98.2, euroEfficiency: 97.6 },
  { id: 'fronius_symo20_0', manufacturer: 'Fronius', model: 'Symo 20.0-3-M', topology: 'string', phases: 3, nominalPowerAC: 20.0, maxDCPower: 30.0, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 27, efficiency: 98.3, euroEfficiency: 97.8 },
  // Primo (einphasig)
  { id: 'fronius_primo3_5', manufacturer: 'Fronius', model: 'Primo 3.5-1', topology: 'string', phases: 1, nominalPowerAC: 3.5, maxDCPower: 5.25, maxDCVoltage: 600, startVoltage: 80, mppVoltageMin: 80, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 98.0, euroEfficiency: 97.1 },
  { id: 'fronius_primo5_0', manufacturer: 'Fronius', model: 'Primo 5.0-1', topology: 'string', phases: 1, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 600, startVoltage: 80, mppVoltageMin: 80, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 12, efficiency: 98.1, euroEfficiency: 97.3 },
  { id: 'fronius_primo8_2', manufacturer: 'Fronius', model: 'Primo 8.2-1', topology: 'string', phases: 1, nominalPowerAC: 8.2, maxDCPower: 12.3, maxDCVoltage: 600, startVoltage: 80, mppVoltageMin: 80, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 16.6, efficiency: 98.1, euroEfficiency: 97.4 },

  // ── KOSTAL ──────────────────────────────────────────────────────────────
  // Plenticore Plus (Hybrid)
  { id: 'kostal_plenticore4_2', manufacturer: 'KOSTAL', model: 'Plenticore Plus 4.2', topology: 'hybrid', phases: 1, nominalPowerAC: 4.2, maxDCPower: 8.4, maxDCVoltage: 800, startVoltage: 150, mppVoltageMin: 120, mppVoltageMax: 750, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 97.9, euroEfficiency: 97.1, hasBatteryInput: true, batteryVoltageMin: 120, batteryVoltageMax: 750, maxBatteryPower: 4.2 },
  { id: 'kostal_plenticore5_5', manufacturer: 'KOSTAL', model: 'Plenticore Plus 5.5', topology: 'hybrid', phases: 1, nominalPowerAC: 5.5, maxDCPower: 11.0, maxDCVoltage: 800, startVoltage: 150, mppVoltageMin: 120, mppVoltageMax: 750, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 97.9, euroEfficiency: 97.1, hasBatteryInput: true, batteryVoltageMin: 120, batteryVoltageMax: 750, maxBatteryPower: 5.5 },
  { id: 'kostal_plenticore8_5', manufacturer: 'KOSTAL', model: 'Plenticore Plus 8.5', topology: 'hybrid', phases: 3, nominalPowerAC: 8.5, maxDCPower: 17.0, maxDCVoltage: 800, startVoltage: 150, mppVoltageMin: 120, mppVoltageMax: 750, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 98.0, euroEfficiency: 97.3, hasBatteryInput: true, batteryVoltageMin: 120, batteryVoltageMax: 750, maxBatteryPower: 8.5 },
  { id: 'kostal_plenticore10', manufacturer: 'KOSTAL', model: 'Plenticore Plus 10', topology: 'hybrid', phases: 3, nominalPowerAC: 10.0, maxDCPower: 20.0, maxDCVoltage: 800, startVoltage: 150, mppVoltageMin: 120, mppVoltageMax: 750, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 98.0, euroEfficiency: 97.3, hasBatteryInput: true, batteryVoltageMin: 120, batteryVoltageMax: 750, maxBatteryPower: 10.0 },
  // Plenticore G3
  { id: 'kostal_plenticore_g3_5', manufacturer: 'KOSTAL', model: 'Plenticore G3 5.5', topology: 'hybrid', phases: 1, nominalPowerAC: 5.5, maxDCPower: 11.0, maxDCVoltage: 800, startVoltage: 100, mppVoltageMin: 120, mppVoltageMax: 800, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 98.0, euroEfficiency: 97.3, hasBatteryInput: true, batteryVoltageMin: 120, batteryVoltageMax: 750, maxBatteryPower: 5.5, hasEMS: true, ipRating: 'IP65' },
  { id: 'kostal_plenticore_g3_10', manufacturer: 'KOSTAL', model: 'Plenticore G3 10', topology: 'hybrid', phases: 3, nominalPowerAC: 10.0, maxDCPower: 20.0, maxDCVoltage: 800, startVoltage: 100, mppVoltageMin: 120, mppVoltageMax: 800, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 98.1, euroEfficiency: 97.5, hasBatteryInput: true, batteryVoltageMin: 120, batteryVoltageMax: 750, maxBatteryPower: 10.0, hasEMS: true, ipRating: 'IP65' },
  // PIKO (String)
  { id: 'kostal_piko_10', manufacturer: 'KOSTAL', model: 'PIKO 10', topology: 'string', phases: 3, nominalPowerAC: 10.0, maxDCPower: 15.0, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 150, mppVoltageMax: 800, mpptCount: 3, maxCurrentPerMPPT: 18, efficiency: 98.2, euroEfficiency: 97.6, ipRating: 'IP65' },
  { id: 'kostal_piko_20', manufacturer: 'KOSTAL', model: 'PIKO 20', topology: 'string', phases: 3, nominalPowerAC: 20.0, maxDCPower: 30.0, maxDCVoltage: 1000, startVoltage: 150, mppVoltageMin: 150, mppVoltageMax: 800, mpptCount: 4, maxCurrentPerMPPT: 22, efficiency: 98.3, euroEfficiency: 97.8, ipRating: 'IP65' },

  // ── Huawei ──────────────────────────────────────────────────────────────
  // SUN2000 L1 (einphasig)
  { id: 'huawei_sun2000_3ktl_l1', manufacturer: 'Huawei', model: 'SUN2000-3KTL-L1', topology: 'string', phases: 1, nominalPowerAC: 3.0, maxDCPower: 4.5, maxDCVoltage: 600, startVoltage: 70, mppVoltageMin: 90, mppVoltageMax: 560, mpptCount: 2, maxCurrentPerMPPT: 11, efficiency: 98.8, euroEfficiency: 98.0 },
  { id: 'huawei_sun2000_5ktl_l1', manufacturer: 'Huawei', model: 'SUN2000-5KTL-L1', topology: 'string', phases: 1, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 600, startVoltage: 70, mppVoltageMin: 90, mppVoltageMax: 560, mpptCount: 2, maxCurrentPerMPPT: 11, efficiency: 98.8, euroEfficiency: 98.1 },
  { id: 'huawei_sun2000_6ktl_l1', manufacturer: 'Huawei', model: 'SUN2000-6KTL-L1', topology: 'string', phases: 1, nominalPowerAC: 6.0, maxDCPower: 9.0, maxDCVoltage: 600, startVoltage: 70, mppVoltageMin: 90, mppVoltageMax: 560, mpptCount: 2, maxCurrentPerMPPT: 13.5, efficiency: 98.9, euroEfficiency: 98.2 },
  // SUN2000 M (dreiphasig)
  { id: 'huawei_sun2000_5ktl_m1', manufacturer: 'Huawei', model: 'SUN2000-5KTL-M1', topology: 'string', phases: 3, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 1080, startVoltage: 140, mppVoltageMin: 200, mppVoltageMax: 950, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.8, euroEfficiency: 98.3 },
  { id: 'huawei_sun2000_8ktl_m2', manufacturer: 'Huawei', model: 'SUN2000-8KTL-M2', topology: 'string', phases: 3, nominalPowerAC: 8.0, maxDCPower: 12.0, maxDCVoltage: 1080, startVoltage: 140, mppVoltageMin: 200, mppVoltageMax: 950, mpptCount: 2, maxCurrentPerMPPT: 20, efficiency: 98.8, euroEfficiency: 98.3 },
  { id: 'huawei_sun2000_10ktl_m2', manufacturer: 'Huawei', model: 'SUN2000-10KTL-M2', topology: 'string', phases: 3, nominalPowerAC: 10.0, maxDCPower: 15.0, maxDCVoltage: 1080, startVoltage: 140, mppVoltageMin: 200, mppVoltageMax: 950, mpptCount: 2, maxCurrentPerMPPT: 25, efficiency: 98.8, euroEfficiency: 98.4 },
  { id: 'huawei_sun2000_15ktl_m2', manufacturer: 'Huawei', model: 'SUN2000-15KTL-M2', topology: 'string', phases: 3, nominalPowerAC: 15.0, maxDCPower: 22.5, maxDCVoltage: 1080, startVoltage: 140, mppVoltageMin: 200, mppVoltageMax: 950, mpptCount: 3, maxCurrentPerMPPT: 25, efficiency: 98.9, euroEfficiency: 98.5 },
  { id: 'huawei_sun2000_20ktl_m2', manufacturer: 'Huawei', model: 'SUN2000-20KTL-M2', topology: 'string', phases: 3, nominalPowerAC: 20.0, maxDCPower: 30.0, maxDCVoltage: 1080, startVoltage: 140, mppVoltageMin: 200, mppVoltageMax: 950, mpptCount: 4, maxCurrentPerMPPT: 25, efficiency: 98.9, euroEfficiency: 98.5 },

  // ── SolarEdge ──────────────────────────────────────────────────────────
  { id: 'solaredge_se3k', manufacturer: 'SolarEdge', model: 'SE3K', topology: 'string', phases: 1, nominalPowerAC: 3.0, maxDCPower: 3.75, maxDCVoltage: 500, startVoltage: 120, mppVoltageMin: 100, mppVoltageMax: 460, mpptCount: 1, maxCurrentPerMPPT: 10, efficiency: 99.2, euroEfficiency: 98.8 },
  { id: 'solaredge_se5k', manufacturer: 'SolarEdge', model: 'SE5K', topology: 'string', phases: 1, nominalPowerAC: 5.0, maxDCPower: 6.15, maxDCVoltage: 500, startVoltage: 120, mppVoltageMin: 100, mppVoltageMax: 460, mpptCount: 1, maxCurrentPerMPPT: 15, efficiency: 99.2, euroEfficiency: 98.8 },
  { id: 'solaredge_se6k', manufacturer: 'SolarEdge', model: 'SE6K', topology: 'string', phases: 1, nominalPowerAC: 6.0, maxDCPower: 7.38, maxDCVoltage: 500, startVoltage: 120, mppVoltageMin: 100, mppVoltageMax: 460, mpptCount: 1, maxCurrentPerMPPT: 18, efficiency: 99.2, euroEfficiency: 98.8 },
  { id: 'solaredge_se8k', manufacturer: 'SolarEdge', model: 'SE8K', topology: 'string', phases: 1, nominalPowerAC: 8.0, maxDCPower: 9.69, maxDCVoltage: 500, startVoltage: 120, mppVoltageMin: 100, mppVoltageMax: 460, mpptCount: 1, maxCurrentPerMPPT: 22.5, efficiency: 99.2, euroEfficiency: 98.9 },

  // ── GoodWe ──────────────────────────────────────────────────────────────
  { id: 'goodwe_gw5k_dt', manufacturer: 'GoodWe', model: 'GW5K-DT', topology: 'string', phases: 3, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 1000, startVoltage: 180, mppVoltageMin: 200, mppVoltageMax: 850, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.4, euroEfficiency: 97.7 },
  { id: 'goodwe_gw8k_dt', manufacturer: 'GoodWe', model: 'GW8K-DT', topology: 'string', phases: 3, nominalPowerAC: 8.0, maxDCPower: 12.0, maxDCVoltage: 1000, startVoltage: 180, mppVoltageMin: 200, mppVoltageMax: 850, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.4, euroEfficiency: 97.8 },
  { id: 'goodwe_gw10k_dt', manufacturer: 'GoodWe', model: 'GW10K-DT', topology: 'string', phases: 3, nominalPowerAC: 10.0, maxDCPower: 15.0, maxDCVoltage: 1000, startVoltage: 180, mppVoltageMin: 200, mppVoltageMax: 850, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.5, euroEfficiency: 97.9 },

  // ── Growatt ──────────────────────────────────────────────────────────────
  { id: 'growatt_min3000tl_x', manufacturer: 'Growatt', model: 'MIN 3000TL-X', topology: 'string', phases: 1, nominalPowerAC: 3.0, maxDCPower: 3.6, maxDCVoltage: 600, startVoltage: 80, mppVoltageMin: 100, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 11, efficiency: 97.7, euroEfficiency: 96.5 },
  { id: 'growatt_min5000tl_x', manufacturer: 'Growatt', model: 'MIN 5000TL-X', topology: 'string', phases: 1, nominalPowerAC: 5.0, maxDCPower: 6.0, maxDCVoltage: 600, startVoltage: 80, mppVoltageMin: 100, mppVoltageMax: 550, mpptCount: 2, maxCurrentPerMPPT: 11, efficiency: 98.0, euroEfficiency: 96.8 },

  // ── Deye ──────────────────────────────────────────────────────────────
  { id: 'deye_sun5k_sg03lp1', manufacturer: 'Deye', model: 'SUN-5K-SG03LP1', topology: 'hybrid', phases: 1, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 500, startVoltage: 70, mppVoltageMin: 120, mppVoltageMax: 430, mpptCount: 2, maxCurrentPerMPPT: 13, efficiency: 97.7, euroEfficiency: 97.0, hasBatteryInput: true, batteryVoltageMin: 40, batteryVoltageMax: 60, maxBatteryPower: 5.0 },
  { id: 'deye_sun8k_sg01hp3eu', manufacturer: 'Deye', model: 'SUN-8K-SG01HP3EU', topology: 'hybrid', phases: 3, nominalPowerAC: 8.0, maxDCPower: 12.0, maxDCVoltage: 850, startVoltage: 160, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 18.5, efficiency: 97.7, euroEfficiency: 97.0, hasBatteryInput: true, batteryVoltageMin: 160, batteryVoltageMax: 700, maxBatteryPower: 8.0 },

  // ── KACO new energy ──────────────────────────────────────────────────────
  { id: 'kaco_blueplanet_5_0', manufacturer: 'KACO new energy', model: 'blueplanet 5.0 TL3', topology: 'string', phases: 3, nominalPowerAC: 5.0, maxDCPower: 7.5, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 11, efficiency: 98.0, euroEfficiency: 97.4, ipRating: 'IP65' },
  { id: 'kaco_blueplanet_10_0', manufacturer: 'KACO new energy', model: 'blueplanet 10.0 TL3', topology: 'string', phases: 3, nominalPowerAC: 10.0, maxDCPower: 15.0, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 2, maxCurrentPerMPPT: 18, efficiency: 98.2, euroEfficiency: 97.7, ipRating: 'IP65' },
  { id: 'kaco_blueplanet_20_0', manufacturer: 'KACO new energy', model: 'blueplanet 20.0 TL3', topology: 'string', phases: 3, nominalPowerAC: 20.0, maxDCPower: 30.0, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 800, mpptCount: 3, maxCurrentPerMPPT: 25, efficiency: 98.3, euroEfficiency: 97.9, ipRating: 'IP65' },
  { id: 'kaco_blueplanet_50_0', manufacturer: 'KACO new energy', model: 'blueplanet 50.0 TL3', topology: 'string', phases: 3, nominalPowerAC: 50.0, maxDCPower: 75.0, maxDCVoltage: 1000, startVoltage: 200, mppVoltageMin: 200, mppVoltageMax: 850, mpptCount: 6, maxCurrentPerMPPT: 22, efficiency: 98.5, euroEfficiency: 98.1, ipRating: 'IP65' },

  // ── RCT Power ──────────────────────────────────────────────────────────
  { id: 'rct_power_storage_5_7', manufacturer: 'RCT Power', model: 'Power Storage DC 5.7', topology: 'hybrid', phases: 1, nominalPowerAC: 5.7, maxDCPower: 9.0, maxDCVoltage: 900, startVoltage: 120, mppVoltageMin: 120, mppVoltageMax: 850, mpptCount: 2, maxCurrentPerMPPT: 14, efficiency: 97.8, euroEfficiency: 97.0, hasBatteryInput: true, batteryVoltageMin: 100, batteryVoltageMax: 750, maxBatteryPower: 5.7, hasEMS: true, ipRating: 'IP65' },
  { id: 'rct_power_storage_10_0', manufacturer: 'RCT Power', model: 'Power Storage DC 10.0', topology: 'hybrid', phases: 3, nominalPowerAC: 10.0, maxDCPower: 16.0, maxDCVoltage: 900, startVoltage: 120, mppVoltageMin: 120, mppVoltageMax: 850, mpptCount: 3, maxCurrentPerMPPT: 14, efficiency: 98.0, euroEfficiency: 97.3, hasBatteryInput: true, batteryVoltageMin: 100, batteryVoltageMax: 750, maxBatteryPower: 10.0, hasEMS: true, ipRating: 'IP65' },
  { id: 'rct_power_inverter_6_0', manufacturer: 'RCT Power', model: 'Power Inverter 6.0', topology: 'string', phases: 1, nominalPowerAC: 6.0, maxDCPower: 9.0, maxDCVoltage: 900, startVoltage: 120, mppVoltageMin: 120, mppVoltageMax: 850, mpptCount: 2, maxCurrentPerMPPT: 15, efficiency: 98.0, euroEfficiency: 97.2, ipRating: 'IP65' },

  // ── REFU Elektronik ──────────────────────────────────────────────────────
  { id: 'refu_sol25', manufacturer: 'REFU Elektronik', model: 'REFUsol 025K', topology: 'string', phases: 3, nominalPowerAC: 25.0, maxDCPower: 37.5, maxDCVoltage: 1000, startVoltage: 250, mppVoltageMin: 250, mppVoltageMax: 800, mpptCount: 4, maxCurrentPerMPPT: 25, efficiency: 98.4, euroEfficiency: 98.0, ipRating: 'IP65' },
  { id: 'refu_sol50', manufacturer: 'REFU Elektronik', model: 'REFUsol 050K', topology: 'string', phases: 3, nominalPowerAC: 50.0, maxDCPower: 75.0, maxDCVoltage: 1000, startVoltage: 250, mppVoltageMin: 250, mppVoltageMax: 900, mpptCount: 6, maxCurrentPerMPPT: 28, efficiency: 98.6, euroEfficiency: 98.2, ipRating: 'IP65' },
  { id: 'refu_sol100', manufacturer: 'REFU Elektronik', model: 'REFUsol 100K', topology: 'central', phases: 3, nominalPowerAC: 100.0, maxDCPower: 150.0, maxDCVoltage: 1000, startVoltage: 300, mppVoltageMin: 300, mppVoltageMax: 900, mpptCount: 6, maxCurrentPerMPPT: 40, efficiency: 98.7, euroEfficiency: 98.4, ipRating: 'IP54' },
];

// ============================================================================
// DACHART-SPEZIFISCHE MATERIALLISTEN
// ============================================================================

export interface MaterialItem {
  id: string;
  category: 'module' | 'mounting' | 'electrical' | 'roofing' | 'safety' | 'misc';
  manufacturer?: string;
  articleNumber?: string;
  description: string;
  unit: string;
  quantity: number;
  notes?: string;
}

export interface RoofTypeMaterial {
  roofType: RoofType;
  mountingSystem: PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem;
  items: MaterialItem[];
}

// STEILDACH-Materialien
export const getPitchedRoofMaterials = (
  moduleCount: number,
  railLengthTotal: number,
  roofHookCount: number,
  endClampCount: number,
  midClampCount: number,
  connectorCount: number,
  system: PitchedRoofSystem = 'braas_rapid2plus'
): MaterialItem[] => {
  const items: MaterialItem[] = [];

  if (system === 'braas_rapid2plus') {
    items.push({ id: 'braas_rapid2_hook', category: 'mounting', manufacturer: 'Braas', articleNumber: 'RD2-H-UNI', description: 'Braas Rapid² Universaldachhaken (Rapid² Plus)', unit: 'Stk.', quantity: roofHookCount, notes: 'Passend für alle gängigen Tondachziegel' });
    items.push({ id: 'braas_rail_330', category: 'mounting', manufacturer: 'Braas', articleNumber: 'RD-SCHIENE-330', description: 'Braas Alu-Montageschiene 3,30m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.30), notes: 'Standard-Schienenmaß' });
    items.push({ id: 'braas_midclamp', category: 'mounting', manufacturer: 'Braas', articleNumber: 'RD-MIDCLAMP-35', description: 'Braas Mittelklemme 35mm (Modulstärke 30-35mm)', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'braas_endclamp', category: 'mounting', manufacturer: 'Braas', articleNumber: 'RD-ENDCLAMP-35', description: 'Braas Endklemme 35mm', unit: 'Stk.', quantity: endClampCount });
    items.push({ id: 'braas_rail_connector', category: 'mounting', manufacturer: 'Braas', articleNumber: 'RD-VERBINDER', description: 'Braas Schienenverbinder', unit: 'Stk.', quantity: connectorCount });
  } else if (system === 'braas_clickfit_evo') {
    items.push({ id: 'braas_clickfit_hook', category: 'mounting', manufacturer: 'Braas', articleNumber: 'CFE-HOOK-UNI', description: 'Braas ClickFit Evo Dachhaken Universal', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'braas_clickfit_rail', category: 'mounting', manufacturer: 'Braas', articleNumber: 'CFE-RAIL-330', description: 'Braas ClickFit Evo Alu-Montageschiene 3,30m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.30) });
    items.push({ id: 'braas_clickfit_midclamp', category: 'mounting', manufacturer: 'Braas', articleNumber: 'CFE-MIDCLAMP', description: 'Braas ClickFit Evo Mittelklemme', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'braas_clickfit_endclamp', category: 'mounting', manufacturer: 'Braas', articleNumber: 'CFE-ENDCLAMP', description: 'Braas ClickFit Evo Endklemme', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'k2_systems_base') {
    items.push({ id: 'k2_base_hook', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-BASE-HOOK-UNI', description: 'K2 Systems Dachhaken Universal BASE', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'k2_base_rail', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-RAIL-360', description: 'K2 Systems Alu-Montageschiene 3,60m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.60) });
    items.push({ id: 'k2_midclamp', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-MIDCLAMP-M', description: 'K2 Systems Mittelklemme M', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'k2_endclamp', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-ENDCLAMP-M', description: 'K2 Systems Endklemme M', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'k2_systems_cross') {
    items.push({ id: 'k2_cross_hook', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-CROSS-HOOK', description: 'K2 Systems Cross-Roof Dachhaken', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'k2_cross_rail', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-CROSS-RAIL-360', description: 'K2 Systems Cross-Roof Quertraverse 3,60m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.60) });
    items.push({ id: 'k2_cross_midclamp', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-CROSS-MIDCLAMP', description: 'K2 Systems Mittelklemme Cross', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'k2_cross_endclamp', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-CROSS-ENDCLAMP', description: 'K2 Systems Endklemme Cross', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'bmi_ecobase') {
    items.push({ id: 'bmi_hook', category: 'mounting', manufacturer: 'BMI', articleNumber: 'BMI-ECOBASE-HOOK', description: 'BMI Ecobase Dachhaken (universal)', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'bmi_rail', category: 'mounting', manufacturer: 'BMI', articleNumber: 'BMI-RAIL-315', description: 'BMI Alu-Profil 3,15m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.15) });
    items.push({ id: 'bmi_midclamp', category: 'mounting', manufacturer: 'BMI', articleNumber: 'BMI-MIDCLAMP', description: 'BMI Mittelklemme', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'bmi_endclamp', category: 'mounting', manufacturer: 'BMI', articleNumber: 'BMI-ENDCLAMP', description: 'BMI Endklemme', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'bmi_klober_twist') {
    items.push({ id: 'bmi_klober_hook', category: 'mounting', manufacturer: 'BMI', articleNumber: 'BMI-TWIST-HOOK', description: 'BMI Klöber Twist Dachhaken (Schnellmontage)', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'bmi_klober_rail', category: 'mounting', manufacturer: 'BMI', articleNumber: 'BMI-TWIST-RAIL-330', description: 'BMI Klöber Twist Alu-Schiene 3,30m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.30) });
    items.push({ id: 'bmi_klober_midclamp', category: 'mounting', manufacturer: 'BMI', articleNumber: 'BMI-TWIST-MIDCLAMP', description: 'BMI Klöber Twist Mittelklemme', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'bmi_klober_endclamp', category: 'mounting', manufacturer: 'BMI', articleNumber: 'BMI-TWIST-ENDCLAMP', description: 'BMI Klöber Twist Endklemme', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'mounting_systems_msr') {
    items.push({ id: 'ms_msr_hook', category: 'mounting', manufacturer: 'Mounting Systems', articleNumber: 'MSR-HOOK-UNI', description: 'Mounting Systems MSR Dachhaken Universal', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'ms_msr_rail', category: 'mounting', manufacturer: 'Mounting Systems', articleNumber: 'MSR-RAIL-350', description: 'Mounting Systems MSR Alu-Schiene 3,50m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.50) });
    items.push({ id: 'ms_msr_midclamp', category: 'mounting', manufacturer: 'Mounting Systems', articleNumber: 'MSR-MIDCLAMP-M', description: 'Mounting Systems MSR Mittelklemme M (30–40mm)', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'ms_msr_endclamp', category: 'mounting', manufacturer: 'Mounting Systems', articleNumber: 'MSR-ENDCLAMP-M', description: 'Mounting Systems MSR Endklemme M', unit: 'Stk.', quantity: endClampCount });
    items.push({ id: 'ms_msr_connector', category: 'mounting', manufacturer: 'Mounting Systems', articleNumber: 'MSR-CONNECTOR', description: 'Mounting Systems MSR Schienenverbinder', unit: 'Stk.', quantity: connectorCount });
  } else if (system === 'schletter_fm_ez') {
    items.push({ id: 'schletter_hook', category: 'mounting', manufacturer: 'Schletter Group', articleNumber: 'FM-EZ-HOOK-UNI', description: 'Schletter FM EZ Dachhaken Universal', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'schletter_rail', category: 'mounting', manufacturer: 'Schletter Group', articleNumber: 'FM-EZ-RAIL-360', description: 'Schletter FM EZ Alu-Montageschiene 3,60m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.60) });
    items.push({ id: 'schletter_midclamp', category: 'mounting', manufacturer: 'Schletter Group', articleNumber: 'FM-EZ-MIDCLAMP', description: 'Schletter FM EZ Mittelklemme', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'schletter_endclamp', category: 'mounting', manufacturer: 'Schletter Group', articleNumber: 'FM-EZ-ENDCLAMP', description: 'Schletter FM EZ Endklemme', unit: 'Stk.', quantity: endClampCount });
    items.push({ id: 'schletter_connector', category: 'mounting', manufacturer: 'Schletter Group', articleNumber: 'FM-EZ-CONNECTOR', description: 'Schletter FM EZ Schienenverbinder', unit: 'Stk.', quantity: connectorCount });
  } else if (system === 'schletter_group_rapid') {
    items.push({ id: 'schletter_rapid_hook', category: 'mounting', manufacturer: 'Schletter Group', articleNumber: 'SG-RAPID-HOOK', description: 'Schletter Group Rapid Dachhaken', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'schletter_rapid_rail', category: 'mounting', manufacturer: 'Schletter Group', articleNumber: 'SG-RAPID-RAIL-360', description: 'Schletter Group Rapid Alu-Schiene 3,60m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.60) });
    items.push({ id: 'schletter_rapid_midclamp', category: 'mounting', manufacturer: 'Schletter Group', articleNumber: 'SG-RAPID-MIDCLAMP', description: 'Schletter Group Rapid Mittelklemme', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'schletter_rapid_endclamp', category: 'mounting', manufacturer: 'Schletter Group', articleNumber: 'SG-RAPID-ENDCLAMP', description: 'Schletter Group Rapid Endklemme', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'renusol_rs') {
    items.push({ id: 'renusol_rs_hook', category: 'mounting', manufacturer: 'Renusol', articleNumber: 'RS-HOOK-UNI', description: 'Renusol RS Dachhaken Universal (Stahl verzinkt)', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'renusol_rs_rail', category: 'mounting', manufacturer: 'Renusol', articleNumber: 'RS-RAIL-330', description: 'Renusol RS Alu-Montageschiene 3,30m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.30) });
    items.push({ id: 'renusol_rs_midclamp', category: 'mounting', manufacturer: 'Renusol', articleNumber: 'RS-MIDCLAMP', description: 'Renusol RS Mittelklemme (32–46mm)', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'renusol_rs_endclamp', category: 'mounting', manufacturer: 'Renusol', articleNumber: 'RS-ENDCLAMP', description: 'Renusol RS Endklemme', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'sl_rack_sr_30') {
    items.push({ id: 'sl_rack_hook', category: 'mounting', manufacturer: 'SL Rack', articleNumber: 'SR30-HOOK-UNI', description: 'SL Rack SR 30 Dachhaken Universal', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'sl_rack_rail', category: 'mounting', manufacturer: 'SL Rack', articleNumber: 'SR30-RAIL-340', description: 'SL Rack SR 30 Alu-Schiene 3,40m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.40) });
    items.push({ id: 'sl_rack_midclamp', category: 'mounting', manufacturer: 'SL Rack', articleNumber: 'SR30-MIDCLAMP', description: 'SL Rack Mittelklemme 35mm', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'sl_rack_endclamp', category: 'mounting', manufacturer: 'SL Rack', articleNumber: 'SR30-ENDCLAMP', description: 'SL Rack Endklemme 35mm', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'altec_pv_pro') {
    items.push({ id: 'altec_hook', category: 'mounting', manufacturer: 'Altec', articleNumber: 'ALTEC-PV-HOOK', description: 'Altec PV Pro Dachhaken Universal', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'altec_rail', category: 'mounting', manufacturer: 'Altec', articleNumber: 'ALTEC-PV-RAIL-340', description: 'Altec PV Pro Alu-Schiene 3,40m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.40) });
    items.push({ id: 'altec_midclamp', category: 'mounting', manufacturer: 'Altec', articleNumber: 'ALTEC-PV-MIDCLAMP', description: 'Altec PV Pro Mittelklemme', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'altec_endclamp', category: 'mounting', manufacturer: 'Altec', articleNumber: 'ALTEC-PV-ENDCLAMP', description: 'Altec PV Pro Endklemme', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'novotegra_baywre') {
    items.push({ id: 'novotegra_hook', category: 'mounting', manufacturer: 'Novotegra (BayWa r.e.)', articleNumber: 'NVT-HOOK-UNI', description: 'Novotegra Dachhaken Universal', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'novotegra_rail', category: 'mounting', manufacturer: 'Novotegra (BayWa r.e.)', articleNumber: 'NVT-RAIL-350', description: 'Novotegra Alu-Montageschiene 3,50m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.50) });
    items.push({ id: 'novotegra_midclamp', category: 'mounting', manufacturer: 'Novotegra (BayWa r.e.)', articleNumber: 'NVT-MIDCLAMP', description: 'Novotegra Mittelklemme', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'novotegra_endclamp', category: 'mounting', manufacturer: 'Novotegra (BayWa r.e.)', articleNumber: 'NVT-ENDCLAMP', description: 'Novotegra Endklemme', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'profiness_solar') {
    items.push({ id: 'profiness_hook', category: 'mounting', manufacturer: 'Profiness', articleNumber: 'PF-HOOK-UNI', description: 'Profiness Solar Dachhaken Universal', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'profiness_rail', category: 'mounting', manufacturer: 'Profiness', articleNumber: 'PF-RAIL-330', description: 'Profiness Solar Alu-Schiene 3,30m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.30) });
    items.push({ id: 'profiness_midclamp', category: 'mounting', manufacturer: 'Profiness', articleNumber: 'PF-MIDCLAMP', description: 'Profiness Solar Mittelklemme', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'profiness_endclamp', category: 'mounting', manufacturer: 'Profiness', articleNumber: 'PF-ENDCLAMP', description: 'Profiness Solar Endklemme', unit: 'Stk.', quantity: endClampCount });
  } else if (system === 'diconal_steildach') {
    items.push({ id: 'diconal_hook', category: 'mounting', manufacturer: 'Diconal', articleNumber: 'DIC-HOOK-UNI', description: 'Diconal Steildach Dachhaken Universal', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'diconal_rail', category: 'mounting', manufacturer: 'Diconal', articleNumber: 'DIC-RAIL-330', description: 'Diconal Steildach Alu-Schiene 3,30m', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.30) });
    items.push({ id: 'diconal_midclamp', category: 'mounting', manufacturer: 'Diconal', articleNumber: 'DIC-MIDCLAMP', description: 'Diconal Mittelklemme', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'diconal_endclamp', category: 'mounting', manufacturer: 'Diconal', articleNumber: 'DIC-ENDCLAMP', description: 'Diconal Endklemme', unit: 'Stk.', quantity: endClampCount });
  } else {
    // generic_hook_rail + alle unbekannten
    items.push({ id: 'generic_hook', category: 'mounting', manufacturer: 'Generisch', description: 'Dachhaken Universal (Edelstahl A4)', unit: 'Stk.', quantity: roofHookCount });
    items.push({ id: 'generic_rail', category: 'mounting', manufacturer: 'Generisch', description: 'Alu-Montageschiene 3,30m (EN 6060)', unit: 'Stk.', quantity: Math.ceil(railLengthTotal / 3.30) });
    items.push({ id: 'generic_midclamp', category: 'mounting', manufacturer: 'Generisch', description: 'Mittelklemme 35mm', unit: 'Stk.', quantity: midClampCount });
    items.push({ id: 'generic_endclamp', category: 'mounting', manufacturer: 'Generisch', description: 'Endklemme 35mm', unit: 'Stk.', quantity: endClampCount });
  }

  items.push({
    id: 'stainless_screws', category: 'mounting',
    description: 'Edelstahlschrauben M8 x 30 (Montagesatz)', unit: 'Pkg.',
    quantity: Math.ceil(roofHookCount / 10), notes: 'Edelstahl A4'
  });

  return items;
};

// FLACHDACH-Materialien
export const getFlatRoofMaterials = (
  moduleCount: number,
  roofAreaM2: number,
  tiltAngle: number,
  system: FlatRoofSystem = 'k2_flat_evo_one'
): MaterialItem[] => {
  const items: MaterialItem[] = [];
  const isEW = tiltAngle <= 15;

  if (system === 'k2_flat_evo_one') {
    items.push({ id: 'k2_flatfix_evo_base', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-FLATFIX-EVO-BASE', description: `K2 Systems FlatFix EVO One Basis (${isEW ? 'Ost-West' : 'Süd'})`, unit: 'Set/Modul', quantity: moduleCount, notes: 'Inkl. Ballasttablett' });
    items.push({ id: 'k2_flat_ballast_paving', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-PFLASTERSTEIN-40', description: 'Pflasterstein 400x400x40mm als Ballast', unit: 'Stk.', quantity: Math.ceil(moduleCount * 1.5), notes: 'Anzahl abhängig von Windlastzone' });
  } else if (system === 'k2_flat_ground') {
    items.push({ id: 'k2_flatfix_ground_base', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-FFG-BASE', description: 'K2 Systems FlatFix Ground Basis-Set', unit: 'Set/Modul', quantity: moduleCount, notes: 'Inkl. Dreieck, Quertraverse, Klemmen' });
    items.push({ id: 'k2_flatfix_ground_ballast', category: 'mounting', manufacturer: 'K2 Systems', articleNumber: 'K2-FFG-BALLAST', description: 'K2 FlatFix Ground Ballasttablett (Betonstein 6kg)', unit: 'Stk.', quantity: Math.ceil(moduleCount * 2), notes: 'Anzahl je nach Windlastzone' });
  } else if (system === 'esdec_flatfix_wave') {
    items.push({ id: 'esdec_wave_mount', category: 'mounting', manufacturer: 'Esdec', articleNumber: 'FF-WAVE-BASE', description: 'Esdec FlatFix Wave Montagesystem', unit: 'Set/Modul', quantity: moduleCount, notes: 'Ballaststeine erforderlich' });
  } else if (system === 'renusol_cs60') {
    items.push({ id: 'renusol_cs60_mount', category: 'mounting', manufacturer: 'Renusol', articleNumber: 'CS60-MOUNT', description: 'Renusol CS60 Montagesystem', unit: 'Set/Modul', quantity: moduleCount });
  } else if (system === 'schletter_freeform') {
    items.push({ id: 'schletter_ff_mount', category: 'mounting', manufacturer: 'Schletter', articleNumber: 'FF-BASE-SET', description: 'Schletter FreeForm Basis-Set', unit: 'Set/Modul', quantity: moduleCount });
  } else if (system === 'mounting_systems_mpk') {
    items.push({ id: 'ms_mpk_base', category: 'mounting', manufacturer: 'Mounting Systems', articleNumber: 'MPK-BASE', description: 'Mounting Systems MPK Ballast-System', unit: 'Set/Modul', quantity: moduleCount });
    items.push({ id: 'ms_mpk_ballast', category: 'mounting', manufacturer: 'Mounting Systems', articleNumber: 'MPK-BALLAST', description: 'MPK Ballasttablett Betonstein', unit: 'Stk.', quantity: Math.ceil(moduleCount * 2) });
  } else if (system === 'sl_rack_fr_10') {
    items.push({ id: 'sl_rack_flat_base', category: 'mounting', manufacturer: 'SL Rack', articleNumber: 'FR10-BASE', description: 'SL Rack FR 10 Flachdach-Dreieck Set', unit: 'Set/Modul', quantity: moduleCount });
    items.push({ id: 'sl_rack_flat_ballast', category: 'mounting', manufacturer: 'SL Rack', articleNumber: 'FR10-BALLAST', description: 'Betonballastplatte 400×400×50mm', unit: 'Stk.', quantity: Math.ceil(moduleCount * 1.5) });
  } else if (system === 'altec_flat_alu') {
    items.push({ id: 'altec_flat_base', category: 'mounting', manufacturer: 'Altec', articleNumber: 'ALTEC-FLAT-BASE', description: 'Altec Flachdach-Alu Montagesystem', unit: 'Set/Modul', quantity: moduleCount });
    items.push({ id: 'altec_flat_ballast', category: 'mounting', manufacturer: 'Altec', articleNumber: 'ALTEC-FLAT-BALLAST', description: 'Altec Ballastplatte', unit: 'Stk.', quantity: Math.ceil(moduleCount * 1.5) });
  } else if (system === 'novotegra_flat') {
    items.push({ id: 'novotegra_flat_base', category: 'mounting', manufacturer: 'Novotegra (BayWa r.e.)', articleNumber: 'NVT-FLAT-BASE', description: 'Novotegra Flat Montage-Dreieck', unit: 'Set/Modul', quantity: moduleCount });
    items.push({ id: 'novotegra_flat_ballast', category: 'mounting', manufacturer: 'Novotegra (BayWa r.e.)', articleNumber: 'NVT-FLAT-BALLAST', description: 'Betonballastplatte 500×500×50mm', unit: 'Stk.', quantity: Math.ceil(moduleCount * 1.5) });
  } else if (system === 'profiness_flat') {
    items.push({ id: 'profiness_flat_base', category: 'mounting', manufacturer: 'Profiness', articleNumber: 'PF-FLAT-BASE', description: 'Profiness Flat Montagesystem', unit: 'Set/Modul', quantity: moduleCount });
  } else if (system === 'diconal_flachdach') {
    items.push({ id: 'diconal_flat_base', category: 'mounting', manufacturer: 'Diconal', articleNumber: 'DIC-FLAT-BASE', description: 'Diconal Flachdach Montagesystem', unit: 'Set/Modul', quantity: moduleCount });
  } else if (system === 'ekv_nord_flat') {
    items.push({ id: 'ekv_flat_mount', category: 'mounting', manufacturer: 'EKV-NORD', articleNumber: 'EKVN-FLAT-BASE', description: 'EKV-NORD Flachdach Montagesystem', unit: 'Set/Modul', quantity: moduleCount });
  } else if (system === 'sflex_flat') {
    items.push({ id: 'sflex_flat_mount', category: 'mounting', manufacturer: 'sflex', articleNumber: 'SFLEX-FLAT-BASE', description: 'sflex Flachdach Montagesystem (Ballastvariante)', unit: 'Set/Modul', quantity: moduleCount, notes: 'inkl. Schienenabdeckung' });
  } else if (system === 'conergy_ts') {
    items.push({ id: 'conergy_ts_mount', category: 'mounting', manufacturer: 'Conergy', articleNumber: 'CTS-BASE', description: 'Conergy Top System Basis-Set', unit: 'Set/Modul', quantity: moduleCount });
  } else {
    // generic_ballast + unbekannte
    items.push({ id: 'generic_flat_mount', category: 'mounting', manufacturer: 'Generisch', description: 'Flachdach-Aufständerung (Ballast-System)', unit: 'Set/Modul', quantity: moduleCount });
    items.push({ id: 'generic_flat_ballast', category: 'mounting', manufacturer: 'Generisch', description: 'Betonballastplatte 400×400mm', unit: 'Stk.', quantity: Math.ceil(moduleCount * 1.5) });
  }

  items.push({
    id: 'protection_mat', category: 'roofing',
    description: 'Schutzunterlage / Schutzmatte unter Ballastelementen', unit: 'm²',
    quantity: Math.ceil(roofAreaM2 * 0.05), notes: 'Schutz der Dachabdichtung'
  });

  return items;
};

// GRÜNDACH-Materialien
export const getGreenRoofMaterials = (
  moduleCount: number,
  roofAreaM2: number,
  greenRoofAreaM2: number,
  system: GreenRoofSystem = 'bauder_thermofin'
): MaterialItem[] => {
  const items: MaterialItem[] = [];

  if (system === 'bauder_thermofin') {
    items.push({ id: 'bauder_thermofin_te', category: 'mounting', manufacturer: 'Bauder', articleNumber: 'BAUDER-THERMOFIN-TE', description: 'Bauder Thermofin TE Aufdach-Dämmplatte (kombiniert Begrünung + Solar)', unit: 'm²', quantity: roofAreaM2, notes: 'Kombisystem Gründach + PV-Fundament' });
    items.push({ id: 'bauder_pv_mount_green', category: 'mounting', manufacturer: 'Bauder', articleNumber: 'BAUDER-PV-BALLAST', description: 'Bauder PV-Ballast-Aufnahme für Thermofin', unit: 'Set/Modul', quantity: moduleCount, notes: 'Keine Dachdurchdringung erforderlich' });
    items.push({ id: 'bauder_sedum_extensive', category: 'roofing', manufacturer: 'Bauder', articleNumber: 'BAUDER-SEDUM-EXT', description: 'Bauder Sedum-Matte extensiv (4-8cm Aufbau)', unit: 'm²', quantity: greenRoofAreaM2, notes: 'Extensive Begrünung rund um PV-Module' });
  } else if (system === 'soprema_soprasolar') {
    items.push({ id: 'soprema_soprasolar_ballast', category: 'mounting', manufacturer: 'Soprema', articleNumber: 'SOPRASOLAR-BALLAST', description: 'Soprema Soprasolar Ballast-Befestigung', unit: 'Set/Modul', quantity: moduleCount, notes: 'Geeignet für bituminöse und synthetische Abdichtungen' });
    items.push({ id: 'soprema_protection_layer', category: 'roofing', manufacturer: 'Soprema', articleNumber: 'SOPRAFLOR-PV', description: 'Soprema Sopraflor PV Schutzlage unter Ballastsystem', unit: 'm²', quantity: roofAreaM2 });
    items.push({ id: 'soprema_sedum', category: 'roofing', manufacturer: 'Soprema', articleNumber: 'SOPREMA-SEDUM-EXT', description: 'Soprema Sedum-Matte extensiv', unit: 'm²', quantity: greenRoofAreaM2 });
  } else if (system === 'vedag_vedagreen') {
    items.push({ id: 'vedag_vedagreen_solar', category: 'mounting', manufacturer: 'Vedag', articleNumber: 'VEDAGREEN-SOLAR', description: 'Vedag VedaGreen Solar Montagesystem (Ballast)', unit: 'Set/Modul', quantity: moduleCount });
    items.push({ id: 'vedag_protection', category: 'roofing', manufacturer: 'Vedag', articleNumber: 'VEDAFLOR-PROTECT', description: 'Vedag VedaFlor Schutzlage', unit: 'm²', quantity: roofAreaM2 });
  } else if (system === 'icopal_solarbase') {
    items.push({ id: 'icopal_solarbase_mount', category: 'mounting', manufacturer: 'Icopal', articleNumber: 'ICOPAL-SOLARBASE', description: 'Icopal SolarBase Ballast-Unterkonstruktion', unit: 'Set/Modul', quantity: moduleCount });
  } else if (system === 'optigruen_type_f') {
    items.push({ id: 'optigruen_f_substrate', category: 'roofing', manufacturer: 'Optigrün', articleNumber: 'OG-SUBSTRAT-F', description: 'Optigrün Leichtsubstrat Typ F (extensiv, 8-10cm)', unit: 'm²', quantity: greenRoofAreaM2, notes: 'Inkl. Vlies und Drainmatte' });
    items.push({ id: 'optigruen_pv_support', category: 'mounting', manufacturer: 'Optigrün', articleNumber: 'OG-PV-STANDER', description: 'Optigrün PV-Ständer für Gründachkonstruktion', unit: 'Set/Modul', quantity: moduleCount });
  } else if (system === 'laumanns_greenroof') {
    items.push({ id: 'laumanns_substrate', category: 'roofing', manufacturer: 'Laumanns', articleNumber: 'LA-SUBSTRAT-EXT', description: 'Laumanns Extensiv-Substrat (6-8cm)', unit: 'm²', quantity: greenRoofAreaM2 });
    items.push({ id: 'laumanns_pv_tray', category: 'mounting', manufacturer: 'Laumanns', articleNumber: 'LA-PV-TRAY', description: 'Laumanns PV-Aufständerung Gründach', unit: 'Set/Modul', quantity: moduleCount });
  } else if (system === 'soprema_pavatex') {
    items.push({ id: 'soprema_pavatex_mount', category: 'mounting', manufacturer: 'Soprema', articleNumber: 'PAVATEX-PV-INT', description: 'Soprema Pavatex integriertes PV-System', unit: 'Set/Modul', quantity: moduleCount });
  } else if (system === 'bauder_solardach') {
    items.push({ id: 'bauder_sol_membrane', category: 'roofing', manufacturer: 'Bauder', articleNumber: 'BAUDER-BITUMEN-4MM', description: 'Bauder Bitumen-Schweißbahn als Unterschicht (4mm)', unit: 'm²', quantity: Math.ceil(roofAreaM2 * 1.10), notes: '+10% Verschnitt' });
    items.push({ id: 'bauder_sol_mount', category: 'mounting', manufacturer: 'Bauder', articleNumber: 'BAUDER-SOL-MOUNT', description: 'Bauder Solardach Montagesystem (auflaminiert)', unit: 'Set/Modul', quantity: moduleCount });
    items.push({ id: 'bauder_sol_ballast', category: 'mounting', manufacturer: 'Bauder', articleNumber: 'BAUDER-SOL-BALLAST', description: 'Bauder Solardach Ballastplatte', unit: 'Stk.', quantity: Math.ceil(moduleCount * 1.5) });
  } else if (system === 'optigruen_intensive') {
    items.push({ id: 'optigruen_int_drainage', category: 'roofing', manufacturer: 'Optigrün', articleNumber: 'OG-INT-DRAINAGE', description: 'Optigrün Intensivbegrünung Drainageschicht FKD 40', unit: 'm²', quantity: Math.ceil(roofAreaM2 * 1.05) });
    items.push({ id: 'optigruen_int_substrate', category: 'roofing', manufacturer: 'Optigrün', articleNumber: 'OG-INT-SUB', description: 'Optigrün Intensivsubstrat Typ R (200mm)', unit: 'm²', quantity: Math.ceil(roofAreaM2 * 1.05) });
    items.push({ id: 'optigruen_int_pv_frame', category: 'mounting', manufacturer: 'Optigrün', articleNumber: 'OG-INT-PVFRAME', description: 'Optigrün PV-Rahmen für Intensivbegrünung (höhenverstellbar)', unit: 'Set/Modul', quantity: moduleCount });
  } else if (system === 'bmi_solar_green') {
    items.push({ id: 'bmi_green_membrane', category: 'roofing', manufacturer: 'BMI', articleNumber: 'BMI-KSK-4MM', description: 'BMI KSK-Bahn kaltselbstklebend als Abdichtung (4mm)', unit: 'm²', quantity: Math.ceil(roofAreaM2 * 1.10) });
    items.push({ id: 'bmi_green_fleece', category: 'roofing', manufacturer: 'BMI', articleNumber: 'BMI-VLI-300', description: 'BMI Vegetationsschutzvlies 300g/m²', unit: 'm²', quantity: Math.ceil(roofAreaM2 * 1.05) });
    items.push({ id: 'bmi_green_pv_mount', category: 'mounting', manufacturer: 'BMI', articleNumber: 'BMI-SOLAR-GREEN-BASE', description: 'BMI Solar Gründach Montage-Basis', unit: 'Set/Modul', quantity: moduleCount });
  } else {
    // generic_green_ballast + unbekannte
    items.push({ id: 'generic_green_mount', category: 'mounting', manufacturer: 'Generisch', description: 'Gründach PV-Aufständerung (Ballast)', unit: 'Set/Modul', quantity: moduleCount });
  }

  items.push({
    id: 'green_protection_membrane', category: 'roofing',
    description: 'Wurzelschutzbahn (nach DIN 4062)', unit: 'm²',
    quantity: roofAreaM2, notes: 'Pflicht bei Gründach mit bituminöser Abdichtung'
  });
  items.push({
    id: 'green_drain_layer', category: 'roofing',
    description: 'Drainmatte / Filtervlies', unit: 'm²', quantity: greenRoofAreaM2
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

  items.push({ id: 'dc_cable_4mm', category: 'electrical', description: 'PV-Kabel 6mm² (schwarz/rot) H1Z2Z2-K', unit: 'm', quantity: Math.ceil(dcCableLength * 1.1), notes: 'Geprüft nach EN 50618' });
  items.push({ id: 'mc4_connectors', category: 'electrical', description: 'MC4-Steckverbinder Pärchen (IP67)', unit: 'Paar', quantity: Math.ceil(totalModules / 2) + estimatedStrings * 4 });
  items.push({ id: 'dc_disconnect', category: 'electrical', description: 'DC-Trennschalter 1000V / 32A (je Wechselrichter)', unit: 'Stk.', quantity: 1, notes: 'Vorgeschrieben nach VDE 0100-712' });
  items.push({ id: 'inverter', category: 'electrical', manufacturer: inverterSpec.manufacturer, description: `Wechselrichter ${inverterSpec.manufacturer} ${inverterSpec.model} (${inverterSpec.nominalPowerAC} kW, ${inverterSpec.phases}-phasig)`, unit: 'Stk.', quantity: 1, notes: `${inverterSpec.mpptCount} MPPT-Tracker, η=${inverterSpec.efficiency}%` });
  items.push({ id: 'ac_cable', category: 'electrical', description: inverterSpec.phases === 1 ? 'NYM-J 3x6mm² (AC-Kabel einphasig)' : 'NYM-J 5x6mm² (AC-Kabel dreiphasig)', unit: 'm', quantity: Math.ceil(acCableLength * 1.1) });
  items.push({ id: 'ac_protection', category: 'electrical', description: 'AC-Schutzeinrichtung LS-Schalter + FI (AC-seitig)', unit: 'Stk.', quantity: 1 });
  items.push({ id: 'surge_dc', category: 'electrical', description: 'DC-Überspannungsschutz Typ 2 (1000V)', unit: 'Stk.', quantity: 1, notes: 'Empfohlen nach IEC 61643-32' });
  items.push({ id: 'surge_ac', category: 'electrical', description: 'AC-Überspannungsschutz Typ 2', unit: 'Stk.', quantity: 1 });
  items.push({ id: 'smart_meter', category: 'electrical', description: 'Bidirektionaler Smart Meter (Eigenverbrauchsoptimierung)', unit: 'Stk.', quantity: 1, notes: 'Pflicht für EEG-Einspeisung' });
  items.push({ id: 'monitoring', category: 'electrical', description: 'Monitoring-System / Datenlogger (inkl. 12 Monate Cloud)', unit: 'Stk.', quantity: 1 });
  items.push({ id: 'cable_duct', category: 'mounting', description: 'Kabelkanal / Kabelschutz (Dach und Innen)', unit: 'm', quantity: Math.ceil(dcCableLength * 0.5) });

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
  
  const minACPower = totalPowerKWp * 0.80;
  const maxACPower = totalPowerKWp * 1.20;

  let candidates = INVERTER_DATABASE.filter(inv => {
    if (inv.phases !== phases) return false;
    if (hasBattery && !inv.hasBatteryInput) return false;
    if (inv.nominalPowerAC >= minACPower && inv.nominalPowerAC <= maxACPower) return true;
    return false;
  });

  if (candidates.length === 0) {
    candidates = INVERTER_DATABASE.filter(inv => {
      if (inv.phases !== phases) return false;
      if (hasBattery && !inv.hasBatteryInput) return false;
      return inv.nominalPowerAC >= minACPower && inv.nominalPowerAC <= totalPowerKWp * 1.5;
    });
  }

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

// ============================================================================
// AUTOMATISCHE WECHSELRICHTERAUSWAHL NACH DACHTYP
// ============================================================================

/**
 * Wählt automatisch einen passenden Wechselrichter basierend auf:
 * - Steildach: 1-phasig bis 10 kWp, 3-phasig darüber
 * - Flachdach: immer 3-phasig
 * - Gründach: immer 3-phasig
 * Priorisiert deutsche Hersteller (SMA, KOSTAL, KACO, RCT Power)
 */
export const autoSelectInverter = (
  totalPowerKWp: number,
  roofType: RoofType,
  hasBattery: boolean = false
): InverterSpec | null => {
  let phases: InverterPhase;
  if (roofType === 'flat' || roofType === 'green') {
    phases = 3;
  } else {
    phases = totalPowerKWp <= 10.0 ? 1 : 3;
  }

  const germanManufacturers = ['SMA', 'KOSTAL', 'KACO new energy', 'RCT Power'];

  for (const manufacturer of germanManufacturers) {
    const result = selectInverter(totalPowerKWp, phases, hasBattery, manufacturer);
    if (result.recommended.length > 0) {
      return result.recommended[0];
    }
  }

  const result = selectInverter(totalPowerKWp, phases, hasBattery);
  if (result.recommended.length > 0) return result.recommended[0];
  if (result.suitable.length > 0) return result.suitable[0];
  return null;
};
