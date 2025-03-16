
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize the virtual file system for fonts
pdfMake.vfs = pdfFonts.pdfMake.vfs;

import { Measurement } from '@/hooks/useMeasurements';

export const generateMeasurementsPDF = (measurements: Measurement[], filename: string) => {
  const docDefinition = {
    content: [
      { text: 'Messungen Exportiert', style: 'header' },
      { text: `Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, style: 'subheader' },
      { text: '\n' },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', '*', '*'],
          body: [
            ['Typ', 'Beschreibung', 'Wert', 'Neigung'],
            ...measurements.map(m => [
              m.type,
              m.description || '-',
              `${m.value.toFixed(2)} cm`,
              m.inclination ? `${m.inclination.toFixed(2)}°` : '-'
            ])
          ]
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
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5]
      }
    },
    defaultStyle: {
      font: 'Helvetica'
    }
  };

  // Create and download the PDF
  pdfMake.createPdf(docDefinition).download(filename);
};
