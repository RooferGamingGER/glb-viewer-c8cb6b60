import * as THREE from 'three';
import { Measurement, Point } from '@/types/measurements';
import { getOriginalGLBBlob } from '@/utils/glbDirectManipulation';

// Minimal GLB structures
interface GLBHeader { magic: number; version: number; length: number; }
interface GLBChunk { length: number; type: number; data: ArrayBuffer; }

const GLB_MAGIC = 0x46546c67; // glTF
const JSON_CHUNK_TYPE = 0x4e4f534a; // JSON
const BIN_CHUNK_TYPE = 0x004e4942; // BIN\0

export interface EmbedProgress {
  (progress: number, message?: string): void;
}

export type EmbeddedMeasurement = {
  id: string;
  type: Measurement['type'];
  label?: string;
  visible?: boolean;
  labelVisible?: boolean;
  color?: string;
  value?: number;
  pointsLocal: Point[];
};

// Parse GLB header
function parseGLBHeader(dataView: DataView): GLBHeader {
  return {
    magic: dataView.getUint32(0, true),
    version: dataView.getUint32(4, true),
    length: dataView.getUint32(8, true)
  };
}

// Parse GLB chunks
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

// Rebuild GLB with provided JSON and original BIN (unchanged)
function rebuildGLB(jsonBuffer: ArrayBuffer, binBuffer?: ArrayBuffer): ArrayBuffer {
  const jsonLength = jsonBuffer.byteLength;
  const binLength = binBuffer ? binBuffer.byteLength : 0;
  const totalLength = 12 + 8 + jsonLength + (binLength > 0 ? 8 + binLength : 0);
  const glb = new ArrayBuffer(totalLength);
  const view = new DataView(glb);
  let offset = 0;

  view.setUint32(offset, GLB_MAGIC, true); offset += 4;
  view.setUint32(offset, 2, true); offset += 4;
  view.setUint32(offset, totalLength, true); offset += 4;

  view.setUint32(offset, jsonLength, true); offset += 4;
  view.setUint32(offset, JSON_CHUNK_TYPE, true); offset += 4;
  new Uint8Array(glb, offset, jsonLength).set(new Uint8Array(jsonBuffer));
  offset += jsonLength;

  if (binBuffer && binLength > 0) {
    view.setUint32(offset, binLength, true); offset += 4;
    view.setUint32(offset, BIN_CHUNK_TYPE, true); offset += 4;
    new Uint8Array(glb, offset, binLength).set(new Uint8Array(binBuffer));
  }

  return glb;
}

// Transform points from world space to model local space
function toLocalPoints(points: Point[], modelRoot: THREE.Object3D): Point[] {
  return points.map(p => {
    const v = new THREE.Vector3(p.x, p.y, p.z);
    const local = modelRoot.worldToLocal(v.clone());
    return { x: local.x, y: local.y, z: local.z };
  });
}

// Build compact embedded measurements block
function buildEmbeddedMeasurements(measurements: Measurement[], modelRoot: THREE.Object3D): EmbeddedMeasurement[] {
  return measurements.map(m => ({
    id: m.id,
    type: m.type,
    label: m.label,
    visible: m.visible !== false,
    labelVisible: m.labelVisible !== false,
    color: m.color,
    value: m.value,
    pointsLocal: toLocalPoints(m.points || [], modelRoot)
  }));
}

// Find the model root (object that carries the originalFile userData)
function findModelRoot(scene: THREE.Scene | THREE.Group): THREE.Object3D | null {
  let root: THREE.Object3D | null = null;
  scene.traverse(obj => {
    if (!root && obj.userData && obj.userData.originalFile instanceof Blob) {
      root = obj;
    }
  });
  return root;
}

/**
 * Embed measurements as JSON metadata (asset.extras.measurements) into the original GLB.
 * Does not modify existing meshes/materials/geometry. BIN chunk stays untouched.
 */
export async function exportOriginalGLBWithMeasurements(
  scene: THREE.Scene | THREE.Group,
  measurements: Measurement[],
  fileName: string = 'model_with_measurements.glb',
  onProgress?: EmbedProgress
): Promise<string> {
  onProgress?.(5, 'Suche Originaldatei');

  const originalBlob = await getOriginalGLBBlob(scene);
  if (!originalBlob) {
    throw new Error('Originale GLB-Datei nicht gefunden. Bitte Modell erneut laden.');
  }

  const modelRoot = findModelRoot(scene);
  if (!modelRoot) {
    throw new Error('Modellwurzel nicht gefunden.');
  }

  onProgress?.(15, 'Lese GLB');
  const buffer = await originalBlob.arrayBuffer();
  const view = new DataView(buffer);
  const header = parseGLBHeader(view);
  if (header.magic !== GLB_MAGIC) {
    throw new Error('Ungültiges GLB-Format');
  }

  const chunks = parseGLBChunks(view, header);
  const jsonChunk = chunks.find(c => c.type === JSON_CHUNK_TYPE);
  const binChunk = chunks.find(c => c.type === BIN_CHUNK_TYPE);
  if (!jsonChunk) {
    throw new Error('Kein JSON-Chunk in GLB gefunden');
  }

  onProgress?.(30, 'Analysiere JSON');
  const jsonString = new TextDecoder().decode(jsonChunk.data);
  const gltf: any = JSON.parse(jsonString);

  // Prepare embedded data
  onProgress?.(45, 'Bereite Messungen vor');
  const embedded = buildEmbeddedMeasurements(measurements, modelRoot);

  // Place into asset.extras to avoid touching scene graph
  if (!gltf.asset) gltf.asset = { version: '2.0' };
  if (!gltf.asset.extras) gltf.asset.extras = {};
  gltf.asset.extras.measurementsV1 = {
    coordinateSpace: 'model-local',
    createdAt: new Date().toISOString(),
    app: 'DrohnenGLB by RooferGaming',
    count: embedded.length,
    items: embedded
  };

  onProgress?.(60, 'Schreibe JSON');
  const modifiedJsonString = JSON.stringify(gltf);
  const modifiedJsonBuffer = new TextEncoder().encode(modifiedJsonString);
  const paddedLen = Math.ceil(modifiedJsonBuffer.length / 4) * 4;
  const paddedBuffer = new ArrayBuffer(paddedLen);
  new Uint8Array(paddedBuffer).set(modifiedJsonBuffer);
  new Uint8Array(paddedBuffer, modifiedJsonBuffer.length).fill(0x20); // pad with spaces

  onProgress?.(80, 'Erzeuge GLB');
  const newGLB = rebuildGLB(paddedBuffer, binChunk?.data);

  const blob = new Blob([newGLB], { type: 'model/gltf-binary' });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);

  onProgress?.(100, 'Fertig');
  return url;
}
