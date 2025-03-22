
  // Update handleCalculatePV function to accept measurements and areaId
  const handleCalculatePV = (
    areaPoints: Point[], 
    userDimensions?: {width: number, length: number},
    allMeasurements?: Measurement[],
    areaId?: string
  ) => {
    if (areaPoints.length !== 4) {
      if (areaPoints.length > 4) {
        areaPoints = areaPoints.slice(0, 4);
      }
    }
    
    const moduleInfo = calculatePVModulePlacement(
      areaPoints,
      undefined,
      undefined,
      DEFAULT_EDGE_DISTANCE,
      DEFAULT_MODULE_SPACING,
      userDimensions,
      allMeasurements,
      areaId
    );
    
    const moduleSpec = PV_MODULE_TEMPLATES[0];
    const powerInKWp = (moduleInfo.moduleCount * moduleSpec.power) / 1000;
    
    return {
      moduleInfo,
      moduleSpec,
      powerOutput: moduleInfo.moduleCount * moduleSpec.power,
      label: `${moduleInfo.moduleCount} Module (${powerInKWp.toFixed(2)} kWp)`
    };
  };
