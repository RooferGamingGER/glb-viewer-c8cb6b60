
import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Trash2, Tag, LayoutList, SunMedium } from 'lucide-react';
import { Measurement } from '@/types/measurements';
import SolarModuleControls from './SolarModuleControls';

interface MeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string, index: number) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint: (id: string, index: number) => void;
  updateMeasurement: (id: string, updates: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: { [key: string]: boolean };
  toggleSegments: (id: string) => void;
  onEditSegment: (segmentId: string) => void;
  movingPointInfo: any;
  showTable: boolean;
  handleClearMeasurements: () => void;
  toggleAllLabelsVisibility: () => void;
  allLabelsVisible: boolean;
  activeMode: string;
  handleMoveMeasurementUp: (id: string) => void;
  handleMoveMeasurementDown: (id: string) => void;
  togglePVModulesVisibility: (id: string) => void;
}

const MeasurementSidebar: React.FC<MeasurementSidebarProps> = ({
  measurements,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  editMeasurementId,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  showTable,
  handleClearMeasurements,
  toggleAllLabelsVisibility,
  allLabelsVisible,
  activeMode,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown,
  togglePVModulesVisibility
}) => {
  const editingSegmentId = null;
  const anyMeasurements = measurements.length > 0;
  
  // Count of solar measurements for button display
  const solarMeasurementCount = measurements.filter(m => m.type === 'solar').length;
  
  // Filter out measurements by type
  const standardMeasurements = measurements.filter(m => 
    m.type === 'length' || m.type === 'height' || m.type === 'area'
  );
  
  const solarMeasurements = measurements.filter(m => m.type === 'solar');
  
  const roofElementMeasurements = measurements.filter(m => 
    m.type === 'chimney' || m.type === 'skylight' || m.type === 'vent' || 
    m.type === 'hook' || m.type === 'other'
  );
  
  const roofStructureMeasurements = measurements.filter(m => 
    m.type === 'ridge' || m.type === 'eave' || m.type === 'verge' || 
    m.type === 'valley' || m.type === 'hip'
  );
  
  // Simplified placeholder for MeasurementDetail (since we haven't implemented it yet)
  const MeasurementDetail = ({ measurement, ...props }) => {
    if (measurement.type === 'solar') {
      return (
        <div className="mb-2">
          <div className="bg-secondary/20 p-2 rounded">
            <div className="text-sm font-medium">{measurement.label}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {measurement.value.toFixed(2)} m²
            </div>
          </div>
          <SolarModuleControls 
            measurement={measurement} 
            togglePVModulesVisibility={togglePVModulesVisibility} 
          />
        </div>
      );
    }
    
    return (
      <div className="mb-2">
        <div className="bg-secondary/20 p-2 rounded">
          <div className="text-sm font-medium">{measurement.label}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Typ: {measurement.type}, Wert: {measurement.value.toFixed(2)}
          </div>
        </div>
      </div>
    );
  };
  
  // Simplified placeholder for MeasurementTable (since we haven't implemented it yet)
  const MeasurementTable = ({ measurements, toggleMeasurementVisibility, handleDeleteMeasurement, toggleLabelVisibility }) => (
    <div className="mt-2">
      <p className="text-sm font-medium">Messwerte als Tabelle</p>
      <div className="mt-2 text-xs text-muted-foreground">
        (Noch nicht implementiert)
      </div>
    </div>
  );
  
  // Simplified placeholder for NoMeasurements (since we haven't implemented it yet)
  const NoMeasurements = ({ activeMode }) => (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <p className="text-sm text-center text-muted-foreground">
        Keine Messungen vorhanden. Verwende die Werkzeuge, um eine neue Messung zu erstellen.
      </p>
    </div>
  );
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/50 flex flex-wrap justify-between">
        <Button
          variant="outline"
          size="sm"
          className="glass-button mr-1 mb-1"
          onClick={toggleAllLabelsVisibility}
          title={allLabelsVisible ? 'Alle Beschriftungen ausblenden' : 'Alle Beschriftungen anzeigen'}
        >
          {allLabelsVisible ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          <span className="text-xs">{allLabelsVisible ? 'Labels aus' : 'Labels an'}</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="glass-button mr-1 mb-1"
          onClick={() => {}}
          title="Tabelle anzeigen/ausblenden"
        >
          <LayoutList className="h-4 w-4 mr-1" />
          <span className="text-xs">Tabelle</span>
        </Button>
        
        {anyMeasurements && (
          <Button
            variant="outline"
            size="sm"
            className="glass-button mb-1"
            onClick={handleClearMeasurements}
            title="Alle Messungen löschen"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            <span className="text-xs">Löschen</span>
          </Button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        {(!showTable && anyMeasurements) ? (
          <>
            {standardMeasurements.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  Standard-Messungen
                </h3>
                {standardMeasurements.map(measurement => (
                  <MeasurementDetail
                    key={measurement.id}
                    measurement={measurement}
                    segmentsOpen={segmentsOpen}
                    toggleSegments={toggleSegments}
                    handleStartPointEdit={handleStartPointEdit}
                    handleDeleteMeasurement={handleDeleteMeasurement}
                    handleDeletePoint={handleDeletePoint}
                    onEditSegment={onEditSegment}
                    editingSegmentId={editingSegmentId}
                    updateMeasurement={updateMeasurement}
                    editMeasurementId={editMeasurementId}
                    handleMoveMeasurementUp={handleMoveMeasurementUp}
                    handleMoveMeasurementDown={handleMoveMeasurementDown}
                    togglePVModulesVisibility={togglePVModulesVisibility}
                  />
                ))}
              </div>
            )}
            
            {solarMeasurements.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium mb-2 flex items-center">
                  <SunMedium className="h-4 w-4 mr-1" />
                  Solarflächen
                </h3>
                {solarMeasurements.map(measurement => (
                  <MeasurementDetail
                    key={measurement.id}
                    measurement={measurement}
                    segmentsOpen={segmentsOpen}
                    toggleSegments={toggleSegments}
                    handleStartPointEdit={handleStartPointEdit}
                    handleDeleteMeasurement={handleDeleteMeasurement}
                    handleDeletePoint={handleDeletePoint}
                    onEditSegment={onEditSegment}
                    editingSegmentId={editingSegmentId}
                    updateMeasurement={updateMeasurement}
                    editMeasurementId={editMeasurementId}
                    handleMoveMeasurementUp={handleMoveMeasurementUp}
                    handleMoveMeasurementDown={handleMoveMeasurementDown}
                    togglePVModulesVisibility={togglePVModulesVisibility}
                  />
                ))}
              </div>
            )}
            
            {roofElementMeasurements.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium mb-2">Dacheinbauten</h3>
                {roofElementMeasurements.map(measurement => (
                  <MeasurementDetail
                    key={measurement.id}
                    measurement={measurement}
                    segmentsOpen={segmentsOpen}
                    toggleSegments={toggleSegments}
                    handleStartPointEdit={handleStartPointEdit}
                    handleDeleteMeasurement={handleDeleteMeasurement}
                    handleDeletePoint={handleDeletePoint}
                    onEditSegment={onEditSegment}
                    editingSegmentId={editingSegmentId}
                    updateMeasurement={updateMeasurement}
                    editMeasurementId={editMeasurementId}
                    handleMoveMeasurementUp={handleMoveMeasurementUp}
                    handleMoveMeasurementDown={handleMoveMeasurementDown}
                    togglePVModulesVisibility={togglePVModulesVisibility}
                  />
                ))}
              </div>
            )}
            
            {roofStructureMeasurements.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-medium mb-2">Dachstruktur</h3>
                {roofStructureMeasurements.map(measurement => (
                  <MeasurementDetail
                    key={measurement.id}
                    measurement={measurement}
                    segmentsOpen={segmentsOpen}
                    toggleSegments={toggleSegments}
                    handleStartPointEdit={handleStartPointEdit}
                    handleDeleteMeasurement={handleDeleteMeasurement}
                    handleDeletePoint={handleDeletePoint}
                    onEditSegment={onEditSegment}
                    editingSegmentId={editingSegmentId}
                    updateMeasurement={updateMeasurement}
                    editMeasurementId={editMeasurementId}
                    handleMoveMeasurementUp={handleMoveMeasurementUp}
                    handleMoveMeasurementDown={handleMoveMeasurementDown}
                    togglePVModulesVisibility={togglePVModulesVisibility}
                  />
                ))}
              </div>
            )}
          </>
        ) : showTable ? (
          <MeasurementTable 
            measurements={measurements}
            toggleMeasurementVisibility={toggleMeasurementVisibility}
            handleDeleteMeasurement={handleDeleteMeasurement}
            toggleLabelVisibility={toggleLabelVisibility}
          />
        ) : (
          <NoMeasurements activeMode={activeMode} />
        )}
      </div>
    </div>
  );
};

export default MeasurementSidebar;
