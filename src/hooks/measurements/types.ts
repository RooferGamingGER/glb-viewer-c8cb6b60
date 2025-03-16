
import { Vector3 } from 'three';

export type MeasurementMode = 'length' | 'height' | 'area' | 'none';

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface MeasurementPoint {
  position: Vector3;
  worldPosition: Vector3;
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
}
