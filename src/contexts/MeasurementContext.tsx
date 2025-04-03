import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { MeasurementMode, Measurement } from '@/types/measurements';

// Define the context type
interface MeasurementContextProps {
  measurements: Measurement[];
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>;
  currentPoints: THREE.Vector3[];
  setCurrentPoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>;
  activeMode: MeasurementMode;
  setActiveMode: React.Dispatch<React.SetStateAction<MeasurementMode>>;
  allMeasurementsVisible: boolean;
  setAllMeasurementsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  allLabelsVisible: boolean;
  setAllLabelsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  editMeasurementId: string | null;
  setEditMeasurementId: React.Dispatch<React.SetStateAction<string | null>>;
  editingPointIndex: number | null;
  setEditingPointIndex: React.Dispatch<React.SetStateAction<number | null>>;
  addPoint: (point: THREE.Vector3) => void;
  finalizeMeasurement: () => Measurement | undefined;
  clearCurrentPoints: () => void;
  clearMeasurements: () => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  toggleAllMeasurementsVisibility: () => void;
  toggleAllLabelsVisibility: () => void;
  toggleEditMode: (id: string | null) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  deleteMeasurement: (id: string) => void;
  deletePoint: (measurementId: string, pointIndex: number) => void;
  undoLastPoint: () => void;
  startPointEdit: (measurementId: string, pointIndex: number) => void;
  updateMeasurementPoint: (newPosition: THREE.Vector3) => void;
  cancelEditing: () => void;
  moveMeasurementUp: (id: string) => void;
  moveMeasurementDown: (id: string) => void;
}

// Create the context with a default value
const MeasurementContext = createContext<MeasurementContextProps | undefined>(
  undefined
);

// Create a provider component
interface MeasurementProviderProps {
  children: React.ReactNode;
}

