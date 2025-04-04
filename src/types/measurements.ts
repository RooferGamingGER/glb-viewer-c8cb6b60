
export type Point = {
  x: number;
  y: number;
  z: number;
};

export type Segment = {
  id: string;
  points: [Point, Point];
  length: number;
  inclination?: number;
  label?: string;
};

export type PVModuleSpec = {
  width: number;
  height: number;
  power: number;
  name: string;
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
  'other';

export type MeasurementMode = MeasurementType | 'none';
