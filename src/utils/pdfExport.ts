
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { Measurement } from '@/hooks/useMeasurements';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { ProjectDataType } from '@/components/measurement/ProjectDataForm';

// Initialize the virtual file system for fonts
(pdfMake as any).vfs = (pdfFonts as any).vfs;

// Logo muss als Base64 oder URL verfügbar sein
const LOGO_PATH = '/drohnenglb-logo.png';
const DEFAULT_LOGO_FALLBACK = ''; // Empty string fallback for logo

/**
 * Converts an image URL to a Base64 data URL
 */
const imageUrlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(new Error('Failed to convert image to base64'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * Generates and downloads a PDF with measurement data
 */
export const generateMeasurementsPDF = async (
  measurements: Measurement[], 
  defaultFilename: string,
  projectData?: ProjectDataType | null
): Promise<boolean> => {
  try {
    // Get logo as Base64
    let logoDataUrl: string;
    try {
      logoDataUrl = await imageUrlToBase64(LOGO_PATH);
    } catch (error) {
      console.warn('Failed to load logo:', error);
      logoDataUrl = DEFAULT_LOGO_FALLBACK;
    }

    // Format current date
    const currentDate = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Create PDF content
    const docContent: Content[] = [];

    // Header with logo and title
    docContent.push({
      columns: [
        {
          width: '40%',
          stack: [
            logoDataUrl ? {
              image: logoDataUrl,
              width: 150,
              alignment: 'left'
            } : { text: '' } // Empty text as fallback if logo fails
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

    // Project information
    if (projectData) {
      docContent.push(
        { text: 'Projektinformationen', style: 'sectionHeader' },
        {
          columns: [
            {
              width: '50%',
              stack: [
                { text: `Projektname: ${projectData.projectName || '-'}`, margin: [0, 3, 0, 0] },
                { text: `Vorgang: ${projectData.currentProcess || '-'}`, margin: [0, 3, 0, 0] }
              ]
            },
            {
              width: '50%',
              stack: [
                { text: `Erstellt am: ${currentDate}`, margin: [0, 3, 0, 0] },
                { text: `Erstellt von: ${projectData.creator || '-'}`, margin: [0, 3, 0, 0] }
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
      // If no project data is available, only show the date
      docContent.push(
        { text: `Erstellt am: ${currentDate}`, style: 'subheader' }
      );
    }

    // Divider line
    docContent.push({ canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 0.5 }], margin: [0, 10, 0, 10] });

    // Measurements table
    docContent.push(
      { text: 'Messungsdaten', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', '*', '*'],
          body: [
            ['Typ', 'Beschreibung', 'Wert', 'Neigung'],
            ...measurements.map(m => {
              // Format based on type
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
          italics: true,
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

    // Create PDF and download it
    return new Promise<boolean>((resolve, reject) => {
      try {
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        
        pdfDocGenerator.getBlob(async (blob) => {
          try {
            // Try using the File System Access API (modern browsers)
            if ('showSaveFilePicker' in window) {
              try {
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
                
                resolve(true);
              } catch (error) {
                // If user cancels the save dialog, it's not an error
                if ((error as any)?.name === 'AbortError') {
                  console.log('User cancelled the save dialog');
                  resolve(false);
                  return;
                }
                // For other errors with File System Access API, fall back to the traditional method
                throw error;
              }
            } else {
              // Fallback for browsers that don't support File System Access API
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = defaultFilename;
              
              // Append to body and click to trigger download
              document.body.appendChild(link);
              link.click();
              
              // Cleanup
              document.body.removeChild(link);
              setTimeout(() => URL.revokeObjectURL(url), 100);
              
              resolve(true);
            }
          } catch (error) {
            console.error('Failed to save PDF:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.error('Failed to generate PDF:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('Error in PDF generation process:', error);
    throw error;
  }
};
