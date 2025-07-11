import React, { useEffect } from 'react';
import ModelViewer from '@/components/ModelViewer';
import { useScene } from '@/components/SceneProvider';
import { useThreeContext } from '@/hooks/useThreeContext';

interface ViewerWrapperProps {
  fileUrl: string;
  fileName: string;
  rotateModel?: boolean;
}

const ViewerWrapper: React.FC<ViewerWrapperProps> = ({ fileUrl, fileName, rotateModel }) => {
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
      <ModelViewer fileUrl={fileUrl} fileName={fileName} rotateModel={rotateModel} />
      <SceneSync />
    </>
  );
};

export default ViewerWrapper;