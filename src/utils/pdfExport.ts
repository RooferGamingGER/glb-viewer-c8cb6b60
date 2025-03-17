import html2pdf from 'html2pdf.js';
import { Measurement } from '@/hooks/useMeasurements';

export interface CoverPageData {
  title: string;
  companyName: string;
  projectNumber: string;
  projectAddress: string;
  clientName: string;
  contactPerson: string;
  creationDate: string;
  notes: string;
}

const createTextLogo = () => {
  const logoContainer = document.createElement('div');
  logoContainer.style.textAlign = 'center';
  logoContainer.style.marginBottom = '30px';
  
  const logoText = document.createElement('div');
  logoText.style.fontSize = '28px';
  logoText.style.fontWeight = 'bold';
  logoText.style.color = '#333';
  logoText.style.marginBottom = '5px';
  logoText.textContent = 'DrohnenGLB';
  
  const byText = document.createElement('div');
  byText.style.fontSize = '16px';
  byText.style.color = '#555';
  byText.textContent = 'by RooferGaming';
  
  logoContainer.appendChild(logoText);
  logoContainer.appendChild(byText);
  
  return logoContainer;
};

export const exportMeasurementsToPdf = async (
  measurements: Measurement[],
  coverData: CoverPageData
): Promise<boolean> => {
  try {
    // Create a container for the PDF content
    const container = document.createElement('div');
    container.className = 'pdf-container';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.color = '#333333';
    container.style.position = 'relative';
    
    // Create and add styles for page layouts
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .pdf-page {
        position: relative;
        padding: 15mm 15mm 15mm 15mm;
        page-break-after: always;
      }
      .pdf-page-end {
        page-break-after: avoid !important;
      }
      .company-info {
        text-align: center;
        margin-bottom: 40px;
        color: #555;
        line-height: 1.8;
      }
      .cover-title {
        font-size: 32px;
        font-weight: 600;
        text-align: center;
        margin: 40px 0;
        color: #333;
      }
      .project-info-table {
        width: 100%;
        border-collapse: collapse;
        margin: 30px 0;
      }
      .project-info-table th {
        text-align: left;
        width: 40%;
        padding: 12px;
        font-weight: normal;
        color: #555;
        vertical-align: top;
        border-bottom: 1px solid #f0f0f0;
      }
      .project-info-table td {
        width: 60%;
        padding: 12px;
        font-weight: 500;
        vertical-align: top;
        border-bottom: 1px solid #f0f0f0;
      }
      .measurement-section {
        margin-bottom: 30px;
      }
      .header {
        text-align: center;
        padding-bottom: 15px;
        margin-bottom: 30px;
        border-bottom: 1px solid #eaeaea;
      }
      .header-title {
        font-size: 20px;
        font-weight: 600;
        color: #444;
      }
      .measurement-section h2 {
        font-size: 24px;
        margin-bottom: 20px;
        color: #333;
        font-weight: 600;
        padding-bottom: 10px;
        border-bottom: 1px solid #e0e0e0;
      }
      .measurement-section h3 {
        font-size: 18px;
        margin: 20px 0 15px 0;
        color: #444;
        font-weight: 500;
      }
      .measurement-section p {
        color: #555;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      .measurement-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 25px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }
      .measurement-table th {
        background-color: #f8f9fa;
        padding: 12px;
        text-align: left;
        font-weight: 600;
        border: 1px solid #eee;
        color: #333;
      }
      .measurement-table td {
        padding: 12px;
        border: 1px solid #eee;
        vertical-align: middle;
      }
      .measurement-table tr:nth-child(even) {
        background-color: #fafbfc;
      }
      .segment-table {
        width: 95%;
        margin-left: 5%;
        border-collapse: collapse;
        margin-bottom: 25px;
      }
      .segment-table th {
        background-color: #f8f9fa;
        padding: 10px;
        text-align: left;
        font-weight: 500;
        border: 1px solid #eee;
        color: #444;
      }
      .segment-table td {
        padding: 10px;
        border: 1px solid #eee;
      }
      .summary-card {
        background-color: #ffffff;
        border-radius: 8px;
        margin-bottom: 30px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        border: 1px solid #f0f0f0;
      }
      .summary-stats {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 15px;
        margin-top: 20px;
      }
      .summary-stat {
        background-color: #f9fafc;
        border-radius: 8px;
        padding: 15px;
        flex: 1;
        min-width: 120px;
        text-align: center;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        border: 1px solid #f0f0f0;
      }
      .summary-stat-value {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 8px;
        color: #333;
      }
      .summary-stat-label {
        font-size: 14px;
        color: #555;
        font-weight: 500;
      }
      .promo-section {
        text-align: center;
        margin-top: 40px;
        padding: 20px;
        background-color: #f9fafc;
        border-radius: 8px;
        border: 1px solid #f0f0f0;
      }
      .promo-item {
        margin: 10px 0;
        font-size: 16px;
        line-height: 1.5;
      }
      .promo-highlight {
        font-weight: 600;
        color: #0066cc;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Add container to document before building content
    document.body.appendChild(container);
    
    // Create cover page
    const coverPage = document.createElement('div');
    coverPage.className = 'pdf-page';
    coverPage.appendChild(createCoverPage(coverData));
    container.appendChild(coverPage);
    
    // Create measurement summary section as page 2
    const summaryPage = document.createElement('div');
    summaryPage.className = 'pdf-page';
    summaryPage.appendChild(createMeasurementSummary(measurements, coverData.title));
    container.appendChild(summaryPage);
    
    // Create separate pages for each measurement type
    // Length measurements
    const lengthMeasurements = measurements.filter(m => m.type === 'length');
    if (lengthMeasurements.length > 0) {
      const lengthPage = document.createElement('div');
      lengthPage.className = 'pdf-page';
      lengthPage.appendChild(createMeasurementTypeSection('length', lengthMeasurements, coverData.title));
      container.appendChild(lengthPage);
    }
    
    // Area measurements
    const areaMeasurements = measurements.filter(m => m.type === 'area');
    if (areaMeasurements.length > 0) {
      const areaPage = document.createElement('div');
      areaPage.className = 'pdf-page';
      areaPage.appendChild(createMeasurementTypeSection('area', areaMeasurements, coverData.title));
      container.appendChild(areaPage);
    }
    
    // Height measurements
    const heightMeasurements = measurements.filter(m => m.type === 'height');
    if (heightMeasurements.length > 0) {
      const heightPage = document.createElement('div');
      heightPage.className = 'pdf-page-end';
      heightPage.appendChild(createMeasurementTypeSection('height', heightMeasurements, coverData.title));
      container.appendChild(heightPage);
    }
    
    // Configure html2pdf options
    const pdfOptions = {
      margin: [10, 10, 10, 10], // [top, right, bottom, left] in mm
      filename: `Vermessungsbericht_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { 
        mode: ['css', 'avoid-all'],
        before: '.pdf-page',
        avoid: ['tr', 'th', 'td', '.avoid-break']
      }
    };
    
    // Add a delay to ensure DOM rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
  
  // Add text-based logo
  coverPage.appendChild(createTextLogo());
  
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
  addTableRow('Erstellungsdatum', coverData.creationDate ? new Date(coverData.creationDate).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE'));
  
  coverPage.appendChild(projectInfoTable);
  
  // Notes section (if provided)
  if (coverData.notes && coverData.notes.trim()) {
    const notesSection = document.createElement('div');
    notesSection.style.marginTop = '30px';
    
    const notesTitle = document.createElement('h3');
    notesTitle.style.fontSize = '18px';
    notesTitle.style.marginBottom = '12px';
    notesTitle.style.color = '#444';
    notesTitle.textContent = 'Bemerkungen';
    notesSection.appendChild(notesTitle);
    
    const notesContent = document.createElement('p');
    notesContent.style.margin = '0';
    notesContent.style.fontSize = '14px';
    notesContent.style.lineHeight = '1.5';
    notesContent.style.whiteSpace = 'pre-line';
    notesContent.style.color = '#555';
    notesContent.textContent = coverData.notes;
    notesSection.appendChild(notesContent);
    
    coverPage.appendChild(notesSection);
  }
  
  // Add promotional information
  const promoSection = document.createElement('div');
  promoSection.className = 'promo-section';
  
  const addPromoItem = (text: string, isHighlight: boolean = false) => {
    const item = document.createElement('div');
    item.className = 'promo-item';
    if (isHighlight) {
      item.classList.add('promo-highlight');
    }
    item.textContent = text;
    promoSection.appendChild(item);
  };
  
  addPromoItem('DrohnenGLB by RooferGaming', true);
  addPromoItem('Kostenloser GLB Viewer: drohnenglb.de');
  addPromoItem('Drohnenaufmaß ab 90€/Monat: drohnenvermessung-server.de');
  
  coverPage.appendChild(promoSection);
  
  return coverPage;
};

const createHeader = (title: string): HTMLElement => {
  const header = document.createElement('div');
  header.className = 'header';
  
  // Add logo text to header
  const logoText = document.createElement('div');
  logoText.style.fontSize = '14px';
  logoText.style.fontWeight = 'bold';
  logoText.style.color = '#666';
  logoText.style.marginBottom = '5px';
  logoText.textContent = 'DrohnenGLB by RooferGaming';
  header.appendChild(logoText);
  
  // Add title to header
  const headerTitle = document.createElement('div');
  headerTitle.className = 'header-title';
  headerTitle.textContent = title || 'Vermessungsbericht';
  header.appendChild(headerTitle);
  
  return header;
};

const createMeasurementSummary = (measurements: Measurement[], title: string): HTMLElement => {
  const summarySection = document.createElement('div');
  summarySection.className = 'measurement-section';
  
  // Add header
  summarySection.appendChild(createHeader(title));
  
  // Create section title
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'Messungen - Übersicht';
  summarySection.appendChild(sectionTitle);
  
  // Create summary card
  const summaryCard = document.createElement('div');
  summaryCard.className = 'summary-card';
  summaryCard.style.padding = '20px';
  
  // Filter measurements by type
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  
  // Create summary text
  const summaryText = document.createElement('p');
  summaryText.style.margin = '0 0 20px 0';
  summaryText.textContent = `Dieser Bericht enthält insgesamt ${measurements.length} Messungen.`;
  summaryCard.appendChild(summaryText);
  
  // Create summary stats
  const summaryStats = document.createElement('div');
  summaryStats.className = 'summary-stats';
  
  // Helper function to create a stat box
  const createStatBox = (value: number, label: string) => {
    const statBox = document.createElement('div');
    statBox.className = 'summary-stat';
    
    const statValue = document.createElement('div');
    statValue.className = 'summary-stat-value';
    statValue.textContent = value.toString();
    statBox.appendChild(statValue);
    
    const statLabel = document.createElement('div');
    statLabel.className = 'summary-stat-label';
    statLabel.textContent = label;
    statBox.appendChild(statLabel);
    
    return statBox;
  };
  
  // Add stat boxes
  summaryStats.appendChild(createStatBox(measurements.length, 'Messungen gesamt'));
  summaryStats.appendChild(createStatBox(lengthMeasurements.length, 'Längenmessungen'));
  summaryStats.appendChild(createStatBox(heightMeasurements.length, 'Höhenmessungen'));
  summaryStats.appendChild(createStatBox(areaMeasurements.length, 'Flächenmessungen'));
  
  summaryCard.appendChild(summaryStats);
  summarySection.appendChild(summaryCard);
  
  // Create detailed summary table
  const detailsTitle = document.createElement('h3');
  detailsTitle.textContent = 'Detaillierte Übersicht';
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

const createMeasurementTypeSection = (type: string, measurements: Measurement[], title: string): HTMLElement => {
  const section = document.createElement('div');
  section.className = 'measurement-section';
  
  // Add header
  section.appendChild(createHeader(title));
  
  // Create title based on measurement type
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = type === 'length' ? 'Längenmessungen' : 
                      type === 'height' ? 'Höhenmessungen' : 
                      'Flächenmessungen';
  section.appendChild(sectionTitle);
  
  // Create description based on type
  const description = document.createElement('p');
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
  
  // For area measurements, add segments tables that keep headings with content
  if (type === 'area') {
    measurements.forEach((measurement, mIndex) => {
      if (measurement.segments && measurement.segments.length > 0) {
        // Create a containing div to ensure the heading stays with its table
        const segmentContainer = document.createElement('div');
        segmentContainer.className = 'avoid-break';
        
        const segmentsTitle = document.createElement('h3');
        segmentsTitle.textContent = `Teilmessungen für Fläche ${mIndex + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
        segmentContainer.appendChild(segmentsTitle);
        
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
        segmentContainer.appendChild(segmentsTable);
        section.appendChild(segmentContainer);
      }
    });
  }
  
  return section;
};
