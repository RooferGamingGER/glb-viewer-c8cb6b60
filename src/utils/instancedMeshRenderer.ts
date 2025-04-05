
import * as THREE from 'three';
import { Point, PVModuleInfo } from '@/types/measurements';

/**
 * Class for managing instanced meshes for efficient rendering of repeated geometry
 */
export class InstancedMeshRenderer {
  private scene: THREE.Scene | null = null;
  private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private instanceCount: Map<string, number> = new Map();
  private instanceData: Map<string, { position: THREE.Vector3, quaternion: THREE.Quaternion, scale: THREE.Vector3 }[]> = new Map();
  private matrix: THREE.Matrix4 = new THREE.Matrix4();
  private parent: THREE.Group | null = null;

  /**
   * Initialize the renderer with a scene
   */
  public initialize(scene: THREE.Scene) {
    this.scene = scene;
    this.parent = new THREE.Group();
    this.parent.name = "instancedMeshes";
    scene.add(this.parent);
  }

  /**
   * Create a new instanced mesh type
   */
  public createInstancedMesh(
    id: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxInstances: number
  ) {
    if (this.instancedMeshes.has(id)) {
      return this.instancedMeshes.get(id)!;
    }

    const instancedMesh = new THREE.InstancedMesh(geometry, material, maxInstances);
    instancedMesh.name = `instanced_${id}`;
    instancedMesh.count = 0;
    instancedMesh.frustumCulled = true;
    instancedMesh.visible = true;
    
    this.instancedMeshes.set(id, instancedMesh);
    this.instanceCount.set(id, 0);
    this.instanceData.set(id, []);
    
    if (this.parent) {
      this.parent.add(instancedMesh);
    }
    
    return instancedMesh;
  }

