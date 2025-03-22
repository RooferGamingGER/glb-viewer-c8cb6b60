
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
  | 'pvmodule'  // PV-Modul (individuelles Zeichnen)
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

export interface PVModuleInfo {
  moduleWidth: number;      // Module width in meters
  moduleHeight: number;     // Module height in meters
  moduleCount: number;      // Number of modules that can fit
  coveragePercent: number;  // Coverage percentage of the roof area
  orientation: 'portrait' | 'landscape'; // Module orientation
  edgeDistance?: number;    // Distance from roof edge in meters
  moduleSpacing?: number;   // Spacing between modules in meters
  columns?: number;         // Number of columns (modules across width)
  rows?: number;            // Number of rows (modules across length)
  boundingWidth?: number;   // Width of the bounding box for the area
  boundingLength?: number;  // Length of the bounding box for the area
  boundingHeight?: number;  // Added: Height of the bounding box (replacing width)
  availableWidth?: number;  // Available width after edge distance
  availableLength?: number; // Available length after edge distance
  startX?: number;         // Starting X position for grid (after edge distance)
  startZ?: number;         // Starting Z position for grid (after edge distance)
  minX?: number;           // Minimum X of the bounding box
  maxX?: number;           // Maximum X of the bounding box
  minZ?: number;           // Minimum Z of the bounding box
  maxZ?: number;           // Maximum Z of the bounding box
  actualArea?: number;      // The actual area (not just bounding box)
  pvModuleSpec?: PVModuleSpec; // Reference to the module specification used
  manualDimensions?: boolean; // Flag to indicate if dimensions were manually set
  userDefinedWidth?: number;  // User-defined available width in meters
  userDefinedLength?: number; // User-defined available length in meters
  edgeInfoValid?: boolean;    // Whether the edge measurements are valid
  edgeInfoMessage?: string;   // Validation message for edge measurements
  isTrapezoid?: boolean;      // Whether the roof is trapezoid-shaped
  roofPitch?: number;         // Roof pitch/inclination in degrees
  ridgeLength?: number;       // Length of the ridge (short side of trapezoid)
  eaveLength?: number;        // Length of the eave (long side of trapezoid)
  modulePositions?: ModulePosition[]; // Array of module positions for rendering
  modulesVisible?: boolean;   // Whether to display the modules visually
}

export interface ModulePosition {
  position: THREE.Vector3;    // Center position of the module
  rotation: THREE.Euler;      // Rotation of the module
  dimensions: {               // Actual dimensions of the module
    width: number;
    height: number;
    depth: number;
  };
  index: number;              // Index of the module in the layout
  row: number;                // Row number (0-based)
  column: number;             // Column number (0-based)
}

export interface PVModuleSpec {
  name: string;             // Module name/model
  width: number;            // Width in meters
  height: number;           // Height in meters
  power: number;            // Power in watts
  efficiency: number;       // Efficiency percentage
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

  // PV module specific fields for individually drawn modules
  pvModuleSpec?: PVModuleSpec; // Specification of the PV module used
  powerOutput?: number;   // Power output in watts for this module
}
