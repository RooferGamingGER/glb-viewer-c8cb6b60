import React, { useEffect } from 'react';
import ModelViewer from '@/components/ModelViewer';
import { useScene } from '@/components/SceneProvider';
import { useThreeContext } from '@/hooks/useThreeContext';

interface ModelViewerWrapperProps {
  fileUrl: string;
  fileName: string;
}

const ModelViewerWrapper: React.FC<ModelViewerWrapperProps> = ({ fileUrl, fileName }) => {
  const { setScene } = useScene();

  // This component needs to be inside the ThreeContext to access the scene
  const SceneSync: React.FC = () => {
    const { scene } = useThreeContext();
    
    useEffect(() => {
      setScene(scene);
    }, [scene]);

    return null;
  };

  return (
    <>
      <ModelViewer fileUrl={fileUrl} fileName={fileName} />
      <SceneSync />
    </>
  );
};

export default ModelViewerWrapper;