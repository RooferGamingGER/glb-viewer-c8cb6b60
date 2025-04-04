

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface Segment {
  id: string;
  points: Point[];
  length: number;
  inclination?: number;
  label?: string;
  color?: string;
  labelPosition?: 'start' | 'middle' | 'end';
}

export interface PVModuleSpec {
  name: string;
  width: number;
  height: number;
  power: number;
  efficiency: number;
}

export interface PVMountingSystem {
  railLength: number;      // Total length of mounting rails in meters
  roofHookCount: number;   // Number of roof hooks needed
  middleClampCount: number; // Number of middle clamps
  endClampCount: number;   // Number of end clamps
  railConnectorCount: number; // Number of connectors between rails
}

export interface PVElectricalSystem {
  stringCableLength: number;  // Length of DC string cable in meters
  mainCableLength: number;    // Length of main DC cable in meters
  acCableLength: number;      // Length of AC cable in meters
  connectorPairCount: number; // Number of MC4 connector pairs
  inverterCount: number;      // Number of inverters needed
  inverterPower: number;      // Total inverter power capacity in kW
  stringCount: number;        // Number of strings
  modulesPerString: number;   // Number of modules per string
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
  boundingHeight?: number;
  boundingLength?: number;
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
  // New positioning properties
  moduleHeightOffset?: number; // Height offset from roof surface
  moduleRotation?: number;     // Rotation in degrees
  modulePositionX?: number;    // X-axis position offset
  modulePositionZ?: number;    // Z-axis position offset
}

export interface Measurement {
  id: string;
  type: string;
  label: string;
  points: Point[];
  value: number;
  unit: string;
  segments?: Segment[];
  isVisible: boolean;
  labelVisible: boolean;
  color: string;
  isClosed?: boolean;
  area?: number;
  height?: number;
  length?: number;
  width?: number;
  category?: string;
  description?: string;
  orderIndex?: number;
  powerOutput?: number;
  pvModuleInfo?: PVModuleInfo;
}

