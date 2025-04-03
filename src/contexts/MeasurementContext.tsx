import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';
import {
  Measurement,
  Point,
  MeasurementMode,
  Segment,
  PVModuleInfo,
} from '@/types/measurements';

// Define the context type
type MeasurementContextType = {
  measurements: Measurement[];
  currentPoints: Point[];
  activeMode: MeasurementMode;
  allMeasurementsVisible: boolean;
  allLabelsVisible: boolean;
  editMeasurementId: string | null;
  editingPointIndex: number | null;
  addPoint: (point: Point) => void;
  toggleMeasurementTool: (tool: MeasurementMode) => void;
  clearMeasurements: () => void;
  clearCurrentPoints: () => void;
  finalizeMeasurement: () => Measurement | undefined;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  toggleAllMeasurementsVisibility: () => void;
  toggleAllLabelsVisibility: () => void;
  toggleEditMode: (id: string | null) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  updateSegment: (measurementId: string, segmentId: string, segmentData: Partial<Segment>) => void;
  deleteMeasurement: (id: string) => void;
  deletePoint: (id: string, pointIndex: number) => void;
  undoLastPoint: () => void;
  startPointEdit: (id: string, index: number) => void;
  cancelEditing: () => void;
  updateMeasurementPoint: (id: string, index: number, point: Point) => void;
  moveMeasurementUp: (id: string) => void;
  moveMeasurementDown: (id: string) => void;
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>;
  setCurrentPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  setActiveMode: React.Dispatch<React.SetStateAction<MeasurementMode>>;
  setAllMeasurementsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setAllLabelsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setEditMeasurementId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingPointIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setUpdateVisualState: React.Dispatch<React.SetStateAction<(updatedMeasurements: Measurement[], labelVisibility: boolean) => void>>;
};

// Create the context with a default value
const MeasurementContext = createContext<MeasurementContextType>({
  measurements: [],
  currentPoints: [],
  activeMode: 'none',
  allMeasurementsVisible: true,
  allLabelsVisible: true,
  editMeasurementId: null,
  editingPointIndex: null,
  addPoint: () => {},
  toggleMeasurementTool: () => {},
  clearMeasurements: () => {},
  clearCurrentPoints: () => {},
  finalizeMeasurement: () => undefined,
  toggleMeasurementVisibility: () => {},
  toggleLabelVisibility: () => {},
  toggleAllMeasurementsVisibility: () => {},
  toggleAllLabelsVisibility: () => {},
  toggleEditMode: () => {},
  updateMeasurement: () => {},
  updateSegment: () => {},
  deleteMeasurement: () => {},
  deletePoint: () => {},
  undoLastPoint: () => {},
  startPointEdit: () => {},
  cancelEditing: () => {},
  updateMeasurementPoint: () => {},
  moveMeasurementUp: () => {},
  moveMeasurementDown: () => {},
  setMeasurements: () => {},
  setCurrentPoints: () => {},
  setActiveMode: () => {},
  setAllMeasurementsVisible: () => {},
  setAllLabelsVisible: () => {},
  setEditMeasurementId: () => {},
  setEditingPointIndex: () => {},
  setUpdateVisualState: () => {}
});

// Create a provider component
type MeasurementProviderProps = {
  children: React.ReactNode;
};

