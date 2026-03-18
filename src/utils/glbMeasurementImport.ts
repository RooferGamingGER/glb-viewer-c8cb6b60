import * as THREE from 'three';
import { Measurement, Point, Segment } from '@/types/measurements';
import { getOriginalGLBBlob } from '@/utils/glbDirectManipulation';
import { generateSegments, calculateArea } from '@/utils/measurementCalculations';
import type { EmbeddedMeasurement } from '@/utils/glbMeasurementEmbed';
// Minimal GLB structures
interface GLBHeader { magic: number; version: number; length: number; }
interface GLBChunk { length: number; type: number; data: ArrayBuffer; }

const GLB_MAGIC = 0x46546c67; // glTF
const JSON_CHUNK_TYPE = 0x4e4f534a; // JSON

function parseGLBHeader(dataView: DataView): GLBHeader {
  return {
    magic: dataView.getUint32(0, true),
    version: dataView.getUint32(4, true),
    length: dataView.getUint32(8, true)
  };
}

function parseGLBChunks(dataView: DataView, header: GLBHeader): GLBChunk[] {
  const chunks: GLBChunk[] = [];
  let offset = 12;
  while (offset < header.length) {
    const length = dataView.getUint32(offset, true);
    const type = dataView.getUint32(offset + 4, true);
    const data = dataView.buffer.slice(offset + 8, offset + 8 + length) as ArrayBuffer;
    chunks.push({ length, type, data });
    offset += 8 + Math.ceil(length / 4) * 4;
  }
  return chunks;
}

function findModelRoot(scene: THREE.Scene | THREE.Group): THREE.Object3D | null {
  let root: THREE.Object3D | null = null;
  scene.traverse(obj => {
    if (!root && obj.userData && obj.userData.originalFile instanceof Blob) {
      root = obj;
    }
  });
  return root;
}

function toWorldPoints(pointsLocal: Point[], modelRoot: THREE.Object3D): Point[] {
  return (pointsLocal || []).map(p => {
    const v = new THREE.Vector3(p.x, p.y, p.z);
    const world = modelRoot.localToWorld(v.clone());
    return { x: world.x, y: world.y, z: world.z };
  });
}

function segmentsToWorld(segments: Segment[] | undefined, modelRoot: THREE.Object3D): Segment[] | undefined {
  if (!segments || segments.length === 0) return undefined;
  return segments.map(seg => ({
    ...seg,
    points: [
      toWorldPoints([seg.points[0]], modelRoot)[0],
      toWorldPoints([seg.points[1]], modelRoot)[0],
    ] as [Point, Point],
  }));
}

export async function importMeasurementsFromGLB(
  scene: THREE.Scene | THREE.Group
): Promise<Measurement[] | null> {
  try {
    const originalBlob = await getOriginalGLBBlob(scene);
    if (!originalBlob) return null;

    const buffer = await originalBlob.arrayBuffer();
    const view = new DataView(buffer);
    const header = parseGLBHeader(view);
    if (header.magic !== GLB_MAGIC) return null;

    const chunks = parseGLBChunks(view, header);
    const jsonChunk = chunks.find(c => c.type === JSON_CHUNK_TYPE);
    if (!jsonChunk) return null;

    const jsonString = new TextDecoder().decode(jsonChunk.data);
    const gltf: any = JSON.parse(jsonString);

    const meta = gltf?.asset?.extras?.measurementsV1;
    if (!meta || !Array.isArray(meta.items) || meta.coordinateSpace !== 'model-local') {
      return null;
    }

    const modelRoot = findModelRoot(scene);
    if (!modelRoot) return null;

    const imported: Measurement[] = meta.items.map((item: EmbeddedMeasurement & { pointsLocal?: Point[] }, idx: number) => {
      const id = typeof item.id === 'string' ? item.id : `imp_${idx}`;
      const type = item.type as Measurement['type'];
      const points = toWorldPoints(item.pointsLocal || [], modelRoot);

      // Restore segments: prefer embedded segments (converted to world), fallback to generated
      let segments: Segment[] | undefined = undefined;
      if (item.segments && item.segments.length > 0) {
        segments = segmentsToWorld(item.segments, modelRoot);
      } else if ((type === 'area' || type === 'solar') && points.length >= 2) {
        segments = generateSegments(points);
      }

      // Compute value if missing
      let value: number | undefined = typeof item.value === 'number' ? item.value : undefined;
      if ((type === 'area' || type === 'solar') && points.length >= 3 && value === undefined) {
        value = calculateArea(points);
      }

      const measurement: Measurement = {
        id,
        type,
        points,
        segments,
        label: item.label,
        visible: item.visible !== false,
        labelVisible: item.labelVisible !== false,
        color: item.color,
        value,
        // Restore full project data
        subType: item.subType,
        dimensions: item.dimensions,
        penetrationType: item.penetrationType,
        notes: item.notes,
        count: item.count,
        pvModuleInfo: item.pvModuleInfo,
        pvModuleSpec: item.pvModuleSpec,
        powerOutput: item.powerOutput,
        relatedMeasurements: item.relatedMeasurements,
      } as Measurement;
      return measurement;
    });

    return imported;
  } catch (e) {
    console.warn('Failed to import measurements from GLB:', e);
    return null;
  }
}
