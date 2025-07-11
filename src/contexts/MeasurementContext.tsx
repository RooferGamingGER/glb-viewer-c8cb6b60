import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MeasurementMode, Measurement, Point, Segment, PVMaterials } from '@/types/measurements';
import { useMeasurements } from '@/hooks/useMeasurements';
import { 
  isMeasurementType as checkMeasurementType, 
  ExtendedMeasurementMode,
  isMeasurementOfType,
  isValidPoint
} from '@/types/measurementTypes';

// Define the context type
interface MeasurementContextType {
  // State
  measurements: Measurement[];
  currentPoints: Point[];
  setCurrentPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  activeMode: MeasurementMode;
  editMeasurementId: string | null;
  editingPointIndex: number | null;
  allMeasurementsVisible: boolean;
  allLabelsVisible: boolean;
  calculatingMaterials: boolean;
  
  // Actions
  addPoint: (point: Point) => void;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  clearMeasurements: () => void;
  clearCurrentPoints: () => void;
  finalizeMeasurement: () => Measurement | undefined;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  toggleAllMeasurementsVisibility: () => void;
  toggleAllLabelsVisibility: () => void;
  toggleEditMode: (id: string) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  updateSegment: (measurementId: string, segmentId: string, segmentData: Partial<Segment>) => void;
  deleteMeasurement: (id: string) => void;
  deletePoint: (measurementId: string, pointIndex: number) => void;
  undoLastPoint: () => boolean;
  startPointEdit: (id: string, pointIndex: number) => void;
  updateMeasurementPoint: (measurementId: string, pointIndex: number, newPoint: Point) => void;
  cancelEditing: () => void;
  moveMeasurementUp: (id: string) => void;
  moveMeasurementDown: (id: string) => void;
  getRoofEdgeInfo: () => any;
  calculatePVMaterialsForMeasurement: (measurementId: string, inverterDistance?: number) => PVMaterials | undefined;
  findAndLinkSharedSegments: (updatedMeasurements: Measurement[]) => Measurement[];
  
  // Visual state update function
  setUpdateVisualState: (fn: (updatedMeasurements: Measurement[], labelVisibility: boolean) => void) => void;
  
  // Utilities
  getNearestPointIndex: (points: Point[], point: Point, threshold?: number) => number;
  calculateSegmentLength: (segment: Segment) => number;
}

// Create the context with a default value
const MeasurementContext = createContext<MeasurementContextType | undefined>(undefined);

// Provider component
export const MeasurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const measurementUtils = useMeasurements();
  
  return (
    <MeasurementContext.Provider value={measurementUtils}>
      {children}
    </MeasurementContext.Provider>
  );
};

// Custom hook to use the measurement context
export const useMeasurementContext = (): MeasurementContextType => {
  const context = useContext(MeasurementContext);
  
  if (context === undefined) {
    throw new Error('useMeasurementContext must be used within a MeasurementProvider');
  }
  
  return context;
};

// Helper function to get display name for measurement type
export const getMeasurementTypeDisplayName = (type: MeasurementMode | ExtendedMeasurementMode): string => {
  const displayNames: Record<string, string> = {
    'length': 'Länge',
    'height': 'Höhe',
    'area': 'Fläche',
    'deductionarea': 'Abzugsfläche', // Added new deduction area display name
    'chimney': 'Kamin',
    'skylight': 'Dachfenster',
    'solar': 'Solaranlage',
    'pvmodule': 'PV-Modul',
    'vent': 'Lüfter',
    'hook': 'Dachhaken',
    'other': 'Sonstige',
    'ridge': 'First',
    'eave': 'Traufe',
    'verge': 'Ortgang',
    'valley': 'Kehle',
    'hip': 'Grat',
    'none': 'Keine'
  };
  
  return displayNames[type] || type;
};

// Helper function to check if a measurement is a roof element
export const isRoofElement = (type: MeasurementMode | ExtendedMeasurementMode): boolean => {
  return [
    'chimney', 'skylight', 'solar', 'vent', 'hook', 'other', 'pvmodule'
  ].includes(type as string);
};

// Helper function to check if a measurement is a roof edge
export const isRoofEdge = (type: MeasurementMode | ExtendedMeasurementMode): boolean => {
  return [
    'ridge', 'eave', 'verge', 'valley', 'hip'
  ].includes(type as string);
};

// Helper function to check if a measurement is a standard measurement
export const isStandardMeasurement = (type: MeasurementMode | ExtendedMeasurementMode): boolean => {
  return ['length', 'height', 'area', 'deductionarea'].includes(type as string); // Added deductionarea
};

// Helper function to check if a measurement is a point-based element
export const isPointElement = (type: MeasurementMode | ExtendedMeasurementMode): boolean => {
  return ['vent', 'hook', 'other'].includes(type as string);
};

// Helper function to check if a measurement is a quadrilateral element
export const isQuadrilateralElement = (type: MeasurementMode | ExtendedMeasurementMode): boolean => {
  return ['chimney', 'skylight', 'pvmodule'].includes(type as string);
};

// Helper function to check if a measurement is an area-based element
export const isAreaElement = (type: MeasurementMode | ExtendedMeasurementMode): boolean => {
  return ['area', 'solar', 'deductionarea'].includes(type as string); // Added deductionarea
};

// Helper function to check if a measurement is a line-based element
export const isLineElement = (type: MeasurementMode | ExtendedMeasurementMode): boolean => {
  return ['length', 'height', 'ridge', 'eave', 'verge', 'valley', 'hip'].includes(type as string);
};

// Helper function to get the required number of points for a measurement type
export const getRequiredPointsForType = (type: MeasurementMode | ExtendedMeasurementMode): number => {
  if (isPointElement(type)) return 1;
  if (isLineElement(type)) return 2;
  if (isQuadrilateralElement(type)) return 4;
  if (isAreaElement(type)) return 3;
  return 0;
};

// Helper function to check if a measurement type is valid for a given number of points
export const isValidPointCountForType = (type: MeasurementMode | ExtendedMeasurementMode, pointCount: number): boolean => {
  const requiredPoints = getRequiredPointsForType(type);
  
  if (requiredPoints === 0) return true;
  if (isAreaElement(type)) return pointCount >= requiredPoints;
  if (isQuadrilateralElement(type)) return pointCount === requiredPoints;
  return pointCount >= requiredPoints;
};

// Helper function to get the color for a measurement type
export const getMeasurementTypeColor = (type: MeasurementMode | ExtendedMeasurementMode): string => {
  const colors: Record<string, string> = {
    'length': '#3b82f6', // blue-500
    'height': '#10b981', // emerald-500
    'area': '#8b5cf6', // violet-500
    'deductionarea': '#F97316', // orange-500 - distinct color for deduction areas
    'chimney': '#ef4444', // red-500
    'skylight': '#f59e0b', // amber-500
    'solar': '#06b6d4', // cyan-500
    'pvmodule': '#06b6d4', // cyan-500
    'vent': '#ec4899', // pink-500
    'hook': '#f97316', // orange-500
    'other': '#6366f1', // indigo-500
    'ridge': '#0ea5e9', // sky-500
    'eave': '#14b8a6', // teal-500
    'verge': '#a855f7', // purple-500
    'valley': '#f43f5e', // rose-500
    'hip': '#84cc16', // lime-500
  };
  
  return colors[type] || '#6b7280'; // gray-500 as default
};
