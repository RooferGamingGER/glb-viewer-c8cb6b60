
// Focusing on the problematic code area in finalizeWithSharedSegments:

const finalizeWithSharedSegments = useCallback(() => {
  // First, call the original finalize
  const newMeasurement = finalizeMeasurement();
  
  if (newMeasurement) {
    // After creating a new measurement, check for shared segments
    const measurementsWithSharedSegments = findAndLinkSharedSegments([...measurements, newMeasurement]);
    
    // Update the measurements with linked segments
    setMeasurements(measurementsWithSharedSegments);
    updateVisualState(measurementsWithSharedSegments, allLabelsVisible);
  }
  
  return newMeasurement;
}, [finalizeMeasurement, measurements, setMeasurements, updateVisualState, allLabelsVisible, findAndLinkSharedSegments]);
