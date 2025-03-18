import html2pdf from 'html2pdf.js';
import { Measurement } from '@/hooks/useMeasurements';
import { getMeasurementTypeDisplayName } from '@/constants/measurements';
import { getRoofElementsSummary, getPenetrationCount } from './exportUtils';

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
  logoContainer.style.marginBottom = '20px';
  
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
    
    // Create and add styles for page layouts
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .pdf-content {
        margin: 0;
        padding: 0;
      }
      .pdf-section {
        padding: 10mm 15mm 10mm 15mm;
      }
      .keep-together {
        page-break-inside: avoid;
      }
      .section-content {
        page-break-inside: avoid;
      }
      .force-page-break {
        page-break-before: always;
      }
      .company-info {
        text-align: center;
        margin-bottom: 30px;
        color: #555;
        line-height: 1.8;
      }
      .cover-title {
        font-size: 32px;
        font-weight: 600;
        text-align: center;
        margin: 30px 0;
        color: #333;
      }
      .project-info-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      .project-info-table th {
        text-align: left;
        width: 40%;
        padding: 10px;
        font-weight: normal;
        color: #555;
        vertical-align: top;
        border-bottom: 1px solid #f0f0f0;
      }
      .project-info-table td {
        width: 60%;
        padding: 10px;
        font-weight: 500;
        vertical-align: top;
        border-bottom: 1px solid #f0f0f0;
      }
      .measurement-section {
        margin-bottom: 20px;
      }
      .header {
        text-align: center;
        padding-bottom: 10px;
        margin-bottom: 20px;
        border-bottom: 1px solid #eaeaea;
      }
      .header-title {
        font-size: 20px;
        font-weight: 600;
        color: #444;
      }
      .measurement-section h2 {
        font-size: 24px;
        margin-bottom: 25px;
        color: #333;
        font-weight: 600;
        padding-bottom: 12px;
        border-bottom: 1px solid #e0e0e0;
      }
      .measurement-section h3 {
        font-size: 18px;
        margin: 25px 0 15px 0;
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
        margin-top: 25px;
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
        margin-top: 20px;
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
        padding: 20px;
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
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 5px;
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
        font-size: 15px;
        line-height: 1.5;
      }
      .promo-highlight {
        font-weight: 600;
        color: #0066cc;
      }
      .section-with-header {
        break-inside: avoid;
        margin-bottom: 30px;
      }
      .table-container {
        break-inside: avoid;
        margin-top: 30px;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Add container to document before building content
    document.body.appendChild(container);
    
    // Create a wrapper div for all content to ensure proper page flow
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'pdf-content';
    container.appendChild(contentWrapper);
    
    // Cover page - should be on its own page
    const coverPage = document.createElement('div');
    coverPage.className = 'pdf-section';
    coverPage.appendChild(createCoverPage(coverData));
    contentWrapper.appendChild(coverPage);
    
    // Filter measurements by type
    const lengthMeasurements = measurements.filter(m => m.type === 'length');
    const areaMeasurements = measurements.filter(m => m.type === 'area');
    const heightMeasurements = measurements.filter(m => m.type === 'height');
    
    // Measurement summary - should start on a new page
    if (measurements.length > 0) {
      const summaryContent = document.createElement('div');
      summaryContent.className = 'pdf-section force-page-break';
      
      // Create summary section with header (always keep header with content)
      const summarySection = document.createElement('div');
      summarySection.className = 'section-with-header';
      summarySection.appendChild(createHeader(coverData.title));
      
      const sectionTitle = document.createElement('h2');
      sectionTitle.textContent = 'Messungen - Übersicht';
      sectionTitle.style.marginTop = '20px'; // Added extra spacing
      sectionTitle.style.marginBottom = '30px'; // Added extra spacing
      summarySection.appendChild(sectionTitle);
      
      summaryContent.appendChild(summarySection);
      
      // Add summary card in its own keep-together block
      const summaryCardContainer = document.createElement('div');
      summaryCardContainer.className = 'keep-together';
      summaryCardContainer.appendChild(createSummaryCard(measurements, lengthMeasurements, heightMeasurements, areaMeasurements));
      summaryContent.appendChild(summaryCardContainer);
      
      // Create detailed summary table in its own keep-together block
      const tableContainer = document.createElement('div');
      tableContainer.className = 'keep-together table-container';
      tableContainer.style.marginTop = '30px'; // Added extra spacing
      
      const detailsTitle = document.createElement('h3');
      detailsTitle.textContent = 'Detaillierte Übersicht';
      tableContainer.appendChild(detailsTitle);
      
      tableContainer.appendChild(createSummaryTable(measurements));
      summaryContent.appendChild(tableContainer);
      
      contentWrapper.appendChild(summaryContent);
    }
    
    // Add measurement type sections only if they have measurements
    if (lengthMeasurements.length > 0) {
      appendMeasurementTypeSection(contentWrapper, 'length', lengthMeasurements, coverData.title);
    }
    
    if (areaMeasurements.length > 0) {
      appendAreaMeasurementSection(contentWrapper, areaMeasurements, coverData.title);
    }
    
    if (heightMeasurements.length > 0) {
      appendMeasurementTypeSection(contentWrapper, 'height', heightMeasurements, coverData.title);
    }
    
    // Configure html2pdf options with improved page break handling
    const pdfOptions = {
      margin: [15, 15, 15, 15], // [top, right, bottom, left] in mm - increased margins
      filename: `Vermessungsbericht_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
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
        before: '.force-page-break',
        avoid: [
          '.keep-together', 
          '.section-content', 
          '.section-with-header',
          '.table-container',
          'table', 'tr', 'th', 'td', 
          'h2', 'h3'
        ]
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
    if (styleElement && styleElement.textContent.includes('pdf-section')) {
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
    notesSection.style.marginTop = '20px';
    
    const notesTitle = document.createElement('h3');
    notesTitle.style.fontSize = '18px';
    notesTitle.style.marginBottom = '10px';
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

// Create a summary card with statistics
const createSummaryCard = (
  measurements: Measurement[],
  lengthMeasurements: Measurement[],
  heightMeasurements: Measurement[],
  areaMeasurements: Measurement[]
): HTMLElement => {
  const summaryCard = document.createElement('div');
  summaryCard.className = 'summary-card';
  summaryCard.style.padding = '15px';
  
  // Create summary text
  const summaryText = document.createElement('p');
  summaryText.style.margin = '0 0 15px 0';
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
  return summaryCard;
};

// Create summary table for all measurements
const createSummaryTable = (measurements: Measurement[]): HTMLElement => {
  const summaryTable = document.createElement('table');
  summaryTable.className = 'measurement-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Removed 'Subtyp' and 'Anzahl' columns
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
    const typeDisplayName = getMeasurementTypeDisplayName(measurement.type);
    typeCell.textContent = typeDisplayName || '–';
    row.appendChild(typeCell);
    
    // Value column (now including count if available)
    const valueCell = document.createElement('td');
    let valueText = `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`;
    if (measurement.type === 'area') {
      valueText = `${measurement.value.toFixed(2)} ${measurement.unit || 'm²'}`;
    }
    // Add count information to value cell if available
    if (measurement.type === 'vent' || measurement.type === 'hook' || measurement.type === 'other') {
      const count = measurement.count && measurement.count > 1 ? measurement.count : 1;
      valueText += ` (${count} Stück)`;
    } else if (measurement.count && measurement.count > 1) {
      valueText += ` (${measurement.count} Stück)`;
    }
    valueCell.textContent = valueText;
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
  return summaryTable;
};

// Helper function to add a measurement type section to the content wrapper
const appendMeasurementTypeSection = (
  contentWrapper: HTMLElement, 
  type: string, 
  measurements: Measurement[], 
  title: string
) => {
  const sectionContent = document.createElement('div');
  sectionContent.className = 'pdf-section force-page-break';
  
  // Create section with header that stays with content
  const section = document.createElement('div');
  section.className = 'section-with-header';
  
  // Add header
  section.appendChild(createHeader(title));
  
  // Create title based on measurement type
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = type === 'length' ? 'Längenmessungen' : 'Höhenmessungen';
  sectionTitle.style.marginTop = '20px'; // Added extra spacing
  sectionTitle.style.marginBottom = '30px'; // Added extra spacing
  section.appendChild(sectionTitle);
  
  // Create description based on type
  const description = document.createElement('p');
  if (type === 'length') {
    description.textContent = `Dieser Abschnitt enthält ${measurements.length} Längenmessungen. Alle Messungen sind in Meter (m) angegeben.`;
  } else {
    description.textContent = `Dieser Abschnitt enthält ${measurements.length} Höhenmessungen. Alle Messungen sind in Meter (m) angegeben.`;
  }
  section.appendChild(description);
  
  sectionContent.appendChild(section);
  
  // Create measurements table in its own container to prevent breaks
  const tableContainer = document.createElement('div');
  tableContainer.className = 'keep-together table-container';
  tableContainer.style.marginTop = '30px'; // Added extra spacing
  
  // Create columns based on measurement type (removed 'Subtyp' and 'Anzahl')
  let columns: string[];
  if (type === 'length') {
    columns = ['Nr.', 'Beschreibung', 'Länge (m)', 'Neigung'];
  } else { // height
    columns = ['Nr.', 'Beschreibung', 'Höhe (m)'];
  }
  
  const table = createMeasurementTable(measurements, columns, type);
  tableContainer.appendChild(table);
  sectionContent.appendChild(tableContainer);
  
  contentWrapper.appendChild(sectionContent);
};

// Helper function to add area measurements section to the content wrapper
const appendAreaMeasurementSection = (
  contentWrapper: HTMLElement, 
  areaMeasurements: Measurement[], 
  title: string
) => {
  const areaContent = document.createElement('div');
  areaContent.className = 'pdf-section force-page-break';
  
  // Create section title and header that stays with content
  const areaSection = document.createElement('div');
  areaSection.className = 'section-with-header';
  areaSection.appendChild(createHeader(title));
  
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'Flächenmessungen';
  sectionTitle.style.marginTop = '20px'; // Added extra spacing
  sectionTitle.style.marginBottom = '30px'; // Added extra spacing
  areaSection.appendChild(sectionTitle);
  
  const description = document.createElement('p');
  description.textContent = `Dieser Abschnitt enthält ${areaMeasurements.length} Flächenmessungen. Alle Messungen sind in Quadratmeter (m²) angegeben.`;
  areaSection.appendChild(description);
  
  areaContent.appendChild(areaSection);
  
  // Create main area measurements table in its own container
  const mainTableContainer = document.createElement('div');
  mainTableContainer.className = 'keep-together table-container';
  mainTableContainer.style.marginTop = '30px'; // Added extra spacing
  mainTableContainer.appendChild(createAreaMeasurementsTable(areaMeasurements));
  areaContent.appendChild(mainTableContainer);
  
  // Create segment tables as separate containers
  areaMeasurements.forEach((measurement, mIndex) => {
    if (measurement.segments && measurement.segments.length > 0) {
      const segmentContainer = document.createElement('div');
      segmentContainer.className = 'keep-together section-content';
      segmentContainer.appendChild(createAreaSegmentsTable(measurement, mIndex));
      areaContent.appendChild(segmentContainer);
    }
  });
  
  contentWrapper.appendChild(areaContent);
};

// Helper function to create a generic measurement table
const createMeasurementTable = (
  measurements: Measurement[], 
  columns: string[], 
  type: string
): HTMLElement => {
  const table = document.createElement('table');
  table.className = 'measurement-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
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
    
    // Value column (now including count if available)
    const valueCell = document.createElement('td');
    let valueText = `${measurement.value.toFixed(2)} ${measurement.unit || (type === 'area' ? 'm²' : 'm')}`;
    
    // Always show at least 1 piece for vent, hook, or other penetration types
    if (measurement.type === 'vent' || measurement.type === 'hook' || measurement.type === 'other') {
      const count = measurement.count && measurement.count > 1 ? measurement.count : 1;
      valueText += ` (${count} Stück)`;
    } else if (measurement.count && measurement.count > 1) {
      valueText += ` (${measurement.count} Stück)`;
    }
    
    valueCell.textContent = valueText;
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
  return table;
};

// Helper function to create area measurement table without segments
const createAreaMeasurementsTable = (measurements: Measurement[]): HTMLElement => {
  const columns = ['Nr.', 'Beschreibung', 'Fläche (m²)'];
  return createMeasurementTable(measurements, columns, 'area');
};

// Helper function to create segment tables for area measurements
const createAreaSegmentsTable = (measurement: Measurement, index: number): HTMLElement => {
  const container = document.createElement('div');
  container.style.marginTop = '30px'; // Added extra spacing
  
  const segmentsTitle = document.createElement('h3');
  segmentsTitle.textContent = `Teilmessungen für Fläche ${index + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
  container.appendChild(segmentsTitle);
  
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
  
  if (measurement.segments) {
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
  }
  
  segmentsTable.appendChild(segmentsTableBody);
  container.appendChild(segmentsTable);
  
  return container;
};

// Helper function for creating measurement summary (moved to separate function)
const createMeasurementSummary = (measurements: Measurement[], title: string): HTMLElement => {
  const summarySection = document.createElement('div');
  summarySection.className = 'measurement-section';
  summarySection.style.marginBottom = '40px'; // Added extra spacing
  
  // Add header
  summarySection.appendChild(createHeader(title));
  
  // Create section title
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'Messungen - Übersicht';
  summarySection.appendChild(sectionTitle);
  
  // Filter measurements by type
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  
  // Get roof elements stats
  const roofElements = getRoofElementsSummary(measurements);
  
  // Create summary card
  const summaryCard = document.createElement('div');
  summaryCard.className = 'summary-card';
  
  // Summary text
  const summaryText = document.createElement('p');
  summaryText.style.margin = '0 0 15px 0';
  summaryText.textContent = `Dieser Bericht enthält insgesamt ${measurements.length} Messungen.`;
  summaryCard.appendChild(summaryText);
  
  // Create summary stats
  const summaryStats = document.createElement('div');
  summaryStats.className = 'summary-stats';
  
  // Helper function to create a stat box
  const createStatBox = (value: number | string, label: string) => {
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
  
  // Add stats
  summaryStats.appendChild(createStatBox(measurements.length, 'Messungen gesamt'));
  summaryStats.appendChild(createStatBox(lengthMeasurements.length, 'Längenmessungen'));
  summaryStats.appendChild(createStatBox(heightMeasurements.length, 'Höhenmessungen'));
  summaryStats.appendChild(createStatBox(areaMeasurements.length, 'Flächenmessungen'));
  
  // Add roof elements stats if any exist
  if (roofElements.chimneys > 0) {
    summaryStats.appendChild(createStatBox(roofElements.chimneys, 'Kamine'));
  }
  
  if (roofElements.skylights > 0) {
    summaryStats.appendChild(createStatBox(roofElements.skylights, 'Dachfenster'));
  }
  
  if (roofElements.vents > 0) {
    summaryStats.appendChild(createStatBox(roofElements.vents, 'Lüfter'));
  }
  
  if (roofElements.hooks > 0) {
    summaryStats.appendChild(createStatBox(roofElements.hooks, 'Dachhaken'));
  }
  
  if (roofElements.otherPenetrations > 0) {
    summaryStats.appendChild(createStatBox(roofElements.otherPenetrations, 'Sonstige Einbauten'));
  }
  
  if (roofElements.solarArea > 0) {
    summaryStats.appendChild(createStatBox(roofElements.solarArea.toFixed(2) + ' m²', 'Solaranlagen'));
  }
  
  summaryCard.appendChild(summaryStats);
  summarySection.appendChild(summaryCard);
  
  return summarySection;
};
