
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sun } from "lucide-react";
import { MeasurementMode } from '@/types/measurements';
import PVPlanningDisclaimer from '@/components/pvplanning/PVPlanningDisclaimer';

interface SolarPlanningButtonProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
}

const SolarPlanningButton: React.FC<SolarPlanningButtonProps> = ({
  activeMode,
  toggleMeasurementTool
}) => {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const isActive = activeMode === 'pvplanning';
  
  const handleButtonClick = () => {
    const hasSeenDisclaimer = localStorage.getItem('pvplanning-disclaimer-seen') === 'true';
    
    if (hasSeenDisclaimer) {
      toggleMeasurementTool('pvplanning');
    } else {
      setShowDisclaimer(true);
    }
  };
  
  const handleConfirmDisclaimer = () => {
    localStorage.setItem('pvplanning-disclaimer-seen', 'true');
    setShowDisclaimer(false);
    toggleMeasurementTool('pvplanning');
  };
  
  const handleCancelDisclaimer = () => {
    setShowDisclaimer(false);
  };
  
  return (
    <>
      <Button 
        variant={isActive ? "default" : "outline"}
        className={`flex-1 justify-center text-xs p-2 h-auto ${isActive ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
        onClick={handleButtonClick}
      >
        <Sun className="h-3.5 w-3.5 mr-1" />
        Solarplanung
      </Button>
      
      <PVPlanningDisclaimer 
        open={showDisclaimer}
        onConfirm={handleConfirmDisclaimer}
        onCancel={handleCancelDisclaimer}
      />
    </>
  );
};

export default SolarPlanningButton;
