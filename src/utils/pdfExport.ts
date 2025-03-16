
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { Measurement } from '@/hooks/useMeasurements';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

// Initialize the virtual file system for fonts
// Access the VFS directly based on how pdfFonts is structured
(pdfMake as any).vfs = (pdfFonts as any).vfs;

export const generateMeasurementsPDF = async (measurements: Measurement[], defaultFilename: string): Promise<void> => {
  const docDefinition: TDocumentDefinitions = {
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

  try {
    // Create PDF as blob
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    
    // Get the PDF as a blob
    pdfDocGenerator.getBlob(async (blob) => {
      try {
        // Check if the File System Access API is supported
        if ('showSaveFilePicker' in window) {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFilename,
            types: [{
              description: 'PDF Dokument',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          });
          
          // Create a FileSystemWritableFileStream
          const writable = await fileHandle.createWritable();
          
          // Write the blob to the file
          await writable.write(blob);
          
          // Close the file and write the contents to disk
          await writable.close();
          
          return true;
        } else {
          // Fallback for browsers that don't support File System Access API
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = defaultFilename;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 100);
          
          return true;
        }
      } catch (error) {
        console.error('Failed to save PDF:', error);
        // If user cancelled, don't treat as an error
        if ((error as any)?.name !== 'AbortError') {
          throw error;
        }
        return false;
      }
    });
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw error;
  }
};
