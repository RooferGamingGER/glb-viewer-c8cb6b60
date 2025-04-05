import * as THREE from 'three';

/**
 * Utility for optimizing scene performance by managing object visibility
 * based on frustum culling and distance thresholds
 */
export class VisibilityOptimizer {
  private frustum: THREE.Frustum;
  private camera: THREE.Camera | null = null;
  private frustumMatrix: THREE.Matrix4;
  private objectGroups: Map<string, THREE.Group> = new Map();
  private distanceThreshold: number;
  private enabled: boolean = true;

  constructor(distanceThreshold: number = 50) {
    this.frustum = new THREE.Frustum();
    this.frustumMatrix = new THREE.Matrix4();
    this.distanceThreshold = distanceThreshold;
  }

  /**
   * Register camera for frustum calculations
   */
  public setCamera(camera: THREE.Camera | null) {
    this.camera = camera;
  }

  /**
   * Register a group of objects to be managed for visibility
   */
  public registerObjectGroup(name: string, group: THREE.Group) {
    this.objectGroups.set(name, group);
  }

  /**
   * Unregister an object group
   */
  public unregisterObjectGroup(name: string) {
    this.objectGroups.delete(name);
  }

  /**
   * Set enabled state
   */
  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Update frustum and check all registered objects
   */
  public update() {
    if (!this.enabled || !this.camera) return;

    // Update frustum from camera
    this.frustumMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.frustumMatrix);

    // Process all registered object groups
    this.objectGroups.forEach((group, name) => {
      this.updateGroupVisibility(group);
    });
  }

  /**
   * Update visibility for objects in a group
   */
  private updateGroupVisibility(group: THREE.Group) {
    if (!this.camera) return;
    
    // Get camera position for distance checks
    const cameraPosition = new THREE.Vector3();
    if (this.camera instanceof THREE.PerspectiveCamera || 
        this.camera instanceof THREE.OrthographicCamera) {
      cameraPosition.setFromMatrixPosition(this.camera.matrixWorld);
    }

    // Check each object in the group
    group.children.forEach(object => {
      // Skip objects with forced visibility
      if (object.userData && object.userData.forceVisible) {
        return;
      }

      // Get the world position of the object to check against frustum
      const position = new THREE.Vector3();
      object.getWorldPosition(position);
      
      // Calculate bounding sphere for the object
      const boundingSphere = this.getBoundingSphere(object);
      
      // Check if object is in frustum
      const isInFrustum = this.frustum.intersectsSphere(boundingSphere);
      
      // Check distance from camera
      const distance = position.distanceTo(cameraPosition);
      const isWithinDistance = distance < this.distanceThreshold;
      
      // Only render if in frustum and within distance threshold
      object.visible = isInFrustum && isWithinDistance;
    });
  }

  /**
   * Get a bounding sphere for an object with caching
   */
  private getBoundingSphere(object: THREE.Object3D): THREE.Sphere {
    // Use cached bounding sphere if available and object hasn't changed
    if (object.userData.boundingSphere && !object.userData.boundingSphereNeedsUpdate) {
      return object.userData.boundingSphere;
    }
    
    // Calculate bounding sphere for the object
    const boundingSphere = new THREE.Sphere();
    
    // Use geometry bounds if available (for meshes)
    if (object instanceof THREE.Mesh && object.geometry) {
      if (!object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere();
      }
      boundingSphere.copy(object.geometry.boundingSphere!);
      boundingSphere.applyMatrix4(object.matrixWorld);
    } 
    // Otherwise use object position with a small radius
    else {
      const position = new THREE.Vector3();
      object.getWorldPosition(position);
      const size = object.scale.length();
      boundingSphere.set(position, size > 0 ? size : 1);
    }
    
    // Cache the bounding sphere
    object.userData.boundingSphere = boundingSphere;
    object.userData.boundingSphereNeedsUpdate = false;
    
    return boundingSphere;
  }

  /**
   * Invalidate cached bounding spheres, forcing recalculation
   */
  public invalidateBoundingSpheres() {
    this.objectGroups.forEach((group) => {
      group.traverse((object) => {
        object.userData.boundingSphereNeedsUpdate = true;
      });
    });
  }

  /**
   * Clear all registered object groups
   */
  public clear() {
    this.objectGroups.clear();
  }
}

/**
 * Create and return a singleton visibility optimizer instance
 */
let visibilityOptimizerInstance: VisibilityOptimizer | null = null;

export const getVisibilityOptimizer = (): VisibilityOptimizer => {
  if (!visibilityOptimizerInstance) {
    visibilityOptimizerInstance = new VisibilityOptimizer();
  }
  return visibilityOptimizerInstance;
};
