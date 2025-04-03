import html2pdf from 'html2pdf.js';
import { Measurement } from '@/types/measurements';
import { getMeasurementTypeDisplayName, getSegmentTypeDisplayName, formatMeasurementValue, calculateTotalArea, groupSegmentsByType } from './exportUtils';

export interface CoverPageData {
  title: string;
  companyName: string;
  projectNumber: string;
  projectAddress: string;
  clientName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  creationDate: string;
  notes: string;
}

const createAreaSegmentsTable = (measurement: Measurement, index: number): HTMLElement => {
  const container = document.createElement('div');
  container.style.marginTop = '30px';
  container.style.pageBreakInside = 'avoid';
  
  const segmentsTitle = document.createElement('h3');
  segmentsTitle.textContent = `Teilmessungen für Fläche ${index + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
  container.appendChild(segmentsTitle);
  
  const segmentsTable = document.createElement('table');
  segmentsTable.className = 'segment-table';
  
  const segmentsTableHead = document.createElement('thead');
  const segmentsHeaderRow = document.createElement('tr');
  
  ['Teilmessung', 'Länge (m)', 'Typ'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    segmentsHeaderRow.appendChild(th);
  });
  
  segmentsTableHead.appendChild(segmentsHeaderRow);
  segmentsTable.appendChild(segmentsTableHead);
  
  const segmentsTableBody = document.createElement('tbody');
  
  if (measurement.segments) {
    measurement.segments.forEach((segment, sIndex) => {
      const segmentRow = document.createElement('tr');
      
      const segmentNumCell = document.createElement('td');
      segmentNumCell.textContent = `Teilmessung ${sIndex + 1}`;
      segmentRow.appendChild(segmentNumCell);
      
      const segmentLengthCell = document.createElement('td');
      segmentLengthCell.textContent = `${segment.length.toFixed(2)} m`;
      segmentRow.appendChild(segmentLengthCell);
      
      const segmentTypeCell = document.createElement('td');
      if (segment.type) {
        const typeName = getSegmentTypeDisplayName(segment.type);
        segmentTypeCell.textContent = typeName;
      } else {
        segmentTypeCell.textContent = '–';
      }
      segmentRow.appendChild(segmentTypeCell);
      
      segmentsTableBody.appendChild(segmentRow);
    });
  }
  
  segmentsTable.appendChild(segmentsTableBody);
  container.appendChild(segmentsTable);
  
  return container;
};

/**
 * Creates a total area summary section for the PDF
 */
const createTotalAreaSummary = (measurements: Measurement[]): HTMLElement => {
  const totalArea = calculateTotalArea(measurements);
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  
  const container = document.createElement('div');
  container.style.marginTop = '40px';
  container.style.pageBreakBefore = 'always';
  
  const summaryTitle = document.createElement('h2');
  summaryTitle.textContent = 'Gesamtübersicht';
  container.appendChild(summaryTitle);
  
  const areaSummary = document.createElement('div');
  areaSummary.style.marginTop = '20px';
  
  const areaSummaryTitle = document.createElement('h3');
  areaSummaryTitle.textContent = 'Flächenauswertung';
  areaSummary.appendChild(areaSummaryTitle);
  
  const areaTable = document.createElement('table');
  areaTable.className = 'summary-table';
  
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Bezeichnung', 'Fläche (m²)'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  
  tableHead.appendChild(headerRow);
  areaTable.appendChild(tableHead);
  
  const tableBody = document.createElement('tbody');
  
  areaMeasurements.forEach((measurement, index) => {
    const row = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.textContent = measurement.description || `Fläche ${index + 1}`;
    row.appendChild(nameCell);
    
    const valueCell = document.createElement('td');
    valueCell.textContent = `${measurement.value.toFixed(2)} m²`;
    row.appendChild(valueCell);
    
    tableBody.appendChild(row);
  });
  
  const totalRow = document.createElement('tr');
  totalRow.className = 'total-row';
  
  const totalLabelCell = document.createElement('td');
  totalLabelCell.textContent = 'Gesamtfläche';
  totalLabelCell.style.fontWeight = 'bold';
  totalRow.appendChild(totalLabelCell);
  
  const totalValueCell = document.createElement('td');
  totalValueCell.textContent = `${totalArea.toFixed(2)} m²`;
  totalValueCell.style.fontWeight = 'bold';
  totalRow.appendChild(totalValueCell);
  
  tableBody.appendChild(totalRow);
  areaTable.appendChild(tableBody);
  areaSummary.appendChild(areaTable);
  
  container.appendChild(areaSummary);
  
  return container;
};

/**
 * Creates a segment summary section for the PDF grouped by segment type
 */
const createSegmentSummary = (measurements: Measurement[]): HTMLElement => {
  const segmentGroups = groupSegmentsByType(measurements);
  
  const container = document.createElement('div');
  container.style.marginTop = '40px';
  
  const summaryTitle = document.createElement('h3');
  summaryTitle.textContent = 'Dachkanten-Auswertung';
  container.appendChild(summaryTitle);
  
  const segmentTypeOrder = ['ridge', 'hip', 'valley', 'eave', 'verge'];
  
  segmentTypeOrder.forEach(type => {
    if (segmentGroups[type] && segmentGroups[type].count > 0) {
      const typeSection = document.createElement('div');
      typeSection.style.pageBreakInside = 'avoid';
      typeSection.style.marginBottom = '20px';
      
      const typeInfo = segmentGroups[type];
      const typeName = getSegmentTypeDisplayName(type);
      
      const typeTitle = document.createElement('h4');
      typeTitle.textContent = typeName;
      typeTitle.style.marginTop = '15px';
      typeTitle.style.marginBottom = '5px';
      typeSection.appendChild(typeTitle);
      
      const typeTable = document.createElement('table');
      typeTable.className = 'summary-table';
      
      const tableHead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      ['Anzahl', 'Gesamtlänge (m)'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        headerRow.appendChild(th);
      });
      
      tableHead.appendChild(headerRow);
      typeTable.appendChild(tableHead);
      
      const tableBody = document.createElement('tbody');
      const row = document.createElement('tr');
      
      const countCell = document.createElement('td');
      countCell.textContent = `${typeInfo.count}`;
      row.appendChild(countCell);
      
      const lengthCell = document.createElement('td');
      lengthCell.textContent = `${typeInfo.totalLength.toFixed(2)} m`;
      row.appendChild(lengthCell);
      
      tableBody.appendChild(row);
      typeTable.appendChild(tableBody);
      
      typeSection.appendChild(typeTable);
      
      container.appendChild(typeSection);
    }
  });
  
  Object.keys(segmentGroups).forEach(type => {
    if (!segmentTypeOrder.includes(type) && segmentGroups[type].count > 0) {
      const typeSection = document.createElement('div');
      typeSection.style.pageBreakInside = 'avoid';
      typeSection.style.marginBottom = '20px';
      
      const typeInfo = segmentGroups[type];
      const typeName = getSegmentTypeDisplayName(type);
      
      const typeTitle = document.createElement('h4');
      typeTitle.textContent = typeName;
      typeTitle.style.marginTop = '15px';
      typeTitle.style.marginBottom = '5px';
      typeSection.appendChild(typeTitle);
      
      const typeTable = document.createElement('table');
      typeTable.className = 'summary-table';
      
      const tableHead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      ['Anzahl', 'Gesamtlänge (m)'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        headerRow.appendChild(th);
      });
      
      tableHead.appendChild(headerRow);
      typeTable.appendChild(tableHead);
      
      const tableBody = document.createElement('tbody');
      const row = document.createElement('tr');
      
      const countCell = document.createElement('td');
      countCell.textContent = `${typeInfo.count}`;
      row.appendChild(countCell);
      
      const lengthCell = document.createElement('td');
      lengthCell.textContent = `${typeInfo.totalLength.toFixed(2)} m`;
      row.appendChild(lengthCell);
      
      tableBody.appendChild(row);
      typeTable.appendChild(tableBody);
      
      typeSection.appendChild(typeTable);
      
      container.appendChild(typeSection);
    }
  });
  
  const totalSection = document.createElement('div');
  totalSection.style.pageBreakInside = 'avoid';
  totalSection.style.marginTop = '20px';
  
  const totalLength = Object.values(segmentGroups).reduce((total, group) => total + group.totalLength, 0);
  const totalCount = Object.values(segmentGroups).reduce((total, group) => total + group.count, 0);
  
  const totalTitle = document.createElement('h4');
  totalTitle.textContent = 'Gesamtübersicht Dachkanten';
  totalSection.appendChild(totalTitle);
  
  const totalTable = document.createElement('table');
  totalTable.className = 'summary-table';
  
  const totalTableHead = document.createElement('thead');
  const totalHeaderRow = document.createElement('tr');
  
  ['Anzahl', 'Gesamtlänge (m)'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    totalHeaderRow.appendChild(th);
  });
  
  totalTableHead.appendChild(totalHeaderRow);
  totalTable.appendChild(totalTableHead);
  
  const totalTableBody = document.createElement('tbody');
  const totalRow = document.createElement('tr');
  totalRow.className = 'total-row';
  
  const totalCountCell = document.createElement('td');
  totalCountCell.textContent = `${totalCount}`;
  totalCountCell.style.fontWeight = 'bold';
  totalRow.appendChild(totalCountCell);
  
  const totalLengthCell = document.createElement('td');
  totalLengthCell.textContent = `${totalLength.toFixed(2)} m`;
  totalLengthCell.style.fontWeight = 'bold';
  totalRow.appendChild(totalLengthCell);
  
  totalTableBody.appendChild(totalRow);
  totalTable.appendChild(totalTableBody);
  
  totalSection.appendChild(totalTable);
  container.appendChild(totalSection);
  
  return container;
};

/**
 * Creates the table of contents for the PDF
 */
const createTableOfContents = (measurements: Measurement[]): HTMLElement => {
  const container = document.createElement('div');
  container.style.marginTop = '20px';
  container.style.marginBottom = '20px';
  
  const title = document.createElement('h3');
  title.textContent = 'Inhaltsverzeichnis';
  title.style.color = '#444';
  title.style.marginBottom = '15px';
  container.appendChild(title);
  
  const tocTable = document.createElement('table');
  tocTable.className = 'toc-table';
  tocTable.style.width = '100%';
  tocTable.style.borderCollapse = 'collapse';
  
  const tbody = document.createElement('tbody');
  
  const coverRow = document.createElement('tr');
  const coverLabel = document.createElement('td');
  coverLabel.textContent = 'Deckblatt';
  coverLabel.style.padding = '5px 0';
  coverLabel.style.borderBottom = '1px solid #eee';
  
  const coverPage = document.createElement('td');
  coverPage.textContent = '1';
  coverPage.style.textAlign = 'right';
  coverPage.style.padding = '5px 0';
  coverPage.style.borderBottom = '1px solid #eee';
  
  coverRow.appendChild(coverLabel);
  coverRow.appendChild(coverPage);
  tbody.appendChild(coverRow);
  
  let currentPage = 2;
  
  const notesRow = document.createElement('tr');
  const notesLabel = document.createElement('td');
  notesLabel.textContent = 'Bemerkungen';
  notesLabel.style.padding = '5px 0';
  notesLabel.style.borderBottom = '1px solid #eee';
  
  const notesPage = document.createElement('td');
  notesPage.textContent = currentPage.toString();
  notesPage.style.textAlign = 'right';
  notesPage.style.padding = '5px 0';
  notesPage.style.borderBottom = '1px solid #eee';
  
  notesRow.appendChild(notesLabel);
  notesRow.appendChild(notesPage);
  tbody.appendChild(notesRow);
  
  currentPage++;
  
  const roofPlanRow = document.createElement('tr');
  const roofPlanLabel = document.createElement('td');
  roofPlanLabel.textContent = 'Dachplan';
  roofPlanLabel.style.padding = '5px 0';
  roofPlanLabel.style.borderBottom = '1px solid #eee';
  
  const roofPlanPage = document.createElement('td');
  roofPlanPage.textContent = currentPage.toString();
  roofPlanPage.style.textAlign = 'right';
  roofPlanPage.style.padding = '5px 0';
  roofPlanPage.style.borderBottom = '1px solid #eee';
  
  roofPlanRow.appendChild(roofPlanLabel);
  roofPlanRow.appendChild(roofPlanPage);
  tbody.appendChild(roofPlanRow);
  
  currentPage++;
  
  const summaryRow = document.createElement('tr');
  const summaryLabel = document.createElement('td');
  summaryLabel.textContent = 'Messungen - Übersicht';
  summaryLabel.style.padding = '5px 0';
  summaryLabel.style.borderBottom = '1px solid #eee';
  
  const summaryPage = document.createElement('td');
  summaryPage.textContent = currentPage.toString();
  summaryPage.style.textAlign = 'right';
  summaryPage.style.padding = '5px 0';
  summaryPage.style.borderBottom = '1px solid #eee';
  
  summaryRow.appendChild(summaryLabel);
  summaryRow.appendChild(summaryPage);
  tbody.appendChild(summaryRow);
  
  currentPage++;
  
  if (measurements.filter(m => m.type === 'area').length > 0) {
    const areaRow = document.createElement('tr');
    const areaLabel = document.createElement('td');
    areaLabel.textContent = 'Flächenmessungen';
    areaLabel.style.padding = '5px 0';
    areaLabel.style.borderBottom = '1px solid #eee';
    
    const areaPage = document.createElement('td');
    areaPage.textContent = currentPage.toString();
    areaPage.style.textAlign = 'right';
    areaPage.style.padding = '5px 0';
    areaPage.style.borderBottom = '1px solid #eee';
    
    areaRow.appendChild(areaLabel);
    areaRow.appendChild(areaPage);
    tbody.appendChild(areaRow);
    
    currentPage++;
  }
  
  if (measurements.filter(m => m.type === 'length').length > 0) {
    const lengthRow = document.createElement('tr');
    const lengthLabel = document.createElement('td');
    lengthLabel.textContent = 'Längenmessungen';
    lengthLabel.style.padding = '5px 0';
    lengthLabel.style.borderBottom = '1px solid #eee';
    
    const lengthPage = document.createElement('td');
    lengthPage.textContent = currentPage.toString();
    lengthPage.style.textAlign = 'right';
    lengthPage.style.padding = '5px 0';
    lengthPage.style.borderBottom = '1px solid #eee';
    
    lengthRow.appendChild(lengthLabel);
    lengthRow.appendChild(lengthPage);
    tbody.appendChild(lengthRow);
    
    currentPage++;
  }
  
  if (measurements.filter(m => m.type === 'height').length > 0) {
    const heightRow = document.createElement('tr');
    const heightLabel = document.createElement('td');
    heightLabel.textContent = 'Höhenmessungen';
    heightLabel.style.padding = '5px 0';
    heightLabel.style.borderBottom = '1px solid #eee';
    
    const heightPage = document.createElement('td');
    heightPage.textContent = currentPage.toString();
    heightPage.style.textAlign = 'right';
    heightPage.style.padding = '5px 0';
    heightPage.style.borderBottom = '1px solid #eee';
    
    heightRow.appendChild(heightLabel);
    heightRow.appendChild(heightPage);
    tbody.appendChild(heightRow);
    
    currentPage++;
  }
  
  if (measurements.filter(m => !['area', 'length', 'height'].includes(m.type)).length > 0) {
    const otherRow = document.createElement('tr');
    const otherLabel = document.createElement('td');
    otherLabel.textContent = 'Andere Messungen';
    otherLabel.style.padding = '5px 0';
    otherLabel.style.borderBottom = '1px solid #eee';
    
    const otherPage = document.createElement('td');
    otherPage.textContent = currentPage.toString();
    otherPage.style.textAlign = 'right';
    otherPage.style.padding = '5px 0';
    otherPage.style.borderBottom = '1px solid #eee';
    
    otherRow.appendChild(otherLabel);
    otherRow.appendChild(otherPage);
    tbody.appendChild(otherRow);
    
    currentPage++;
  }
  
  const totalRow = document.createElement('tr');
  const totalLabel = document.createElement('td');
  totalLabel.textContent = 'Gesamtübersicht';
  totalLabel.style.padding = '5px 0';
  totalLabel.style.borderBottom = '1px solid #eee';
  
  const totalPage = document.createElement('td');
  totalPage.textContent = currentPage.toString();
  totalPage.style.textAlign = 'right';
  totalPage.style.padding = '5px 0';
  totalPage.style.borderBottom = '1px solid #eee';
  
  totalRow.appendChild(totalLabel);
  totalRow.appendChild(totalPage);
  tbody.appendChild(totalRow);
  
  tocTable.appendChild(tbody);
  container.appendChild(tocTable);
  
  return container;
};

/**
 * Creates the summary section for the cover page
 */
const createCoverPageSummary = (summary: any): HTMLElement => {
  const container = document.createElement('div');
  container.style.marginTop = '15px';
  
  const title = document.createElement('h3');
  title.textContent = 'Zusammenfassung';
  title.style.color = '#444';
  title.style.marginBottom = '10px';
  container.appendChild(title);
  
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  
  const tbody = document.createElement('tbody');
  
  const areaRow = document.createElement('tr');
  
  const areaLabel = document.createElement('td');
  areaLabel.textContent = 'Dachfläche gesamt';
  areaLabel.style.padding = '3px 0';
  areaLabel.style.borderBottom = '1px solid #eee';
  
  const areaValue = document.createElement('td');
  areaValue.textContent = `${summary.totalArea ? summary.totalArea.toFixed(2) : '0.00'} m²`;
  areaValue.style.textAlign = 'right';
  areaValue.style.padding = '3px 0';
  areaValue.style.borderBottom = '1px solid #eee';
  
  areaRow.appendChild(areaLabel);
  areaRow.appendChild(areaValue);
  tbody.appendChild(areaRow);
  
  if (summary.pvModules > 0) {
    const pvRow = document.createElement('tr');
    
    const pvLabel = document.createElement('td');
    pvLabel.textContent = 'PV-Module';
    pvLabel.style.padding = '3px 0';
    pvLabel.style.borderBottom = '1px solid #eee';
    
    const pvValue = document.createElement('td');
    pvValue.textContent = `${summary.pvModules} (${summary.pvPower.toFixed(2)} kWp)`;
    pvValue.style.textAlign = 'right';
    pvValue.style.padding = '3px 0';
    pvValue.style.borderBottom = '1px solid #eee';
    
    pvRow.appendChild(pvLabel);
    pvRow.appendChild(pvValue);
    tbody.appendChild(pvRow);
  }
  
  if (summary.skylights > 0) {
    const skylightRow = document.createElement('tr');
    
    const skylightLabel = document.createElement('td');
    skylightLabel.textContent = 'Dachfenster';
    skylightLabel.style.padding = '3px 0';
    skylightLabel.style.borderBottom = '1px solid #eee';
    
    const skylightValue = document.createElement('td');
    skylightValue.textContent = `${summary.skylights}`;
    skylightValue.style.textAlign = 'right';
    skylightValue.style.padding = '3px 0';
    skylightValue.style.borderBottom = '1px solid #eee';
    
    skylightRow.appendChild(skylightLabel);
    skylightRow.appendChild(skylightValue);
    tbody.appendChild(skylightRow);
  }
  
  if (summary.chimneys > 0) {
    const chimneyRow = document.createElement('tr');
    
    const chimneyLabel = document.createElement('td');
    chimneyLabel.textContent = 'Kamine';
    chimneyLabel.style.padding = '3px 0';
    chimneyLabel.style.borderBottom = '1px solid #eee';
    
    const chimneyValue = document.createElement('td');
    chimneyValue.textContent = `${summary.chimneys}`;
    chimneyValue.style.textAlign = 'right';
    chimneyValue.style.padding = '3px 0';
    chimneyValue.style.borderBottom = '1px solid #eee';
    
    chimneyRow.appendChild(chimneyLabel);
    chimneyRow.appendChild(chimneyValue);
    tbody.appendChild(chimneyRow);
  }
  
  const totalPenetrations = (summary.vents || 0) + (summary.hooks || 0) + (summary.otherPenetrations || 0);
  if (totalPenetrations > 0) {
    const penetrationRow = document.createElement('tr');
    
    const penetrationLabel = document.createElement('td');
    penetrationLabel.textContent = 'Durchdringungen gesamt';
    penetrationLabel.style.padding = '3px 0';
    penetrationLabel.style.borderBottom = '1px solid #eee';
    
    const penetrationValue = document.createElement('td');
    penetrationValue.textContent = `${totalPenetrations}`;
    penetrationValue.style.textAlign = 'right';
    penetrationValue.style.padding = '3px 0';
    penetrationValue.style.borderBottom = '1px solid #eee';
    
    penetrationRow.appendChild(penetrationLabel);
    penetrationRow.appendChild(penetrationValue);
    tbody.appendChild(penetrationRow);
  }
  
  table.appendChild(tbody);
  container.appendChild(table);
  
  return container;
};

/**
 * Creates a dedicated info page with notes and summary
 */
const createInfoPage = (notes: string, summary: any): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'info-page';
  container.style.padding = '20px';
  container.style.position = 'relative';
  container.style.height = '270mm';
  container.style.pageBreakAfter = 'always';
  
  // Add summary section first
  const summaryContainer = document.createElement('div');
  summaryContainer.style.marginBottom = '30px';
  
  const summaryTitle = document.createElement('h2');
  summaryTitle.textContent = 'Zusammenfassung';
  summaryTitle.style.marginBottom = '20px';
  summaryContainer.appendChild(summaryTitle);
  
  const summaryContent = createCoverPageSummary(summary);
  summaryContainer.appendChild(summaryContent);
  
  container.appendChild(summaryContainer);
  
  // Add notes section if notes exist
  if (notes && notes.trim().length > 0) {
    const notesContainer = document.createElement('div');
    notesContainer.style.marginTop = '30px';
    
    const notesTitle = document.createElement('h2');
    notesTitle.textContent = 'Bemerkungen';
    notesTitle.style.marginBottom = '20px';
    notesContainer.appendChild(notesTitle);
    
    const notesContent = document.createElement('div');
    notesContent.style.padding = '15px';
    notesContent.style.backgroundColor = '#f9f9f9';
    notesContent.style.border = '1px solid #eee';
    notesContent.style.borderRadius = '4px';
    notesContent.style.fontSize = '14px';
    notesContent.style.lineHeight = '1.6';
    notesContent.style.whiteSpace = 'pre-wrap';
    
    const formattedNotes = notes.split('\n').join('<br>');
    notesContent.innerHTML = formattedNotes;
    
    notesContainer.appendChild(notesContent);
    container.appendChild(notesContainer);
  }
  
  return container;
};

/**
 * Creates a dedicated notes page
 */
const createNotesPage = (notes: string): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'notes-page';
  container.style.padding = '20px';
  container.style.position = 'relative';
  container.style.height = '270mm';
  container.style.pageBreakAfter = 'always';
  
  const notesTitle = document.createElement('h2');
  notesTitle.textContent = 'Bemerkungen';
  notesTitle.style.marginBottom = '20px';
  container.appendChild(notesTitle);
  
  const notesContent = document.createElement('div');
  notesContent.style.padding = '15px';
  notesContent.style.backgroundColor = '#f9f9f9';
  notesContent.style.border = '1px solid #eee';
  notesContent.style.borderRadius = '4px';
  notesContent.style.fontSize = '14px';
  notesContent.style.lineHeight = '1.6';
  notesContent.style.whiteSpace = 'pre-wrap';
  
  const formattedNotes = notes.split('\n').join('<br>');
  notesContent.innerHTML = formattedNotes;
  
  container.appendChild(notesContent);
  
  return container;
};

/**
 * Export measurements to PDF with cover page
 */
export const exportMeasurementsToPdf = async (measurements: Measurement[], coverData: CoverPageData): Promise<boolean> => {
  try {
    const sortedMeasurements = measurements.sort((a, b) => {
      const typeOrder: Record<string, number> = {
        'length': 1,
        'height': 2,
        'area': 3,
        'skylight': 4,
        'chimney': 5,
        'solar': 6,
        'vent': 7,
        'hook': 8,
        'other': 9
      };
      
      const orderA = typeOrder[a.type] || 999;
      const orderB = typeOrder[b.type] || 999;
      
      return orderA - orderB;
    });
    
    const summaryData = (measurements as any).summary || {};
    if (!summaryData.totalArea) {
      summaryData.totalArea = calculateTotalArea(measurements);
    }
    
    const container = document.createElement('div');
    container.className = 'pdf-container';
    
    const style = document.createElement('style');
    style.textContent = `
      .pdf-container {
        font-family: 'Arial', sans-serif;
        color: #333;
        line-height: 1.4;
      }
      .cover-page {
        padding: 15px;
        height: 270mm;
        max-height: 270mm;
        position: relative;
        background-color: #fafafa;
        overflow: hidden;
        box-sizing: border-box;
        page-break-after: always;
      }
      .cover-header {
        margin-bottom: 15px;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
      }
      .company-name {
        font-size: 20px;
        font-weight: bold;
        color: #222;
        text-align: center;
        width: 100%;
      }
      .cover-title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
        color: #333;
        text-align: center;
      }
      .cover-subtitle {
        text-align: center;
        font-size: 12px;
        color: #555;
        margin-bottom: 15px;
      }
      .info-section {
        display: flex;
        margin-bottom: 10px;
        gap: 30px;
      }
      .left-info, .right-info {
        flex: 1;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
      }
      .info-table td {
        padding: 2px 0;
        border-bottom: 1px solid #eee;
        font-size: 11px;
      }
      .info-label {
        font-weight: bold;
        width: 110px;
        color: #555;
      }
      .model-view {
        margin: 20px auto;
        text-align: center;
        max-width: 100%;
        height: calc(100% - 250px);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .model-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #fff;
      }
      .content-container {
        max-height: 80mm;
        overflow: hidden;
      }
      .toc-table {
        width: 100%;
        border-collapse: collapse;
      }
      .toc-table td {
        padding: 2px 0;
        border-bottom: 1px solid #eee;
        font-size: 10px;
      }
      .info-page {
        padding: 20px;
        height: 270mm;
        position: relative;
        background-color: #fafafa;
        box-sizing: border-box;
        page-break-after: always;
      }
      .notes-page {
        padding: 20px;
        height: 270mm;
        position: relative;
        background-color: #fafafa;
        box-sizing: border-box;
        page-break-after: always;
      }
      .measurement-section {
        margin-top: 20px;
        page-break-before: always;
      }
      .measurement-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        margin-bottom: 20px;
        page-break-inside: avoid;
      }
      .measurement-table th,
      .measurement-table td,
      .segment-table th,
      .segment-table td,
      .summary-table th,
      .summary-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      .measurement-table th,
      .segment-table th,
      .summary-table th {
        background-color: #f2f2f2;
      }
      .segment-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        margin-bottom: 30px;
        font-size: 0.9em;
      }
      .summary-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        margin-bottom: 20px;
      }
      .total-row {
        background-color: #f9f9f9;
      }
      .area-visual {
        max-width: 100%;
        max-height: 300px;
        margin-top: 10px;
        margin-bottom: 20px;
      }
      h2 {
        border-bottom: 1px solid #ddd;
        padding-bottom: 10px;
        margin-top: 20px;
      }
      h3 {
        margin-top: 10px;
        margin-bottom: 5px;
        font-size: 13px;
      }
      h4 {
        margin-top: 8px;
        margin-bottom: 5px;
        font-size: 12px;
      }
      .roof-plan {
        max-width: 100%;
        height: auto;
        margin: 0 auto;
        display: block;
      }
      .footnote {
        font-size: 10px;
        color: #999;
        margin-top: 10px;
      }
      .page-break {
        page-break-before: always;
      }
      .area-detail {
        page-break-inside: avoid;
      }
      .type-section {
        page-break-inside: avoid;
      }
      .summary-section {
        max-height: 60mm;
        overflow: hidden;
      }
    `;
    container.appendChild(style);
    
    // Create the cover page
    const coverPage = document.createElement('div');
    coverPage.className = 'cover-page';
    
    const coverHeader = document.createElement('div');
    coverHeader.className = 'cover-header';
    
    const companyName = document.createElement('div');
    companyName.className = 'company-name';
    companyName.innerHTML = coverData.companyName || 'DrohnenGLB by RooferGaming<sup>®</sup>';
    coverHeader.appendChild(companyName);
    
    coverPage.appendChild(coverHeader);
    
    const title = document.createElement('h1');
    title.className = 'cover-title';
    title.textContent = coverData.title;
    coverPage.appendChild(title);
    
    const subtitle = document.createElement('div');
    subtitle.className = 'cover-subtitle';
    subtitle.innerHTML = 'Kostenloser GLB Viewer: drohnenglb.de<br>Drohnenaufmaß ab 90€/Monat: drohnenvermessung-server.de';
    coverPage.appendChild(subtitle);
    
    const infoSection = document.createElement('div');
    infoSection.className = 'info-section';
    
    const leftInfo = document.createElement('div');
    leftInfo.className = 'left-info';
    
    const projectTitle = document.createElement('h3');
    projectTitle.textContent = 'Projektdaten';
    projectTitle.style.color = '#444';
    projectTitle.style.marginBottom = '5px';
    leftInfo.appendChild(projectTitle);
    
    const projectTable = document.createElement('table');
    projectTable.className = 'info-table';
    
    const projectRows = [
      { label: 'Projektnummer:', value: coverData.projectNumber },
      { label: 'Erstellungsdatum:', value: coverData.creationDate },
      { label: 'Objektadresse:', value: coverData.projectAddress }
    ];
    
    projectRows.forEach(row => {
      if (row.value) {
        const tableRow = document.createElement('tr');
        
        const labelCell = document.createElement('td');
        labelCell.className = 'info-label';
        labelCell.textContent = row.label;
        tableRow.appendChild(labelCell);
        
        const valueCell = document.createElement('td');
        valueCell.textContent = row.value;
        tableRow.appendChild(valueCell);
        
        projectTable.appendChild(tableRow);
      }
    });
    
    leftInfo.appendChild(projectTable);
    infoSection.appendChild(leftInfo);
    
    const rightInfo = document.createElement('div');
    rightInfo.className = 'right-info';
    
    const customerTitle = document.createElement('h3');
    customerTitle.textContent = 'Kundendaten';
    customerTitle.style.color = '#444';
    customerTitle.style.marginBottom = '5px';
    rightInfo.appendChild(customerTitle);
    
    const customerTable = document.createElement('table');
    customerTable.className = 'info-table';
    
    const customerRows = [
      { label: 'Auftraggeber:', value: coverData.clientName },
      { label: 'Ansprechpartner:', value: coverData.contactPerson },
      { label: 'Telefon:', value: coverData.contactPhone },
      { label: 'E-Mail:', value: coverData.contactEmail }
    ];
    
    customerRows.forEach(row => {
      if (row.value) {
        const tableRow = document.createElement('tr');
        
        const labelCell = document.createElement('td');
        labelCell.className = 'info-label';
        labelCell.textContent = row.label;
        tableRow.appendChild(labelCell);
        
        const valueCell = document.createElement('td');
        valueCell.textContent = row.value;
        tableRow.appendChild(valueCell);
        
        customerTable.appendChild(tableRow);
      }
    });
    
    rightInfo.appendChild(customerTable);
    infoSection.appendChild(rightInfo);
    
    coverPage.appendChild(infoSection);
    
    if ((measurements as any).topDownScreenshot) {
      const modelView = document.createElement('div');
      modelView.className = 'model-view';
      
      const modelImage = document.createElement('img');
      modelImage.className = 'model-image';
      modelImage.src = (measurements as any).topDownScreenshot;
      modelImage.alt = 'Dachdraufsicht';
      
      modelView.appendChild(modelImage);
      coverPage.appendChild(modelView);
    }
    
    // Add the cover page to the container first
    container.appendChild(coverPage);
    
    // Create and add the info page with summary and notes
    const infoPage = createInfoPage(coverData.notes, summaryData);
    container.appendChild(infoPage);
    
    // Continue with the roof plan (now on page 3)
    if ((measurements as any).roofPlan && ((measurements as any).placeRoofPlanOnPage2 || (measurements as any).roofPlanPageNumber === 2)) {
      const roofPlanPage = document.createElement('div');
      roofPlanPage.style.pageBreakAfter = 'always';
      roofPlanPage.style.padding = '20px';
      roofPlanPage.style.height = '270mm';
      roofPlanPage.style.position = 'relative';
      
      if (!(measurements as any).showRoofPlanWithoutHeader) {
        const roofPlanTitle = document.createElement('h2');
        roofPlanTitle.textContent = 'Dachplan';
        roofPlanPage.appendChild(roofPlanTitle);
      }
      
      const roofPlanContainer = document.createElement('div');
      roofPlanContainer.style.display = 'flex';
      roofPlanContainer.style.justifyContent = 'center';
      roofPlanContainer.style.alignItems = 'center';
      roofPlanContainer.style.height = (measurements as any).showRoofPlanWithoutHeader ? 'calc(100% - 40px)' : 'calc(100% - 80px)';
      
      const roofPlanImage = document.createElement('img');
      roofPlanImage.src = (measurements as any).roofPlan;
      roofPlanImage.className = 'roof-plan';
      
      if ((measurements as any).roofPlanDimensions) {
        const dims = (measurements as any).roofPlanDimensions;
        const pageWidth = 210 - 40;
        const pageHeight = 297 - 40;
        const scaleFactor = Math.min(
          pageWidth / dims.width * 25.4,
          pageHeight / dims.height * 25.4
        );
        
        roofPlanImage.style.maxWidth = '100%';
        roofPlanImage.style.maxHeight = '100%';
        roofPlanImage.style.objectFit = 'contain';
      }
      
      roofPlanContainer.appendChild(roofPlanImage);
      roofPlanPage.appendChild(roofPlanContainer);
      
      const footnote = document.createElement('div');
      footnote.className = 'footnote';
      footnote.textContent = 'Hinweis: Dieser Dachplan ist eine schematische Darstellung und nicht maßstabsgetreu.';
      footnote.style.position = 'absolute';
      footnote.style.bottom = '20px';
      footnote.style.left = '20px';
      footnote.style.right = '20px';
      roofPlanPage.appendChild(footnote);
      
      container.appendChild(roofPlanPage);
    }
    
    const measurementSection = document.createElement('div');
    measurementSection.className = 'measurement-section';
    
    const measurementTitle = document.createElement('h2');
    measurementTitle.textContent = 'Messungen - Übersicht';
    measurementSection.appendChild(measurementTitle);
    
    const summaryTable = document.createElement('table');
    summaryTable.className = 'measurement-table';
    
    const tableHead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    ['Nr.', 'Beschreibung', 'Typ', 'Wert'].forEach(column => {
      const th = document.createElement('th');
      th.textContent = column;
      headerRow.appendChild(th);
    });
    
    tableHead.appendChild(headerRow);
    summaryTable.appendChild(tableHead);
    
    const tableBody = document.createElement('tbody');
    
    sortedMeasurements.forEach((measurement, index) => {
      if (measurement.id) {
        const row = document.createElement('tr');
        
        const numCell = document.createElement('td');
        numCell.textContent = (index + 1).toString();
        row.appendChild(numCell);
        
        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = measurement.description || '';
        row.appendChild(descriptionCell);
        
        const typeCell = document.createElement('td');
        typeCell.textContent = getMeasurementTypeDisplayName(measurement.type);
        row.appendChild(typeCell);
        
        const valueCell = document.createElement('td');
        valueCell.textContent = formatMeasurementValue(measurement);
        row.appendChild(valueCell);
        
        tableBody.appendChild(row);
      }
    });
    
    summaryTable.appendChild(tableBody);
    measurementSection.appendChild(summaryTable);
    
    container.appendChild(measurementSection);
    
    const areaMeasurements = sortedMeasurements.filter(m => m.type === 'area');
    const lengthMeasurements = sortedMeasurements.filter(m => m.type === 'length');
    const heightMeasurements = sortedMeasurements.filter(m => m.type === 'height');
    const otherMeasurements = sortedMeasurements.filter(m => !['area', 'length', 'height'].includes(m.type));
    
    if (areaMeasurements.length > 0) {
      const areaSection = document.createElement('div');
      areaSection.className = 'page-break';
      
      const areaTitle = document.createElement('h2');
      areaTitle.textContent = 'Flächenmessungen';
      areaSection.appendChild(areaTitle);
      
      areaMeasurements.forEach((measurement, index) => {
        const areaContainer = document.createElement('div');
        areaContainer.className = 'area-detail';
        areaContainer.style.marginBottom = '30px';
        
        const areaHeading = document.createElement('h3');
        areaHeading.textContent = `Fläche ${index + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
        areaContainer.appendChild(areaHeading);
        
        const areaDetails = document.createElement('div');
        areaDetails.style.marginBottom = '10px';
        areaDetails.innerHTML = `<strong>Fläche:</strong> ${measurement.value.toFixed(2)} m²`;
        
        if (measurement.inclination !== undefined) {
          areaDetails.innerHTML += `<br><strong>Neigung:</strong> ${Math.abs(measurement.inclination).toFixed(1)}°`;
        }
        
        areaContainer.appendChild(areaDetails);
        
        if (measurement.screenshot || measurement.polygon2D) {
          const visual = document.createElement('img');
          visual.src = measurement.screenshot || measurement.polygon2D || '';
          visual.className = 'area-visual';
          areaContainer.appendChild(visual);
        }
        
        if (measurement.segments && measurement.segments.length > 0) {
          const segmentsTable = createAreaSegmentsTable(measurement, index);
          areaContainer.appendChild(segmentsTable);
        }
        
        if (measurement.customScreenshots && measurement.customScreenshots.length > 0) {
          const screenshotsContainer = document.createElement('div');
          screenshotsContainer.style.marginTop = '20px';
          screenshotsContainer.style.pageBreakInside = 'avoid';
          
          const screenshotsTitle = document.createElement('h4');
          screenshotsTitle.textContent = 'Zusätzliche Ansichten';
          screenshotsContainer.appendChild(screenshotsTitle);
          
          const screenshotsGrid = document.createElement('div');
          screenshotsGrid.style.display = 'flex';
          screenshotsGrid.style.flexWrap = 'wrap';
          screenshotsGrid.style.gap = '10px';
          
          measurement.customScreenshots.forEach(screenshot => {
            const screenshotImg = document.createElement('img');
            screenshotImg.src = screenshot;
            screenshotImg.style.maxWidth = '48%';
            screenshotImg.style.height = 'auto';
            screenshotsGrid.appendChild(screenshotImg);
          });
          
          screenshotsContainer.appendChild(screenshotsGrid);
          areaContainer.appendChild(screenshotsContainer);
        }
        
        areaSection.appendChild(areaContainer);
      });
      
      container.appendChild(areaSection);
    }
    
    if (lengthMeasurements.length > 0) {
      const lengthSection = document.createElement('div');
      lengthSection.className = 'page-break';
      
      const lengthTitle = document.createElement('h2');
      lengthTitle.textContent = 'Längenmessungen';
      lengthSection.appendChild(lengthTitle);
      
      const lengthTable = document.createElement('table');
      lengthTable.className = 'measurement-table';
      
      const lengthTableHead = document.createElement('thead');
      const lengthHeaderRow = document.createElement('tr');
      
      ['Nr.', 'Beschreibung', 'Länge', 'Neigung'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        lengthHeaderRow.appendChild(th);
      });
      
      lengthTableHead.appendChild(lengthHeaderRow);
      lengthTable.appendChild(lengthTableHead);
      
      const lengthTableBody = document.createElement('tbody');
      
      lengthMeasurements.forEach((measurement, index) => {
        const row = document.createElement('tr');
        
        const numCell = document.createElement('td');
        numCell.textContent = (index + 1).toString();
        row.appendChild(numCell);
        
        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = measurement.description || '';
        row.appendChild(descriptionCell);
        
        const valueCell = document.createElement('td');
        valueCell.textContent = `${measurement.value.toFixed(2)} m`;
        row.appendChild(valueCell);
        
        const inclinationCell = document.createElement('td');
        if (measurement.inclination !== undefined) {
          inclinationCell.textContent = `${Math.abs(measurement.inclination).toFixed(1)}°`;
        } else {
          inclinationCell.textContent = '-';
        }
        row.appendChild(inclinationCell);
        
        lengthTableBody.appendChild(row);
      });
      
      lengthTable.appendChild(lengthTableBody);
      lengthSection.appendChild(lengthTable);
      
      container.appendChild(lengthSection);
    }
    
    if (heightMeasurements.length > 0) {
      const heightSection = document.createElement('div');
      
      if (lengthMeasurements.length > 0) {
        heightSection.className = 'page-break';
      } else {
        heightSection.style.marginTop = '40px';
      }
      
      const heightTitle = document.createElement('h2');
      heightTitle.textContent = 'Höhenmessungen';
      heightSection.appendChild(heightTitle);
      
      const heightTable = document.createElement('table');
      heightTable.className = 'measurement-table';
      
      const heightTableHead = document.createElement('thead');
      const heightHeaderRow = document.createElement('tr');
      
      ['Nr.', 'Beschreibung', 'Höhe'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        heightHeaderRow.appendChild(th);
      });
      
      heightTableHead.appendChild(heightHeaderRow);
      heightTable.appendChild(heightTableHead);
      
      const heightTableBody = document.createElement('tbody');
      
      heightMeasurements.forEach((measurement, index) => {
        const row = document.createElement('tr');
        
        const numCell = document.createElement('td');
        numCell.textContent = (index + 1).toString();
        row.appendChild(numCell);
        
        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = measurement.description || '';
        row.appendChild(descriptionCell);
        
        const valueCell = document.createElement('td');
        valueCell.textContent = `${measurement.value.toFixed(2)} m`;
        row.appendChild(valueCell);
        
        heightTableBody.appendChild(row);
      });
      
      heightTable.appendChild(heightTableBody);
      heightSection.appendChild(heightTable);
      
      container.appendChild(heightSection);
    }
    
    if (otherMeasurements.length > 0) {
      const otherSection = document.createElement('div');
      
      if (areaMeasurements.length > 0 || lengthMeasurements.length > 0 || heightMeasurements.length > 0) {
        otherSection.className = 'page-break';
      } else {
        otherSection.style.marginTop = '40px';
      }
      
      const otherTitle = document.createElement('h2');
      otherTitle.textContent = 'Andere Messungen';
      otherSection.appendChild(otherTitle);
      
      const measurementsByType: Record<string, Measurement[]> = {};
      
      otherMeasurements.forEach(measurement => {
        if (!measurementsByType[measurement.type]) {
          measurementsByType[measurement.type] = [];
        }
        measurementsByType[measurement.type].push(measurement);
      });
      
      Object.entries(measurementsByType).forEach(([type, measurements]) => {
        const typeSection = document.createElement('div');
        typeSection.className = 'type-section';
        typeSection.style.marginBottom = '30px';
        
        const typeTitle = document.createElement('h3');
        typeTitle.textContent = getMeasurementTypeDisplayName(type);
        typeSection.appendChild(typeTitle);
        
        const typeTable = document.createElement('table');
        typeTable.className = 'measurement-table';
        
        const typeTableHead = document.createElement('thead');
        const typeHeaderRow = document.createElement('tr');
        
        const headerColumns = ['Nr.', 'Beschreibung'];
        
        if (type === 'skylight') {
          headerColumns.push('Breite', 'Höhe', 'Fläche');
        } else if (type === 'chimney' || type === 'vent') {
          headerColumns.push('Durchmesser/Breite', 'Fläche');
        } else if (type === 'solar') {
          headerColumns.push('Fläche', 'Anzahl Module');
        } else {
          headerColumns.push('Wert');
        }
        
        headerColumns.forEach(column => {
          const th = document.createElement('th');
          th.textContent = column;
          typeHeaderRow.appendChild(th);
        });
        
        typeTableHead.appendChild(typeHeaderRow);
        typeTable.appendChild(typeTableHead);
        
        const typeTableBody = document.createElement('tbody');
        
        measurements.forEach((measurement, index) => {
          const row = document.createElement('tr');
          
          const numCell = document.createElement('td');
          numCell.textContent = (index + 1).toString();
          row.appendChild(numCell);
          
          const descriptionCell = document.createElement('td');
          descriptionCell.textContent = measurement.description || '';
          row.appendChild(descriptionCell);
          
          if (type === 'skylight') {
            const widthCell = document.createElement('td');
            widthCell.textContent = measurement.dimensions?.width ? `${measurement.dimensions.width.toFixed(2)} m` : '-';
            row.appendChild(widthCell);
            
            const heightCell = document.createElement('td');
            heightCell.textContent = measurement.dimensions?.height ? `${measurement.dimensions.height.toFixed(2)} m` : '-';
            row.appendChild(heightCell);
            
            const areaCell = document.createElement('td');
            areaCell.textContent = `${measurement.value.toFixed(2)} m²`;
            row.appendChild(areaCell);
          } else if (type === 'chimney' || type === 'vent') {
            const diameterCell = document.createElement('td');
            diameterCell.textContent = measurement.dimensions?.width ? `${measurement.dimensions.width.toFixed(2)} m` : '-';
            row.appendChild(diameterCell);
            
            const areaCell = document.createElement('td');
            areaCell.textContent = `${measurement.value.toFixed(2)} m²`;
            row.appendChild(areaCell);
          } else if (type === 'solar') {
            const areaCell = document.createElement('td');
            areaCell.textContent = `${measurement.value.toFixed(2)} m²`;
            row.appendChild(areaCell);
            
            const moduleCell = document.createElement('td');
            moduleCell.textContent = measurement.pvModuleInfo?.moduleCount?.toString() || '-';
            row.appendChild(moduleCell);
          } else {
            const valueCell = document.createElement('td');
            valueCell.textContent = formatMeasurementValue(measurement);
            row.appendChild(valueCell);
          }
          
          typeTableBody.appendChild(row);
        });
        
        typeTable.appendChild(typeTableBody);
        typeSection.appendChild(typeTable);
        
        otherSection.appendChild(typeSection);
      });
      
      container.appendChild(otherSection);
    }
    
    if (areaMeasurements.length > 0) {
      const areaSummary = createTotalAreaSummary(areaMeasurements);
      container.appendChild(areaSummary);
      
      const hasSegments = areaMeasurements.some(
        m => m.segments && m.segments.length > 0
      );
      
      if (hasSegments) {
        const segmentSummary = createSegmentSummary(areaMeasurements);
        container.appendChild(segmentSummary);
      }
    }
    
    const options = {
      margin: 10,
      filename: `${coverData.title || 'Vermessungsbericht'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };
    
    await html2pdf()
      .from(container)
      .set(options)
      .save();
    
    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};
