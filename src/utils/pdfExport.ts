
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Measurement } from '@/hooks/useMeasurements';
import { TDocumentDefinitions, Content, StyleDictionary } from 'pdfmake/interfaces';

// Register fonts
pdfMake.vfs = pdfFonts.vfs;

// Define fonts
const defaultFonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

interface PDFExportOptions {
  title: string;
  screenshotUrl?: string;
  measurements: Measurement[];
  filename?: string;
  includeScreenshot?: boolean;
  companyLogo?: string;
  companyName?: string;
  projectDetails?: {
    projectName?: string;
    projectNumber?: string;
    location?: string;
    date?: string;
    userName?: string;
  };
}

// PDF Document Styles
const docStyles: StyleDictionary = {
  header: {
    fontSize: 22,
    bold: true,
    alignment: 'center',
    margin: [0, 10, 0, 20]
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
  companyHeader: {
    fontSize: 10,
    color: '#666',
    alignment: 'right'
  },
  footer: {
    fontSize: 8,
    color: '#666',
    alignment: 'center',
    margin: [0, 10, 0, 0]
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
  },
  projectDetailLabel: {
    bold: true,
    fontSize: 10,
    color: '#444'
  },
  projectDetailValue: {
    fontSize: 10
  }
};

export const exportMeasurementsToPDF = async ({
  title,
  screenshotUrl,
  measurements,
  filename = 'messungen.pdf',
  includeScreenshot = true,
  companyLogo,
  companyName,
  projectDetails = {}
}: PDFExportOptions): Promise<void> => {
  try {
    let imageBase64 = '';
    let logoBase64 = '';
    
    // Process screenshot if included and URL is provided
    if (includeScreenshot && screenshotUrl) {
      try {
        imageBase64 = await urlToBase64(screenshotUrl);
      } catch (error) {
        console.error('Failed to process screenshot:', error);
        // Continue without the screenshot if it fails
      }
    }
    
    // Process company logo if provided
    if (companyLogo) {
      try {
        logoBase64 = await urlToBase64(companyLogo);
      } catch (error) {
        console.error('Failed to process company logo:', error);
        // Continue without the logo if it fails
      }
    }
    
    // Generate the document definition
    const docDefinition = createDocumentDefinition(
      title, 
      imageBase64, 
      measurements, 
      includeScreenshot,
      logoBase64,
      companyName,
      projectDetails
    );
    
    // Create and download the PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.download(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
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
  text?: string;
  style?: string;
  colSpan?: number;
  rowSpan?: number;
  image?: string;
  width?: number;
  alignment?: string;
  border?: boolean | [boolean, boolean, boolean, boolean];
}

// Format the current date to a local string
const formatDate = (date: Date = new Date()): string => {
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Create the full document definition
const createDocumentDefinition = (
  title: string,
  imageBase64: string,
  measurements: Measurement[],
  includeScreenshot: boolean = true,
  logoBase64: string = '',
  companyName: string = '',
  projectDetails: PDFExportOptions['projectDetails'] = {}
): TDocumentDefinitions => {
  const content: Content[] = [];
  
  // Add company info and logo in header if provided
  if (logoBase64 || companyName) {
    const headerContent: any[] = [];
    
    if (logoBase64) {
      headerContent.push({
        image: logoBase64,
        width: 100,
        alignment: 'left'
      });
    }
    
    headerContent.push({
      text: companyName || '',
      style: 'companyHeader',
      alignment: 'right',
      margin: [0, 10, 0, 0]
    });
    
    content.push({
      columns: headerContent,
      margin: [0, 0, 0, 20]
    });
  }
  
  // Add title
  content.push({
    text: title,
    style: 'header'
  });
  
  // Add project details if any are provided
  if (Object.values(projectDetails).some(val => val)) {
    const detailsTable: any[] = [];
    
    if (projectDetails.projectName) {
      detailsTable.push([
        { text: 'Projektname:', style: 'projectDetailLabel' },
        { text: projectDetails.projectName, style: 'projectDetailValue' }
      ]);
    }
    
    if (projectDetails.projectNumber) {
      detailsTable.push([
        { text: 'Projektnummer:', style: 'projectDetailLabel' },
        { text: projectDetails.projectNumber, style: 'projectDetailValue' }
      ]);
    }
    
    if (projectDetails.location) {
      detailsTable.push([
        { text: 'Standort:', style: 'projectDetailLabel' },
        { text: projectDetails.location, style: 'projectDetailValue' }
      ]);
    }
    
    if (projectDetails.date) {
      detailsTable.push([
        { text: 'Datum:', style: 'projectDetailLabel' },
        { text: projectDetails.date, style: 'projectDetailValue' }
      ]);
    }
    
    if (projectDetails.userName) {
      detailsTable.push([
        { text: 'Erstellt von:', style: 'projectDetailLabel' },
        { text: projectDetails.userName, style: 'projectDetailValue' }
      ]);
    }
    
    if (detailsTable.length > 0) {
      content.push({
        table: {
          widths: ['30%', '70%'],
          body: detailsTable
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20]
      });
    }
  }
  
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
    styles: docStyles,
    
    // Define footer
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          { text: formatDate(), alignment: 'left', style: 'footer' },
          { text: `Seite ${currentPage} von ${pageCount}`, alignment: 'right', style: 'footer' }
        ],
        margin: [40, 10, 40, 0]
      };
    },
    
    // Define defaults
    defaultStyle: {
      fontSize: 11
    },
    
    // Page margins [left, top, right, bottom]
    pageMargins: [40, 40, 40, 60]
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
  const body: (TableCell | string)[][] = [headers];
  
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
