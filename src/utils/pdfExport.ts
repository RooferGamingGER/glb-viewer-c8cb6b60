
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Measurement } from '@/hooks/useMeasurements';
import { TDocumentDefinitions, Content, StyleDictionary } from 'pdfmake/interfaces';
import { StoredScreenshot } from '@/utils/screenshot';

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
  screenshots?: StoredScreenshot[];
  measurements: Measurement[];
  filename?: string;
  includeScreenshot?: boolean;
  companyLogo?: string;
  companyName?: string;
  footerLogo?: string;
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
  },
  coverPageTitle: {
    fontSize: 26,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 40]
  },
  coverPageSubtitle: {
    fontSize: 18,
    alignment: 'center',
    margin: [0, 0, 0, 20]
  },
  companyInfo: {
    fontSize: 14,
    margin: [0, 5, 0, 2]
  }
};

export const exportMeasurementsToPDF = async ({
  title,
  screenshotUrl,
  screenshots = [],
  measurements,
  filename = 'messungen.pdf',
  includeScreenshot = true,
  companyLogo,
  companyName,
  projectDetails = {}
}: PDFExportOptions): Promise<void> => {
  try {
    let companyLogoBase64 = '';
    let footerLogoBase64 = '';
    let screenshotsBase64: {url: string, id: string}[] = [];
    
    // Process company logo if provided
    if (companyLogo) {
      try {
        companyLogoBase64 = await urlToBase64(companyLogo);
      } catch (error) {
        console.error('Failed to process company logo:', error);
      }
    }
    
    // Process footer logo (using provided file)
    try {
      // This will use the logo provided in the attachment for the footer
      const footerLogoURL = '/logo-roofergaming.png';
      footerLogoBase64 = await urlToBase64(footerLogoURL).catch(() => '');
    } catch (error) {
      console.error('Failed to process footer logo:', error);
    }
    
    // Process all screenshots if included
    if (includeScreenshot) {
      if (screenshots && screenshots.length > 0) {
        for (const screenshot of screenshots) {
          try {
            const base64 = await urlToBase64(screenshot.url);
            screenshotsBase64.push({ url: base64, id: screenshot.id });
          } catch (error) {
            console.error(`Failed to process screenshot ${screenshot.id}:`, error);
          }
        }
      } else if (screenshotUrl) {
        // Backward compatibility with old interface
        try {
          const base64 = await urlToBase64(screenshotUrl);
          screenshotsBase64.push({ url: base64, id: 'single' });
        } catch (error) {
          console.error('Failed to process screenshot:', error);
        }
      }
    }
    
    // Generate the document definition with the new layout
    const docDefinition = createDocumentDefinition(
      title, 
      screenshotsBase64, 
      measurements, 
      includeScreenshot,
      companyLogoBase64,
      companyName,
      projectDetails,
      footerLogoBase64
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

// Create the full document definition with the new multi-page layout
const createDocumentDefinition = (
  title: string,
  screenshots: {url: string, id: string}[],
  measurements: Measurement[],
  includeScreenshot: boolean = true,
  logoBase64: string = '',
  companyName: string = '',
  projectDetails: PDFExportOptions['projectDetails'] = {},
  footerLogoBase64: string = ''
): TDocumentDefinitions => {
  const content: Content[] = [];
  
  // Start with a cover page
  content.push(
    // Cover page content
    createCoverPage(title, logoBase64, companyName, projectDetails),
    
    // Page break
    { text: '', pageBreak: 'after' }
  );
  
  // Add measurements as the second section (on their own page)
  if (measurements.length > 0) {
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
    
    // Add a page break before screenshots if there are any
    if (includeScreenshot && screenshots.length > 0) {
      content.push({ text: '', pageBreak: 'after' });
    }
  }
  
  // Add screenshots as the third section (on their own page)
  if (includeScreenshot && screenshots.length > 0) {
    content.push(
      {
        text: 'Screenshots',
        style: 'subheader',
        margin: [0, 10, 0, 20]
      }
    );
    
    // Create screenshot gallery - 2 screenshots per page
    const screenshotGallery = createScreenshotGallery(screenshots);
    content.push(...screenshotGallery);
  }
  
  return {
    content: content,
    
    // Define styles
    styles: docStyles,
    
    // Define custom footer with company info
    footer: function(currentPage, pageCount) {
      const footerContent = [];
      
      // Add footer text
      const footerText = 'Kostenloser Service von Drohnenvermessung by RooferGaming - Homepage: drohnenvermessung-roofergaming.de - Email: info@drohnenvermessung-roofergaming.de';
      
      // Add company logo if available
      if (footerLogoBase64) {
        footerContent.push({
          columns: [
            { 
              image: footerLogoBase64,
              width: 40,
              alignment: 'left'
            },
            {
              text: footerText,
              style: 'footer',
              alignment: 'center',
              margin: [0, 6, 0, 0]
            },
            {
              text: `Seite ${currentPage} von ${pageCount}`,
              style: 'footer',
              alignment: 'right',
              margin: [0, 6, 0, 0]
            }
          ],
          margin: [40, 10, 40, 0]
        });
      } else {
        footerContent.push({
          columns: [
            { text: footerText, style: 'footer', alignment: 'left' },
            { text: `Seite ${currentPage} von ${pageCount}`, alignment: 'right', style: 'footer' }
          ],
          margin: [40, 10, 40, 0]
        });
      }
      
      return footerContent;
    },
    
    // Define defaults
    defaultStyle: {
      fontSize: 11
    },
    
    // Page margins [left, top, right, bottom]
    pageMargins: [40, 40, 40, 60]
  };
};

// Create a cover page
const createCoverPage = (
  title: string,
  logoBase64: string,
  companyName: string,
  projectDetails: PDFExportOptions['projectDetails'] = {}
): Content[] => {
  const coverPageContent: Content[] = [];
  
  // Add company logo if available
  if (logoBase64) {
    coverPageContent.push({
      image: logoBase64,
      width: 200,
      alignment: 'center',
      margin: [0, 40, 0, 20]
    });
  }
  
  // Add company name if available
  if (companyName) {
    coverPageContent.push({
      text: companyName,
      style: 'companyHeader',
      alignment: 'center',
      fontSize: 18,
      margin: [0, 10, 0, 40]
    });
  }
  
  // Add title
  coverPageContent.push({
    text: title,
    style: 'coverPageTitle'
  });
  
  // Add project details in an elegant table
  if (Object.values(projectDetails).some(val => val)) {
    const detailsTable = [];
    
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
      coverPageContent.push({
        table: {
          headerRows: 0,
          widths: ['30%', '70%'],
          body: detailsTable
        },
        layout: 'noBorders',
        margin: [0, 40, 0, 0]
      });
    }
  }
  
  return coverPageContent;
};

// Create a gallery of screenshots with 2 per page
const createScreenshotGallery = (screenshots: {url: string, id: string}[]): Content[] => {
  const galleryContent: Content[] = [];
  
  // Process screenshots in pairs
  for (let i = 0; i < screenshots.length; i += 2) {
    const row = [];
    
    // Add first screenshot of the pair
    row.push({
      image: screenshots[i].url,
      width: 250,
      alignment: 'center',
      margin: [0, 0, 0, 10]
    });
    
    // Add second screenshot if available
    if (i + 1 < screenshots.length) {
      row.push({
        image: screenshots[i + 1].url,
        width: 250,
        alignment: 'center',
        margin: [0, 0, 0, 10]
      });
    } else {
      // If there's no second screenshot, add an empty cell
      row.push({ text: '' });
    }
    
    // Add the row to the gallery
    galleryContent.push({
      columns: row,
      columnGap: 10,
      margin: [0, 10, 0, 0]
    });
    
    // Add page break after each pair, except for the last pair
    if (i + 2 < screenshots.length) {
      galleryContent.push({ text: '', pageBreak: 'after' });
    }
  }
  
  return galleryContent;
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
    { text: 'Bezeichnung', style: 'tableHeader' },
    { text: 'Wert', style: 'tableHeader' }
  ];
  
  // Add inclination column for length measurements
  if (type === 'length') {
    headers.push({ text: 'Neigung', style: 'tableHeader' });
  }
  
  // Create the table body rows
  const body: (TableCell | string)[][] = [headers];
  
  measurements.forEach((measurement, index) => {
    const row: TableCell[] = [
      { text: (index + 1).toString() },
      { text: measurement.description || '–' },
      { text: measurement.label || `${measurement.value.toFixed(2)} ${measurement.unit || (type === 'area' ? 'm²' : 'm')}` }
    ];
    
    // Add inclination for length measurements
    if (type === 'length') {
      row.push({ 
        text: measurement.inclination !== undefined 
          ? `${Math.abs(measurement.inclination).toFixed(1)}°` 
          : '–' 
      });
    }
    
    body.push(row);
    
    // Add segment information for area measurements
    if (type === 'area' && measurement.segments && measurement.segments.length > 0) {
      // Add a row for segments header
      const segmentRow: TableCell[] = [
        { text: '', colSpan: 1 },
        { 
          text: 'Segmente:', 
          style: 'segmentTitle',
          colSpan: type === 'area' ? 2 : 3 // FIX: This line had the type comparison error
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
            colSpan: type === 'area' ? 2 : 3 // FIX: This line had the type comparison error
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

