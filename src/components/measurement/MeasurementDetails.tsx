
import React from 'react';
import { Measurement } from '@/types/measurements';

interface MeasurementDetailsProps {
  measurement: Measurement;
}

const MeasurementDetails: React.FC<MeasurementDetailsProps> = ({ measurement }) => {
  return (
    <div className="text-sm mt-1">
      <div className="font-medium">{measurement.label}</div>
      
      {measurement.dimensions && (
        <div className="text-xs opacity-75 space-y-0.5">
          {measurement.dimensions.width !== undefined && (
            <div>Breite: {measurement.dimensions.width.toFixed(2)} m</div>
          )}
          {measurement.dimensions.length !== undefined && (
            <div>Länge: {measurement.dimensions.length.toFixed(2)} m</div>
          )}
          {measurement.dimensions.height !== undefined && (
            <div>Höhe: {measurement.dimensions.height.toFixed(2)} m</div>
          )}
          {measurement.dimensions.area !== undefined && (
            <div>Fläche: {measurement.dimensions.area.toFixed(2)} m²</div>
          )}
          {measurement.dimensions.perimeter !== undefined && (
            <div>Umfang: {measurement.dimensions.perimeter.toFixed(2)} m</div>
          )}
        </div>
      )}
      
      {measurement.inclination !== undefined && (
        <div className="text-xs opacity-75">
          Neigung: {Math.abs(measurement.inclination).toFixed(1)}°
        </div>
      )}
      
      {measurement.count !== undefined && measurement.count > 0 && (
        <div className="text-xs opacity-75">
          Anzahl: {measurement.count}
        </div>
      )}
    </div>
  );
};

export default MeasurementDetails;
