
import html2pdf from 'html2pdf.js';
import { Measurement } from '@/hooks/useMeasurements';

export interface CoverPageData {
  title: string;
  companyName: string;
  projectNumber: string;
  projectAddress: string;
  clientName: string;
  contactPerson: string;
  droneDate: string;
  creationDate: string;
  notes: string;
}

// Base64-encoded logo image for reliable embedding in PDF
const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAD8klEQVR4nO1XW2xMQRT9JBJPa0NEUEoVD4KI/BCPxI94WIhI2N1qqe2KiIiERDy70YhHgl/BRkR8LIk/QYgQm1pNqZZ4x0NVVVcpvVp3WmPunVnzuHdm785Upb3JyWZzZ+75zjn3zMwdSfqPLKMbtP4JGO4TaOsRrB/BJLrr+Aa3mwCXnUD5SWD5MWDhYSDL2uu4qcf+M8D4RmDkfUB6ApjytLezFiZidBOQvQd4t0P00/iBz0i8ZOODyNiJXyQX9gKrzzgL6KLdYGCPTM4Kpzd7gOwWIK0FSG0GXNcSL0BmBr19QNk5Z+GHGoCRbLyWw1+jtRDI2QOsPOEsvpTSs/w6m+MHlXQ6+UmcWfGcxLHHyiVcQFN39IG1jwE5LYGKNwyAq8FZ/MQnwNQnWtGO62TjScCt2L8DSIGY8Jze/DYguw3IogbJBDNZfQxYb+FMVNe0fPO9gDfHGK45YpxA/TXA3a417jv8/TDj3UDdDft5rr0KPOoFEd22AKWfQ4uvugCMtWgmmFHxpwXPqcbf/2yTwgLw6IvWcMvdwqSvMMr6aCpWLvcAm18E5n35VWDKs9CcO14BSw4DYxoASrJoBkj8iGYFxPq9FTmcSDYfuQckH7GfY0MvMOoekMQnwE0tfBWm7lQgXoDvPkCzgPk7lSy58Oim3YD4SGB6GxmfwbQT2PjQXjw3sFyI5+K9a54ZZyDdAgqPmhvP8f0Bs/7vP7XvWO5dRdwAujK7zQ1/zg7QCZQ0iiaCwuGqMxFHbwdIthb/0AektrMB+URWnzduXm5WOum0lsAJpLYIRXzI+AQUxOQWWq6KeHIrMLXHeG7eQaUZK5oH5DQJRbyjfLYnrwVpvAIJD5xEk9GC50BNK7DwRXDM+/f2TZdPQOw9gB4gvYXMbxPiea+Ck5nYzHXyOhCLZqJdDaCTSDwc+PuoPRHnHzYWTycgt43EtwniW4R7jfEK4LGJeC6WtHr77VyvENOcbCKcyUqLJoJikYGsrlKJr+OGEWKKr5rFV2vxpefNoZBOXdvMgIl4e/Ec3ZeB8feMxXNhc46LGHxSWJmJWKMQQmOdKyGI52ZLbhLFc3rzFXHnmBDC4m0s3kA8n8ScvaExRPGLLcJKlJ61qeZkKC9EwRdIvL1wI/FVJ41jnK0VcXwLbWQMhyL03hIvQhDfEHrhRvvZeK1wLvrxXfHv3NL9sVLM0JLzgXe7UOPphY+LWcPZeO5vUx7aij87ZL1lhiv4uV/71a1uUyNmIa0H2HYh9mSGK7Y/ANZeoOc3Q2XSf0QCPwFMnCZVVryuPwAAAABJRU5ErkJggg==";

