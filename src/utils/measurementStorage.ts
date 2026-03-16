import { supabase } from "@/integrations/supabase/client";
import { Measurement } from "@/types/measurements";

const FUNCTION_NAME = "measurement-storage";

interface SavedMeasurementEntry {
  id: string;
  project_id: number;
  task_id: string;
  task_name: string | null;
  project_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Serialize measurements for storage (strip non-serializable data like screenshots) */
function serializeMeasurements(measurements: Measurement[]) {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    measurements: measurements.map((m) => ({
      id: m.id,
      type: m.type,
      points: m.points,
      value: m.value,
      label: m.label,
      visible: m.visible,
      labelVisible: m.labelVisible,
      unit: m.unit,
      description: m.description,
      segments: m.segments,
      inclination: m.inclination,
      color: m.color,
      subType: m.subType,
      dimensions: m.dimensions,
      position: m.position,
      count: m.count,
      relatedMeasurements: m.relatedMeasurements,
      penetrationType: m.penetrationType,
      notes: m.notes,
      pvModuleInfo: m.pvModuleInfo
        ? {
            ...m.pvModuleInfo,
            // Strip visual-only data that can be regenerated
            modulePositions: m.pvModuleInfo.modulePositions,
            moduleCorners: m.pvModuleInfo.moduleCorners,
            removedModuleIndices: m.pvModuleInfo.removedModuleIndices,
            exclusionZones: m.pvModuleInfo.exclusionZones,
            gridOffsetU: m.pvModuleInfo.gridOffsetU,
            gridOffsetW: m.pvModuleInfo.gridOffsetW,
            gridRotation: m.pvModuleInfo.gridRotation,
          }
        : undefined,
      pvModuleSpec: m.pvModuleSpec,
      powerOutput: m.powerOutput,
    })),
  };
}

async function callEdgeFunction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body,
  });
  if (error) throw new Error(error.message || "Edge function error");
  // The function may return error in the body with non-200 status
  if (data?.error) {
    const err = new Error(data.message || data.error);
    (err as any).code = data.error;
    (err as any).count = data.count;
    throw err;
  }
  return data;
}

/** Save measurements for a specific task */
export async function saveMeasurements(
  token: string,
  projectId: number,
  taskId: string,
  measurements: Measurement[],
  taskName?: string,
  projectName?: string
): Promise<{ id: string; updated_at: string }> {
  const serialized = serializeMeasurements(measurements);
  return callEdgeFunction({
    action: "save",
    token,
    project_id: projectId,
    task_id: taskId,
    task_name: taskName,
    project_name: projectName,
    measurements: serialized,
  });
}

/** Load measurements for a specific task */
export async function loadMeasurements(
  token: string,
  projectId: number,
  taskId: string
): Promise<{ found: boolean; measurements?: Measurement[]; updated_at?: string }> {
  const data = await callEdgeFunction({
    action: "load",
    token,
    project_id: projectId,
    task_id: taskId,
  });
  if (!data.found) return { found: false };
  // Extract measurements from the stored format
  const stored = data.measurements;
  const list: Measurement[] = stored?.measurements || [];
  return { found: true, measurements: list, updated_at: data.updated_at };
}

/** Check if measurements exist for a specific task */
export async function checkSavedMeasurements(
  token: string,
  projectId: number,
  taskId: string
): Promise<{ exists: boolean; updated_at: string | null }> {
  return callEdgeFunction({
    action: "check",
    token,
    project_id: projectId,
    task_id: taskId,
  });
}

/** List all saved measurements for the current user */
export async function listSavedMeasurements(
  token: string
): Promise<{ items: SavedMeasurementEntry[]; count: number }> {
  return callEdgeFunction({
    action: "list",
    token,
  });
}

/** Delete saved measurements for a specific task */
export async function deleteSavedMeasurements(
  token: string,
  projectId: number,
  taskId: string
): Promise<void> {
  await callEdgeFunction({
    action: "delete",
    token,
    project_id: projectId,
    task_id: taskId,
  });
}
