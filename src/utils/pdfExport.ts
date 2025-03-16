import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Measurement } from '@/hooks/useMeasurements';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

// Register fonts
pdfMake.vfs = pdfFonts.vfs;

// Define fonts
const fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

interface PDFExportOptions {
  title: string;
  screenshotUrl: string;
  measurements: Measurement[];
  filename?: string;
  includeScreenshot?: boolean;
}

export const exportMeasurementsToPDF = async ({
  title,
  screenshotUrl,
  measurements,
  filename = 'messungen.pdf',
  includeScreenshot = true
}: PDFExportOptions): Promise<void> => {
  try {
    let imageBase64 = '';
    
    // Only process screenshot if it's included and a URL is provided
    if (includeScreenshot && screenshotUrl) {
      // Convert the screenshot URL to a base64 data URL
      imageBase64 = await urlToBase64(screenshotUrl);
    }
    
    // Generate the document definition
    const docDefinition = createDocumentDefinition(title, imageBase64, measurements, includeScreenshot);
    
    // Create and download the PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.download(filename);
  } catch (error) {
    console.error('PDF-Export fehlgeschlagen:', error);
    throw error;
  }
};

// Convert URL to base64
const urlToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Skip processing if it's already a base64 data URL
    if (url.startsWith('data:image')) {
      resolve(url);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

// Define TableCell interface to allow colSpan
interface TableCell {
  text: string;
  style?: string;
  colSpan?: number;
}

// Create the full document definition
const createDocumentDefinition = (
  title: string,
  imageBase64: string,
  measurements: Measurement[],
  includeScreenshot: boolean = true
): TDocumentDefinitions => {
  const content: Content[] = [
    // Header
    {
      text: title,
      style: 'header',
      margin: [0, 0, 0, 10]
    }
  ];
  
  // Add screenshot if included
  if (includeScreenshot && imageBase64) {
    content.push({
      image: imageBase64,
      width: 500,
      alignment: 'center',
      margin: [0, 0, 0, 20]
    });
  }
  
  // Add measurements section
  content.push(
    // Measurements section title
    {
      text: 'Messungen',
      style: 'subheader',
      margin: [0, 10, 0, 10]
    },
    
    // Generate measurements table
    createMeasurementsTable(measurements)
  );
  
  return {
    content: content,
    
    // Define styles
    styles: {
      header: {
        fontSize: 22,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 16,
        bold: true,
        margin: [0, 10, 0, 5]
      },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: 'black',
        fillColor: '#f3f3f3'
      },
      measurement: {
        margin: [0, 5, 0, 5]
      },
      measurementTitle: {
        bold: true,
        fontSize: 14,
        margin: [0, 10, 0, 5]
      },
      segmentTitle: {
        bold: true,
        fontSize: 12,
        color: '#555',
        margin: [0, 5, 0, 2]
      }
    },
    
    // Define defaults
    defaultStyle: {
      fontSize: 11
    }
  };
};

// Create the measurements table
const createMeasurementsTable = (measurements: Measurement[]): Content => {
  // If no measurements, return message
  if (measurements.length === 0) {
    return {
      text: 'Keine Messungen vorhanden',
      style: 'measurement',
      italics: true
    };
  }
  
  // Group measurements by type for better organization
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  
  const tableContent: Content[] = [];
  
  // Add length measurements
  if (lengthMeasurements.length > 0) {
    tableContent.push(
      { text: 'Längenmessungen', style: 'measurementTitle' },
      createTypedMeasurementsTable(lengthMeasurements, 'length')
    );
  }
  
  // Add height measurements
  if (heightMeasurements.length > 0) {
    tableContent.push(
      { text: 'Höhenmessungen', style: 'measurementTitle', margin: [0, 15, 0, 5] },
      createTypedMeasurementsTable(heightMeasurements, 'height')
    );
  }
  
  // Add area measurements
  if (areaMeasurements.length > 0) {
    tableContent.push(
      { text: 'Flächenmessungen', style: 'measurementTitle', margin: [0, 15, 0, 5] },
      createTypedMeasurementsTable(areaMeasurements, 'area')
    );
  }
  
  return tableContent;
};

// Create table for a specific measurement type
const createTypedMeasurementsTable = (measurements: Measurement[], type: 'length' | 'height' | 'area') => {
  // Define table headers based on type
  const headers: TableCell[] = [
    { text: 'Nr.', style: 'tableHeader' },
    { text: 'Wert', style: 'tableHeader' }
  ];
  
  // Add inclination column for length measurements
  if (type === 'length') {
    headers.push({ text: 'Neigung', style: 'tableHeader' });
  }
  
  // Add description column
  headers.push({ text: 'Beschreibung', style: 'tableHeader' });
  
  // Create the table body rows
  const body: TableCell[][] = [headers];
  
  measurements.forEach((measurement, index) => {
    const row: TableCell[] = [
      { text: (index + 1).toString() },
      { text: measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}` }
    ];
    
    // Add inclination for length measurements
    if (type === 'length') {
      row.push({ 
        text: measurement.inclination !== undefined 
          ? `${Math.abs(measurement.inclination).toFixed(1)}°` 
          : '–' 
      });
    }
    
    // Add description
    row.push({ text: measurement.description || '–' });
    
    body.push(row);
    
    // Add segment information for area measurements
    if (type === 'area' && measurement.segments && measurement.segments.length > 0) {
      // Add a row for segments header
      const segmentRow: TableCell[] = [
        { text: '', colSpan: 1 },
        { 
          text: 'Segmente:', 
          style: 'segmentTitle',
          colSpan: headers.length - 1
        }
      ];
      // Fill remaining cells with empty objects to match column count
      for (let i = 2; i < headers.length; i++) {
        segmentRow.push({ text: '' });
      }
      body.push(segmentRow);
      
      // Add rows for each segment
      measurement.segments.forEach((segment, segIndex) => {
        const segmentDetailRow: TableCell[] = [
          { text: '', colSpan: 1 },
          { 
            text: `Segment ${segIndex + 1}: ${segment.length.toFixed(2)} m`, 
            colSpan: headers.length - 1
          }
        ];
        // Fill remaining cells with empty objects to match column count
        for (let i = 2; i < headers.length; i++) {
          segmentDetailRow.push({ text: '' });
        }
        body.push(segmentDetailRow);
      });
    }
  });
  
  return {
    table: {
      headerRows: 1,
      widths: Array(headers.length).fill('*'),
      body: body
    },
    layout: {
      fillColor: function(rowIndex: number) {
        return (rowIndex % 2 === 0) ? '#fff' : '#f9f9f9';
      }
    }
  };
};
