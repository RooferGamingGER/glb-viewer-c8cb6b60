
import html2pdf from 'html2pdf.js';
import { Measurement } from '@/hooks/useMeasurements';
import { ProjectDataType } from '@/components/measurement/ProjectDataForm';

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
          margin: 20px;
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
        }
        h2 {
          color: #1e3a8a;
          font-size: 18px;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        h3 {
          font-size: 16px;
          color: #64748b;
          margin-top: 15px;
          margin-bottom: 10px;
        }
        .info-grid {
          display: flex;
          justify-content: space-between;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
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
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="/drohnenglb-logo.png" alt="DrohnenGLB Logo" class="logo">
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
    
    // Create temporary container for the HTML content
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    // Configure html2pdf options
    const opt = {
      margin: [10, 10, 10, 10],
      filename: defaultFilename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };
    
    // Generate PDF
    try {
      await html2pdf().set(opt).from(container).save();
      document.body.removeChild(container);
      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      document.body.removeChild(container);
      throw error;
    }
  } catch (error) {
    console.error('Error in PDF generation process:', error);
    throw error;
  }
};
