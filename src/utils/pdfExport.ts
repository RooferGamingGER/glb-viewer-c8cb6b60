
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Measurement } from '@/hooks/useMeasurements';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

// Initialize the fonts
pdfMake.vfs = pdfFonts.pdfMake.vfs;

// Helper function to format measurement types
const formatType = (type: string): string => {
  switch (type) {
    case 'length': return 'Länge';
    case 'height': return 'Höhe';
    case 'area': return 'Fläche';
    default: return type;
  }
};

// Helper to format values based on type
const formatValue = (value: number, type: string): string => {
  if (type === 'area') {
    return `${value.toFixed(2)} m²`;
  }
  return `${value.toFixed(2)} m`;
};

// Helper to format inclination
const formatInclination = (inclination?: number): string => {
  if (inclination === undefined || inclination === null) {
    return '-';
  }
  return `${inclination.toFixed(1)}°`;
};

// Helper to get description or fallback
const getDescription = (description?: string): string => {
  return description && description.trim() !== '' ? description : '-';
};

export const generateMeasurementsPDF = (measurements: Measurement[], fileName?: string): void => {
  if (!measurements || measurements.length === 0) {
    throw new Error('No measurements to export');
  }

  // Define the table data
  const tableData = [
    // Header row
    [
      { text: 'Messungstyp', style: 'tableHeader' },
      { text: 'Bezeichnung', style: 'tableHeader' },
      { text: 'Wert', style: 'tableHeader' },
      { text: 'Neigung', style: 'tableHeader' }
    ],
    // Data rows
    ...measurements.map(measurement => [
      formatType(measurement.type),
      getDescription(measurement.description),
      formatValue(measurement.value, measurement.type),
      // Only length measurements have inclination
      measurement.type === 'length' ? formatInclination(measurement.inclination) : '-'
    ])
  ];

  // Create the document definition
  const docDefinition: TDocumentDefinitions = {
    content: [
      { text: 'Messungen Export', style: 'header' },
      { text: `Erstellt am: ${new Date().toLocaleString('de-DE')}`, style: 'subheader' },
      { text: ' ' }, // Adds some spacing
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', '*', '*'],
          body: tableData
        }
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 12,
        bold: false,
        margin: [0, 0, 0, 5]
      },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: 'black'
      }
    }
  };

  // Generate and download the PDF
  pdfMake.createPdf(docDefinition).download(fileName || 'messungen-export.pdf');
};
