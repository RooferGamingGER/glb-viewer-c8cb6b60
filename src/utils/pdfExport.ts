
import html2pdf from 'html2pdf.js';
import { Measurement } from '@/hooks/useMeasurements';
import { ProjectDataType } from '@/components/measurement/ProjectDataForm';
import { toast } from 'sonner';

/**
 * Formats a measurement type to a readable string
 */
const formatType = (type: string): string => {
  switch (type) {
    case 'length': return 'Länge';
    case 'height': return 'Höhe';
    case 'area': return 'Fläche';
    default: return type;
  }
};

/**
 * Formats a value based on measurement type
 */
const formatValue = (value: number, type: string): string => {
  if (type === 'area') {
    return `${value.toFixed(2)} m²`;
  }
  return `${value.toFixed(2)} m`;
};

/**
 * Simple logo for the PDF
 */
const LOGO_BASE64 = 'data:image/png;base64,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';

/**
 * Creates an HTML template for the measurements export
 */
const createHtmlTemplate = (
  measurements: Measurement[],
  projectData?: ProjectDataType | null
): string => {
  // Format current date
  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Group measurements by type
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area');

  // Project information section
  let projectInfoHtml = '';
  if (projectData) {
    projectInfoHtml = `
      <div class="project-info">
        <h2>Projektinformationen</h2>
        <div class="info-grid">
          <div>
            <p><strong>Projekt:</strong> ${projectData.projectName || '-'}</p>
            <p><strong>Vorgang:</strong> ${projectData.currentProcess || '-'}</p>
          </div>
          <div>
            <p><strong>Erstellt am:</strong> ${currentDate}</p>
            <p><strong>Erstellt von:</strong> ${projectData.creator || '-'}</p>
          </div>
        </div>
        ${projectData.contactInfo ? `<p><strong>Kontakt für Rückfragen:</strong> ${projectData.contactInfo}</p>` : ''}
      </div>
      <hr>
    `;
  } else {
    projectInfoHtml = `
      <div class="project-info">
        <p><strong>Erstellt am:</strong> ${currentDate}</p>
      </div>
      <hr>
    `;
  }

  // Create length measurements table
  let lengthHtml = '';
  if (lengthMeasurements.length > 0) {
    lengthHtml = `
      <div class="measurement-section">
        <h2>Längenmessungen</h2>
        <table>
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Wert</th>
              <th>Neigung</th>
              <th>Beschreibung</th>
            </tr>
          </thead>
          <tbody>
            ${lengthMeasurements.map((m, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${m.label || `${m.value.toFixed(2)} ${m.unit || 'm'}`}</td>
                <td>${m.inclination !== undefined ? `${Math.abs(m.inclination).toFixed(1)}°` : '–'}</td>
                <td>${m.description || '–'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Create height measurements table
  let heightHtml = '';
  if (heightMeasurements.length > 0) {
    heightHtml = `
      <div class="measurement-section">
        <h2>Höhenmessungen</h2>
        <table>
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Wert</th>
              <th>Beschreibung</th>
            </tr>
          </thead>
          <tbody>
            ${heightMeasurements.map((m, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${m.label || `${m.value.toFixed(2)} ${m.unit || 'm'}`}</td>
                <td>${m.description || '–'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Create area measurements tables
  let areaHtml = '';
  if (areaMeasurements.length > 0) {
    areaHtml = `
      <div class="measurement-section">
        <h2>Flächenmessungen</h2>
        <table>
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Wert</th>
              <th>Beschreibung</th>
            </tr>
          </thead>
          <tbody>
            ${areaMeasurements.map((m, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${m.label || `${m.value.toFixed(2)} ${m.unit || 'm²'}`}</td>
                <td>${m.description || '–'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Add segments for area measurements
    areaMeasurements.forEach((measurement, mIndex) => {
      if (measurement.segments && measurement.segments.length > 0) {
        areaHtml += `
          <div class="segment-section">
            <h3>Segmente für Fläche ${mIndex + 1}</h3>
            <table class="segment-table">
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>Länge</th>
                </tr>
              </thead>
              <tbody>
                ${measurement.segments.map((segment, sIndex) => `
                  <tr>
                    <td>${sIndex + 1}</td>
                    <td>${segment.length.toFixed(2)} m</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    });
  }

  // Create the complete HTML document
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Messungsbericht</title>
      <style>
        body {
          font-family: Helvetica, Arial, sans-serif;
          color: #333;
          line-height: 1.4;
          margin: 0;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .title-section {
          text-align: right;
        }
        .title {
          color: #1e3a8a;
          font-size: 24px;
          margin: 0;
        }
        .subtitle {
          color: #475569;
          font-size: 18px;
          margin: 5px 0 0 0;
        }
        .logo {
          max-width: 150px;
          max-height: 80px;
        }
        h2 {
          color: #1e3a8a;
          font-size: 18px;
          margin-top: 20px;
          margin-bottom: 10px;
          page-break-after: avoid;
        }
        h3 {
          font-size: 16px;
          color: #64748b;
          margin-top: 15px;
          margin-bottom: 10px;
          page-break-after: avoid;
        }
        .info-grid {
          display: flex;
          justify-content: space-between;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          text-align: left;
        }
        th {
          background-color: #f8fafc;
          font-weight: 500;
        }
        .segment-table {
          margin-left: 20px;
          width: 80%;
        }
        .segment-section {
          margin-left: 20px;
          margin-bottom: 20px;
        }
        hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #64748b;
          margin-top: 30px;
          font-style: italic;
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
        }
        .project-info, .measurement-section {
          page-break-inside: avoid;
        }
        .measurement-section {
          page-break-before: auto;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${LOGO_BASE64}" alt="DrohnenGLB Logo" class="logo">
        <div class="title-section">
          <h1 class="title">DrohnenGLB by RooferGaming</h1>
          <p class="subtitle">Messungsbericht</p>
        </div>
      </div>
      
      ${projectInfoHtml}
      
      <div class="measurements">
        <h2>Messungsdaten</h2>
        ${lengthHtml}
        ${heightHtml}
        ${areaHtml}
      </div>
      
      <div class="footer">
        DrohnenGLB by RooferGaming - Präzise Vermessungen für Ihre Projekte
      </div>
    </body>
    </html>
  `;
};

/**
 * Generates and exports a PDF with measurement data
 */
export const generateMeasurementsPDF = async (
  measurements: Measurement[],
  defaultFilename: string,
  projectData?: ProjectDataType | null
): Promise<boolean> => {
  try {
    // Create HTML content
    const htmlContent = createHtmlTemplate(measurements, projectData);
    
    // Properly append and remove the container
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.width = '8.27in'; // A4 width
    container.style.height = 'auto';
    document.body.appendChild(container);
    
    toast.info('PDF wird generiert...');
    
    // Configure html2pdf options with better defaults for proper rendering
    const opt = {
      margin: 10,
      filename: defaultFilename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      // On mobile, we want to output as a blob instead of automatically saving
      outputPdf: 'blob'
    };
    
    try {
      // Generate PDF as blob
      const pdfBlob = await html2pdf().from(container).set(opt).outputPdf('blob');
      
      // Remove the container after PDF generation
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }

      // First try using File System Access API (modern browsers)
      const savedWithFSAPI = await saveWithFileSystemAccessAPI(pdfBlob, defaultFilename);
      
      if (!savedWithFSAPI) {
        // Fallback to traditional download method for mobile
        triggerMobileDownload(pdfBlob, defaultFilename);
      }
      
      return true;
    } catch (error) {
      console.error('Error generating or saving PDF:', error);
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in PDF generation process:', error);
    toast.error('Fehler beim Erstellen des PDFs: ' + (error instanceof Error ? error.message : 'Unbekannter Fehler'));
    throw error;
  }
};

/**
 * Creates a download link for a blob
 */
const createDownloadLink = (blob: Blob, filename: string): HTMLAnchorElement => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  return link;
};

/**
 * Triggers a download dialog for mobile
 */
const triggerMobileDownload = (blob: Blob, filename: string): void => {
  // For mobile devices, create an invisible link and click it
  const link = createDownloadLink(blob, filename);
  link.click();
  
  // Clean up after a timeout
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 100);
};

/**
 * Uses the File System Access API if available
 */
const saveWithFileSystemAccessAPI = async (blob: Blob, filename: string): Promise<boolean> => {
  try {
    // Use the properly typed window.showSaveFilePicker method
    if (window.showSaveFilePicker) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'PDF Document',
          accept: { 'application/pdf': ['.pdf'] },
        }],
      });
      
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    }
    return false;
  } catch (err) {
    // User cancelled or API not available
    return false;
  }
};

