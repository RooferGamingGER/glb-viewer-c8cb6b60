
import * as THREE from 'three';

export type MeasurementMode = 'length' | 'height' | 'area' | 'none';

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface MeasurementPoint {
  position: THREE.Vector3;
  worldPosition: THREE.Vector3;
}

export interface Segment {
  id: string;
  points: [Point, Point];
  length: number;
  label?: string;
  inclination?: number;
}

export interface Measurement {
  id: string;
  type: MeasurementMode;
  points: Point[];
  value: number;
  label?: string;
  visible?: boolean;
  editMode?: boolean;
  unit?: string;
  description?: string;
  segments?: Segment[];
  inclination?: number;
}
