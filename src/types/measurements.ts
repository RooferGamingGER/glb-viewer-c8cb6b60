
import * as THREE from 'three';

export type MeasurementMode = 
  | 'length' 
  | 'height' 
  | 'area' 
  | 'none' 
  | 'dormer'    // Gaube
  | 'chimney'   // Kamin
  | 'skylight'  // Dachfenster
  | 'solar'     // Solaranlage
  | 'gutter'    // Dachrinne
  | 'verge'     // Ortgang/Traufe
  | 'valley'    // Kehle
  | 'ridge'     // Grat
  | 'vent';     // Lüfter (nur Markierung)

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
  penetrationType?: 'vent' | 'other'; // Type of penetration
  
  // Added for the rectangle editor
  isRectangleMode?: boolean; // Flag to indicate if the element uses rectangle editing
  rectanglePoints?: Point[]; // The 4 corners of the rectangle (for chimney/skylight)
  isEditing?: boolean;      // Flag for active rectangle editing
  activeCorner?: number;    // Index of the currently active corner (0-3)
}
