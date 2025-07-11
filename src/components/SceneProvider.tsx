import React, { createContext, useContext, useState, ReactNode } from 'react';
import * as THREE from 'three';

interface SceneContextProps {
  scene: THREE.Scene | null;
  setScene: (scene: THREE.Scene | null) => void;
}

const SceneContext = createContext<SceneContextProps>({
  scene: null,
  setScene: () => {}
});

export const useScene = () => useContext(SceneContext);

interface SceneProviderProps {
  children: ReactNode;
}

export const SceneProvider: React.FC<SceneProviderProps> = ({ children }) => {
  const [scene, setScene] = useState<THREE.Scene | null>(null);

  return (
    <SceneContext.Provider value={{ scene, setScene }}>
      {children}
    </SceneContext.Provider>
  );
};