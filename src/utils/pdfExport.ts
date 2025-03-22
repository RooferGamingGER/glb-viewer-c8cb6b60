
import html2pdf from 'html2pdf.js';
import { Measurement } from '@/hooks/useMeasurements';
import { getMeasurementTypeDisplayName } from '@/constants/measurements';
import { 
  getRoofElementsSummary, 
  getPenetrationCount, 
  formatMeasurementValue,
  sortMeasurementsForExport,
  consolidatePenetrations
} from './exportUtils';
import { formatPVMaterials } from './pvCalculations';

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
    // Sort and consolidate measurements for export
    const sortedMeasurements = sortMeasurementsForExport(measurements);
    const consolidatedMeasurements = consolidatePenetrations(sortedMeasurements);
    
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
      .area-screenshot {
        max-width: 100%;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        margin: 20px 0 30px 0;
        border: 1px solid #eee;
      }
      .screenshot-container {
        text-align: center;
        margin: 20px 0;
        page-break-inside: avoid;
      }
      .screenshot-caption {
        font-size: 14px;
        color: #666;
        margin-top: 10px;
        text-align: center;
      }
      .custom-screenshots-section {
        margin-top: 30px;
        page-break-before: always;
      }
      .screenshots-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-top: 20px;
      }
      .screenshot-item {
        break-inside: avoid;
        margin-bottom: 30px;
        text-align: center;
      }
      .custom-screenshot {
        max-width: 100%;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border: 1px solid #eee;
        margin-bottom: 10px;
      }
      .screenshot-title {
        font-size: 14px;
        color: #555;
        margin-top: 8px;
        text-align: center;
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
    
    // Filter measurements by type using the consolidated measurements
    const lengthMeasurements = consolidatedMeasurements.filter(m => m.type === 'length');
    const areaMeasurements = consolidatedMeasurements.filter(m => m.type === 'area');
    const heightMeasurements = consolidatedMeasurements.filter(m => m.type === 'height');
    const skylightMeasurements = consolidatedMeasurements.filter(m => m.type === 'skylight');
    const chimneyMeasurements = consolidatedMeasurements.filter(m => m.type === 'chimney');
    const solarMeasurements = consolidatedMeasurements.filter(m => m.type === 'solar');
    const ventMeasurements = consolidatedMeasurements.filter(m => m.type === 'vent');
    const hookMeasurements = consolidatedMeasurements.filter(m => m.type === 'hook');
    const otherMeasurements = consolidatedMeasurements.filter(m => m.type === 'other');
    
    // Check measurements with PV materials
    const measurementsWithPVMaterials = consolidatedMeasurements.filter(
      m => m.pvModuleInfo?.pvMaterials
    );
    
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
      summaryCardContainer.appendChild(createSummaryCard(consolidatedMeasurements, lengthMeasurements, heightMeasurements, areaMeasurements));
      summaryContent.appendChild(summaryCardContainer);
      
      // Create detailed summary table in its own keep-together block
      const tableContainer = document.createElement('div');
      tableContainer.className = 'keep-together table-container';
      tableContainer.style.marginTop = '30px'; // Added extra spacing
      
      const detailsTitle = document.createElement('h3');
      detailsTitle.textContent = 'Detaillierte Übersicht';
      tableContainer.appendChild(detailsTitle);
      
      tableContainer.appendChild(createSummaryTable(consolidatedMeasurements));
      summaryContent.appendChild(tableContainer);
      
      contentWrapper.appendChild(summaryContent);
    }
    
    // Using the category-specific measurements for each section
    // Standard measurements
    if (lengthMeasurements.length > 0) {
      appendMeasurementTypeSection(contentWrapper, 'length', lengthMeasurements, coverData.title);
    }
    
    if (areaMeasurements.length > 0) {
      appendAreaMeasurementSection(contentWrapper, areaMeasurements, coverData.title);
    }
    
    if (heightMeasurements.length > 0) {
      appendMeasurementTypeSection(contentWrapper, 'height', heightMeasurements, coverData.title);
    }
    
    // Roof elements (skylight, chimney, solar)
    const roofElements = [...skylightMeasurements, ...chimneyMeasurements, ...solarMeasurements];
    if (roofElements.length > 0) {
      appendRoofElementsSection(contentWrapper, roofElements, coverData.title);
    }
    
    // Installations (vent, hook, other)
    const installations = [...ventMeasurements, ...hookMeasurements, ...otherMeasurements];
    if (installations.length > 0) {
      appendInstallationsSection(contentWrapper, installations, coverData.title);
    }
    
    // Add PV Materials section if we have measurements with PV materials
    if (measurementsWithPVMaterials.length > 0) {
      appendPVMaterialsSection(contentWrapper, measurementsWithPVMaterials, coverData.title);
    }
    
    // Check if there are any custom screenshots to include
    const measurementsWithCustomScreenshots = measurements.filter(
      m => m.customScreenshots && m.customScreenshots.length > 0
    );
    
    if (measurementsWithCustomScreenshots.length > 0) {
      // Add custom screenshots section
      appendCustomScreenshotsSection(contentWrapper, measurementsWithCustomScreenshots, coverData.title);
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

const createSummaryTable = (measurements: Measurement[]): HTMLElement => {
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
  
  // Use the sorted measurements for the summary table
  const sortedMeasurements = sortMeasurementsForExport(measurements);
  const consolidatedMeasurements = consolidatePenetrations(sortedMeasurements);
  
  consolidatedMeasurements.forEach((measurement, index) => {
    const row = document.createElement('tr');
    
    const numCell = document.createElement('td');
    numCell.textContent = (index + 1).toString();
    row.appendChild(numCell);
    
    const descCell = document.createElement('td');
    descCell.textContent = measurement.description || '–';
    row.appendChild(descCell);
    
    const typeCell = document.createElement('td');
    const typeDisplayName = getMeasurementTypeDisplayName(measurement.type);
    typeCell.textContent = typeDisplayName || '–';
    row.appendChild(typeCell);
    
    const valueCell = document.createElement('td');
    valueCell.textContent = formatMeasurementValue(measurement);
    valueCell.style.fontWeight = 'bold';
    row.appendChild(valueCell);
    
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
  
  // Add screenshots for area measurements if available
  const measurementsWithScreenshots = areaMeasurements.filter(m => m.screenshot);
  
  if (measurementsWithScreenshots.length > 0) {
    const screenshotsTitle = document.createElement('h3');
    screenshotsTitle.textContent = 'Visualisierung der Flächenmessungen';
    screenshotsTitle.style.marginTop = '30px';
    areaContent.appendChild(screenshotsTitle);
    
    const screenshotsDescription = document.createElement('p');
    screenshotsDescription.textContent = 'Die folgenden Visualisierungen zeigen die erfassten Flächen mit Messpunkten und Maßen.';
    areaContent.appendChild(screenshotsDescription);
    
    // Add each screenshot in its own container to avoid page breaks
    measurementsWithScreenshots.forEach((measurement, index) => {
      const screenshotContainer = document.createElement('div');
      screenshotContainer.className = 'screenshot-container keep-together';
      
      const screenshot = document.createElement('img');
      screenshot.src = measurement.screenshot;
      screenshot.className = 'area-screenshot';
      screenshot.style.maxWidth = '100%';
      screenshot.alt = `Flächenmessung ${index + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
      
      const caption = document.createElement('div');
      caption.className = 'screenshot-caption';
      caption.textContent = `Fläche ${index + 1}${measurement.description ? `: ${measurement.description}` : ''} - ${formatMeasurementValue(measurement)}`;
      
      screenshotContainer.appendChild(screenshot);
      screenshotContainer.appendChild(caption);
      areaContent.appendChild(screenshotContainer);
    });
  }
  
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
    
    // Value column using the formatted value
    const valueCell = document.createElement('td');
    valueCell.textContent = formatMeasurementValue(measurement);
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

const createAreaMeasurementsTable = (areaMeasurements: Measurement[]): HTMLElement => {
  const table = document.createElement('table');
  table.className = 'measurement-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Nr.', 'Beschreibung', 'Fläche (m²)', 'Segmente'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  
  tableHead.appendChild(headerRow);
  table.appendChild(tableHead);
  
  // Table body
  const tableBody = document.createElement('tbody');
  
  areaMeasurements.forEach((measurement, index) => {
    const row = document.createElement('tr');
    
    // Nr column
    const numCell = document.createElement('td');
    numCell.textContent = (index + 1).toString();
    row.appendChild(numCell);
    
    // Description column
    const descCell = document.createElement('td');
    descCell.textContent = measurement.description || '–';
    row.appendChild(descCell);
    
    // Area value column
    const valueCell = document.createElement('td');
    valueCell.textContent = formatMeasurementValue(measurement);
    valueCell.style.fontWeight = 'bold';
    row.appendChild(valueCell);
    
    // Segments count column
    const segmentsCell = document.createElement('td');
    if (measurement.segments && measurement.segments.length > 0) {
      segmentsCell.textContent = measurement.segments.length.toString();
    } else {
      segmentsCell.textContent = '–';
    }
    row.appendChild(segmentsCell);
    
    tableBody.appendChild(row);
  });
  
  table.appendChild(tableBody);
  return table;
};

const createAreaSegmentsTable = (measurement: Measurement, measurementIndex: number): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'segment-table-container';
  
  const title = document.createElement('h3');
  title.textContent = `Segmente für Fläche ${measurementIndex + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
  title.style.fontSize = '16px';
  title.style.marginTop = '20px';
  container.appendChild(title);
  
  const table = document.createElement('table');
  table.className = 'segment-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Segment', 'Fläche (m²)', 'Neigung'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  
  tableHead.appendChild(headerRow);
  table.appendChild(tableHead);
  
  // Table body
  const tableBody = document.createElement('tbody');
  
  if (measurement.segments && measurement.segments.length > 0) {
    measurement.segments.forEach((segment, index) => {
      const row = document.createElement('tr');
      
      // Segment number column
      const numCell = document.createElement('td');
      numCell.textContent = `Segment ${index + 1}`;
      row.appendChild(numCell);
      
      // Area column
      const areaCell = document.createElement('td');
      if (segment.area !== undefined) {
        areaCell.textContent = `${segment.area.toFixed(2)} m²`;
        areaCell.style.fontWeight = 'bold';
      } else {
        areaCell.textContent = '–';
      }
      row.appendChild(areaCell);
      
      // Inclination column
      const inclinationCell = document.createElement('td');
      if (segment.inclination !== undefined) {
        inclinationCell.textContent = `${Math.abs(segment.inclination).toFixed(1)}°`;
      } else {
        inclinationCell.textContent = '–';
      }
      row.appendChild(inclinationCell);
      
      tableBody.appendChild(row);
    });
  } else {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 3;
    emptyCell.textContent = 'Keine Segmente verfügbar';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.padding = '20px';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);
  }
  
  table.appendChild(tableBody);
  container.appendChild(table);
  
  return container;
};

const appendRoofElementsSection = (
  contentWrapper: HTMLElement, 
  roofElements: Measurement[], 
  title: string
) => {
  const roofElementsContent = document.createElement('div');
  roofElementsContent.className = 'pdf-section force-page-break';
  
  // Create section with header that stays with content
  const roofElementsSection = document.createElement('div');
  roofElementsSection.className = 'section-with-header';
  roofElementsSection.appendChild(createHeader(title));
  
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'Dachelemente';
  sectionTitle.style.marginTop = '20px'; // Added extra spacing
  sectionTitle.style.marginBottom = '30px'; // Added extra spacing
  roofElementsSection.appendChild(sectionTitle);
  
  // Count the number of each type of roof element
  const skylights = roofElements.filter(m => m.type === 'skylight');
  const chimneys = roofElements.filter(m => m.type === 'chimney');
  const solar = roofElements.filter(m => m.type === 'solar');
  
  const description = document.createElement('p');
  description.textContent = `Dieser Abschnitt enthält ${roofElements.length} Dachelemente:`;
  roofElementsSection.appendChild(description);
  
  // Create a list of element counts
  const elementList = document.createElement('ul');
  elementList.style.marginTop = '10px';
  elementList.style.marginBottom = '20px';
  elementList.style.paddingLeft = '20px';
  
  const addListItem = (count: number, label: string) => {
    if (count > 0) {
      const item = document.createElement('li');
      item.textContent = `${count} ${label}${count !== 1 ? 'e' : ''}`;
      item.style.marginBottom = '5px';
      elementList.appendChild(item);
    }
  };
  
  addListItem(skylights.length, 'Dachfenster');
  addListItem(chimneys.length, 'Schornstein');
  addListItem(solar.length, 'Solaranlage');
  
  roofElementsSection.appendChild(elementList);
  roofElementsContent.appendChild(roofElementsSection);
  
  // Create main roof elements table in its own container
  const tableContainer = document.createElement('div');
  tableContainer.className = 'keep-together table-container';
  tableContainer.style.marginTop = '30px'; // Added extra spacing
  
  const columns = ['Nr.', 'Beschreibung', 'Typ', 'Wert'];
  const table = createRoofElementsTable(roofElements, columns);
  tableContainer.appendChild(table);
  
  roofElementsContent.appendChild(tableContainer);
  contentWrapper.appendChild(roofElementsContent);
};

const createRoofElementsTable = (roofElements: Measurement[], columns: string[]): HTMLElement => {
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
  
  roofElements.forEach((element, index) => {
    const row = document.createElement('tr');
    
    // Nr column
    const numCell = document.createElement('td');
    numCell.textContent = (index + 1).toString();
    row.appendChild(numCell);
    
    // Description column
    const descCell = document.createElement('td');
    descCell.textContent = element.description || '–';
    row.appendChild(descCell);
    
    // Type column
    const typeCell = document.createElement('td');
    const typeDisplayName = getMeasurementTypeDisplayName(element.type);
    typeCell.textContent = typeDisplayName || '–';
    row.appendChild(typeCell);
    
    // Value column (area or count)
    const valueCell = document.createElement('td');
    valueCell.textContent = formatMeasurementValue(element);
    valueCell.style.fontWeight = 'bold';
    row.appendChild(valueCell);
    
    tableBody.appendChild(row);
  });
  
  table.appendChild(tableBody);
  return table;
};

const appendInstallationsSection = (
  contentWrapper: HTMLElement, 
  installations: Measurement[], 
  title: string
) => {
  const installationsContent = document.createElement('div');
  installationsContent.className = 'pdf-section force-page-break';
  
  // Create section with header that stays with content
  const installationsSection = document.createElement('div');
  installationsSection.className = 'section-with-header';
  installationsSection.appendChild(createHeader(title));
  
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'Installationen';
  sectionTitle.style.marginTop = '20px'; // Added extra spacing
  sectionTitle.style.marginBottom = '30px'; // Added extra spacing
  installationsSection.appendChild(sectionTitle);
  
  // Count the number of each type of installations
  const vents = installations.filter(m => m.type === 'vent');
  const hooks = installations.filter(m => m.type === 'hook');
  const other = installations.filter(m => m.type === 'other');
  
  const description = document.createElement('p');
  description.textContent = `Dieser Abschnitt enthält ${installations.length} Installationen:`;
  installationsSection.appendChild(description);
  
  // Create a list of installation counts
  const installationList = document.createElement('ul');
  installationList.style.marginTop = '10px';
  installationList.style.marginBottom = '20px';
  installationList.style.paddingLeft = '20px';
  
  const addListItem = (count: number, label: string) => {
    if (count > 0) {
      const item = document.createElement('li');
      item.textContent = `${count} ${label}${count !== 1 ? 'e' : ''}`;
      item.style.marginBottom = '5px';
      installationList.appendChild(item);
    }
  };
  
  addListItem(vents.length, 'Entlüftung');
  addListItem(hooks.length, 'Sicherheitshaken');
  addListItem(other.length, 'Sonstige');
  
  installationsSection.appendChild(installationList);
  installationsContent.appendChild(installationsSection);
  
  // Create main installations table in its own container
  const tableContainer = document.createElement('div');
  tableContainer.className = 'keep-together table-container';
  tableContainer.style.marginTop = '30px'; // Added extra spacing
  
  const columns = ['Nr.', 'Beschreibung', 'Typ', 'Wert'];
  const table = createRoofElementsTable(installations, columns);
  tableContainer.appendChild(table);
  
  installationsContent.appendChild(tableContainer);
  contentWrapper.appendChild(installationsContent);
};

const appendPVMaterialsSection = (
  contentWrapper: HTMLElement,
  solarMeasurements: Measurement[],
  title: string
) => {
  // Check if we actually have PV materials to show
  const measurementsWithMaterials = solarMeasurements.filter(m => 
    m.pvModuleInfo?.pvMaterials && m.type === 'solar' && m.area && m.area > 0
  );
  
  if (measurementsWithMaterials.length === 0) return;
  
  const pvMaterialsContent = document.createElement('div');
  pvMaterialsContent.className = 'pdf-section force-page-break';
  
  // Create section with header that stays with content
  const pvMaterialsSection = document.createElement('div');
  pvMaterialsSection.className = 'section-with-header';
  pvMaterialsSection.appendChild(createHeader(title));
  
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'PV-Anlagen Materialliste';
  sectionTitle.style.marginTop = '20px';
  sectionTitle.style.marginBottom = '30px';
  pvMaterialsSection.appendChild(sectionTitle);
  
  // Add description
  const description = document.createElement('p');
  description.textContent = `Dieser Abschnitt enthält die Materiallisten für ${measurementsWithMaterials.length} PV-Anlagen. Die folgenden Materialien werden für die Installation benötigt:`;
  pvMaterialsSection.appendChild(description);
  
  // Process each solar measurement with materials
  measurementsWithMaterials.forEach((measurement, index) => {
    if (!measurement.pvModuleInfo?.pvMaterials) return;
    
    // Create measurement container
    const measurementContainer = document.createElement('div');
    measurementContainer.className = 'keep-together summary-card';
    measurementContainer.style.marginTop = '30px';
    
    // Add measurement title
    const measurementTitle = document.createElement('h3');
    measurementTitle.textContent = `PV-Anlage ${index + 1}${measurement.description ? `: ${measurement.description}` : ''}`;
    measurementContainer.appendChild(measurementTitle);
    
    // Add measurement info
    const measurementInfo = document.createElement('div');
    measurementInfo.style.marginBottom = '20px';
    measurementInfo.style.display = 'flex';
    measurementInfo.style.flexWrap = 'wrap';
    measurementInfo.style.gap = '20px';
    
    // Module info box
    const moduleInfoBox = document.createElement('div');
    moduleInfoBox.style.flex = '1';
    moduleInfoBox.style.minWidth = '200px';
    moduleInfoBox.style.backgroundColor = '#f8f9fa';
    moduleInfoBox.style.padding = '15px';
    moduleInfoBox.style.borderRadius = '8px';
    moduleInfoBox.style.border = '1px solid #eee';
    
    const moduleTitle = document.createElement('div');
    moduleTitle.textContent = 'Modulinformation';
    moduleTitle.style.fontWeight = 'bold';
    moduleTitle.style.marginBottom = '10px';
    moduleInfoBox.appendChild(moduleTitle);
    
    const moduleList = document.createElement('ul');
    moduleList.style.listStyle = 'none';
    moduleList.style.padding = '0';
    moduleList.style.margin = '0';
    
    const moduleData = [
      { label: 'Modultyp', value: measurement.pvModuleInfo.moduleName || '–' },
      { label: 'Modulfläche', value: `${measurement.pvModuleInfo.moduleArea?.toFixed(2) || '–'} m²` },
      { label: 'Leistung', value: `${measurement.pvModuleInfo.modulePower || '–'} Wp` },
      { label: 'Anzahl', value: measurement.pvModuleInfo.pvMaterials?.moduleCount.toString() || '–' },
      { label: 'Gesamtleistung', value: `${(measurement.pvModuleInfo.pvMaterials?.totalPower || 0).toFixed(1)} kWp` }
    ];
    
    moduleData.forEach(item => {
      const li = document.createElement('li');
      li.style.marginBottom = '5px';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      
      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.color = '#555';
      
      const value = document.createElement('span');
      value.textContent = item.value;
      value.style.fontWeight = 'bold';
      
      li.appendChild(label);
      li.appendChild(value);
      moduleList.appendChild(li);
    });
    
    moduleInfoBox.appendChild(moduleList);
    measurementInfo.appendChild(moduleInfoBox);
    
    // Installation info box
    const installInfoBox = document.createElement('div');
    installInfoBox.style.flex = '1';
    installInfoBox.style.minWidth = '200px';
    installInfoBox.style.backgroundColor = '#f8f9fa';
    installInfoBox.style.padding = '15px';
    installInfoBox.style.borderRadius = '8px';
    installInfoBox.style.border = '1px solid #eee';
    
    const installTitle = document.createElement('div');
    installTitle.textContent = 'Installationsdaten';
    installTitle.style.fontWeight = 'bold';
    installTitle.style.marginBottom = '10px';
    installInfoBox.appendChild(installTitle);
    
    const installList = document.createElement('ul');
    installList.style.listStyle = 'none';
    installList.style.padding = '0';
    installList.style.margin = '0';
    
    const formatNumber = (value: number) => value.toLocaleString('de-DE');
    
    const installData = [
      { label: 'Dachfläche', value: `${measurement.area?.toFixed(2) || '–'} m²` },
      { label: 'Dachneigung', value: measurement.segments && measurement.segments[0]?.inclination !== undefined ? `${Math.abs(measurement.segments[0].inclination).toFixed(1)}°` : '–' },
      { label: 'Ausrichtung', value: measurement.orientation || '–' },
      { label: 'Belegungsgrad', value: measurement.pvModuleInfo.pvMaterials?.coverage ? `${(measurement.pvModuleInfo.pvMaterials.coverage * 100).toFixed(0)}%` : '–' }
    ];
    
    installData.forEach(item => {
      const li = document.createElement('li');
      li.style.marginBottom = '5px';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      
      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.color = '#555';
      
      const value = document.createElement('span');
      value.textContent = item.value;
      value.style.fontWeight = 'bold';
      
      li.appendChild(label);
      li.appendChild(value);
      installList.appendChild(li);
    });
    
    installInfoBox.appendChild(installList);
    measurementInfo.appendChild(installInfoBox);
    measurementContainer.appendChild(measurementInfo);
    
    // Create tables for materials
    const pvMaterials = measurement.pvModuleInfo.pvMaterials;
    
    // Create mounting materials table
    if (pvMaterials.mounting && Object.keys(pvMaterials.mounting).length > 0) {
      const mountingTitle = document.createElement('h4');
      mountingTitle.textContent = 'Befestigungsmaterial';
      mountingTitle.style.marginTop = '25px';
      mountingTitle.style.marginBottom = '15px';
      measurementContainer.appendChild(mountingTitle);
      
      const mountingTable = document.createElement('table');
      mountingTable.className = 'measurement-table';
      
      // Table header
      const mountingTableHead = document.createElement('thead');
      const mountingHeaderRow = document.createElement('tr');
      
      ['Material', 'Anzahl'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        mountingHeaderRow.appendChild(th);
      });
      
      mountingTableHead.appendChild(mountingHeaderRow);
      mountingTable.appendChild(mountingTableHead);
      
      // Table body
      const mountingTableBody = document.createElement('tbody');
      
      // Format the mounting materials for display
      const formattedMounting = formatPVMaterials(pvMaterials);
      
      formattedMounting.mounting.forEach(item => {
        const row = document.createElement('tr');
        
        // Material name column
        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;
        row.appendChild(nameCell);
        
        // Count column
        const countCell = document.createElement('td');
        countCell.textContent = item.value;
        countCell.style.fontWeight = 'bold';
        row.appendChild(countCell);
        
        mountingTableBody.appendChild(row);
      });
      
      mountingTable.appendChild(mountingTableBody);
      measurementContainer.appendChild(mountingTable);
    }
    
    // Create electrical materials table
    if (pvMaterials.electrical && Object.keys(pvMaterials.electrical).length > 0) {
      const electricalTitle = document.createElement('h4');
      electricalTitle.textContent = 'Elektromaterial';
      electricalTitle.style.marginTop = '25px';
      electricalTitle.style.marginBottom = '15px';
      measurementContainer.appendChild(electricalTitle);
      
      const electricalTable = document.createElement('table');
      electricalTable.className = 'measurement-table';
      
      // Table header
      const electricalTableHead = document.createElement('thead');
      const electricalHeaderRow = document.createElement('tr');
      
      ['Material', 'Anzahl'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        electricalHeaderRow.appendChild(th);
      });
      
      electricalTableHead.appendChild(electricalHeaderRow);
      electricalTable.appendChild(electricalTableHead);
      
      // Table body
      const electricalTableBody = document.createElement('tbody');
      
      // Format the electrical materials for display
      const formattedElectrical = formatPVMaterials(pvMaterials);
      
      formattedElectrical.electrical.forEach(item => {
        const row = document.createElement('tr');
        
        // Material name column
        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;
        row.appendChild(nameCell);
        
        // Count column
        const countCell = document.createElement('td');
        countCell.textContent = item.value;
        countCell.style.fontWeight = 'bold';
        row.appendChild(countCell);
        
        electricalTableBody.appendChild(row);
      });
      
      electricalTable.appendChild(electricalTableBody);
      measurementContainer.appendChild(electricalTable);
    }
    
    pvMaterialsContent.appendChild(measurementContainer);
  });
  
  contentWrapper.appendChild(pvMaterialsContent);
};

const appendCustomScreenshotsSection = (
  contentWrapper: HTMLElement,
  measurementsWithScreenshots: Measurement[],
  title: string
) => {
  const screenshotsContent = document.createElement('div');
  screenshotsContent.className = 'pdf-section custom-screenshots-section';
  
  // Create section with header
  screenshotsContent.appendChild(createHeader(title));
  
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'Bildergalerie';
  sectionTitle.style.marginTop = '20px';
  sectionTitle.style.marginBottom = '30px';
  screenshotsContent.appendChild(sectionTitle);
  
  const description = document.createElement('p');
  description.textContent = 'Die folgenden Bilder wurden während der Vermessung aufgenommen:';
  screenshotsContent.appendChild(description);
  
  // Create a grid for screenshots (2 columns)
  const screenshotsGrid = document.createElement('div');
  screenshotsGrid.className = 'screenshots-grid';
  
  // Add screenshots from all measurements
  measurementsWithScreenshots.forEach(measurement => {
    if (!measurement.customScreenshots || measurement.customScreenshots.length === 0) return;
    
    measurement.customScreenshots.forEach((screenshot, screenIndex) => {
      const screenshotItem = document.createElement('div');
      screenshotItem.className = 'screenshot-item keep-together';
      
      const img = document.createElement('img');
      img.src = screenshot.dataUrl;
      img.className = 'custom-screenshot';
      img.alt = screenshot.title || `Screenshot ${screenIndex + 1}`;
      
      const title = document.createElement('div');
      title.className = 'screenshot-title';
      title.textContent = screenshot.title || `Bild ${screenIndex + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
      
      screenshotItem.appendChild(img);
      screenshotItem.appendChild(title);
      screenshotsGrid.appendChild(screenshotItem);
    });
  });
  
  screenshotsContent.appendChild(screenshotsGrid);
  contentWrapper.appendChild(screenshotsContent);
};
