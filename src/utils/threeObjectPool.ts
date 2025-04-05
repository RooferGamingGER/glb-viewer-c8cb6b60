
import * as THREE from 'three';

/**
 * A utility for pooling and reusing THREE.js objects
 * to avoid garbage collection and improve performance
 */
export class ThreeObjectPool<T extends THREE.Object3D> {
  private pool: T[] = [];
  private createObject: () => T;
  private resetObject?: (obj: T) => void;
  private maxPoolSize: number;

  /**
   * Create a new object pool
   * @param createFn Function that creates a new object
   * @param resetFn Optional function to reset an object before reuse
   * @param initialSize Initial size of the pool
   * @param maxPoolSize Maximum size of the pool (defaults to 100)
   */
  constructor(
    createFn: () => T,
    resetFn?: (obj: T) => void,
    initialSize = 0,
    maxPoolSize = 100
  ) {
    this.createObject = createFn;
    this.resetObject = resetFn;
    this.maxPoolSize = maxPoolSize;

    // Pre-populate the pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createObject());
    }
  }

  /**
   * Get an object from the pool or create a new one if none available
   */
  get(): T {
    if (this.pool.length > 0) {
      const object = this.pool.pop()!;
      if (this.resetObject) {
        this.resetObject(object);
      }
      return object;
    }

    // No objects in pool, create new one
    return this.createObject();
  }

  /**
   * Return an object to the pool for future reuse
   */
  release(object: T): void {
    if (this.pool.length < this.maxPoolSize) {
      // Only add to pool if we're under max size
      // This prevents memory leaks from an ever-growing pool
      this.pool.push(object);
    } else {
      // If pool is at capacity, dispose of the object properly if possible
      if ('geometry' in object && (object as any).geometry?.dispose) {
        (object as any).geometry.dispose();
      }
      
      if ('material' in object) {
        const mat = (object as any).material;
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose && m.dispose());
        } else if (mat?.dispose) {
          mat.dispose();
        }
      }
    }
  }

  /**
   * Get the current size of the pool
   */
  size(): number {
    return this.pool.length;
  }

  /**
   * Clear the pool and optionally dispose of all objects
   */
  clear(dispose = true): void {
    if (dispose) {
      this.pool.forEach(object => {
        if ('geometry' in object && (object as any).geometry?.dispose) {
          (object as any).geometry.dispose();
        }
        
        if ('material' in object) {
          const mat = (object as any).material;
          if (Array.isArray(mat)) {
            mat.forEach(m => m.dispose && m.dispose());
          } else if (mat?.dispose) {
            mat.dispose();
          }
        }
      });
    }
    
    this.pool = [];
  }
}

// Specialized pools for common THREE.js objects
export const createPointPool = (color = 0xff0000, size = 0.1) => {
  return new ThreeObjectPool(
    () => {
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const material = new THREE.MeshBasicMaterial({ color });
      return new THREE.Mesh(geometry, material);
    },
    (point) => {
      point.position.set(0, 0, 0);
      point.visible = true;
      point.scale.set(1, 1, 1);
    },
    10, // Initial size
    50  // Max size
  );
};

export const createLinePool = (color = 0x0000ff, linewidth = 2) => {
  return new ThreeObjectPool(
    () => {
      const material = new THREE.LineBasicMaterial({ 
        color, 
        linewidth 
      });
      const geometry = new THREE.BufferGeometry();
      return new THREE.Line(geometry, material);
    },
    (line) => {
      if (line.geometry) {
        // Reset the geometry with empty positions
        line.geometry.setAttribute('position', 
          new THREE.Float32BufferAttribute([], 3)
        );
      }
      line.visible = true;
    },
    5, // Initial size
    30 // Max size
  );
};
