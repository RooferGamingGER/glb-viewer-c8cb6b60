
import { useContext } from 'react';
import { ThreeContext, ThreeContextProps } from '@/components/ModelViewer';

export const useThreeContext = (): ThreeContextProps => {
  return useContext(ThreeContext);
};
