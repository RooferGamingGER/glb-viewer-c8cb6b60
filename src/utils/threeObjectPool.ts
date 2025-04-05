
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
  private activeObjects: Set<T> = new Set(); // Track active objects

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
      this.activeObjects.add(object);
      return object;
    }

    // No objects in pool, create new one
    const newObject = this.createObject();
    this.activeObjects.add(newObject);
    return newObject;
  }

  /**
   * Return an object to the pool for future reuse
   */
  release(object: T): void {
    if (!this.activeObjects.has(object)) {
      // Prevent double releases
      return;
    }
    
    this.activeObjects.delete(object);
    
    if (this.pool.length < this.maxPoolSize) {
      // Only add to pool if we're under max size
      // This prevents memory leaks from an ever-growing pool
      this.pool.push(object);
    } else {
      // If pool is at capacity, dispose of the object properly if possible
      this.disposeObject(object);
    }
  }

  /**
   * Dispose of an object's resources
   */
  private disposeObject(object: T): void {
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

  /**
   * Get the current size of the pool
   */
  size(): number {
    return this.pool.length;
  }
  
  /**
   * Get the number of active objects
   */
  activeCount(): number {
    return this.activeObjects.size;
  }

  /**
   * Clear the pool and optionally dispose of all objects
   */
  clear(dispose = true): void {
    if (dispose) {
      // Dispose pool objects
      this.pool.forEach(object => {
        this.disposeObject(object);
      });
      
      // Also dispose active objects
      this.activeObjects.forEach(object => {
        this.disposeObject(object);
      });
    }
    
    this.pool = [];
    this.activeObjects.clear();
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

// New pools for additional visual elements
export const createLabelPool = () => {
  return new ThreeObjectPool(
    () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;
      
      // Clear canvas
      context.fillStyle = 'rgba(255, 255, 255, 0.8)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(1, 0.25, 1);
      
      return sprite;
    },
    (sprite) => {
      const material = sprite.material as THREE.SpriteMaterial;
      const canvas = (material.map as THREE.CanvasTexture).image;
      const context = canvas.getContext('2d')!;
      
      // Clear canvas
      context.fillStyle = 'rgba(255, 255, 255, 0.8)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update texture
      (material.map as THREE.CanvasTexture).needsUpdate = true;
      
      sprite.visible = true;
      sprite.position.set(0, 0, 0);
      sprite.scale.set(1, 0.25, 1);
    },
    5, // Initial size
    30 // Max size
  );
};

export const createAreaMeshPool = (color = 0x00ff00, opacity = 0.5) => {
  return new ThreeObjectPool(
    () => {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.MeshBasicMaterial({
        color,
        opacity,
        transparent: true,
        side: THREE.DoubleSide
      });
      return new THREE.Mesh(geometry, material);
    },
    (mesh) => {
      if (mesh.geometry) {
        // Reset the geometry with empty positions
        mesh.geometry.setAttribute('position',
          new THREE.Float32BufferAttribute([], 3)
        );
        mesh.geometry.setIndex([]);
      }
      mesh.visible = true;
    },
    3, // Initial size
    15 // Max size
  );
};

// Helper function to update text on a label sprite
export const updateLabelText = (
  sprite: THREE.Sprite, 
  text: string, 
  backgroundColor = 'rgba(255, 255, 255, 0.8)',
  textColor = 'black',
  fontSize = 24
) => {
  const material = sprite.material as THREE.SpriteMaterial;
  const canvas = (material.map as THREE.CanvasTexture).image;
  const context = canvas.getContext('2d')!;
  
  // Clear canvas
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  context.fillStyle = textColor;
  context.font = `${fontSize}px Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  // Update texture
  (material.map as THREE.CanvasTexture).needsUpdate = true;
};
