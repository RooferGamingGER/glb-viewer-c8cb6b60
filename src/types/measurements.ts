
import * as THREE from 'three';

export type MeasurementMode = 
  | 'length' 
  | 'height' 
  | 'area'
  | 'deductionarea' // Added new deduction area type
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
  type?: 'first' | 'grat' | 'kehle' | 'traufe' | 'ortgang' | 'custom' | 'ridge' | 'hip' | 'valley' | 'eave' | 'verge' | 'anschluss' | 'verfallung';
  shared?: boolean;            // Indicates if this segment is shared with another measurement
  sharedWithSegmentId?: string; // ID of the segment this is shared with
  isOriginal?: boolean;        // For shared segments, indicates if this is the "original" one
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
  pvMaterials?: PVMaterials;  // Materials needed for the PV system
  roofAzimuth?: number;       // Azimuth angle in degrees (0=North, 90=East, 180=South, 270=West)
  roofDirection?: string;     // Cardinal direction (N, NE, E, SE, S, SW, W, NW)
  roofInclination?: number;   // Roof inclination in degrees 
  yieldFactor?: number;       // Yield factor in kWh/kWp per year
  points?: Point[];           // Store the original points used for the solar area calculation
  modulePositions?: Point[];  // Array of position points for each module (center points)
  moduleCorners?: Point[][];  // Array of corner points for each module (4 corners per module)
  removedModuleIndices?: number[]; // Indices of modules removed by user click
  moduleVisuals?: {           // Visual properties for module rendering
    frameBorder?: number;     // Frame border width in meters
    frameColor?: number;      // Frame color (hex)
    panelColor?: number;      // Panel color (hex)
    cellRows?: number;        // Number of cell rows in module
    cellColumns?: number;     // Number of cell columns in module
    cellSpacing?: number;     // Spacing between cells in meters
    cellColor?: number;       // Cell color (hex)
    busbarCount?: number;     // Number of busbars per cell
  };
  exclusionZones?: Point[][];  // Polygons from roof elements (chimneys, skylights, etc.) to exclude from module placement
  gridOffsetU?: number;        // Grid offset along primary axis (v1) in meters
  gridOffsetW?: number;        // Grid offset along secondary axis (v2) in meters
  gridRotation?: number;       // Grid rotation in degrees around grid center
  roofType?: 'pitched' | 'flat';           // Steildach oder Flachdach (auto-erkannt bei < 5°)
  flatRoofLayout?: 'south' | 'east-west';  // Belegungsvariante bei Flachdach
  tiltAngle?: number;                       // Aufständerungswinkel in Grad
  rowSpacing?: number;                      // Berechneter Reihenabstand in Metern (nur Anzeige)
  flatRoofEdgeDistance?: number;            // Randabstand bei Flachdach (Standard: 0.50m)
  ewPairGap?: number;                       // Abstand zwischen O/W-Feldern (0.50 oder 0.60m)
  northAngle?: number;                      // Nordrichtung im Modell in Grad (0 = +Z ist Nord, Standard für UTM-Modelle)
  maintenancePathWidth?: number;            // Breite des zentralen Wartungsgangs in Metern (Standard: 0.80m)
}

export interface PVModuleSpec {
  name: string;             // Module name/model
  width: number;            // Width in meters
  height: number;           // Height in meters
  power: number;            // Power in watts
  efficiency: number;       // Efficiency percentage
  voc?: number;             // Open-circuit voltage in V (optional, default ~41.8V)
  isc?: number;             // Short-circuit current in A (optional)
  tempCoeff?: number;       // Temperature coefficient %/°C (optional)
}

export interface PVMountingSystem {
  railLength: number;         // Total length of mounting rails in meters
  roofHookCount: number;      // Number of roof hooks needed
  middleClampCount: number;   // Number of middle clamps
  endClampCount: number;      // Number of end clamps
  railConnectorCount: number; // Number of rail connectors
}

export interface PVElectricalSystem {
  stringCableLength: number;  // Total length of string cables in meters
  mainCableLength: number;    // Length of main DC cables in meters
  acCableLength: number;      // Length of AC cables in meters
  connectorPairCount: number; // Number of MC4 connector pairs
  inverterCount: number;      // Number of inverters needed
  inverterPower: number;      // Power rating of inverter(s) in kW
  stringCount: number;        // Number of strings
  modulesPerString: number;   // Modules per string
}

export interface PVMaterials {
  totalModuleCount: number;     // Total number of modules
  totalPower: number;           // Total power in kWp
  moduleSpec: PVModuleSpec;     // Module specification
  mountingSystem: PVMountingSystem;     // Mounting system components
  electricalSystem: PVElectricalSystem; // Electrical system components
  includesSurgeProtection: boolean;     // Whether surge protection is included
  includesMonitoringSystem: boolean;    // Whether monitoring system is included
  notes: string[];                      // Additional notes or recommendations
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
  color?: string;      // Add color property for visualization
  
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
  pvSolarLayout?: string; // Pre-rendered base64 solar layout for PDF export
  
  customScreenshots?: string[];  // Array of base64 data URLs for custom screenshots
  
  pvModuleInfo?: PVModuleInfo; // Information about PV module placement

  pvModuleSpec?: PVModuleSpec; // Specification of the PV module used
  powerOutput?: number;   // Power output in watts for this module
}
