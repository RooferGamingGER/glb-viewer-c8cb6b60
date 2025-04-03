
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

// Helper function to safely check if a measurement is of a certain type
export const isMeasurementOfType = (measurement: Measurement, type: MeasurementMode | ExtendedMeasurementMode): boolean => {
  return measurement.type === type;
};

// Utility to check if a return value from finalizeMeasurement is a measurement
export const isMeasurement = (value: any): value is Measurement => {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    Array.isArray(value.points)
  );
};
