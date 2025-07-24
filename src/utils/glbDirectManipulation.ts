import * as THREE from 'three';

interface GLBHeader {
  magic: number;
  version: number;
  length: number;
}

interface GLBChunk {
  length: number;
  type: number;
  data: ArrayBuffer;
}

const GLB_MAGIC = 0x46546C67; // "glTF"
const JSON_CHUNK_TYPE = 0x4E4F534A; // "JSON"
const BIN_CHUNK_TYPE = 0x004E4942; // "BIN\0"

/**
 * Directly manipulates GLB binary data to apply rotation without re-exporting
 */
export async function rotateGLBDirect(
  originalBlob: Blob,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  onProgress?.(10);

  try {
    // Read the original GLB file
    const arrayBuffer = await originalBlob.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    
    onProgress?.(20);

    // Parse GLB header
    const header = parseGLBHeader(dataView);
    if (header.magic !== GLB_MAGIC) {
      throw new Error('Invalid GLB file format');
    }

    onProgress?.(30);

    // Parse chunks
    const chunks = parseGLBChunks(dataView, header);
    const jsonChunk = chunks.find(chunk => chunk.type === JSON_CHUNK_TYPE);
    
    if (!jsonChunk) {
      throw new Error('No JSON chunk found in GLB file');
    }

    onProgress?.(50);

    // Parse and modify the GLTF JSON
    const jsonString = new TextDecoder().decode(jsonChunk.data);
    const gltf = JSON.parse(jsonString);
    
    // Apply rotation to root nodes
    applyRotationToGLTF(gltf);
    
    onProgress?.(70);

    // Rebuild the GLB file
    const modifiedJsonString = JSON.stringify(gltf);
    const modifiedJsonBuffer = new TextEncoder().encode(modifiedJsonString);
    
    // Pad JSON to 4-byte boundary
    const paddedJsonLength = Math.ceil(modifiedJsonBuffer.length / 4) * 4;
    const paddedJsonBuffer = new ArrayBuffer(paddedJsonLength);
    new Uint8Array(paddedJsonBuffer).set(modifiedJsonBuffer);
    
    // Fill remaining bytes with spaces (0x20)
    const padding = new Uint8Array(paddedJsonBuffer, modifiedJsonBuffer.length);
    padding.fill(0x20);

    onProgress?.(80);

    // Rebuild GLB
    const binChunk = chunks.find(chunk => chunk.type === BIN_CHUNK_TYPE);
    const newGLB = rebuildGLB(paddedJsonBuffer, binChunk?.data);
    
    onProgress?.(90);

    // Create download
    const blob = new Blob([newGLB], { type: 'model/gltf-binary' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    onProgress?.(100);
    return fileName;

  } catch (error) {
    console.error('Direct GLB manipulation failed:', error);
    throw error;
  }
}

function parseGLBHeader(dataView: DataView): GLBHeader {
  return {
    magic: dataView.getUint32(0, true),
    version: dataView.getUint32(4, true),
    length: dataView.getUint32(8, true)
  };
}

function parseGLBChunks(dataView: DataView, header: GLBHeader): GLBChunk[] {
  const chunks: GLBChunk[] = [];
  let offset = 12; // After header

  while (offset < header.length) {
    const chunkLength = dataView.getUint32(offset, true);
    const chunkType = dataView.getUint32(offset + 4, true);
    const chunkData = dataView.buffer.slice(offset + 8, offset + 8 + chunkLength);
    
    chunks.push({
      length: chunkLength,
      type: chunkType,
      data: chunkData
    });
    
    // Move to next chunk (with padding)
    offset += 8 + Math.ceil(chunkLength / 4) * 4;
  }

  return chunks;
}

function applyRotationToGLTF(gltf: any): void {
  // Create rotation matrix for -90 degrees around X-axis
  const rotationMatrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  const matrixArray = rotationMatrix.elements;

  // Ensure we have nodes array
  if (!gltf.nodes) {
    gltf.nodes = [];
  }

  // Find or create root node
  let rootNodeIndex = 0;
  if (gltf.scenes && gltf.scenes[0] && gltf.scenes[0].nodes) {
    rootNodeIndex = gltf.scenes[0].nodes[0] || 0;
  }

  // Ensure root node exists
  while (gltf.nodes.length <= rootNodeIndex) {
    gltf.nodes.push({});
  }

  // Apply transformation matrix to root node
  const rootNode = gltf.nodes[rootNodeIndex];
  
  // Convert THREE.js matrix to GLTF matrix (column-major)
  rootNode.matrix = [
    matrixArray[0], matrixArray[1], matrixArray[2], matrixArray[3],
    matrixArray[4], matrixArray[5], matrixArray[6], matrixArray[7],
    matrixArray[8], matrixArray[9], matrixArray[10], matrixArray[11],
    matrixArray[12], matrixArray[13], matrixArray[14], matrixArray[15]
  ];

  // Remove any existing TRS (translation, rotation, scale) properties
  // since matrix takes precedence
  delete rootNode.translation;
  delete rootNode.rotation;
  delete rootNode.scale;
}

function rebuildGLB(jsonBuffer: ArrayBuffer, binBuffer?: ArrayBuffer): ArrayBuffer {
  const jsonLength = jsonBuffer.byteLength;
  const binLength = binBuffer ? binBuffer.byteLength : 0;
  
  // Calculate total length: header + json chunk header + json data + (bin chunk header + bin data if exists)
  const totalLength = 12 + 8 + jsonLength + (binLength > 0 ? 8 + binLength : 0);
  
  const glb = new ArrayBuffer(totalLength);
  const dataView = new DataView(glb);
  let offset = 0;

  // Write GLB header
  dataView.setUint32(offset, GLB_MAGIC, true); // magic
  offset += 4;
  dataView.setUint32(offset, 2, true); // version
  offset += 4;
  dataView.setUint32(offset, totalLength, true); // length
  offset += 4;

  // Write JSON chunk header
  dataView.setUint32(offset, jsonLength, true); // chunk length
  offset += 4;
  dataView.setUint32(offset, JSON_CHUNK_TYPE, true); // chunk type
  offset += 4;

  // Write JSON data
  new Uint8Array(glb, offset, jsonLength).set(new Uint8Array(jsonBuffer));
  offset += jsonLength;

  // Write binary chunk if it exists
  if (binBuffer && binLength > 0) {
    dataView.setUint32(offset, binLength, true); // chunk length
    offset += 4;
    dataView.setUint32(offset, BIN_CHUNK_TYPE, true); // chunk type
    offset += 4;
    
    new Uint8Array(glb, offset, binLength).set(new Uint8Array(binBuffer));
  }

  return glb;
}

/**
 * Get GLB blob from scene model file
 */
export async function getOriginalGLBBlob(scene: THREE.Scene | THREE.Group): Promise<Blob | null> {
  // Try to find the original model file from the scene userData
  const userData = scene.userData;
  
  if (userData && userData.originalFile && userData.originalFile instanceof Blob) {
    return userData.originalFile;
  }

  // Fallback: look for file in children userData
  let originalFile: Blob | null = null;
  scene.traverse((child) => {
    if (child.userData && child.userData.originalFile && child.userData.originalFile instanceof Blob && !originalFile) {
      originalFile = child.userData.originalFile;
    }
  });

  return originalFile;
}