export const MeasurementProvider: React.FC<MeasurementProviderProps> = ({
  children,
}) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
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
  const [updateVisualState, setUpdateVisualState] = useState<(updatedMeasurements: Measurement[], labelVisibility: boolean) => void>(() => {});

  // Function to add a new point to currentPoints
  const addPoint = useCallback(
    (point: Point) => {
      setCurrentPoints((prevPoints) => [...prevPoints, point]);
    },
    [setCurrentPoints]
  );

  // Function to toggle the active measurement tool
  const toggleMeasurementTool = useCallback(
    (tool: MeasurementMode) => {
      setActiveMode(tool);
      clearCurrentPoints();
      setEditMeasurementId(null);
      setEditingPointIndex(null);
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((m) => ({ ...m, isEditing: false }))
      );
    },
    [setActiveMode, clearCurrentPoints, setEditMeasurementId, setEditingPointIndex, setMeasurements]
  );

  // Function to clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, [setMeasurements]);

  // Function to clear current points
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
  }, [setCurrentPoints]);

  // Function to finalize a measurement
  const finalizeMeasurement = useCallback(() => {
    if (currentPoints.length === 0) return;

    const id = uuidv4();
    let newMeasurement: Measurement = {
      id,
      type: activeMode,
      points: currentPoints,
      visible: true,
      labelVisible: true,
      isEditing: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // For area measurements, create segments
    if (activeMode === 'area' || activeMode === 'solar') {
      const segments: Segment[] = [];
      for (let i = 0; i < currentPoints.length; i++) {
        const startPoint = currentPoints[i];
        const endPoint = currentPoints[(i + 1) % currentPoints.length]; // Loop back to the first point
        segments.push({
          id: uuidv4(),
          points: [startPoint, endPoint],
          type: 'edge',
          shared: false,
          isOriginal: true,
          sharedWithSegmentId: null,
        });
      }
      newMeasurement = { ...newMeasurement, segments };
    }

    setMeasurements((prevMeasurements) => [...prevMeasurements, newMeasurement]);
    clearCurrentPoints();
    return newMeasurement;
  }, [activeMode, currentPoints, setMeasurements, clearCurrentPoints]);

  // Function to toggle the visibility of a measurement
  const toggleMeasurementVisibility = useCallback(
    (id: string) => {
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((m) =>
          m.id === id ? { ...m, visible: !m.visible } : m
        )
      );
    },
    [setMeasurements]
  );

  // Function to toggle the visibility of a measurement label
  const toggleLabelVisibility = useCallback(
    (id: string) => {
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((m) =>
          m.id === id ? { ...m, labelVisible: !m.labelVisible } : m
        )
      );
    },
    [setMeasurements]
  );

  // Function to toggle the visibility of all measurements
  const toggleAllMeasurementsVisibility = useCallback(() => {
    setAllMeasurementsVisible((prev) => !prev);
    setMeasurements((prevMeasurements) =>
      prevMeasurements.map((m) => ({ ...m, visible: !allMeasurementsVisible }))
    );
  }, [setMeasurements, allMeasurementsVisible, setAllMeasurementsVisible]);

  // Function to toggle the visibility of all labels
  const toggleAllLabelsVisibility = useCallback(() => {
    setAllLabelsVisible((prev) => !prev);
    setMeasurements((prevMeasurements) =>
      prevMeasurements.map((m) => ({ ...m, labelVisible: !allLabelsVisible }))
    );
  }, [setMeasurements, allLabelsVisible, setAllLabelsVisible]);

  // Function to toggle edit mode for a measurement
  const toggleEditMode = useCallback(
    (id: string | null) => {
      setEditMeasurementId(id);
      setEditingPointIndex(null);
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((m) => ({ ...m, isEditing: m.id === id }))
      );
    },
    [setEditMeasurementId, setEditingPointIndex, setMeasurements]
  );

  // Function to update a measurement
  const updateMeasurement = useCallback(
    (id: string, data: Partial<Measurement>) => {
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((m) => (m.id === id ? { ...m, ...data } : m))
      );
    },
    [setMeasurements]
  );

  // Function to update a segment
  const updateSegment = useCallback(
    (measurementId: string, segmentId: string, segmentData: Partial<Segment>) => {
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((m) => {
          if (m.id === measurementId && m.segments) {
            return {
              ...m,
              segments: m.segments.map((s) =>
                s.id === segmentId ? { ...s, ...segmentData } : s
              ),
            };
          }
          return m;
        })
      );
    },
    [setMeasurements]
  );

  // Function to delete a measurement
  const deleteMeasurement = useCallback(
    (id: string) => {
      setMeasurements((prevMeasurements) =>
        prevMeasurements.filter((m) => m.id !== id)
      );
      setEditMeasurementId(null);
      setEditingPointIndex(null);
    },
    [setMeasurements, setEditMeasurementId, setEditingPointIndex]
  );

  // Function to delete a point from a measurement
  const deletePoint = useCallback(
    (id: string, pointIndex: number) => {
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((m) => {
          if (m.id === id && m.points) {
            const updatedPoints = [...m.points];
            updatedPoints.splice(pointIndex, 1);
            return { ...m, points: updatedPoints };
          }
          return m;
        })
      );
    },
    [setMeasurements]
  );

  // Function to undo the last added point
  const undoLastPoint = useCallback(() => {
    setCurrentPoints((prevPoints) => {
      const newPoints = [...prevPoints];
      newPoints.pop();
      return newPoints;
    });
  }, [setCurrentPoints]);

  // Function to start editing a point
  const startPointEdit = useCallback(
    (id: string, index: number) => {
      setEditMeasurementId(id);
      setEditingPointIndex(index);
    },
    [setEditMeasurementId, setEditingPointIndex]
  );

  // Function to cancel editing
  const cancelEditing = useCallback(() => {
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, [setEditMeasurementId, setEditingPointIndex]);

  // Function to update a measurement point
  const updateMeasurementPoint = useCallback(
    (id: string, index: number, point: Point) => {
      setMeasurements((prevMeasurements) =>
        prevMeasurements.map((m) => {
          if (m.id === id && m.points) {
            const updatedPoints = [...m.points];
            updatedPoints[index] = point;
            return { ...m, points: updatedPoints };
          }
          return m;
        })
      );
    },
    [setMeasurements]
  );

  // Function to move a measurement up in the array
  const moveMeasurementUp = useCallback((id: string) => {
    setMeasurements((prevMeasurements) => {
      const index = prevMeasurements.findIndex((m) => m.id === id);
      if (index <= 0) return prevMeasurements;
      const newMeasurements = [...prevMeasurements];
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[index - 1];
      newMeasurements[index - 1] = temp;
      return newMeasurements;
    });
  }, [setMeasurements]);

  // Function to move a measurement down in the array
  const moveMeasurementDown = useCallback((id: string) => {
    setMeasurements((prevMeasurements) => {
      const index = prevMeasurements.findIndex((m) => m.id === id);
      if (index < 0 || index >= prevMeasurements.length - 1) return prevMeasurements;
      const newMeasurements = [...prevMeasurements];
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[index + 1];
      newMeasurements[index + 1] = temp;
      return newMeasurements;
    });
  }, [setMeasurements]);

  const value: MeasurementContextType = {
    measurements,
    currentPoints,
    activeMode,
    allMeasurementsVisible,
    allLabelsVisible,
    editMeasurementId,
    editingPointIndex,
    addPoint,
    toggleMeasurementTool,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility,
    toggleEditMode,
    updateMeasurement,
    updateSegment,
    deleteMeasurement,
    deletePoint,
    undoLastPoint,
    startPointEdit,
    cancelEditing,
    updateMeasurementPoint,
    moveMeasurementUp,
    moveMeasurementDown,
    setMeasurements,
    setCurrentPoints,
    setActiveMode,
    setAllMeasurementsVisible,
    setAllLabelsVisible,
    setEditMeasurementId,
    setEditingPointIndex,
    setUpdateVisualState
  };

  return (
    <MeasurementContext.Provider value={value}>
      {children}
    </MeasurementContext.Provider>
  );
};

// Create a hook to use the measurement context
export const useMeasurementContext = () => useContext(MeasurementContext);