export const exportMeasurementsToPdf = async (
  measurements: Measurement[],
  coverData: CoverPageData
): Promise<boolean> => {
  try {
    // Create a container for the PDF content
    const container = document.createElement('div');
    container.className = 'pdf-container';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.padding = '20px';
    container.style.color = '#000000';
    container.style.position = 'relative';
    
    // Create and add styles for page layouts
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .pdf-page {
        position: relative;
        padding-bottom: 20mm;
      }
      .pdf-page-break {
        page-break-after: always;
      }
      .pdf-page-end {
        page-break-after: avoid !important;
      }
      .logo-container {
        text-align: center;
        margin-bottom: 10px;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .logo-image {
        display: flex;
        align-items: center;
        white-space: nowrap;
      }
      .logo-icon {
        height: 32px;
        width: auto;
        margin-right: 10px;
      }
      .logo-text {
        font-size: 32px;
        font-weight: bold;
        color: #333;
        white-space: nowrap;
      }
      .company-info {
        text-align: center;
        margin-bottom: 20px;
        color: #333;
        line-height: 1.6;
      }
      .company-slogan {
        font-style: italic;
        margin-top: 10px;
        color: #555;
        font-size: 14px;
      }
      .cover-upper {
        margin-bottom: 30px;
      }
      .cover-title {
        font-size: 28px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #ddd;
      }
      .project-info-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      .project-info-table th {
        text-align: left;
        width: 40%;
        padding: 8px;
        font-weight: normal;
        color: #555;
        vertical-align: top;
        border-bottom: 1px solid #eee;
      }
      .project-info-table td {
        width: 60%;
        padding: 8px;
        font-weight: 500;
        vertical-align: top;
        border-bottom: 1px solid #eee;
      }
      .measurement-section {
        margin-bottom: 20px;
      }
      .measurement-section h2 {
        font-size: 18px;
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 1px solid #ddd;
      }
      .measurement-section h3 {
        font-size: 16px;
        margin-bottom: 8px;
        color: #555;
      }
      .measurement-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
      }
      .measurement-table th {
        background-color: #f8f9fa;
        padding: 8px;
        text-align: left;
        font-weight: 600;
        border: 1px solid #ddd;
      }
      .measurement-table td {
        padding: 8px;
        border: 1px solid #ddd;
        vertical-align: top;
      }
      .measurement-table tr:nth-child(even) {
        background-color: #f9fafb;
      }
      .segment-table {
        width: 95%;
        margin-left: 5%;
        border-collapse: collapse;
        margin-bottom: 15px;
      }
      .segment-table th {
        background-color: #f0f2f5;
        padding: 6px;
        text-align: left;
        font-weight: 600;
        border: 1px solid #ddd;
        font-size: 13px;
      }
      .segment-table td {
        padding: 6px;
        border: 1px solid #ddd;
        font-size: 13px;
      }
      .summary-card {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .summary-stats {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 10px;
      }
      .summary-stat {
        background-color: white;
        border-radius: 6px;
        padding: 10px;
        flex: 1;
        min-width: 100px;
        text-align: center;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .summary-stat-value {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .summary-stat-label {
        font-size: 12px;
        color: #666;
      }
      .footer {
        position: fixed;
        bottom: 10mm;
        width: 100%;
        text-align: center;
        font-size: 9px;
        color: #777;
      }
      .page-number:after {
        content: counter(page);
      }
    `;
    document.head.appendChild(styleElement);
    
    // Add container to document before building content
    document.body.appendChild(container);
    
    // Determine which page will be the last to avoid page breaks
    const hasAreaMeasurements = measurements.filter(m => m.type === 'area').length > 0;
    
    // Create cover page WITH page break after
    const coverPage = document.createElement('div');
    coverPage.className = 'pdf-page pdf-page-break';
    coverPage.appendChild(createCoverPage(coverData));
    container.appendChild(coverPage);
    
    // Create measurement summary section WITH page break
    const summaryPage = document.createElement('div');
    summaryPage.className = 'pdf-page pdf-page-break';
    summaryPage.appendChild(createMeasurementSummary(measurements));
    container.appendChild(summaryPage);
    
    // Create measurement data section - separate by measurement type
    // Length measurements
    const lengthMeasurements = measurements.filter(m => m.type === 'length');
    if (lengthMeasurements.length > 0) {
      const lengthPage = document.createElement('div');
      lengthPage.className = 'pdf-page pdf-page-break';
      lengthPage.appendChild(createMeasurementTypeSection('length', lengthMeasurements));
      container.appendChild(lengthPage);
    }
    
    // Height measurements
    const heightMeasurements = measurements.filter(m => m.type === 'height');
    if (heightMeasurements.length > 0) {
      const heightPage = document.createElement('div');
      heightPage.className = 'pdf-page pdf-page-break';
      heightPage.appendChild(createMeasurementTypeSection('height', heightMeasurements));
      container.appendChild(heightPage);
    }
    
    // Area measurements - ALWAYS as the last section
    const areaMeasurements = measurements.filter(m => m.type === 'area');
    if (areaMeasurements.length > 0) {
      const areaPage = document.createElement('div');
      areaPage.className = 'pdf-page pdf-page-end';
      areaPage.appendChild(createMeasurementTypeSection('area', areaMeasurements));
      container.appendChild(areaPage);
    }
    
    // Add footer with page number and company info
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.innerHTML = `
      DrohnenGLB by RooferGaming® | www.drohnenglb.de | Seite <span class="page-number"></span>
    `;
    container.appendChild(footer);
    
    // Configure html2pdf options
    const pdfOptions = {
      margin: [15, 15, 25, 15], // [top, right, bottom, left] - increased bottom margin for footer
      filename: `DrohnenGLB_Vermessungsbericht_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2.5,
        useCORS: true,
        logging: false,
        letterRendering: true,
        windowWidth: 1200 
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      },
      pagebreak: { mode: ['css'] }
    };
    
    // Add a longer delay to ensure DOM rendering is complete
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate the PDF
    await html2pdf().from(container).set(pdfOptions).save();
    
    // Clean up
    document.body.removeChild(container);
    document.head.removeChild(styleElement);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Clean up in case of error
    const container = document.querySelector('.pdf-container');
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    const styleElement = document.querySelector('style');
    if (styleElement && styleElement.textContent.includes('pdf-page')) {
      document.head.removeChild(styleElement);
    }
    return false;
  }
};

const createCoverPage = (coverData: CoverPageData): HTMLElement => {
  const coverPage = document.createElement('div');
  coverPage.style.height = '100%';
  coverPage.style.display = 'flex';
  coverPage.style.flexDirection = 'column';
  coverPage.style.padding = '20px';

  // Upper section - Company logo and info
  const upperSection = document.createElement('div');
  upperSection.className = 'cover-upper';
  
  // Logo container with flex layout
  const logoContainer = document.createElement('div');
  logoContainer.className = 'logo-container';
  
  // Create a wrapper for logo and text with flex layout
  const logoImage = document.createElement('div');
  logoImage.className = 'logo-image';
  
  // Create and add the logo icon using Base64 data
  const logoIcon = document.createElement('img');
  logoIcon.className = 'logo-icon';
  logoIcon.src = LOGO_BASE64;
  logoIcon.alt = 'DrohnenGLB Logo';
  logoIcon.style.height = '40px';
  logoIcon.style.width = 'auto';
  logoIcon.style.marginRight = '12px';
  logoImage.appendChild(logoIcon);
  
  // Create and add the logo text
  const logoText = document.createElement('span');
  logoText.className = 'logo-text';
  logoText.textContent = 'DrohnenGLB by RooferGaming®';
  logoImage.appendChild(logoText);
  
  logoContainer.appendChild(logoImage);
  upperSection.appendChild(logoContainer);
  
  // Company information section with vertical alignment
  const companyInfo = document.createElement('div');
  companyInfo.className = 'company-info';
  
  const websiteInfo = document.createElement('div');
  websiteInfo.style.fontSize = '14px';
  websiteInfo.textContent = 'GLB Viewer: drohnenglb.de | Drohnenaufmaß: drohnenvermessung-roofergaming.de';
  companyInfo.appendChild(websiteInfo);
  
  const emailInfo = document.createElement('div');
  emailInfo.style.fontSize = '14px';
  emailInfo.textContent = 'Email: info@drohnenvermessung-roofergaming.de';
  companyInfo.appendChild(emailInfo);
  
  const companySlogan = document.createElement('div');
  companySlogan.className = 'company-slogan';
  companySlogan.textContent = 'Fliegen - Digitalisieren - tolle Ergebnisse';
  companyInfo.appendChild(companySlogan);
  
  upperSection.appendChild(companyInfo);
  coverPage.appendChild(upperSection);
  
  // Cover title - centered
  const coverTitle = document.createElement('h1');
  coverTitle.className = 'cover-title';
  coverTitle.textContent = coverData.title || 'Vermessungsbericht';
  coverPage.appendChild(coverTitle);
  
  // Project information table
  const projectInfoTable = document.createElement('table');
  projectInfoTable.className = 'project-info-table';
  
  // Helper function to add row to table
  const addTableRow = (label: string, value: string | undefined) => {
    if (!value) return;
    
    const row = document.createElement('tr');
    
    const labelCell = document.createElement('th');
    labelCell.textContent = label;
    row.appendChild(labelCell);
    
    const valueCell = document.createElement('td');
    valueCell.textContent = value;
    row.appendChild(valueCell);
    
    projectInfoTable.appendChild(row);
  };
  
  // Add project information rows
  addTableRow('Projektnummer', coverData.projectNumber);
  addTableRow('Objektadresse', coverData.projectAddress);
  addTableRow('Auftraggeber', coverData.clientName);
  addTableRow('Ausführender Betrieb', coverData.companyName);
  addTableRow('Ansprechpartner', coverData.contactPerson);
  addTableRow('Datum der Drohnenaufnahmen', coverData.droneDate ? new Date(coverData.droneDate).toLocaleDateString('de-DE') : undefined);
  addTableRow('Erstellungsdatum', new Date().toLocaleDateString('de-DE'));
  
  coverPage.appendChild(projectInfoTable);
  
  // Notes section (if provided)
  if (coverData.notes && coverData.notes.trim()) {
    const notesSection = document.createElement('div');
    notesSection.style.marginTop = '30px';
    
    const notesTitle = document.createElement('h3');
    notesTitle.style.fontSize = '16px';
    notesTitle.style.marginBottom = '10px';
    notesTitle.textContent = 'Bemerkungen';
    notesSection.appendChild(notesTitle);
    
    const notesContent = document.createElement('p');
    notesContent.style.margin = '0';
    notesContent.style.fontSize = '14px';
    notesContent.style.lineHeight = '1.5';
    notesContent.style.whiteSpace = 'pre-line';
    notesContent.textContent = coverData.notes;
    notesSection.appendChild(notesContent);
    
    coverPage.appendChild(notesSection);
  }
  
  return coverPage;
};

const createMeasurementSummary = (measurements: Measurement[]): HTMLElement => {
  const summarySection = document.createElement('div');
  summarySection.className = 'measurement-section';
  
  // Create section title
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'Messungen - Übersicht';
  summarySection.appendChild(sectionTitle);
  
  // Create summary card
  const summaryCard = document.createElement('div');
  summaryCard.className = 'summary-card';
  
  // Filter measurements by type
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  
  // Create summary text
  const summaryText = document.createElement('p');
  summaryText.style.margin = '0 0 15px 0';
  summaryText.textContent = `Dieser Bericht enthält insgesamt ${measurements.length} Messungen, die mit DrohnenGLB erstellt wurden.`;
  summaryCard.appendChild(summaryText);
  
  // Create summary stats
  const summaryStats = document.createElement('div');
  summaryStats.className = 'summary-stats';
  
  // Helper function to create a stat box
  const createStatBox = (value: number, label: string, icon: string) => {
    const statBox = document.createElement('div');
    statBox.className = 'summary-stat';
    
    const statValue = document.createElement('div');
    statValue.className = 'summary-stat-value';
    statValue.textContent = value.toString();
    statBox.appendChild(statValue);
    
    const statLabel = document.createElement('div');
    statLabel.className = 'summary-stat-label';
    statLabel.textContent = `${icon} ${label}`;
    statBox.appendChild(statLabel);
    
    return statBox;
  };
  
  // Add stat boxes
  summaryStats.appendChild(createStatBox(measurements.length, 'Gesamt', '📊'));
  summaryStats.appendChild(createStatBox(lengthMeasurements.length, 'Längen', '📏'));
  summaryStats.appendChild(createStatBox(heightMeasurements.length, 'Höhen', '📐'));
  summaryStats.appendChild(createStatBox(areaMeasurements.length, 'Flächen', '🔲'));
  
  summaryCard.appendChild(summaryStats);
  summarySection.appendChild(summaryCard);
  
  // Create detailed summary table
  const detailsTitle = document.createElement('h3');
  detailsTitle.textContent = 'Detaillierte Übersicht';
  detailsTitle.style.marginTop = '20px';
  summarySection.appendChild(detailsTitle);
  
  // Create the summary table
  const summaryTable = document.createElement('table');
  summaryTable.className = 'measurement-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Nr.', 'Beschreibung', 'Typ', 'Wert', 'Neigung'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  
  tableHead.appendChild(headerRow);
  summaryTable.appendChild(tableHead);
  
  // Table body
  const tableBody = document.createElement('tbody');
  
  measurements.forEach((measurement, index) => {
    const row = document.createElement('tr');
    
    // Nr column
    const numCell = document.createElement('td');
    numCell.textContent = (index + 1).toString();
    row.appendChild(numCell);
    
    // Description column
    const descCell = document.createElement('td');
    descCell.textContent = measurement.description || '–';
    row.appendChild(descCell);
    
    // Type column
    const typeCell = document.createElement('td');
    typeCell.textContent = measurement.type === 'length' ? 'Länge' : 
                         measurement.type === 'height' ? 'Höhe' : 
                         measurement.type === 'area' ? 'Fläche' : '–';
    row.appendChild(typeCell);
    
    // Value column
    const valueCell = document.createElement('td');
    valueCell.textContent = `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`;
    if (measurement.type === 'area') {
      valueCell.textContent = `${measurement.value.toFixed(2)} ${measurement.unit || 'm²'}`;
    }
    valueCell.style.fontWeight = 'bold';
    row.appendChild(valueCell);
    
    // Inclination column
    const inclinationCell = document.createElement('td');
    if (measurement.type === 'length' && measurement.inclination !== undefined) {
      inclinationCell.textContent = `${Math.abs(measurement.inclination).toFixed(1)}°`;
    } else {
      inclinationCell.textContent = '–';
    }
    row.appendChild(inclinationCell);
    
    tableBody.appendChild(row);
  });
  
  summaryTable.appendChild(tableBody);
  summarySection.appendChild(summaryTable);
  
  return summarySection;
};

const createMeasurementTypeSection = (type: string, measurements: Measurement[]): HTMLElement => {
  const section = document.createElement('div');
  section.className = 'measurement-section';
  
  // Create title based on measurement type
  const title = document.createElement('h2');
  title.textContent = type === 'length' ? 'Längenmessungen' : 
                      type === 'height' ? 'Höhenmessungen' : 
                      'Flächenmessungen';
  section.appendChild(title);
  
  // Create description based on type
  const description = document.createElement('p');
  description.style.marginBottom = '15px';
  if (type === 'length') {
    description.textContent = `Dieser Abschnitt enthält ${measurements.length} Längenmessungen. Alle Messungen sind in Meter (m) angegeben.`;
  } else if (type === 'height') {
    description.textContent = `Dieser Abschnitt enthält ${measurements.length} Höhenmessungen. Alle Messungen sind in Meter (m) angegeben.`;
  } else {
    description.textContent = `Dieser Abschnitt enthält ${measurements.length} Flächenmessungen. Alle Messungen sind in Quadratmeter (m²) angegeben.`;
  }
  section.appendChild(description);
  
  // Create measurements table
  const table = document.createElement('table');
  table.className = 'measurement-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Columns depend on measurement type
  let columns: string[];
  if (type === 'length') {
    columns = ['Nr.', 'Beschreibung', 'Länge (m)', 'Neigung'];
  } else if (type === 'height') {
    columns = ['Nr.', 'Beschreibung', 'Höhe (m)'];
  } else { // area
    columns = ['Nr.', 'Beschreibung', 'Fläche (m²)'];
  }
  
  columns.forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  
  tableHead.appendChild(headerRow);
  table.appendChild(tableHead);
  
  // Table body
  const tableBody = document.createElement('tbody');
  
  measurements.forEach((measurement, index) => {
    const row = document.createElement('tr');
    
    // Nr column
    const numCell = document.createElement('td');
    numCell.textContent = (index + 1).toString();
    row.appendChild(numCell);
    
    // Description column
    const descCell = document.createElement('td');
    descCell.textContent = measurement.description || '–';
    row.appendChild(descCell);
    
    // Value column
    const valueCell = document.createElement('td');
    valueCell.textContent = `${measurement.value.toFixed(2)} ${measurement.unit || (type === 'area' ? 'm²' : 'm')}`;
    valueCell.style.fontWeight = 'bold';
    row.appendChild(valueCell);
    
    // Inclination column for length measurements
    if (type === 'length') {
      const inclinationCell = document.createElement('td');
      if (measurement.inclination !== undefined) {
        inclinationCell.textContent = `${Math.abs(measurement.inclination).toFixed(1)}°`;
      } else {
        inclinationCell.textContent = '–';
      }
      row.appendChild(inclinationCell);
    }
    
    tableBody.appendChild(row);
  });
  
  table.appendChild(tableBody);
  section.appendChild(table);
  
  // For area measurements, add segments tables
  if (type === 'area') {
    measurements.forEach((measurement, mIndex) => {
      if (measurement.segments && measurement.segments.length > 0) {
        const segmentsTitle = document.createElement('h3');
        segmentsTitle.textContent = `Teilmessungen für Fläche ${mIndex + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
        segmentsTitle.style.marginTop = '20px';
        segmentsTitle.style.marginBottom = '10px';
        section.appendChild(segmentsTitle);
        
        const segmentsTable = document.createElement('table');
        segmentsTable.className = 'segment-table';
        
        // Segments table header
        const segmentsTableHead = document.createElement('thead');
        const segmentsHeaderRow = document.createElement('tr');
        
        ['Teilmessung', 'Länge (m)'].forEach(column => {
          const th = document.createElement('th');
          th.textContent = column;
          segmentsHeaderRow.appendChild(th);
        });
        
        segmentsTableHead.appendChild(segmentsHeaderRow);
        segmentsTable.appendChild(segmentsTableHead);
        
        // Segments table body
        const segmentsTableBody = document.createElement('tbody');
        
        measurement.segments.forEach((segment, sIndex) => {
          const segmentRow = document.createElement('tr');
          
          // Segment number column
          const segmentNumCell = document.createElement('td');
          segmentNumCell.textContent = `Teilmessung ${sIndex + 1}`;
          segmentRow.appendChild(segmentNumCell);
          
          // Segment length column
          const segmentLengthCell = document.createElement('td');
          segmentLengthCell.textContent = `${segment.length.toFixed(2)} m`;
          segmentRow.appendChild(segmentLengthCell);
          
          segmentsTableBody.appendChild(segmentRow);
        });
        
        segmentsTable.appendChild(segmentsTableBody);
        section.appendChild(segmentsTable);
      }
    });
  }
  
  return section;
};
