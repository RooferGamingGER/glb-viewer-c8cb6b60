
import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Measurement } from '@/hooks/useMeasurements';

interface MeasurementTableProps {
  measurements: Measurement[];
  title?: string;
  showTableHeaders?: boolean;
}

const MeasurementTable: React.FC<MeasurementTableProps> = ({
  measurements,
  title = "Messungen",
  showTableHeaders = true
}) => {
  if (measurements.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        Keine Messungen vorhanden
      </div>
    );
  }

  // Group measurements by type
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area');

  return (
    <div className="space-y-6">
      {/* Length measurements */}
      {lengthMeasurements.length > 0 && (
        <div>
          {showTableHeaders && <h3 className="text-base font-medium mb-2">Längenmessungen</h3>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr.</TableHead>
                <TableHead>Wert</TableHead>
                <TableHead>Neigung</TableHead>
                <TableHead>Beschreibung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lengthMeasurements.map((measurement, index) => (
                <TableRow key={measurement.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`}</TableCell>
                  <TableCell>
                    {measurement.inclination !== undefined 
                      ? `${Math.abs(measurement.inclination).toFixed(1)}°` 
                      : '–'}
                  </TableCell>
                  <TableCell>{measurement.description || '–'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Height measurements */}
      {heightMeasurements.length > 0 && (
        <div>
          {showTableHeaders && <h3 className="text-base font-medium mb-2">Höhenmessungen</h3>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr.</TableHead>
                <TableHead>Wert</TableHead>
                <TableHead>Beschreibung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heightMeasurements.map((measurement, index) => (
                <TableRow key={measurement.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`}</TableCell>
                  <TableCell>{measurement.description || '–'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Area measurements */}
      {areaMeasurements.length > 0 && (
        <div>
          {showTableHeaders && <h3 className="text-base font-medium mb-2">Flächenmessungen</h3>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr.</TableHead>
                <TableHead>Wert</TableHead>
                <TableHead>Beschreibung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areaMeasurements.map((measurement, index) => (
                <TableRow key={measurement.id} className="border-b-0">
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || 'm²'}`}</TableCell>
                  <TableCell>{measurement.description || '–'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Segments for area measurements */}
          {areaMeasurements.map((measurement, mIndex) => (
            measurement.segments && measurement.segments.length > 0 && (
              <div key={`${measurement.id}-segments`} className="ml-6 mt-2 mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Segmente für Fläche {mIndex + 1}
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead>Länge</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {measurement.segments.map((segment, sIndex) => (
                      <TableRow key={segment.id}>
                        <TableCell>{sIndex + 1}</TableCell>
                        <TableCell>{segment.length.toFixed(2)} m</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default MeasurementTable;
