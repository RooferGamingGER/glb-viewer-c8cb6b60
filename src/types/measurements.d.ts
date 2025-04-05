export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Segment {
  id: string;
  points: [Point, Point];
  length: number;
  inclination?: number;
  label?: string;
  type?: 'first' | 'grat' | 'kehle' | 'traufe' | 'ortgang' | 'custom';
  shared?: boolean;
  sharedWithSegmentId?: string;
  isOriginal?: boolean;
}

export interface Measurement {
  id: string;
  type: 'length' | 'height' | 'area' | 'pvmodule' | 'ridge' | 'eave' | 'verge' | 'solar';
  name?: string;
  points: Point[];
  segments?: Segment[];
  value?: number;
  label?: string;
  visible?: boolean;
  labelVisible?: boolean;
  powerOutput?: number;
}

export interface PVModuleSpec {
  name: string;
  width: number;
  height: number;
  power: number;
  efficiency: number;
}

export interface PVMountingSystem {
  railLength: number;
  roofHookCount: number;
  middleClampCount: number;
  endClampCount: number;
  railConnectorCount: number;
}

export interface PVElectricalSystem {
  stringCableLength: number;
  mainCableLength: number;
  acCableLength: number;
  connectorPairCount: number;
  inverterCount: number;
  inverterPower: number;
  stringCount: number;
  modulesPerString: number;
}

export interface PVMaterials {
  totalModuleCount: number;
  totalPower: number;
  moduleSpec: PVModuleSpec;
  mountingSystem: PVMountingSystem;
  electricalSystem: PVElectricalSystem;
  includesSurgeProtection: boolean;
  includesMonitoringSystem: boolean;
  notes: string[];
}

export interface PVModuleInfo {
  moduleWidth: number;
  moduleHeight: number;
  moduleCount: number;
  edgeDistance?: number;
  moduleSpacing?: number;
  coveragePercent: number;
  orientation: 'portrait' | 'landscape';
  columns?: number;
  rows?: number;
  boundingWidth?: number;
  boundingLength?: number;
  boundingHeight?: number;
  availableWidth?: number;
  availableLength?: number;
  startX?: number;
  startZ?: number;
  minX?: number;
  maxX?: number;
  minZ?: number;
  maxZ?: number;
  actualArea?: number;
  manualDimensions?: boolean;
  userDefinedWidth?: number;
  userDefinedLength?: number;
  edgeInfoValid?: boolean;
  edgeInfoMessage?: string;
  pvModuleSpec?: PVModuleSpec;
  pvMaterials?: PVMaterials;
  roofAzimuth?: number;       // Azimuth angle in degrees (0=North, 90=East, 180=South, 270=West)
  roofDirection?: string;     // Cardinal direction (N, NE, E, SE, S, SW, W, NW)  
  roofInclination?: number;   // Roof inclination in degrees
  yieldFactor?: number;       // Yield factor in kWh/kWp per year
  points?: Point[];           // Store the original points used for the solar area calculation
}

export type MeasurementMode = 
  | 'line' 
  | 'area' 
  | 'length' 
  | 'height' 
  | 'solar' 
  | 'skylight' 
  | 'chimney' 
  | 'pvmodule' 
  | 'pvplanning' 
  | 'vent' 
  | 'hook' 
  | 'other'
  | 'none';
