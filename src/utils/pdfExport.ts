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
  
  const segmentsTitle = document.createElement('h3');
  segmentsTitle.textContent = `Teilmessungen für Fläche ${index + 1}${measurement.description ? ` (${measurement.description})` : ''}`;
  container.appendChild(segmentsTitle);
  
  const segmentsTable = document.createElement('table');
  segmentsTable.className = 'segment-table';
  
  // Segments table header
  const segmentsTableHead = document.createElement('thead');
  const segmentsHeaderRow = document.createElement('tr');
  
  ['Teilmessung', 'Länge (m)', 'Bezeichnung', 'Typ'].forEach(column => {
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
      
      // Segment label column
      const segmentLabelCell = document.createElement('td');
      segmentLabelCell.textContent = segment.label || '–';
      segmentRow.appendChild(segmentLabelCell);
      
      // Segment type column
      const segmentTypeCell = document.createElement('td');
      if (segment.type) {
        segmentTypeCell.textContent = getSegmentTypeDisplayName(segment.type);
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
 * Creates a segment summary section for the PDF
 */
const createSegmentSummary = (measurements: Measurement[]): HTMLElement => {
  const segmentGroups = groupSegmentsByType(measurements);
  
  const container = document.createElement('div');
  container.style.marginTop = '40px';
  
  const summaryTitle = document.createElement('h3');
  summaryTitle.textContent = 'Dachkanten-Auswertung';
  container.appendChild(summaryTitle);
  
  const segmentTable = document.createElement('table');
  segmentTable.className = 'summary-table';
  
  // Table header
  const tableHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  ['Kantentyp', 'Anzahl', 'Gesamtlänge (m)'].forEach(column => {
    const th = document.createElement('th');
    th.textContent = column;
    headerRow.appendChild(th);
  });
  
  tableHead.appendChild(headerRow);
  segmentTable.appendChild(tableHead);
  
  // Table body
  const tableBody = document.createElement('tbody');
  
  // Sort segment types for consistent display
  const segmentTypes = Object.keys(segmentGroups).sort((a, b) => {
    // Custom sorting order for common types
    const order = {
      'ridge': 1,  // First
      'hip': 2,    // Grat
      'valley': 3, // Kehle
      'eave': 4,   // Traufe
      'verge': 5   // Ortgang
    };
    return (order[a] || 99) - (order[b] || 99);
  });
  
  // Add each segment type
  segmentTypes.forEach(type => {
    const group = segmentGroups[type];
    if (group.count > 0) {
      const row = document.createElement('tr');
      
      // Segment type column
      const typeCell = document.createElement('td');
      typeCell.textContent = getSegmentTypeDisplayName(type);
      row.appendChild(typeCell);
      
      // Segment count column
      const countCell = document.createElement('td');
      countCell.textContent = `${group.count}`;
      row.appendChild(countCell);
      
      // Total length column
      const lengthCell = document.createElement('td');
      lengthCell.textContent = `${group.totalLength.toFixed(2)} m`;
      row.appendChild(lengthCell);
      
      tableBody.appendChild(row);
    }
  });
  
  // Add total length row
  const totalLength = segmentTypes.reduce((total, type) => total + segmentGroups[type].totalLength, 0);
  const totalCount = segmentTypes.reduce((total, type) => total + segmentGroups[type].count, 0);
  
  const totalRow = document.createElement('tr');
  totalRow.className = 'total-row';
  
  const totalLabelCell = document.createElement('td');
  totalLabelCell.textContent = 'Gesamt';
  totalLabelCell.style.fontWeight = 'bold';
  totalRow.appendChild(totalLabelCell);
  
  const totalCountCell = document.createElement('td');
  totalCountCell.textContent = `${totalCount}`;
  totalCountCell.style.fontWeight = 'bold';
  totalRow.appendChild(totalCountCell);
  
  const totalLengthCell = document.createElement('td');
  totalLengthCell.textContent = `${totalLength.toFixed(2)} m`;
  totalLengthCell.style.fontWeight = 'bold';
  totalRow.appendChild(totalLengthCell);
  
  tableBody.appendChild(totalRow);
  segmentTable.appendChild(tableBody);
  
  container.appendChild(segmentTable);
  
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
        margin-bottom: 60px;
        font-size: 14px;
      }
      .cover-title {
        font-size: 26px;
        font-weight: bold;
        margin-top: 100px;
        margin-bottom: 60px;
      }
      .project-info {
        margin-top: 40px;
        text-align: left;
        padding-left: 40px;
      }
      .project-info div {
        margin-bottom: 10px;
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
        font-size: 12px;
      }
      .measurement-section {
        margin-top: 40px;
        page-break-before: always;
      }
      .measurement-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
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
        font-size: 0.9em;
      }
      .summary-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
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
      }
      h3 {
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
    `;
    container.appendChild(style);
    
    // === Cover Page ===
    const coverPage = document.createElement('div');
    coverPage.className = 'cover-page';
    
    const companyHeader = document.createElement('div');
    companyHeader.className = 'company-header';
    companyHeader.textContent = coverData.companyName;
    coverPage.appendChild(companyHeader);
    
    const title = document.createElement('h1');
    title.className = 'cover-title';
    title.textContent = coverData.title;
    coverPage.appendChild(title);
    
    const projectInfo = document.createElement('div');
    projectInfo.className = 'project-info';
    
    // Add project details
    if (coverData.projectNumber) {
      const projectNumberDiv = document.createElement('div');
      const projectNumberLabel = document.createElement('span');
      projectNumberLabel.className = 'info-label';
      projectNumberLabel.textContent = 'Projektnummer:';
      projectNumberDiv.appendChild(projectNumberLabel);
      projectNumberDiv.appendChild(document.createTextNode(coverData.projectNumber));
      projectInfo.appendChild(projectNumberDiv);
    }
    
    if (coverData.projectAddress) {
      const addressDiv = document.createElement('div');
      const addressLabel = document.createElement('span');
      addressLabel.className = 'info-label';
      addressLabel.textContent = 'Adresse:';
      addressDiv.appendChild(addressLabel);
      addressDiv.appendChild(document.createTextNode(coverData.projectAddress));
      projectInfo.appendChild(addressDiv);
    }
    
    if (coverData.clientName) {
      const clientDiv = document.createElement('div');
      const clientLabel = document.createElement('span');
      clientLabel.className = 'info-label';
      clientLabel.textContent = 'Auftraggeber:';
      clientDiv.appendChild(clientLabel);
      clientDiv.appendChild(document.createTextNode(coverData.clientName));
      projectInfo.appendChild(clientDiv);
    }
    
    if (coverData.contactPerson) {
      const contactDiv = document.createElement('div');
      const contactLabel = document.createElement('span');
      contactLabel.className = 'info-label';
      contactLabel.textContent = 'Ansprechpartner:';
      contactDiv.appendChild(contactLabel);
      contactDiv.appendChild(document.createTextNode(coverData.contactPerson));
      projectInfo.appendChild(contactDiv);
    }
    
    const dateDiv = document.createElement('div');
    const dateLabel = document.createElement('span');
    dateLabel.className = 'info-label';
    dateLabel.textContent = 'Datum:';
    dateDiv.appendChild(dateLabel);
    dateDiv.appendChild(document.createTextNode(coverData.creationDate));
    projectInfo.appendChild(dateDiv);
    
    coverPage.appendChild(projectInfo);
    
    if (coverData.notes) {
      const notesDiv = document.createElement('div');
      notesDiv.style.marginTop = '40px';
      notesDiv.style.textAlign = 'left';
      notesDiv.style.padding = '0 40px';
      
      const notesTitle = document.createElement('h3');
      notesTitle.textContent = 'Bemerkungen:';
      notesDiv.appendChild(notesTitle);
      
      const notesContent = document.createElement('p');
      notesContent.textContent = coverData.notes;
      notesDiv.appendChild(notesContent);
      
      coverPage.appendChild(notesDiv);
    }
    
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.textContent = `Erstellt am ${coverData.creationDate} • ${coverData.companyName}`;
    coverPage.appendChild(footer);
    
    container.appendChild(coverPage);
    
    // === Roof Plan (Page 2) ===
    if ((measurements as any).roofPlan && (measurements as any).placeRoofPlanOnPage2) {
      const roofPlanPage = document.createElement('div');
      roofPlanPage.style.pageBreakBefore = 'always';
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
      areaSection.style.pageBreakBefore = 'always';
      
      const areaTitle = document.createElement('h2');
      areaTitle.textContent = 'Flächenmessungen';
      areaSection.appendChild(areaTitle);
      
      areaMeasurements.forEach((measurement, index) => {
        const areaContainer = document.createElement('div');
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
      lengthSection.style.pageBreakBefore = 'always';
      
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
      heightSection.style.marginTop = '40px';
      
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
      otherSection.style.marginTop = '40px';
      
      const otherTitle = document.createElement('h2');
      otherTitle.textContent = 'Dacheinbauten und Sonstiges';
      otherSection.appendChild(otherTitle);
      
      const otherTable = document.createElement('table');
      otherTable.className = 'measurement-table';
      
      // Table header
      const otherTableHead = document.createElement('thead');
      const otherHeaderRow = document.createElement('tr');
      
      ['Nr.', 'Beschreibung', 'Typ', 'Wert'].forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        otherHeaderRow.appendChild(th);
      });
      
      otherTableHead.appendChild(otherHeaderRow);
      otherTable.appendChild(otherTableHead);
      
      // Table body
      const otherTableBody = document.createElement('tbody');
      
      otherMeasurements.forEach((measurement, index) => {
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
        
        otherTableBody.appendChild(row);
      });
      
      otherTable.appendChild(otherTableBody);
      otherSection.appendChild(otherTable);
      
      container.appendChild(otherSection);
    }
    
    // === Add Summary Section at the end ===
    // Total Area Summary
    const areaSummary = createTotalAreaSummary(measurements);
    container.appendChild(areaSummary);
    
    // Segment Summary
    const segmentSummary = createSegmentSummary(measurements);
    container.appendChild(segmentSummary);
    
    // Generate PDF
    const element = container;
    const opt = {
      margin: [15, 15], // [top & bottom, left & right]
      filename: `Vermessungsbericht_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().from(element).set(opt).save();
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};
