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
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, EyeIcon, BookmarkX, Trash2 } from 'lucide-react';
import { formatMeasurementValue } from '@/utils/exportUtils';

interface MeasurementTableProps {
  measurements: Measurement[];
  title?: string;
  showTableHeaders?: boolean;
  toggleMeasurementVisibility?: (id: string) => void;
  toggleLabelVisibility?: (id: string) => void;
  handleDeleteMeasurement?: (id: string) => void;
}

const MeasurementTable: React.FC<MeasurementTableProps> = ({
  measurements,
  title = "Messungen",
  showTableHeaders = true,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleDeleteMeasurement
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
  const skylightMeasurements = measurements.filter(m => m.type === 'skylight');
  const otherMeasurements = measurements.filter(m => 
    !['length', 'height', 'area', 'skylight'].includes(m.type)
  );

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
                {(toggleMeasurementVisibility || toggleLabelVisibility || handleDeleteMeasurement) && (
                  <TableHead className="w-24">Aktionen</TableHead>
                )}
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
                  {(toggleMeasurementVisibility || toggleLabelVisibility || handleDeleteMeasurement) && (
                    <TableCell>
                      <div className="flex space-x-1 justify-end">
                        {toggleMeasurementVisibility && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => toggleMeasurementVisibility(measurement.id)}
                          >
                            {measurement.visible === false ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {toggleLabelVisibility && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => toggleLabelVisibility(measurement.id)}
                          >
                            {measurement.labelVisible === false ? (
                              <EyeIcon className="h-3 w-3" />
                            ) : (
                              <BookmarkX className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {handleDeleteMeasurement && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => handleDeleteMeasurement(measurement.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
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
                {(toggleMeasurementVisibility || toggleLabelVisibility || handleDeleteMeasurement) && (
                  <TableHead className="w-24">Aktionen</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {heightMeasurements.map((measurement, index) => (
                <TableRow key={measurement.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`}</TableCell>
                  <TableCell>{measurement.description || '–'}</TableCell>
                  {(toggleMeasurementVisibility || toggleLabelVisibility || handleDeleteMeasurement) && (
                    <TableCell>
                      <div className="flex space-x-1 justify-end">
                        {toggleMeasurementVisibility && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => toggleMeasurementVisibility(measurement.id)}
                          >
                            {measurement.visible === false ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {toggleLabelVisibility && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => toggleLabelVisibility(measurement.id)}
                          >
                            {measurement.labelVisible === false ? (
                              <EyeIcon className="h-3 w-3" />
                            ) : (
                              <BookmarkX className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {handleDeleteMeasurement && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => handleDeleteMeasurement(measurement.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Skylight measurements */}
      {skylightMeasurements.length > 0 && (
        <div>
          {showTableHeaders && <h3 className="text-base font-medium mb-2">Dachfenster</h3>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr.</TableHead>
                <TableHead>Wert</TableHead>
                <TableHead>Beschreibung</TableHead>
                {(toggleMeasurementVisibility || toggleLabelVisibility || handleDeleteMeasurement) && (
                  <TableHead className="w-24">Aktionen</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {skylightMeasurements.map((measurement, index) => (
                <TableRow key={measurement.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{formatMeasurementValue(measurement)}</TableCell>
                  <TableCell>{measurement.description || '–'}</TableCell>
                  {(toggleMeasurementVisibility || toggleLabelVisibility || handleDeleteMeasurement) && (
                    <TableCell>
                      <div className="flex space-x-1 justify-end">
                        {toggleMeasurementVisibility && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => toggleMeasurementVisibility(measurement.id)}
                          >
                            {measurement.visible === false ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {toggleLabelVisibility && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => toggleLabelVisibility(measurement.id)}
                          >
                            {measurement.labelVisible === false ? (
                              <EyeIcon className="h-3 w-3" />
                            ) : (
                              <BookmarkX className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {handleDeleteMeasurement && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => handleDeleteMeasurement(measurement.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
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
                {(toggleMeasurementVisibility || toggleLabelVisibility || handleDeleteMeasurement) && (
                  <TableHead className="w-24">Aktionen</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {areaMeasurements.map((measurement, index) => (
                <TableRow key={measurement.id} className="border-b-0">
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || 'm²'}`}</TableCell>
                  <TableCell>{measurement.description || '–'}</TableCell>
                  {(toggleMeasurementVisibility || toggleLabelVisibility || handleDeleteMeasurement) && (
                    <TableCell>
                      <div className="flex space-x-1 justify-end">
                        {toggleMeasurementVisibility && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => toggleMeasurementVisibility(measurement.id)}
                          >
                            {measurement.visible === false ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {toggleLabelVisibility && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => toggleLabelVisibility(measurement.id)}
                          >
                            {measurement.labelVisible === false ? (
                              <EyeIcon className="h-3 w-3" />
                            ) : (
                              <BookmarkX className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {handleDeleteMeasurement && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => handleDeleteMeasurement(measurement.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Segments for area measurements */}
          {areaMeasurements.map((measurement, mIndex) => (
            measurement.segments && measurement.segments.length > 0 && (
              <div key={`${measurement.id}-segments`} className="ml-6 mt-2 mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Teilmessungen für Fläche {mIndex + 1}
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teilmessung</TableHead>
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

      {/* Other measurements (chimney, vents, etc.) */}
      {otherMeasurements.length > 0 && (
        <div>
          {showTableHeaders && <h3 className="text-base font-medium mb-2">Dacheinbauten</h3>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr.</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Wert</TableHead>
                <TableHead>Beschreibung</TableHead>
                {(toggleMeasurementVisibility || toggleLabelVisibility || handleDeleteMeasurement) && (
                  <TableHead className="w-24">Aktionen</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {otherMeasurements.map((measurement, index) => (
                <TableRow key={measurement.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {(() => {
                      switch(measurement.type) {
                        case 'chimney': return 'Kamin';
                        case 'vent': return 'Lüfter';
                        case 'hook': return 'Dachhaken';
                        case 'solar': return 'Solaranlage';
                        case 'other': return 'Sonstiges';
                        default: return measurement.type;
                      }
                    })()}
                  </TableCell>
                  <TableCell>{formatMeasurementValue(measurement)}</TableCell>
                  <TableCell>{measurement.description || '–'}</TableCell>
                  {(toggleMeasurementVisibility || toggleLabelVisibility || handleDeleteMeasurement) && (
                    <TableCell>
                      <div className="flex space-x-1 justify-end">
                        {toggleMeasurementVisibility && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => toggleMeasurementVisibility(measurement.id)}
                          >
                            {measurement.visible === false ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {toggleLabelVisibility && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => toggleLabelVisibility(measurement.id)}
                          >
                            {measurement.labelVisible === false ? (
                              <EyeIcon className="h-3 w-3" />
                            ) : (
                              <BookmarkX className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {handleDeleteMeasurement && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => handleDeleteMeasurement(measurement.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default MeasurementTable;
