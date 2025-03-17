
import { Measurement } from '@/hooks/useMeasurements';

/**
 * Exportiert Messungen als CSV-Datei
 */
export const exportMeasurementsToCSV = (measurements: Measurement[]): void => {
  // Header für die CSV-Datei
  const header = ['ID', 'Typ', 'Wert', 'Einheit', 'Beschreibung', 'Neigung'];
  
  // Daten für die CSV-Datei
  const csvData = measurements.map(m => {
    // Messungstyp auf Deutsch konvertieren
    const typeMapping: Record<string, string> = {
      'length': 'Länge',
      'height': 'Höhe',
      'area': 'Fläche'
    };
    
    const type = typeMapping[m.type] || m.type;
    const unit = m.unit || (m.type === 'area' ? 'm²' : 'm');
    
    return [
      m.id,
      type,
      m.value.toFixed(2),
      unit,
      m.description || '',
      m.inclination ? `${m.inclination.toFixed(1)}°` : ''
    ];
  });
  
  // CSV-Inhalt erstellen
  const csvContent = [
    header.join(','),
    ...csvData.map(row => row.join(','))
  ].join('\n');
  
  // Datei herunterladen
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `Messungen_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
