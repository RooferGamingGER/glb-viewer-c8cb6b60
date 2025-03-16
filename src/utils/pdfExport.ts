
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { Measurement } from '@/hooks/useMeasurements';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { ProjectDataType } from '@/components/measurement/ProjectDataForm';

// Initialize the virtual file system for fonts
// Access the VFS directly based on how pdfFonts is structured
(pdfMake as any).vfs = (pdfFonts as any).vfs;

// Logo muss als Base64 oder URL verfügbar sein
const LOGO_PATH = '/drohnenglb-logo.png';

export const generateMeasurementsPDF = async (
  measurements: Measurement[], 
  defaultFilename: string,
  projectData?: ProjectDataType | null
): Promise<void> => {
  // Logo als Base64 konvertieren
  let logoDataUrl: string;
  try {
    const response = await fetch(LOGO_PATH);
    const blob = await response.blob();
    logoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load logo:', error);
    logoDataUrl = ''; // Fallback falls das Logo nicht geladen werden kann
  }

  // Aktuelles Datum formatieren
  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // PDF Inhalte erstellen
  const docContent: Content[] = [];

  // Header mit Logo und Titel
  docContent.push({
    columns: [
      {
        width: '40%',
        stack: [
          {
            image: logoDataUrl,
            width: 150,
            alignment: 'left'
          }
        ]
      },
      {
        width: '60%',
        stack: [
          { text: 'DrohnenGLB by RooferGaming', style: 'title', alignment: 'right' },
          { text: 'Messungsbericht', style: 'subtitle', alignment: 'right' }
        ]
      }
    ],
    margin: [0, 0, 0, 20]
  });

  // Projekt Informationen
  if (projectData) {
    docContent.push(
      { text: 'Projektinformationen', style: 'sectionHeader' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: `Projektname: ${projectData.projectName}`, margin: [0, 3, 0, 0] },
              { text: `Vorgang: ${projectData.currentProcess}`, margin: [0, 3, 0, 0] }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: `Erstellt am: ${currentDate}`, margin: [0, 3, 0, 0] },
              { text: `Erstellt von: ${projectData.creator}`, margin: [0, 3, 0, 0] }
            ]
          }
        ]
      }
    );

    if (projectData.contactInfo) {
      docContent.push(
        { text: `Kontakt für Rückfragen: ${projectData.contactInfo}`, margin: [0, 5, 0, 0] }
      );
    }
  } else {
    // Wenn keine Projektdaten vorhanden sind, nur das Datum anzeigen
    docContent.push(
      { text: `Erstellt am: ${currentDate}`, style: 'subheader' }
    );
  }

  // Trennlinie
  docContent.push({ canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 0.5 }], margin: [0, 10, 0, 10] });

  // Messungen Tabelle
  docContent.push(
    { text: 'Messungsdaten', style: 'sectionHeader' },
    {
      table: {
        headerRows: 1,
        widths: ['*', '*', '*', '*'],
        body: [
          ['Typ', 'Beschreibung', 'Wert', 'Neigung'],
          ...measurements.map(m => {
            // Formatierung basierend auf dem Typ
            let formattedValue = '';
            if (m.type === 'area') {
              formattedValue = `${m.value.toFixed(2)} m²`;
            } else {
              formattedValue = `${m.value.toFixed(2)} m`;
            }
            
            return [
              m.type === 'length' ? 'Länge' : m.type === 'height' ? 'Höhe' : m.type === 'area' ? 'Fläche' : m.type,
              m.description || '-',
              formattedValue,
              m.inclination ? `${m.inclination.toFixed(2)}°` : '-'
            ];
          })
        ]
      }
    }
  );

  // Footer
  docContent.push({
    text: 'DrohnenGLB by RooferGaming - Präzise Vermessungen für Ihre Projekte',
    style: 'footer',
    margin: [0, 30, 0, 0]
  });

  const docDefinition: TDocumentDefinitions = {
    content: docContent,
    styles: {
      title: {
        fontSize: 20,
        bold: true,
        margin: [0, 0, 0, 10],
        color: '#1e3a8a'
      },
      subtitle: {
        fontSize: 16,
        bold: false,
        margin: [0, 0, 0, 10],
        color: '#475569'
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 10],
        color: '#1e3a8a'
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5]
      },
      footer: {
        fontSize: 10,
        italic: true,
        alignment: 'center',
        color: '#64748b'
      }
    },
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 12
    },
    pageMargins: [40, 60, 40, 60]
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
