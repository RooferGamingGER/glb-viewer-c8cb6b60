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
import { calculatePVPower } from './pvCalculations';

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
    
    // Extract roof plan if included
    const roofPlan = (measurements as any).roofPlan;
    
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
      .pv-disclaimer {
        background-color: #fff8e6;
        border-left: 4px solid #f0b429;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .pv-disclaimer-title {
        font-weight: 600;
        color: #d97706;
        margin-bottom: 8px;
      }
      .pv-disclaimer-text {
        color: #666;
        font-size: 14px;
        line-height: 1.5;
      }
      .pv-info-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      .pv-info-table th {
        text-align: left;
        padding: 8px;
        background-color: #f8f9fa;
        border: 1px solid #eee;
        font-weight: 500;
        width: 40%;
      }
      .pv-info-table td {
        padding: 8px;
        border: 1px solid #eee;
        font-weight: 500;
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
    
    // Add roof plan if available
    if (roofPlan) {
      const roofPlanSection = document.createElement('div');
      roofPlanSection.className = 'pdf-section force-page-break';
      
      // Create section with header that stays with content
      const roofPlanContent = document.createElement('div');
      roofPlanContent.className = 'section-with-header';
      
      // Add header
      roofPlanContent.appendChild(createHeader(coverData.title));
      
      // Create title
      const sectionTitle = document.createElement('h2');
      sectionTitle.textContent = 'Dachplan (Draufsicht)';
      sectionTitle.style.marginTop = '20px';
      sectionTitle.style.marginBottom = '30px';
      roofPlanContent.appendChild(sectionTitle);
      
      // Create description
      const description = document.createElement('p');
      description.textContent = 'Dieser Plan zeigt alle vermessenen Dachflächen und Elemente in der Draufsicht.';
      roofPlanContent.appendChild(description);
      
      roofPlanSection.appendChild(roofPlanContent);
      
      // Add the roof plan image
      const screenshotContainer = document.createElement('div');
      screenshotContainer.className = 'screenshot-container keep-together';
      screenshotContainer.style.marginTop = '20px';
      
      const roofPlanImage = document.createElement('img');
      roofPlanImage.src = roofPlan;
      roofPlanImage.className = 'area-screenshot';
      roofPlanImage.style.maxWidth = '100%';
      roofPlanImage.alt = 'Dachplan';
      
      screenshotContainer.appendChild(roofPlanImage);
      roofPlanSection.appendChild(screenshotContainer);
      
      contentWrapper.appendChild(roofPlanSection);
    }
    
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
    
    // Get measurements with PV modules
    const measurementsWithPV = consolidatedMeasurements.filter(m => 
      m.pvModuleInfo && m.pvModuleInfo.moduleCount > 0
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
    
    // Check if there are any custom screenshots to include
    const measurementsWithCustomScreenshots = measurements.filter(
      m => m.customScreenshots && m.customScreenshots.length > 0
    );
    
    if (measurementsWithCustomScreenshots.length > 0) {
      // Add custom screenshots section
      appendCustomScreenshotsSection(contentWrapper, measurementsWithCustomScreenshots, coverData.title);
    }
    
    // If there are areas with PV modules, add a PV summary section
    if (measurementsWithPV.length > 0) {
      appendPVSummarySection(contentWrapper, measurementsWithPV, coverData.title);
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
    
    if (measurement.pvModuleInfo && measurement.pvModuleInfo.moduleCount > 0) {
      const pvInfoContainer = document.createElement('div');
      pvInfoContainer.className = 'keep-together section-content';
      pvInfoContainer.appendChild(createPVModuleInfoSection(measurement, mIndex));
      areaContent.appendChild(pvInfoContainer);
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

const createAreaMeasurementsTable = (measurements: Measurement[]): HTMLElement => {
  const columns = ['Nr.', 'Beschreibung', 'Fläche (m²)'];
  return createMeasurementTable(measurements, columns, 'area');
};

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
  
  const penetrations = getPenetrationCount(measurements);
  if (penetrations > 0) {
    summaryStats.appendChild(createStatBox(penetrations, 'Durchdringungen'));
  }
  
  if (roofElements.solarArea > 0) {
    summaryStats.appendChild(createStatBox(roofElements.solarArea.toFixed(2) + ' m²', 'Solarfläche'));
  }
  
  summaryCard.appendChild(summaryStats);
  summarySection.appendChild(summaryCard);
  
  return summarySection;
};

/**
 * Add section for roof elements (skylights, chimneys, solar)
 */
const appendRoofElementsSection = (
  contentWrapper: HTMLElement, 
  roofElements: Measurement[], 
  title: string
) => {
  if (roofElements.length === 0) return;
  
  const sectionContent = document.createElement('div');
  sectionContent.className = 'pdf-section force-page-break';
  
  // Create section with header that stays with content
  const section = document.createElement('div');
  section.className = 'section-with-header';
  
  // Add header
  section.appendChild(createHeader(title));
  
  // Create title
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'Dachelemente';
  sectionTitle.style.marginTop = '20px';
  sectionTitle.style.marginBottom = '30px';
  section.appendChild(sectionTitle);
  
  // Create description
  const description = document.createElement('p');
  description.textContent = `Dieser Abschnitt enthält ${roofElements.length} Dachelemente.`;
  section.appendChild(description);
  
  sectionContent.appendChild(section);
  
  // Create table for roof elements
  const tableContainer = document.createElement('div');
  tableContainer.className = 'keep-together table-container';
  tableContainer.style.marginTop = '30px';
  
  const table = document.createElement('table');
  table.className = 'measurement-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Nr.', 'Beschreibung', 'Element', 'Wert'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  
  tableHead.appendChild(headerRow);
  table.appendChild(tableHead);
  
  // Table body
  const tableBody = document.createElement('tbody');
  
  // Sort roof elements by type (skylight, chimney, solar)
  const sortedRoofElements = sortMeasurementsForExport(roofElements);
  
  sortedRoofElements.forEach((element, index) => {
    const row = document.createElement('tr');
    
    // Nr
    const numCell = document.createElement('td');
    numCell.textContent = (index + 1).toString();
    row.appendChild(numCell);
    
    // Description
    const descCell = document.createElement('td');
    descCell.textContent = element.description || '–';
    row.appendChild(descCell);
    
    // Element type
    const typeCell = document.createElement('td');
    typeCell.textContent = getMeasurementTypeDisplayName(element.type);
    row.appendChild(typeCell);
    
    // Value
    const valueCell = document.createElement('td');
    valueCell.textContent = formatMeasurementValue(element);
    valueCell.style.fontWeight = 'bold';
    row.appendChild(valueCell);
    
    tableBody.appendChild(row);
  });
  
  table.appendChild(tableBody);
  tableContainer.appendChild(table);
  sectionContent.appendChild(tableContainer);
  
  contentWrapper.appendChild(sectionContent);
};

/**
 * Add section for installations (vents, hooks, other)
 */
const appendInstallationsSection = (
  contentWrapper: HTMLElement, 
  installations: Measurement[], 
  title: string
) => {
  if (installations.length === 0) return;
  
  const sectionContent = document.createElement('div');
  sectionContent.className = 'pdf-section force-page-break';
  
  // Create section with header that stays with content
  const section = document.createElement('div');
  section.className = 'section-with-header';
  
  // Add header
  section.appendChild(createHeader(title));
  
  // Create title
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'Einbauten und Durchdringungen';
  sectionTitle.style.marginTop = '20px';
  sectionTitle.style.marginBottom = '30px';
  section.appendChild(sectionTitle);
  
  // Create description
  const description = document.createElement('p');
  description.textContent = `Dieser Abschnitt enthält ${installations.length} Einbauten und Durchdringungen.`;
  section.appendChild(description);
  
  sectionContent.appendChild(section);
  
  // Create table for installations
  const tableContainer = document.createElement('div');
  tableContainer.className = 'keep-together table-container';
  tableContainer.style.marginTop = '30px';
  
  const table = document.createElement('table');
  table.className = 'measurement-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Nr.', 'Beschreibung', 'Element', 'Anzahl'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  
  tableHead.appendChild(headerRow);
  table.appendChild(tableHead);
  
  // Table body
  const tableBody = document.createElement('tbody');
  
  // Sort installations by type (vent, hook, other)
  const sortedInstallations = sortMeasurementsForExport(installations);
  
  sortedInstallations.forEach((installation, index) => {
    const row = document.createElement('tr');
    
    // Nr
    const numCell = document.createElement('td');
    numCell.textContent = (index + 1).toString();
    row.appendChild(numCell);
    
    // Description
    const descCell = document.createElement('td');
    descCell.textContent = installation.description || '–';
    row.appendChild(descCell);
    
    // Element type
    const typeCell = document.createElement('td');
    typeCell.textContent = getMeasurementTypeDisplayName(installation.type);
    row.appendChild(typeCell);
    
    // Count
    const countCell = document.createElement('td');
    countCell.textContent = `${installation.count || 1} Stück`;
    countCell.style.fontWeight = 'bold';
    row.appendChild(countCell);
    
    tableBody.appendChild(row);
  });
  
  table.appendChild(tableBody);
  tableContainer.appendChild(table);
  sectionContent.appendChild(tableContainer);
  
  contentWrapper.appendChild(sectionContent);
};

/**
 * Add section for custom screenshots
 */
const appendCustomScreenshotsSection = (
  contentWrapper: HTMLElement, 
  measurementsWithScreenshots: Measurement[], 
  title: string
) => {
  if (measurementsWithScreenshots.length === 0) return;
  
  const sectionContent = document.createElement('div');
  sectionContent.className = 'pdf-section custom-screenshots-section';
  
  // Create section with header that stays with content
  const section = document.createElement('div');
  section.className = 'section-with-header';
  
  // Add header
  section.appendChild(createHeader(title));
  
  // Create title
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'Zusätzliche Aufnahmen';
  sectionTitle.style.marginTop = '20px';
  sectionTitle.style.marginBottom = '30px';
  section.appendChild(sectionTitle);
  
  // Create description
  const totalScreenshots = measurementsWithScreenshots.reduce(
    (total, m) => total + (m.customScreenshots?.length || 0), 0
  );
  
  const description = document.createElement('p');
  description.textContent = `Dieser Abschnitt enthält ${totalScreenshots} zusätzliche Aufnahmen.`;
  section.appendChild(description);
  
  sectionContent.appendChild(section);
  
  // Add screenshots
  measurementsWithScreenshots.forEach((measurement) => {
    if (!measurement.customScreenshots || measurement.customScreenshots.length === 0) {
      return;
    }
    
    const measurementTitle = document.createElement('h3');
    measurementTitle.style.marginTop = '30px';
    measurementTitle.style.marginBottom = '15px';
    measurementTitle.style.pageBreakAfter = 'avoid';
    
    const typeName = getMeasurementTypeDisplayName(measurement.type);
    measurementTitle.textContent = measurement.description || typeName || 'Messung';
    
    sectionContent.appendChild(measurementTitle);
    
    // Add screenshots grid
    const screenshotsGrid = document.createElement('div');
    screenshotsGrid.className = 'screenshots-grid';
    
    measurement.customScreenshots.forEach((screenshot, index) => {
      const screenshotItem = document.createElement('div');
      screenshotItem.className = 'screenshot-item';
      
      const img = document.createElement('img');
      img.src = screenshot;
      img.alt = `Aufnahme ${index + 1}`;
      img.className = 'custom-screenshot';
      
      const caption = document.createElement('div');
      caption.className = 'screenshot-title';
      caption.textContent = `Aufnahme ${index + 1} - ${measurement.description || typeName || 'Messung'}`;
      
      screenshotItem.appendChild(img);
      screenshotItem.appendChild(caption);
      screenshotsGrid.appendChild(screenshotItem);
    });
    
    sectionContent.appendChild(screenshotsGrid);
  });
  
  contentWrapper.appendChild(sectionContent);
};

/**
 * Creates a section with PV module information for a specific measurement
 */
const createPVModuleInfoSection = (measurement: Measurement, index: number): HTMLElement => {
  const container = document.createElement('div');
  container.style.marginTop = '30px';
  
  if (!measurement.pvModuleInfo) return container;
  
  const pvInfo = measurement.pvModuleInfo;
  
  const pvTitle = document.createElement('h3');
  pvTitle.textContent = `PV-Planung für Fläche ${index + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
  container.appendChild(pvTitle);
  
  // Create PV module info table
  const pvTable = document.createElement('table');
  pvTable.className = 'pv-info-table';
  
  // Helper function to add a row to the table
  const addRow = (label: string, value: string | number) => {
    const row = document.createElement('tr');
    
    const labelCell = document.createElement('th');
    labelCell.textContent = label;
    row.appendChild(labelCell);
    
    const valueCell = document.createElement('td');
    valueCell.textContent = typeof value === 'number' ? value.toString() : value;
    row.appendChild(valueCell);
    
    pvTable.appendChild(row);
  };
  
  // Add rows with PV module information
  addRow('Anzahl Module', pvInfo.moduleCount);
  addRow('Modulgröße', `${pvInfo.moduleWidth.toFixed(3)}m × ${pvInfo.moduleHeight.toFixed(3)}m`);
  addRow('Ausrichtung', pvInfo.orientation === 'portrait' ? 'Hochformat' : 'Querformat');
  addRow('Dachflächenabdeckung', `${pvInfo.coveragePercent.toFixed(1)}%`);
  addRow('Gesamtleistung', `${calculatePVPower(pvInfo.moduleCount).toFixed(2)} kWp`);
  
  // Add orientation information if available
  if (pvInfo.roofDirection) {
    addRow('Dachausrichtung', pvInfo.roofDirection);
  }
  
  if (pvInfo.roofInclination !== undefined) {
    addRow('Dachneigung', `${pvInfo.roofInclination.toFixed(1)}°`);
  }
  
  if (pvInfo.yieldFactor) {
    addRow('Ertragsfaktor', `${pvInfo.yieldFactor.toFixed(0)} kWh/kWp pro Jahr`);
  }
  
  container.appendChild(pvTable);
  
  // Add PV disclaimer
  container.appendChild(createPVDisclaimer());
  
  return container;
};

/**
 * Creates a PV disclaimer section for the PDF
 */
const createPVDisclaimer = (): HTMLElement => {
  const disclaimer = document.createElement('div');
  disclaimer.className = 'pv-disclaimer';
  
  const title = document.createElement('div');
  title.className = 'pv-disclaimer-title';
  title.textContent = 'Wichtiger Hinweis zur PV-Planung';
  disclaimer.appendChild(title);
  
  const text = document.createElement('div');
  text.className = 'pv-disclaimer-text';
  text.innerHTML = `
    <p><strong>Vorläufige Planung – Bitte beachten Sie:</strong></p>
    <p>Die hier dargestellte Planung ist eine erste, unverbindliche Vorplanung. Bei dieser ersten Einschätzung wurden die exakte Ausrichtung der potenziellen PV-Anlage sowie die genaue Dachneigung noch nicht berücksichtigt. Diese Vorplanung dient lediglich einer ersten Orientierung und ersetzt keine detaillierte Fachplanung.</p>
    <p>Für eine präzise und verbindliche Planung, die alle relevanten Aspekte einbezieht, empfehlen wir Ihnen, ein professionelles Angebot von einem Fachbetrieb einzuholen.</p>
  `;
  disclaimer.appendChild(text);
  
  return disclaimer;
};

/**
 * Adds a summary section for PV planning
 */
const appendPVSummarySection = (
  contentWrapper: HTMLElement,
  measurementsWithPV: Measurement[],
  title: string
) => {
  if (measurementsWithPV.length === 0) return;
  
  const sectionContent = document.createElement('div');
  sectionContent.className = 'pdf-section force-page-break';
  
  // Create section with header that stays with content
  const section = document.createElement('div');
  section.className = 'section-with-header';
  
  // Add header
  section.appendChild(createHeader(title));
  
  // Create title
  const sectionTitle = document.createElement('h2');
  sectionTitle.textContent = 'PV-Planung - Übersicht';
  sectionTitle.style.marginTop = '20px';
  sectionTitle.style.marginBottom = '30px';
  section.appendChild(sectionTitle);
  
  // Create description
  const description = document.createElement('p');
  description.textContent = `Die Auswertung enthält ${measurementsWithPV.length} Dachflächen mit geplanten PV-Modulen.`;
  section.appendChild(description);
  
  // Add PV disclaimer at the top of the section
  section.appendChild(createPVDisclaimer());
  
  sectionContent.appendChild(section);
  
  // Calculate totals
  const totalModules = measurementsWithPV.reduce((sum, m) => 
    sum + (m.pvModuleInfo?.moduleCount || 0), 0
  );
  
  const totalPower = calculatePVPower(totalModules);
  
  // Create total summary card
  const summaryCard = document.createElement('div');
  summaryCard.className = 'summary-card';
  summaryCard.style.marginTop = '30px';
  
  const summaryTitle = document.createElement('h3');
  summaryTitle.textContent = 'Zusammenfassung PV-Planung';
  summaryTitle.style.marginBottom = '15px';
  summaryCard.appendChild(summaryTitle);
  
  const summaryStats = document.createElement('div');
  summaryStats.className = 'summary-stats';
  
  // Helper function to create stat boxes
  const createStatBox = (value: string | number, label: string) => {
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
  
  // Add summary stat boxes
  summaryStats.appendChild(createStatBox(measurementsWithPV.length, 'Dachflächen mit PV'));
  summaryStats.appendChild(createStatBox(totalModules, 'Gesamtanzahl Module'));
  summaryStats.appendChild(createStatBox(`${totalPower.toFixed(2)} kWp`, 'Gesamtleistung'));
  
  // Add estimated yield if available for any of the measurements
  const hasYieldInfo = measurementsWithPV.some(m => m.pvModuleInfo?.yieldFactor);
  if (hasYieldInfo) {
    // Find the first measurement with yield factor to use as reference
    const referenceYield = measurementsWithPV.find(m => m.pvModuleInfo?.yieldFactor)?.pvModuleInfo?.yieldFactor;
    if (referenceYield) {
      const estimatedYield = (totalPower * referenceYield).toFixed(0);
      summaryStats.appendChild(createStatBox(`${estimatedYield} kWh`, 'Geschätzter Jahresertrag'));
    }
  }
  
  summaryCard.appendChild(summaryStats);
  sectionContent.appendChild(summaryCard);
  
  // Create table with PV info for each roof area
  const tableContainer = document.createElement('div');
  tableContainer.className = 'keep-together table-container';
  tableContainer.style.marginTop = '30px';
  
  const table = document.createElement('table');
  table.className = 'measurement-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Nr.', 'Beschreibung', 'Fläche (m²)', 'Module', 'Ausrichtung', 'Leistung (kWp)'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  
  tableHead.appendChild(headerRow);
  table.appendChild(tableHead);
  
  // Table body
  const tableBody = document.createElement('tbody');
  
  measurementsWithPV.forEach((measurement, index) => {
    const row = document.createElement('tr');
    
    // Nr
    const numCell = document.createElement('td');
    numCell.textContent = (index + 1).toString();
    row.appendChild(numCell);
    
    // Description
    const descCell = document.createElement('td');
    descCell.textContent = measurement.description || '–';
    row.appendChild(descCell);
    
    // Area
    const areaCell = document.createElement('td');
    areaCell.textContent = `${measurement.value?.toFixed(2) || '–'} m²`;
    row.appendChild(areaCell);
    
    // Module count
    const moduleCell = document.createElement('td');
    moduleCell.textContent = `${measurement.pvModuleInfo?.moduleCount || '–'}`;
    row.appendChild(moduleCell);
    
    // Orientation
    const orientationCell = document.createElement('td');
    let orientationText = measurement.pvModuleInfo?.orientation === 'portrait' ? 'Hochformat' : 'Querformat';
    if (measurement.pvModuleInfo?.roofDirection) {
      orientationText += `, ${measurement.pvModuleInfo.roofDirection}`;
    }
    orientationCell.textContent = orientationText;
    row.appendChild(orientationCell);
    
    // Power
    const powerCell = document.createElement('td');
    const power = measurement.pvModuleInfo?.moduleCount 
      ? calculatePVPower(measurement.pvModuleInfo.moduleCount).toFixed(2)
      : '–';
    powerCell.textContent = power;
    row.appendChild(powerCell);
    
    tableBody.appendChild(row);
  });
  
  table.appendChild(tableBody);
  tableContainer.appendChild(table);
  sectionContent.appendChild(tableContainer);
  
  contentWrapper.appendChild(sectionContent);
};

