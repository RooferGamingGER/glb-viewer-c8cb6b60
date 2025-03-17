
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
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
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
        <div className="table-container">
          {showTableHeaders && <h3 className="text-base font-medium mb-2">Längenmessungen</h3>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isMobile ? "p-2" : ""}>Nr.</TableHead>
                <TableHead className={isMobile ? "p-2" : ""}>Wert</TableHead>
                <TableHead className={isMobile ? "p-2" : ""}>Neigung</TableHead>
                <TableHead className={isMobile ? "p-2" : ""}>Beschreibung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lengthMeasurements.map((measurement, index) => (
                <TableRow key={measurement.id}>
                  <TableCell className={isMobile ? "p-2" : ""}>{index + 1}</TableCell>
                  <TableCell className={isMobile ? "p-2" : ""}>{measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`}</TableCell>
                  <TableCell className={isMobile ? "p-2" : ""}>
                    {measurement.inclination !== undefined 
                      ? `${Math.abs(measurement.inclination).toFixed(1)}°` 
                      : '–'}
                  </TableCell>
                  <TableCell className={isMobile ? "p-2 max-w-[100px] truncate" : ""}>{measurement.description || '–'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Height measurements */}
      {heightMeasurements.length > 0 && (
        <div className="table-container">
          {showTableHeaders && <h3 className="text-base font-medium mb-2">Höhenmessungen</h3>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isMobile ? "p-2" : ""}>Nr.</TableHead>
                <TableHead className={isMobile ? "p-2" : ""}>Wert</TableHead>
                <TableHead className={isMobile ? "p-2" : ""}>Beschreibung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heightMeasurements.map((measurement, index) => (
                <TableRow key={measurement.id}>
                  <TableCell className={isMobile ? "p-2" : ""}>{index + 1}</TableCell>
                  <TableCell className={isMobile ? "p-2" : ""}>{measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`}</TableCell>
                  <TableCell className={isMobile ? "p-2 max-w-[100px] truncate" : ""}>{measurement.description || '–'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Area measurements */}
      {areaMeasurements.length > 0 && (
        <div className="table-container">
          {showTableHeaders && <h3 className="text-base font-medium mb-2">Flächenmessungen</h3>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isMobile ? "p-2" : ""}>Nr.</TableHead>
                <TableHead className={isMobile ? "p-2" : ""}>Wert</TableHead>
                <TableHead className={isMobile ? "p-2" : ""}>Beschreibung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areaMeasurements.map((measurement, index) => (
                <TableRow key={measurement.id} className="border-b-0">
                  <TableCell className={isMobile ? "p-2" : ""}>{index + 1}</TableCell>
                  <TableCell className={isMobile ? "p-2" : ""}>{measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || 'm²'}`}</TableCell>
                  <TableCell className={isMobile ? "p-2 max-w-[100px] truncate" : ""}>{measurement.description || '–'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Segments for area measurements - only show on non-mobile or when explicitly expanded */}
          {areaMeasurements.map((measurement, mIndex) => (
            measurement.segments && measurement.segments.length > 0 && (
              <div key={`${measurement.id}-segments`} className={`ml-2 md:ml-6 mt-2 mb-6`}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Teilmessungen für Fläche {mIndex + 1}
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isMobile ? "p-2" : ""}>Teilmessung</TableHead>
                      <TableHead className={isMobile ? "p-2" : ""}>Länge</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {measurement.segments.map((segment, sIndex) => (
                      <TableRow key={segment.id}>
                        <TableCell className={isMobile ? "p-2" : ""}>{sIndex + 1}</TableCell>
                        <TableCell className={isMobile ? "p-2" : ""}>{segment.length.toFixed(2)} m</TableCell>
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
