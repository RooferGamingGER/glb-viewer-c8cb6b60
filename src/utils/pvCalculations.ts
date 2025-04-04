import * as THREE from 'three';
import { Point, PVModuleInfo, PVModuleSpec, Measurement, PVMaterials, PVMountingSystem, PVElectricalSystem } from '@/types/measurements';
import { calculatePolygonArea, calculateQuadrilateralDimensions, generateSegments } from './measurementCalculations';
import { findLargestRectangle } from './rectangleFinder';

// Default PV module dimensions in meters
export const DEFAULT_MODULE_WIDTH = 1.041;
export const DEFAULT_MODULE_HEIGHT = 1.767;

// Default distances in meters
export const DEFAULT_EDGE_DISTANCE = 0.1;  // 10cm from roof edge
export const DEFAULT_MODULE_SPACING = 0.05;  // 5cm between modules

// Common PV module templates that users can select from
export const PV_MODULE_TEMPLATES: PVModuleSpec[] = [
  {
    name: "Standard (425W)",
    width: 1.04,
    height: 1.77,
    power: 425,
    efficiency: 21.0
  }
];

// Default values for material calculations
export const DEFAULT_ROOF_HOOK_SPACING = 0.8; // meters (80cm between hooks)
export const DEFAULT_CABLE_PER_MODULE = 1.2; // meters of string cable per module
export const DEFAULT_INVERTER_SIZING_FACTOR = 0.85; // Inverter should be 85% of module power
export const DEFAULT_MODULES_PER_STRING = 10; // Default modules per string

// Constants for material calculation
const RAIL_LENGTH_PER_MODULE = 0.35; // meters of rail per module (approximation)
const RAIL_STANDARD_LENGTH = 3.0; // Standard rail length in meters
const END_CLAMPS_PER_ARRAY = 4; // 4 end clamps per array (one at each corner)

// Constants for yield calculation
const ANNUAL_YIELD_FACTOR_DEFAULT = 950; // kWh/kWp (estimated annual yield per kWp in Germany)
const YIELD_FACTORS: Record<string, number> = {
  'hochformat': 950, // Portrait orientation
  'querformat': 970, // Landscape orientation
  'default': 950
};

[... rest of the code from the original file ...]