  /**
   * Add an instance to a specific mesh type
   */
  public addInstance(
    id: string,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion = new THREE.Quaternion(),
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)
  ): number {
    if (!this.instancedMeshes.has(id)) {
      console.error(`Instanced mesh with id ${id} does not exist.`);
      return -1;
    }
    
    const mesh = this.instancedMeshes.get(id)!;
    const index = this.instanceCount.get(id)!;
    
    // Check if we've reached the maximum number of instances
    if (index >= mesh.count) {
      console.warn(`Cannot add more instances to ${id}, maximum reached.`);
      return -1;
    }
    
    // Set the matrix for this instance
    this.matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, this.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    
    // Store instance data for later reference
    const data = this.instanceData.get(id)!;
    data.push({
      position: position.clone(),
      quaternion: quaternion.clone(),
      scale: scale.clone()
    });
    
    // Increment the instance count
    this.instanceCount.set(id, index + 1);
    mesh.count = index + 1;
    
    return index;
  }

  /**
   * Update an existing instance
   */
  public updateInstance(
    id: string,
    index: number,
    position?: THREE.Vector3,
    quaternion?: THREE.Quaternion,
    scale?: THREE.Vector3
  ) {
    if (!this.instancedMeshes.has(id)) {
      console.error(`Instanced mesh with id ${id} does not exist.`);
      return;
    }
    
    const mesh = this.instancedMeshes.get(id)!;
    const data = this.instanceData.get(id)!;
    
    if (index < 0 || index >= data.length) {
      console.error(`Invalid instance index: ${index}`);
      return;
    }
    
    const instance = data[index];
    
    if (position) {
      instance.position.copy(position);
    }
    
    if (quaternion) {
      instance.quaternion.copy(quaternion);
    }
    
    if (scale) {
      instance.scale.copy(scale);
    }
    
    // Update the matrix for this instance
    this.matrix.compose(instance.position, instance.quaternion, instance.scale);
    mesh.setMatrixAt(index, this.matrix);
    
    mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Create PV module instanced meshes for better performance
   */
  public createPVModuleInstances(
    moduleInfo: PVModuleInfo,
    positions: Point[],
    parentMeasurementId: string
  ) {
    // Create module geometries
    const frameGeometry = new THREE.PlaneGeometry(moduleInfo.width, moduleInfo.height);
    const innerWidth = moduleInfo.width - 0.04; // 2cm border on each side
    const innerHeight = moduleInfo.height - 0.04;
    const panelGeometry = new THREE.PlaneGeometry(innerWidth, innerHeight);
    
    // Create module materials
    const frameMaterial = new THREE.MeshBasicMaterial({
      color: 0x444444,
      side: THREE.DoubleSide
    });
    
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a4b8f,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    
    // Create instanced meshes if they don't exist
    const frameId = `pvModuleFrame_${parentMeasurementId}`;
    const panelId = `pvModulePanel_${parentMeasurementId}`;
    
    // Max instances based on positions array
    const maxInstances = positions.length;
    
    // Create the instanced meshes
    const frameMesh = this.createInstancedMesh(frameId, frameGeometry, frameMaterial, maxInstances);
    frameMesh.userData = { isPVModule: true, measurementId: parentMeasurementId, elementType: 'frame' };
    
    const panelMesh = this.createInstancedMesh(panelId, panelGeometry, panelMaterial, maxInstances);
    panelMesh.userData = { isPVModule: true, measurementId: parentMeasurementId, elementType: 'panel' };
    
    // Calculate normal vector (assuming first 3 points form a plane)
    const normal = this.calculateNormal(positions);
    
    // Add instances for each position
    positions.forEach((position, i) => {
      // Create quaternion from normal
      const quaternion = new THREE.Quaternion();
      const upVector = new THREE.Vector3(0, 1, 0);
      quaternion.setFromUnitVectors(upVector, normal);
      
      // Add module rotation if specified
      if (moduleInfo.rotation) {
        const rotationQuat = new THREE.Quaternion().setFromAxisAngle(
          normal,
          moduleInfo.rotation * (Math.PI / 180)
        );
        quaternion.multiply(rotationQuat);
      }
      
      // Create position vector
      const pos = new THREE.Vector3(position.x, position.y, position.z);
      
      // Add frame instance
      this.addInstance(frameId, pos, quaternion);
      
      // Add panel instance with slight y offset to prevent z-fighting
      const panelPos = pos.clone().add(new THREE.Vector3(0, 0.001, 0));
      this.addInstance(panelId, panelPos, quaternion);
    });
    
    return {
      frameId,
      panelId
    };
  }

  /**
   * Calculate normal vector from at least 3 points
   */
  private calculateNormal(points: Point[]): THREE.Vector3 {
    if (points.length < 3) {
      return new THREE.Vector3(0, 1, 0); // Default up vector
    }
    
    const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
    const p2 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
    const p3 = new THREE.Vector3(points[2].x, points[2].y, points[2].z);
    
    const v1 = new THREE.Vector3().subVectors(p2, p1);
    const v2 = new THREE.Vector3().subVectors(p3, p1);
    
    return new THREE.Vector3().crossVectors(v1, v2).normalize();
  }

  /**
   * Clear all instances for a specific mesh type
   */
  public clearInstances(id: string) {
    if (!this.instancedMeshes.has(id)) {
      return;
    }
    
    const mesh = this.instancedMeshes.get(id)!;
    mesh.count = 0;
    this.instanceCount.set(id, 0);
    this.instanceData.get(id)!.length = 0;
  }

  /**
   * Remove an instanced mesh completely
   */
  public removeInstancedMesh(id: string) {
    if (!this.instancedMeshes.has(id)) {
      return;
    }
    
    const mesh = this.instancedMeshes.get(id)!;
    
    if (this.parent) {
      this.parent.remove(mesh);
    }
    
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    
    this.instancedMeshes.delete(id);
    this.instanceCount.delete(id);
    this.instanceData.delete(id);
  }

  /**
   * Clean up all resources
   */
  public dispose() {
    // Clear all instanced meshes
    this.instancedMeshes.forEach((mesh, id) => {
      this.removeInstancedMesh(id);
    });
    
    // Clear maps
    this.instancedMeshes.clear();
    this.instanceCount.clear();
    this.instanceData.clear();
    
    // Remove parent group
    if (this.parent && this.scene) {
      this.scene.remove(this.parent);
      this.parent = null;
    }
    
    this.scene = null;
  }
}

/**
 * Create and return a singleton instance
 */
let instancedMeshRendererInstance: InstancedMeshRenderer | null = null;

export const getInstancedMeshRenderer = (): InstancedMeshRenderer => {
  if (!instancedMeshRendererInstance) {
    instancedMeshRendererInstance = new InstancedMeshRenderer();
  }
  return instancedMeshRendererInstance;
};
