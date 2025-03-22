
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
  | 'other'     // Sonstige Einbauten
  | 'ridge'     // First
  | 'eave'      // Traufe
  | 'verge'     // Ortgang
  | 'valley'    // Kehle
  | 'hip';      // Grat

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

export interface Point2D {
  x: number;
  y: number;
}

export interface RoofOrientation {
  ridgeDirection?: THREE.Vector3;  // Direction vector of the ridge
  eaveDirection?: THREE.Vector3;   // Direction vector of the eave
  principalDirection?: "ridge" | "eave"; // Which direction to align modules with
  ridgeId?: string;               // ID of ridge measurement
  eaveId?: string;                // ID of eave measurement
}

export interface PVModuleInfo {
  moduleWidth: number;      // Module width in meters
  moduleHeight: number;     // Module height in meters
  moduleCount: number;      // Number of modules that can fit
  coveragePercent: number;  // Coverage percentage of the roof area
  orientation: 'portrait' | 'landscape'; // Module orientation
  edgeDistance?: number;    // Distance from roof edge in meters
  moduleSpacing?: number;   // Spacing between modules in meters
  roofOrientation?: RoofOrientation; // Orientation relative to roof structure
  alignWithRoof?: boolean;  // Whether modules are aligned with roof structure
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
  polygon2D?: string;    // Base64 data URL of 2D polygon rendering for PDF export
  
  // Custom screenshots for PDF export
  customScreenshots?: string[];  // Array of base64 data URLs for custom screenshots
  
  // PV module calculation data
  pvModuleInfo?: PVModuleInfo; // Information about PV module placement
}
