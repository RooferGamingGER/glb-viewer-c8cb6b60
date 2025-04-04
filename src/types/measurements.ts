
export type Point = {
  x: number;
  y: number;
  z: number;
};

export type Point2D = {
  x: number;
  y: number;
};

export type Segment = {
  id: string;
  points: [Point, Point];
  length: number;
  inclination?: number;
  label?: string;
  type?: 'first' | 'grat' | 'kehle' | 'traufe' | 'ortgang' | 'custom';
  shared?: boolean;
  sharedWithSegmentId?: string;
  isOriginal?: boolean;
};

export type PVModuleSpec = {
  width: number;
  height: number;
  power: number;
  name: string;
  efficiency?: number;
};

export type PVMountingSystem = {
  railLength: number;
  roofHookCount: number;
  middleClampCount: number;
  endClampCount: number;
  railConnectorCount: number;
};

export type PVElectricalSystem = {
  stringCableLength: number;
  mainCableLength: number;
  acCableLength: number;
  connectorPairCount: number;
  inverterCount: number;
  inverterPower: number;
  stringCount: number;
  modulesPerString: number;
};

export type PVMaterials = {
  totalModuleCount: number;
  totalPower: number;
  moduleSpec: PVModuleSpec;
  mountingSystem: PVMountingSystem;
  electricalSystem: PVElectricalSystem;
  includesSurgeProtection: boolean;
  includesMonitoringSystem: boolean;
  notes: string[];
};

export type PVModuleInfo = {
  moduleCount: number;
  modulesX: number;
  modulesY: number;
  orientation: 'landscape' | 'portrait';
  spacing: number;
  pvModuleSpec?: PVModuleSpec;
  alignmentEdge?: {
    from: Point;
    to: Point;
  };
  // Additional properties used in code
  moduleWidth?: number;
  moduleHeight?: number;
  edgeDistance?: number;
  moduleSpacing?: number;
  coveragePercent?: number;
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
  pvMaterials?: PVMaterials;
  roofAzimuth?: number;       // Azimuth angle in degrees (0=North, 90=East, 180=South, 270=West)
  roofDirection?: string;     // Cardinal direction (N, NE, E, SE, S, SW, W, NW)  
  roofInclination?: number;   // Roof inclination in degrees
  yieldFactor?: number;       // Yield factor in kWh/kWp per year
};

export type Measurement = {
  id: string;
  type: MeasurementType;
  points: Point[];
  value: number;
  editMode?: boolean;
  label?: string;
  segments?: Segment[];
  visible?: boolean;
  labelVisible?: boolean;
  pvModuleInfo?: PVModuleInfo;
  pvModuleSpec?: PVModuleSpec;
  // Additional properties used in code
  description?: string;
  inclination?: number;
  customScreenshots?: string[];
  subType?: string;
  count?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    diameter?: number;
    area?: number;
  };
  unit?: string;
  powerOutput?: number;
  notes?: string[];
  screenshot?: string;
  polygon2D?: string;
};

export type MeasurementType = 
  'length' | 
  'height' | 
  'area' | 
  'solar' | 
  'skylight' | 
  'chimney' | 
  'vent' | 
  'hook' |
  'eave' |
  'ridge' |
  'verge' |
  'valley' |
  'pvmodule' |
  'hip' |
  'other';

export type MeasurementMode = MeasurementType | 'none';
