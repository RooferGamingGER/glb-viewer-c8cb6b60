
import React, { createContext, useContext, useState } from 'react';

interface TutorialContextType {
  showTutorial: boolean;
  currentStep: number;
  setShowTutorial: (show: boolean) => void;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

interface TutorialProviderProps {
  children: React.ReactNode;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 8; // Update this if steps change

  return (
    <TutorialContext.Provider 
      value={{ 
        showTutorial, 
        setShowTutorial, 
        currentStep, 
        setCurrentStep,
        totalSteps
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  
  return context;
};
