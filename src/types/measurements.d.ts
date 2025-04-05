
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
  type: 'length' | 'height' | 'area' | 'pvmodule' | 'ridge' | 'eave' | 'verge' | 'solar' | 'pvplanning';
  name?: string;
  points: Point[];
  segments?: Segment[];
  value?: number;
  label?: string;
  visible?: boolean;
  labelVisible?: boolean;
  powerOutput?: number;
  pvPositions?: Point[];
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
  width: number;
  height: number;
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
  roofAzimuth?: number;
  roofDirection?: string;
  roofInclination?: number;
  yieldFactor?: number;
  points?: Point[];
  rotation?: number;
}

export type MeasurementMode = 
  | 'none'
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
  | 'other';
