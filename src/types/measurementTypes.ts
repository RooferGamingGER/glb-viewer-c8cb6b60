
import { MeasurementMode, Point, Measurement, Segment, PVMaterials } from './measurements';

// Helper function to safely check measurement types, including 'pvmodule'
export const isMeasurementType = (currentMode: MeasurementMode, typeToCheck: string): boolean => {
  // This function safely checks if a mode matches a type, handling type incompatibilities
  return currentMode === typeToCheck as MeasurementMode;
};

// This type definition ensures 'pvmodule' is included in MeasurementMode
export type ExtendedMeasurementMode = MeasurementMode | 'pvmodule';

// Helper function to check if a given point is valid
export const isValidPoint = (point: Point): boolean => {
  return (
    point !== null &&
    typeof point === 'object' &&
    typeof point.x === 'number' &&
    typeof point.y === 'number' &&
    typeof point.z === 'number'
  );
};
