
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
  creationDate: string;
  notes: string;
}

const createAreaSegmentsTable = (measurement: Measurement, index: number): HTMLElement => {
  const container = document.createElement('div');
  container.style.marginTop = '30px'; // Added extra spacing
  container.style.pageBreakInside = 'avoid'; // Prevent page breaks inside segment tables
  
  const segmentsTitle = document.createElement('h3');
  segmentsTitle.textContent = `Teilmessungen für Fläche ${index + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
  container.appendChild(segmentsTitle);
  
  const segmentsTable = document.createElement('table');
  segmentsTable.className = 'segment-table';
  
  // Segments table header - Removed "Bezeichnung" column as requested
  const segmentsTableHead = document.createElement('thead');
  const segmentsHeaderRow = document.createElement('tr');
  
  ['Teilmessung', 'Länge (m)', 'Typ'].forEach(column => {
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
      
      // Segment type column - Capitalized first letter
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
  areaSummary.style.pageBreakInside = 'avoid'; // Prevent page breaks inside area summary
  
  const areaSummaryTitle = document.createElement('h3');
  areaSummaryTitle.textContent = 'Flächenauswertung';
  areaSummary.appendChild(areaSummaryTitle);
  
  const areaTable = document.createElement('table');
  areaTable.className = 'summary-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Bezeichnung', 'Fläche (m²)'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  
  tableHead.appendChild(headerRow);
  areaTable.appendChild(tableHead);
  
  // Table body
  const tableBody = document.createElement('tbody');
  
  // Add each area measurement
  areaMeasurements.forEach((measurement, index) => {
    const row = document.createElement('tr');
    
    // Area name/description column
    const nameCell = document.createElement('td');
    nameCell.textContent = measurement.description || `Fläche ${index + 1}`;
    row.appendChild(nameCell);
    
    // Area value column
    const valueCell = document.createElement('td');
    valueCell.textContent = `${measurement.value.toFixed(2)} m²`;
    row.appendChild(valueCell);
    
    tableBody.appendChild(row);
  });
  
  // Add total row
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
  
  // Define the order for segment types
  const segmentTypeOrder = ['ridge', 'hip', 'valley', 'eave', 'verge'];
  
  // Create tables for each segment type instead of a single table
  segmentTypeOrder.forEach(type => {
    if (segmentGroups[type] && segmentGroups[type].count > 0) {
      const typeSection = document.createElement('div');
      typeSection.style.pageBreakInside = 'avoid'; // Prevent page breaks inside each type section
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
      
      // Table header
      const tableHead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      ['Anzahl', 'Gesamtlänge (m)'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        headerRow.appendChild(th);
      });
      
      tableHead.appendChild(headerRow);
      typeTable.appendChild(tableHead);
      
      // Table body with a single row for this type
      const tableBody = document.createElement('tbody');
      const row = document.createElement('tr');
      
      // Count column
      const countCell = document.createElement('td');
      countCell.textContent = `${typeInfo.count}`;
      row.appendChild(countCell);
      
      // Total length column
      const lengthCell = document.createElement('td');
      lengthCell.textContent = `${typeInfo.totalLength.toFixed(2)} m`;
      row.appendChild(lengthCell);
      
      tableBody.appendChild(row);
      typeTable.appendChild(tableBody);
      
      typeSection.appendChild(typeTable);
      
      container.appendChild(typeSection);
    }
  });
  
  // Add other segment types that are not in the predefined order
  Object.keys(segmentGroups).forEach(type => {
    if (!segmentTypeOrder.includes(type) && segmentGroups[type].count > 0) {
      const typeSection = document.createElement('div');
      typeSection.style.pageBreakInside = 'avoid'; // Prevent page breaks inside each type section
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
      
      // Table header
      const tableHead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      ['Anzahl', 'Gesamtlänge (m)'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        headerRow.appendChild(th);
      });
      
      tableHead.appendChild(headerRow);
      typeTable.appendChild(tableHead);
      
      // Table body with a single row for this type
      const tableBody = document.createElement('tbody');
      const row = document.createElement('tr');
      
      // Count column
      const countCell = document.createElement('td');
      countCell.textContent = `${typeInfo.count}`;
      row.appendChild(countCell);
      
      // Total length column
      const lengthCell = document.createElement('td');
      lengthCell.textContent = `${typeInfo.totalLength.toFixed(2)} m`;
      row.appendChild(lengthCell);
      
      tableBody.appendChild(row);
      typeTable.appendChild(tableBody);
      
      typeSection.appendChild(typeTable);
      
      container.appendChild(typeSection);
    }
  });
  
  // Add total row as a separate summary
  const totalSection = document.createElement('div');
  totalSection.style.pageBreakInside = 'avoid'; // Prevent page breaks inside total section
  totalSection.style.marginTop = '20px';
  
  const totalLength = Object.values(segmentGroups).reduce((total, group) => total + group.totalLength, 0);
  const totalCount = Object.values(segmentGroups).reduce((total, group) => total + group.count, 0);
  
  const totalTitle = document.createElement('h4');
  totalTitle.textContent = 'Gesamtübersicht Dachkanten';
  totalSection.appendChild(totalTitle);
  
  const totalTable = document.createElement('table');
  totalTable.className = 'summary-table';
  
  // Table header
  const totalTableHead = document.createElement('thead');
  const totalHeaderRow = document.createElement('tr');
  
  ['Anzahl', 'Gesamtlänge (m)'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    totalHeaderRow.appendChild(th);
  });
  
  totalTableHead.appendChild(totalHeaderRow);
  totalTable.appendChild(totalTableHead);
  
  // Table body with totals
  const totalTableBody = document.createElement('tbody');
  const totalRow = document.createElement('tr');
  totalRow.className = 'total-row';
  
  // Total count column
  const totalCountCell = document.createElement('td');
  totalCountCell.textContent = `${totalCount}`;
  totalCountCell.style.fontWeight = 'bold';
  totalRow.appendChild(totalCountCell);
  
  // Total length column
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
 * Export measurements to PDF with cover page
 */
export const exportMeasurementsToPdf = async (measurements: Measurement[], coverData: CoverPageData): Promise<boolean> => {
  try {
    const sortedMeasurements = measurements.sort((a, b) => {
      // Define type order for sorting
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
    
    // Create container for the PDF content
    const container = document.createElement('div');
    container.className = 'pdf-container';
    
    // Add cover page styles
    const style = document.createElement('style');
    style.textContent = `
      .pdf-container {
        font-family: 'Arial', sans-serif;
        color: #333;
        line-height: 1.5;
      }
      .cover-page {
        text-align: center;
        padding: 40px 20px;
        height: 100%;
        position: relative;
      }
      .company-header {
        margin-bottom: 40px;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
      }
      .cover-title {
        font-size: 28px;
        font-weight: bold;
        margin-top: 40px;
        margin-bottom: 60px;
        text-align: center;
      }
      .project-info {
        margin: 60px auto;
        text-align: left;
        width: 80%;
        max-width: 500px;
      }
      .project-info div {
        margin-bottom: 15px;
      }
      .info-label {
        font-weight: bold;
        display: inline-block;
        width: 150px;
      }
      .footer {
        position: absolute;
        bottom: 40px;
        left: 0;
        right: 0;
        text-align: center;
      }
      .footer-img {
        max-width: 80%;
        max-height: 150px;
        margin: 0 auto;
      }
      .measurement-section {
        margin-top: 40px;
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
        page-break-inside: avoid;
      }
      .summary-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        margin-bottom: 20px;
        page-break-inside: avoid;
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
        margin-top: 40px;
      }
      h3 {
        margin-top: 30px;
        margin-bottom: 10px;
      }
      h4 {
        margin-top: 20px;
        margin-bottom: 10px;
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
    `;
    container.appendChild(style);
    
    // === Cover Page ===
    const coverPage = document.createElement('div');
    coverPage.className = 'cover-page';
    
    // Company Header - DrohnenGLB by RooferGaming®
    const companyHeader = document.createElement('div');
    companyHeader.className = 'company-header';
    companyHeader.innerHTML = 'DrohnenGLB by RooferGaming<sup>®</sup>';
    coverPage.appendChild(companyHeader);
    
    // Report Title (centered)
    const title = document.createElement('h1');
    title.className = 'cover-title';
    title.textContent = coverData.title;
    coverPage.appendChild(title);
    
    // Project Information
    const projectInfo = document.createElement('div');
    projectInfo.className = 'project-info';
    
    // Create info rows in a logical list
    const infoFields = [
      { label: 'Projektnummer:', value: coverData.projectNumber },
      { label: 'Erstellungsdatum:', value: coverData.creationDate },
      { label: 'Objektadresse:', value: coverData.projectAddress },
      { label: 'Auftraggeber:', value: coverData.clientName },
      { label: 'Ansprechpartner:', value: coverData.contactPerson },
      { label: 'Ausführender Betrieb:', value: coverData.companyName }
    ];
    
    infoFields.forEach(field => {
      if (field.value) {
        const infoRow = document.createElement('div');
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'info-label';
        labelSpan.textContent = field.label;
        infoRow.appendChild(labelSpan);
        
        infoRow.appendChild(document.createTextNode(field.value));
        projectInfo.appendChild(infoRow);
      }
    });
    
    // Add notes if present
    if (coverData.notes) {
      const notesRow = document.createElement('div');
      notesRow.style.marginTop = '20px';
      
      const notesLabel = document.createElement('div');
      notesLabel.style.fontWeight = 'bold';
      notesLabel.textContent = 'Bemerkungen:';
      notesRow.appendChild(notesLabel);
      
      const notesContent = document.createElement('div');
      notesContent.style.marginTop = '5px';
      notesContent.textContent = coverData.notes;
      notesRow.appendChild(notesContent);
      
      projectInfo.appendChild(notesRow);
    }
    
    coverPage.appendChild(projectInfo);
    
    // Footer with promotional image (always visible)
    const footer = document.createElement('div');
    footer.className = 'footer';
    
    // Add the promotional image from public folder
    const footerImg = document.createElement('img');
    footerImg.src = '/lovable-uploads/2656e45c-bc18-44f7-8506-199c2edee8a2.png'; 
    footerImg.className = 'footer-img';
    footerImg.alt = 'DrohnenGLB Promotion';
    footer.appendChild(footerImg);
    
    coverPage.appendChild(footer);
    container.appendChild(coverPage);
    
    // === Roof Plan (Page 2) ===
    if ((measurements as any).roofPlan && (measurements as any).placeRoofPlanOnPage2) {
      const roofPlanPage = document.createElement('div');
      roofPlanPage.className = 'page-break';
      roofPlanPage.style.padding = '20px';
      
      // Only add title if not showing the roof plan in full page mode
      if (!(measurements as any).showRoofPlanWithoutHeader) {
        const roofPlanTitle = document.createElement('h2');
        roofPlanTitle.textContent = 'Dachplan';
        roofPlanPage.appendChild(roofPlanTitle);
      }
      
      const roofPlanImage = document.createElement('img');
      roofPlanImage.src = (measurements as any).roofPlan;
      roofPlanImage.className = 'roof-plan';
      
      // If we have dimensions for the roof plan, use them to calculate optimal display size
      if ((measurements as any).roofPlanDimensions) {
        const dims = (measurements as any).roofPlanDimensions;
        // Calculate page dimensions in mm for A4 (210mm x 297mm)
        const pageWidth = 210 - 40; // 20mm margins on each side
        const pageHeight = 297 - 40; // 20mm margins on top and bottom
        
        // Calculate scale factor to fit within the page
        const scaleFactor = Math.min(
          pageWidth / dims.width * 25.4, // Convert from pixels to mm
          pageHeight / dims.height * 25.4
        );
        
        if ((measurements as any).showRoofPlanWithoutHeader) {
          // Use full page if showing without header
          roofPlanImage.style.maxHeight = '95vh';
        } else {
          // Keep some space for the header
          roofPlanImage.style.maxHeight = '85vh';
        }
      }
      
      roofPlanPage.appendChild(roofPlanImage);
      
      const footnote = document.createElement('div');
      footnote.className = 'footnote';
      footnote.textContent = 'Hinweis: Dieser Dachplan ist eine schematische Darstellung und nicht maßstabsgetreu.';
      roofPlanPage.appendChild(footnote);
      
      container.appendChild(roofPlanPage);
    }
    
    // === Measurements Summary (Page 3) ===
    const measurementSection = document.createElement('div');
    measurementSection.className = 'measurement-section';
    
    const measurementTitle = document.createElement('h2');
    measurementTitle.textContent = 'Messungen - Übersicht';
    measurementSection.appendChild(measurementTitle);
    
    // Create summary table
    const summaryTable = document.createElement('table');
    summaryTable.className = 'measurement-table';
    
    // Table header
    const tableHead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    ['Nr.', 'Beschreibung', 'Typ', 'Wert'].forEach(column => {
      const th = document.createElement('th');
      th.textContent = column;
      headerRow.appendChild(th);
    });
    
    tableHead.appendChild(headerRow);
    summaryTable.appendChild(tableHead);
    
    // Table body
    const tableBody = document.createElement('tbody');
    
    sortedMeasurements.forEach((measurement, index) => {
      if (measurement.id) { // Skip any invalid measurements
        const row = document.createElement('tr');
        
        // Measurement number column
        const numCell = document.createElement('td');
        numCell.textContent = (index + 1).toString();
        row.appendChild(numCell);
        
        // Measurement description column
        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = measurement.description || '';
        row.appendChild(descriptionCell);
        
        // Measurement type column
        const typeCell = document.createElement('td');
        typeCell.textContent = getMeasurementTypeDisplayName(measurement.type);
        row.appendChild(typeCell);
        
        // Measurement value column
        const valueCell = document.createElement('td');
        valueCell.textContent = formatMeasurementValue(measurement);
        row.appendChild(valueCell);
        
        tableBody.appendChild(row);
      }
    });
    
    summaryTable.appendChild(tableBody);
    measurementSection.appendChild(summaryTable);
    
    container.appendChild(measurementSection);
    
    // === Detailed Measurements (Page 4+) ===
    // Group measurements by type
    const areaMeasurements = sortedMeasurements.filter(m => m.type === 'area');
    const lengthMeasurements = sortedMeasurements.filter(m => m.type === 'length');
    const heightMeasurements = sortedMeasurements.filter(m => m.type === 'height');
    const otherMeasurements = sortedMeasurements.filter(m => !['area', 'length', 'height'].includes(m.type));
    
    // Process area measurements (with visuals if available)
    if (areaMeasurements.length > 0) {
      const areaSection = document.createElement('div');
      areaSection.className = 'page-break';
      
      const areaTitle = document.createElement('h2');
      areaTitle.textContent = 'Flächenmessungen';
      areaSection.appendChild(areaTitle);
      
      areaMeasurements.forEach((measurement, index) => {
        // Create a container that avoids page breaks inside
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
        
        // Add visual if available (either screenshot or 2D polygon)
        if (measurement.screenshot || measurement.polygon2D) {
          const visual = document.createElement('img');
          visual.src = measurement.screenshot || measurement.polygon2D || '';
          visual.className = 'area-visual';
          areaContainer.appendChild(visual);
        }
        
        // Add area segments table if the area has segments
        if (measurement.segments && measurement.segments.length > 0) {
          const segmentsTable = createAreaSegmentsTable(measurement, index);
          areaContainer.appendChild(segmentsTable);
        }
        
        // Add custom screenshots if available
        if (measurement.customScreenshots && measurement.customScreenshots.length > 0) {
          const screenshotsContainer = document.createElement('div');
          screenshotsContainer.style.marginTop = '20px';
          screenshotsContainer.style.pageBreakInside = 'avoid'; // Prevent page breaks inside screenshots
          
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
    
    // Process length measurements
    if (lengthMeasurements.length > 0) {
      const lengthSection = document.createElement('div');
      lengthSection.className = 'page-break';
      
      const lengthTitle = document.createElement('h2');
      lengthTitle.textContent = 'Längenmessungen';
      lengthSection.appendChild(lengthTitle);
      
      const lengthTable = document.createElement('table');
      lengthTable.className = 'measurement-table';
      
      // Table header
      const lengthTableHead = document.createElement('thead');
      const lengthHeaderRow = document.createElement('tr');
      
      ['Nr.', 'Beschreibung', 'Länge', 'Neigung'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        lengthHeaderRow.appendChild(th);
      });
      
      lengthTableHead.appendChild(lengthHeaderRow);
      lengthTable.appendChild(lengthTableHead);
      
      // Table body
      const lengthTableBody = document.createElement('tbody');
      
      lengthMeasurements.forEach((measurement, index) => {
        const row = document.createElement('tr');
        
        // Measurement number column
        const numCell = document.createElement('td');
        numCell.textContent = (index + 1).toString();
        row.appendChild(numCell);
        
        // Measurement description column
        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = measurement.description || '';
        row.appendChild(descriptionCell);
        
        // Measurement value column
        const valueCell = document.createElement('td');
        valueCell.textContent = `${measurement.value.toFixed(2)} m`;
        row.appendChild(valueCell);
        
        // Inclination column
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
    
    // Process height measurements
    if (heightMeasurements.length > 0) {
      const heightSection = document.createElement('div');
      
      // Only add page break if there was already a section before
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
      
      // Table header
      const heightTableHead = document.createElement('thead');
      const heightHeaderRow = document.createElement('tr');
      
      ['Nr.', 'Beschreibung', 'Höhe'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        heightHeaderRow.appendChild(th);
      });
      
      heightTableHead.appendChild(heightHeaderRow);
      heightTable.appendChild(heightTableHead);
      
      // Table body
      const heightTableBody = document.createElement('tbody');
      
      heightMeasurements.forEach((measurement, index) => {
        const row = document.createElement('tr');
        
        // Measurement number column
        const numCell = document.createElement('td');
        numCell.textContent = (index + 1).toString();
        row.appendChild(numCell);
        
        // Measurement description column
        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = measurement.description || '';
        row.appendChild(descriptionCell);
        
        // Measurement value column
        const valueCell = document.createElement('td');
        valueCell.textContent = `${measurement.value.toFixed(2)} m`;
        row.appendChild(valueCell);
        
        heightTableBody.appendChild(row);
      });
      
      heightTable.appendChild(heightTableBody);
      heightSection.appendChild(heightTable);
      
      container.appendChild(heightSection);
    }
    
    // Process other measurements (skylights, chimneys, vents, etc.)
    if (otherMeasurements.length > 0) {
      const otherSection = document.createElement('div');
      
      // Only add page break if there were already sections before
      if (areaMeasurements.length > 0 || lengthMeasurements.length > 0 || heightMeasurements.length > 0) {
        otherSection.className = 'page-break';
      } else {
        otherSection.style.marginTop = '40px';
      }
      
      const otherTitle = document.createElement('h2');
      otherTitle.textContent = 'Andere Messungen';
      otherSection.appendChild(otherTitle);
      
      // Group by type
      const measurementsByType: Record<string, Measurement[]> = {};
      otherMeasurements.forEach(measurement => {
        if (!measurementsByType[measurement.type]) {
          measurementsByType[measurement.type] = [];
        }
        measurementsByType[measurement.type].push(measurement);
      });
      
      // Create a section for each type
      Object.entries(measurementsByType).forEach(([type, measurements]) => {
        const typeSection = document.createElement('div');
        typeSection.className = 'type-section';
        typeSection.style.marginBottom = '30px';
        
        const typeTitle = document.createElement('h3');
        typeTitle.textContent = getMeasurementTypeDisplayName(type);
        typeSection.appendChild(typeTitle);
        
        const typeTable = document.createElement('table');
        typeTable.className = 'measurement-table';
        
        // Table header
        const typeTableHead = document.createElement('thead');
        const typeHeaderRow = document.createElement('tr');
        
        const headerColumns = ['Nr.', 'Beschreibung'];
        
        // Add type-specific columns
        if (type === 'skylight') {
          headerColumns.push('Breite', 'Höhe', 'Fläche');
        } else if (type === 'chimney' || type === 'vent') {
          headerColumns.push('Durchmesser/Breite', 'Fläche');
        } else if (type === 'solar') {
          headerColumns.push('Fläche', 'Anzahl Module');
        } else {
          headerColumns.push('Wert'); // Generic value column for other types
        }
        
        headerColumns.forEach(column => {
          const th = document.createElement('th');
          th.textContent = column;
          typeHeaderRow.appendChild(th);
        });
        
        typeTableHead.appendChild(typeHeaderRow);
        typeTable.appendChild(typeTableHead);
        
        // Table body
        const typeTableBody = document.createElement('tbody');
        
        measurements.forEach((measurement, index) => {
          const row = document.createElement('tr');
          
          // Number column
          const numCell = document.createElement('td');
          numCell.textContent = (index + 1).toString();
          row.appendChild(numCell);
          
          // Description column
          const descriptionCell = document.createElement('td');
          descriptionCell.textContent = measurement.description || '';
          row.appendChild(descriptionCell);
          
          // Type-specific value columns
          if (type === 'skylight') {
            // Width column
            const widthCell = document.createElement('td');
            widthCell.textContent = measurement.width ? `${measurement.width.toFixed(2)} m` : '-';
            row.appendChild(widthCell);
            
            // Height column
            const heightCell = document.createElement('td');
            heightCell.textContent = measurement.height ? `${measurement.height.toFixed(2)} m` : '-';
            row.appendChild(heightCell);
            
            // Area column
            const areaCell = document.createElement('td');
            areaCell.textContent = `${measurement.value.toFixed(2)} m²`;
            row.appendChild(areaCell);
          } else if (type === 'chimney' || type === 'vent') {
            // Diameter/width column
            const diameterCell = document.createElement('td');
            diameterCell.textContent = measurement.width ? `${measurement.width.toFixed(2)} m` : '-';
            row.appendChild(diameterCell);
            
            // Area column
            const areaCell = document.createElement('td');
            areaCell.textContent = `${measurement.value.toFixed(2)} m²`;
            row.appendChild(areaCell);
          } else if (type === 'solar') {
            // Area column
            const areaCell = document.createElement('td');
            areaCell.textContent = `${measurement.value.toFixed(2)} m²`;
            row.appendChild(areaCell);
            
            // Module count column
            const moduleCell = document.createElement('td');
            moduleCell.textContent = measurement.pvModuleCount?.toString() || '-';
            row.appendChild(moduleCell);
          } else {
            // Generic value column
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
    
    // === Create Area & Segment Summaries (if we have area measurements) ===
    if (areaMeasurements.length > 0) {
      // Add total area summary
      const areaSummary = createTotalAreaSummary(areaMeasurements);
      container.appendChild(areaSummary);
      
      // Add segment summary if areas have segments
      const hasSegments = areaMeasurements.some(
        m => m.segments && m.segments.length > 0
      );
      
      if (hasSegments) {
        const segmentSummary = createSegmentSummary(areaMeasurements);
        container.appendChild(segmentSummary);
      }
    }
    
    // Generate PDF file
    try {
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
      console.error('PDF generation error:', error);
      return false;
    }
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};