export const MeasurementProvider: React.FC<MeasurementProviderProps> = ({
  children,
}) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none');
  const [allMeasurementsVisible, setAllMeasurementsVisible] =
    useState<boolean>(true);
  const [allLabelsVisible, setAllLabelsVisible] = useState<boolean>(true);
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(
    null
  );
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(
    null
  );

  // Function to add a point to the current measurement
  const addPoint = useCallback((point: THREE.Vector3) => {
    setCurrentPoints((prevPoints) => [...prevPoints, point]);
  }, []);

  // Function to clear the current points
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
  }, []);

  // Function to clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);

  // Function to toggle the visibility of a measurement
  const toggleMeasurementVisibility = useCallback((id: string) => {
    setMeasurements((prevMeasurements) =>
      prevMeasurements.map((measurement) =>
        measurement.id === id
          ? { ...measurement, visible: !measurement.visible }
          : measurement
      )
    );
  }, []);

  const toggleLabelVisibility = useCallback((id: string) => {
    setMeasurements((prevMeasurements) =>
      prevMeasurements.map((measurement) =>
        measurement.id === id
          ? { ...measurement, labelVisible: !measurement.labelVisible }
          : measurement
      )
    );
  }, []);

  // Function to toggle the visibility of all measurements
  const toggleAllMeasurementsVisibility = useCallback(() => {
    setAllMeasurementsVisible((prevVisibility) => !prevVisibility);
    setMeasurements((prevMeasurements) =>
      prevMeasurements.map((measurement) => ({
        ...measurement,
        visible: !allMeasurementsVisible,
      }))
    );
  }, [allMeasurementsVisible]);

  const toggleAllLabelsVisibility = useCallback(() => {
    setAllLabelsVisible((prevVisibility) => !prevVisibility);
    setMeasurements((prevMeasurements) =>
      prevMeasurements.map((measurement) => ({
        ...measurement,
        labelVisible: !allLabelsVisible,
      }))
    );
  }, [allLabelsVisible]);

  // Function to finalize a measurement
  const finalizeMeasurement = useCallback((): Measurement | undefined => {
    if (currentPoints.length < 2) {
      // A line requires at least two points
      console.warn('At least two points are required for a measurement.');
      return undefined;
    }

    let value = 0;
    let segments: { points: [Point, Point]; length: number; id: string }[] =
      [];

    if (activeMode === 'length') {
      // Calculate total length for 'length' mode
      for (let i = 0; i < currentPoints.length - 1; i++) {
        const p1 = currentPoints[i];
        const p2 = currentPoints[i + 1];
        const segmentLength = p1.distanceTo(p2);
        value += segmentLength;
        segments.push({
          id: uuidv4(),
          points: [
            { x: p1.x, y: p1.y, z: p1.z },
            { x: p2.x, y: p2.y, z: p2.z },
          ],
          length: segmentLength,
        });
      }
    } else if (activeMode === 'height') {
      // Calculate height as the difference between the first and last point
      const firstPoint = currentPoints[0];
      const lastPoint = currentPoints[currentPoints.length - 1];
      value = Math.abs(lastPoint.y - firstPoint.y); // Assuming Y-axis represents height
      segments = [
        {
          id: uuidv4(),
          points: [
            { x: firstPoint.x, y: firstPoint.y, z: firstPoint.z },
            { x: lastPoint.x, y: lastPoint.y, z: lastPoint.z },
          ],
          length: value,
        },
      ];
    } else if (activeMode === 'area') {
      if (currentPoints.length < 3) {
        console.warn('At least three points are required to define an area.');
        return undefined;
      }

      // Calculate area using the shoelace formula
      let area = 0;
      for (let i = 0; i < currentPoints.length; i++) {
        const p1 = currentPoints[i];
        const p2 = currentPoints[(i + 1) % currentPoints.length]; // Wrap around to the first point
        area += (p1.x * p2.z - p2.x * p1.z); // Use x and z coordinates
      }
      value = Math.abs(area / 2);

      // Create segments for each edge of the area
      for (let i = 0; i < currentPoints.length; i++) {
        const p1 = currentPoints[i];
        const p2 = currentPoints[(i + 1) % currentPoints.length]; // Wrap around to the first point
        const segmentLength = p1.distanceTo(p2);
        segments.push({
          id: uuidv4(),
          points: [
            { x: p1.x, y: p1.y, z: p1.z },
            { x: p2.x, y: p2.y, z: p2.z },
          ],
          length: segmentLength,
        });
      }
    } else if (
      activeMode === 'chimney' ||
      activeMode === 'skylight' ||
      activeMode === 'vent' ||
      activeMode === 'hook' ||
      activeMode === 'other' ||
      activeMode === 'ridge' ||
      activeMode === 'eave' ||
      activeMode === 'verge' ||
      activeMode === 'valley' ||
      activeMode === 'hip'
    ) {
      if (currentPoints.length < 3) {
        console.warn('At least three points are required to define this element.');
        return undefined;
      }

      // Calculate area using the shoelace formula
      let area = 0;
      for (let i = 0; i < currentPoints.length; i++) {
        const p1 = currentPoints[i];
        const p2 = currentPoints[(i + 1) % currentPoints.length]; // Wrap around to the first point
        area += p1.x * p2.z - p2.x * p1.z; // Use x and z coordinates
      }
      value = Math.abs(area / 2);

      // Create segments for each edge of the element
      for (let i = 0; i < currentPoints.length; i++) {
        const p1 = currentPoints[i];
        const p2 = currentPoints[(i + 1) % currentPoints.length]; // Wrap around to the first point
        const segmentLength = p1.distanceTo(p2);
        segments.push({
          id: uuidv4(),
          points: [
            { x: p1.x, y: p1.y, z: p1.z },
            { x: p2.x, y: p2.y, z: p2.z },
          ],
          length: segmentLength,
        });
      }
    } else if (activeMode === 'pvmodule' as MeasurementMode) {
      if (currentPoints.length < 3) {
        console.warn('At least three points are required to define a PV module area.');
        return undefined;
      }
    
      // Calculate area using the shoelace formula
      let area = 0;
      for (let i = 0; i < currentPoints.length; i++) {
        const p1 = currentPoints[i];
        const p2 = currentPoints[(i + 1) % currentPoints.length]; // Wrap around to the first point
        area += (p1.x * p2.z - p2.x * p1.z); // Use x and z coordinates
      }
      value = Math.abs(area / 2);
    
      // Create segments for each edge of the area
      for (let i = 0; i < currentPoints.length; i++) {
        const p1 = currentPoints[i];
        const p2 = currentPoints[(i + 1) % currentPoints.length]; // Wrap around to the first point
        const segmentLength = p1.distanceTo(p2);
        segments.push({
          id: uuidv4(),
          points: [
            { x: p1.x, y: p1.y, z: p1.z },
            { x: p2.x, y: p2.y, z: p2.z },
          ],
          length: segmentLength,
        });
      }
    }

    const newMeasurement: Measurement = {
      id: uuidv4(),
      type: activeMode,
      points: currentPoints.map((point) => ({
        x: point.x,
        y: point.y,
        z: point.z,
      })),
      value: value,
      visible: true,
      labelVisible: true,
      segments: segments,
    };

    setMeasurements((prevMeasurements) => [...prevMeasurements, newMeasurement]);
    clearCurrentPoints();
    return newMeasurement;
  }, [currentPoints, activeMode, clearCurrentPoints, setMeasurements]);

  const toggleEditMode = useCallback((id: string | null) => {
    setEditMeasurementId(id);
    setEditingPointIndex(null);
  }, []);

  const updateMeasurement = useCallback(
    (id: string, data: Partial<Measurement>) => {
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((measurement) =>
          measurement.id === id ? { ...measurement, ...data } : measurement
        )
      );
    },
    []
  );

  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements((prevMeasurements) =>
      prevMeasurements.filter((measurement) => measurement.id !== id)
    );
  }, []);

  const deletePoint = useCallback(
    (measurementId: string, pointIndex: number) => {
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((measurement) => {
          if (measurement.id === measurementId) {
            const updatedPoints = [...measurement.points];
            updatedPoints.splice(pointIndex, 1); // Remove 1 element at pointIndex
            return { ...measurement, points: updatedPoints };
          }
          return measurement;
        })
      );
    },
    []
  );

  const undoLastPoint = useCallback(() => {
    setCurrentPoints((prevPoints) => {
      const newPoints = [...prevPoints];
      newPoints.pop();
      return newPoints;
    });
  }, []);

  const startPointEdit = useCallback((measurementId: string, pointIndex: number) => {
    setEditMeasurementId(measurementId);
    setEditingPointIndex(pointIndex);
  }, []);

  const updateMeasurementPoint = useCallback((newPosition: THREE.Vector3) => {
    if (editMeasurementId !== null && editingPointIndex !== null) {
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((measurement) => {
          if (measurement.id === editMeasurementId) {
            const updatedPoints = [...measurement.points];
            updatedPoints[editingPointIndex] = {
              x: newPosition.x,
              y: newPosition.y,
              z: newPosition.z,
            };
            return { ...measurement, points: updatedPoints };
          }
          return measurement;
        })
      );
    }
  }, [editMeasurementId, editingPointIndex]);

  const cancelEditing = useCallback(() => {
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, []);

  const moveMeasurementUp = useCallback((id: string) => {
    setMeasurements((prevMeasurements) => {
      const index = prevMeasurements.findIndex((m) => m.id === id);
      if (index <= 0) return prevMeasurements; // Already at the top or not found

      const newMeasurements = [...prevMeasurements];
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[index - 1];
      newMeasurements[index - 1] = temp;

      return newMeasurements;
    });
  }, []);

  const moveMeasurementDown = useCallback((id: string) => {
    setMeasurements((prevMeasurements) => {
      const index = prevMeasurements.findIndex((m) => m.id === id);
      if (index < 0 || index >= prevMeasurements.length - 1)
        return prevMeasurements; // Not found or already at the bottom

      const newMeasurements = [...prevMeasurements];
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[index + 1];
      newMeasurements[index + 1] = temp;

      return newMeasurements;
    });
  }, []);

  // Provide the context value
  const value: MeasurementContextProps = {
    measurements,
    setMeasurements,
    currentPoints,
    setCurrentPoints,
    activeMode,
    setActiveMode,
    allMeasurementsVisible,
    setAllMeasurementsVisible,
    allLabelsVisible,
    setAllLabelsVisible,
    editMeasurementId,
    setEditMeasurementId,
    editingPointIndex,
    setEditingPointIndex,
    addPoint,
    finalizeMeasurement,
    clearCurrentPoints,
    clearMeasurements,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility,
    toggleEditMode,
    updateMeasurement,
    deleteMeasurement,
    deletePoint,
    undoLastPoint,
    startPointEdit,
    updateMeasurementPoint,
    cancelEditing,
    moveMeasurementUp,
    moveMeasurementDown,
  };

  return (
    <MeasurementContext.Provider value={value}>
      {children}
    </MeasurementContext.Provider>
  );
};

// Create a custom hook to use the context
export const useMeasurementContext = (): MeasurementContextProps => {
  const context = useContext(MeasurementContext);
  if (!context) {
    throw new Error(
      'useMeasurementContext must be used within a MeasurementProvider'
    );
  }
  return context;
};

// Re-export types
export type { MeasurementMode, Measurement } from '@/types/measurements';

