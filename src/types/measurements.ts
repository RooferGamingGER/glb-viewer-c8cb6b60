
import * as THREE from 'three';

export type MeasurementMode = 
  | 'length' 
  | 'height' 
  | 'area' 
  | 'none' 
  | 'chimney'   // Kamin
  | 'skylight'  // Dachfenster
  | 'solar'     // Solaranlage
  | 'vent'      // Lüfter (nur Markierung)
  | 'hook'      // Dachhaken
  | 'other';    // Sonstige Einbauten

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
  labelVisible?: boolean;
  editMode?: boolean;
  unit?: string;
  description?: string;
  segments?: Segment[];
  inclination?: number;
  
  // Roof element specific fields
  subType?: string;      // Additional classification within type (e.g. "Kaminausschnitt" for chimney)
  dimensions?: {         // Specific dimensions for roof elements
    width?: number;
    length?: number;
    height?: number;
    diameter?: number;
    area?: number;
    perimeter?: number;  // Adding perimeter to dimensions
  };
  position?: {           // Reference position
    x: number;
    y: number;
    z: number;
  };
  count?: number;        // For elements that need counting (e.g., vents)
  relatedMeasurements?: string[]; // IDs of related measurements
  penetrationType?: 'vent' | 'hook' | 'other'; // Type of penetration
  notes?: string;        // Additional notes for the measurement
  screenshot?: string;   // Base64 data URL of measurement screenshot for PDF export
}
