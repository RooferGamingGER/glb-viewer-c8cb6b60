
import html2pdf from 'html2pdf.js';
import { Measurement } from '@/hooks/useMeasurements';

export interface CoverPageData {
  title: string;
  companyName: string;
  projectAddress: string;
  contactPerson: string;
  droneDate: string;
  notes: string;
}

export interface PdfExportOptions {
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

const defaultOptions: PdfExportOptions = {
  pageSize: 'a4',
  orientation: 'portrait'
};

export const exportMeasurementsToPdf = async (
  measurements: Measurement[],
  options: PdfExportOptions = defaultOptions,
  coverData: CoverPageData
): Promise<boolean> => {
  try {
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Create a container for the PDF content
    const container = document.createElement('div');
    container.className = 'pdf-container';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.padding = '20px';
    container.style.color = '#000000';
    
    // Create cover page
    const coverPage = createCoverPage(coverData);
    container.appendChild(coverPage);
    
    // Create a page break
    const pageBreak = document.createElement('div');
    pageBreak.style.pageBreakAfter = 'always';
    pageBreak.style.height = '1px';
    container.appendChild(pageBreak);
    
    // Add measurement data section
    const dataSection = createMeasurementDataSection(measurements);
    container.appendChild(dataSection);
    
    // Add area measurement details tables
    if (measurements.filter(m => m.type === 'area').length > 0) {
      const areaDetailsSection = createAreaDetailsSection(measurements);
      container.appendChild(areaDetailsSection);
    }
    
    // Add footer
    const footer = createFooter();
    
    // Configure html2pdf options
    const pdfOptions = {
      margin: [15, 15, 20, 15], // [top, right, bottom, left]
      filename: `DrohnenGLB_Messung_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { 
        unit: 'mm', 
        format: mergedOptions.pageSize, 
        orientation: mergedOptions.orientation
      },
      pagebreak: { mode: 'css' },
      footer: {
        height: '20mm',
        contents: footer
      }
    };
    
    // Generate the PDF
    document.body.appendChild(container);
    await html2pdf().from(container).set(pdfOptions).save();
    document.body.removeChild(container);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};

const createCoverPage = (coverData: CoverPageData): HTMLElement => {
  const coverPage = document.createElement('div');
  coverPage.style.height = '100%';
  coverPage.style.display = 'flex';
  coverPage.style.flexDirection = 'column';
  coverPage.style.justifyContent = 'space-between';
  coverPage.style.padding = '40px 20px';
  
  // Header of cover page
  const coverHeader = document.createElement('div');
  coverHeader.style.textAlign = 'center';
  coverHeader.style.marginBottom = '40px';
  
  const coverTitle = document.createElement('h1');
  coverTitle.textContent = coverData.title || 'Vermessungsbericht';
  coverTitle.style.fontSize = '28px';
  coverTitle.style.fontWeight = 'bold';
  coverTitle.style.marginBottom = '10px';
  coverTitle.style.color = '#000000';
  coverHeader.appendChild(coverTitle);
  
  const coverDate = document.createElement('div');
  coverDate.textContent = `Erstellt am: ${new Date().toLocaleDateString('de-DE')}`;
  coverDate.style.fontSize = '14px';
  coverHeader.appendChild(coverDate);
  
  coverPage.appendChild(coverHeader);
  
  // Main content of cover page
  const coverContent = document.createElement('div');
  coverContent.style.flex = '1';
  coverContent.style.display = 'flex';
  coverContent.style.flexDirection = 'column';
  coverContent.style.justifyContent = 'center';
  
  const infoCard = document.createElement('div');
  infoCard.style.backgroundColor = '#f8f9fa';
  infoCard.style.border = '1px solid #eaeaea';
  infoCard.style.borderRadius = '8px';
  infoCard.style.padding = '30px';
  infoCard.style.maxWidth = '500px';
  infoCard.style.margin = '0 auto';
  infoCard.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
  
  // Project details
  const createInfoRow = (label: string, value: string) => {
    if (!value) return null;
    
    const row = document.createElement('div');
    row.style.marginBottom = '20px';
    
    const labelElement = document.createElement('div');
    labelElement.textContent = label;
    labelElement.style.fontSize = '12px';
    labelElement.style.color = '#666';
    labelElement.style.marginBottom = '4px';
    row.appendChild(labelElement);
    
    const valueElement = document.createElement('div');
    valueElement.textContent = value;
    valueElement.style.fontSize = '16px';
    valueElement.style.fontWeight = 'bold';
    row.appendChild(valueElement);
    
    return row;
  };
  
  const companyRow = createInfoRow('Name des Betriebes', coverData.companyName);
  if (companyRow) infoCard.appendChild(companyRow);
  
  const addressRow = createInfoRow('Anschrift des Objekts', coverData.projectAddress);
  if (addressRow) infoCard.appendChild(addressRow);
  
  const contactRow = createInfoRow('Ansprechpartner', coverData.contactPerson);
  if (contactRow) infoCard.appendChild(contactRow);
  
  const droneDateRow = createInfoRow('Datum der Drohnenaufnahmen', coverData.droneDate ? new Date(coverData.droneDate).toLocaleDateString('de-DE') : '');
  if (droneDateRow) infoCard.appendChild(droneDateRow);
  
  if (coverData.notes) {
    const notesLabel = document.createElement('div');
    notesLabel.textContent = 'Bemerkungen';
    notesLabel.style.fontSize = '12px';
    notesLabel.style.color = '#666';
    notesLabel.style.marginBottom = '4px';
    infoCard.appendChild(notesLabel);
    
    const notesText = document.createElement('div');
    notesText.textContent = coverData.notes;
    notesText.style.padding = '10px';
    notesText.style.backgroundColor = '#ffffff';
    notesText.style.border = '1px solid #eee';
    notesText.style.borderRadius = '4px';
    notesText.style.fontSize = '14px';
    infoCard.appendChild(notesText);
  }
  
  coverContent.appendChild(infoCard);
  coverPage.appendChild(coverContent);
  
  return coverPage;
};

const createMeasurementDataSection = (measurements: Measurement[]): HTMLElement => {
  const dataSection = document.createElement('div');
  dataSection.style.marginBottom = '30px';
  
  // Filter measurements by type
  const lengthMeasurements = measurements.filter(m => m.type === 'length');
  const heightMeasurements = measurements.filter(m => m.type === 'height');
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  
  // Add measurement summary
  const summary = document.createElement('div');
  summary.style.marginBottom = '30px';
  
  const summaryTitle = document.createElement('h2');
  summaryTitle.textContent = 'Übersicht';
  summaryTitle.style.fontSize = '18px';
  summaryTitle.style.marginBottom = '10px';
  summaryTitle.style.color = '#000000';
  summary.appendChild(summaryTitle);
  
  const summaryContent = document.createElement('div');
  summaryContent.style.display = 'flex';
  summaryContent.style.flexWrap = 'wrap';
  summaryContent.style.gap = '20px';
  
  const createSummaryStat = (label: string, value: number, icon: string) => {
    const stat = document.createElement('div');
    stat.style.backgroundColor = '#f8f9fa';
    stat.style.borderRadius = '8px';
    stat.style.padding = '15px';
    stat.style.minWidth = '150px';
    stat.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    
    const statValue = document.createElement('div');
    statValue.style.fontSize = '24px';
    statValue.style.fontWeight = 'bold';
    statValue.style.marginBottom = '5px';
    statValue.textContent = value.toString();
    stat.appendChild(statValue);
    
    const statLabel = document.createElement('div');
    statLabel.style.fontSize = '14px';
    statLabel.style.color = '#666';
    statLabel.style.display = 'flex';
    statLabel.style.alignItems = 'center';
    statLabel.style.gap = '5px';
    statLabel.innerHTML = `${icon} ${label}`;
    stat.appendChild(statLabel);
    
    return stat;
  };
  
  summaryContent.appendChild(createSummaryStat('Gesamt', measurements.length, '📊'));
  summaryContent.appendChild(createSummaryStat('Längen', lengthMeasurements.length, '📏'));
  summaryContent.appendChild(createSummaryStat('Höhen', heightMeasurements.length, '📐'));
  summaryContent.appendChild(createSummaryStat('Flächen', areaMeasurements.length, '🔲'));
  
  summary.appendChild(summaryContent);
  dataSection.appendChild(summary);
  
  // Main title for measurement data
  const dataTitle = document.createElement('h2');
  dataTitle.textContent = 'Messdaten';
  dataTitle.style.fontSize = '18px';
  dataTitle.style.marginBottom = '15px';
  dataTitle.style.color = '#000000';
  dataSection.appendChild(dataTitle);
  
  // Create combined table for all measurements
  if (measurements.length > 0) {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '30px';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f3f4f6';
    
    ['Nr.', 'Beschreibung', 'Typ', 'Messwert', 'Dachneigung'].forEach(column => {
      const th = document.createElement('th');
      th.textContent = column;
      th.style.padding = '10px';
      th.style.textAlign = 'left';
      th.style.border = '1px solid #ddd';
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    measurements.forEach((measurement, index) => {
      const row = document.createElement('tr');
      row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
      
      // Nr column
      const numCell = document.createElement('td');
      numCell.textContent = (index + 1).toString();
      numCell.style.padding = '10px';
      numCell.style.border = '1px solid #ddd';
      row.appendChild(numCell);
      
      // Description column
      const descCell = document.createElement('td');
      descCell.textContent = measurement.description || '–';
      descCell.style.padding = '10px';
      descCell.style.border = '1px solid #ddd';
      row.appendChild(descCell);
      
      // Type column
      const typeCell = document.createElement('td');
      typeCell.textContent = measurement.type === 'length' ? 'Länge' : 
                           measurement.type === 'height' ? 'Höhe' : 
                           measurement.type === 'area' ? 'Fläche' : '–';
      typeCell.style.padding = '10px';
      typeCell.style.border = '1px solid #ddd';
      row.appendChild(typeCell);
      
      // Value column
      const valueCell = document.createElement('td');
      valueCell.textContent = `${measurement.value.toFixed(2)} ${measurement.unit || 'm'}`;
      if (measurement.type === 'area') {
        valueCell.textContent = `${measurement.value.toFixed(2)} ${measurement.unit || 'm²'}`;
      }
      valueCell.style.padding = '10px';
      valueCell.style.border = '1px solid #ddd';
      valueCell.style.fontWeight = 'bold';
      row.appendChild(valueCell);
      
      // Inclination column
      const inclinationCell = document.createElement('td');
      if (measurement.type === 'length' && measurement.inclination !== undefined) {
        inclinationCell.textContent = `${Math.abs(measurement.inclination).toFixed(1)}°`;
      } else {
        inclinationCell.textContent = '–';
      }
      inclinationCell.style.padding = '10px';
      inclinationCell.style.border = '1px solid #ddd';
      row.appendChild(inclinationCell);
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    dataSection.appendChild(table);
  }
  
  return dataSection;
};

const createAreaDetailsSection = (measurements: Measurement[]): HTMLElement => {
  const areaSection = document.createElement('div');
  areaSection.style.marginBottom = '30px';
  
  const areaMeasurements = measurements.filter(m => m.type === 'area');
  
  if (areaMeasurements.length > 0) {
    const areaDetailsTitle = document.createElement('h2');
    areaDetailsTitle.textContent = 'Flächendetails';
    areaDetailsTitle.style.fontSize = '18px';
    areaDetailsTitle.style.marginBottom = '15px';
    areaDetailsTitle.style.color = '#000000';
    areaSection.appendChild(areaDetailsTitle);
    
    // For each area measurement, show its segments
    areaMeasurements.forEach((measurement, mIndex) => {
      if (measurement.segments && measurement.segments.length > 0) {
        const areaTitle = document.createElement('h3');
        areaTitle.textContent = measurement.description 
          ? `Fläche: ${measurement.description}` 
          : `Fläche ${mIndex + 1}`;
        areaTitle.style.fontSize = '16px';
        areaTitle.style.marginTop = '20px';
        areaTitle.style.marginBottom = '10px';
        areaTitle.style.color = '#000000';
        areaSection.appendChild(areaTitle);
        
        const segmentTable = document.createElement('table');
        segmentTable.style.width = '100%';
        segmentTable.style.borderCollapse = 'collapse';
        segmentTable.style.marginBottom = '20px';
        
        // Segment table header
        const segmentThead = document.createElement('thead');
        const segmentHeaderRow = document.createElement('tr');
        segmentHeaderRow.style.backgroundColor = '#f3f4f6';
        
        ['Segment', 'Länge'].forEach(column => {
          const th = document.createElement('th');
          th.textContent = column;
          th.style.padding = '8px';
          th.style.textAlign = 'left';
          th.style.border = '1px solid #ddd';
          segmentHeaderRow.appendChild(th);
        });
        
        segmentThead.appendChild(segmentHeaderRow);
        segmentTable.appendChild(segmentThead);
        
        // Segment table body
        const segmentTbody = document.createElement('tbody');
        
        measurement.segments.forEach((segment, sIndex) => {
          const segmentRow = document.createElement('tr');
          segmentRow.style.backgroundColor = sIndex % 2 === 0 ? '#ffffff' : '#f9fafb';
          
          // Segment number
          const segmentNumCell = document.createElement('td');
          segmentNumCell.textContent = `Segment ${sIndex + 1}`;
          segmentNumCell.style.padding = '8px';
          segmentNumCell.style.border = '1px solid #ddd';
          segmentRow.appendChild(segmentNumCell);
          
          // Segment length
          const segmentLengthCell = document.createElement('td');
          segmentLengthCell.textContent = `${segment.length.toFixed(2)} m`;
          segmentLengthCell.style.padding = '8px';
          segmentLengthCell.style.border = '1px solid #ddd';
          segmentRow.appendChild(segmentLengthCell);
          
          segmentTbody.appendChild(segmentRow);
        });
        
        segmentTable.appendChild(segmentTbody);
        areaSection.appendChild(segmentTable);
      }
    });
  }
  
  return areaSection;
};

const createFooter = (): string => {
  // Create the footer as HTML string (required for html2pdf footer option)
  return `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-top: 1px solid #ddd; font-size: 10px; color: #666; width: 100%;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 24px; height: 24px;">
          <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiM0RjQ2RTUiLz4KICAgIDxwYXRoIGQ9Ik03IDEySDE3TTEyIDdWMTciIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPg==" alt="DrohnenGLB Logo" style="width: 100%; height: 100%;">
        </div>
        <span style="font-weight: bold;">DrohnenGLB by RooferGaming</span>
      </div>
      <div>
        <div style="font-weight: bold; margin-bottom: 3px;">Dieser Service wird kostenlos von Drohnenvermessung by RooferGaming® zur Verfügung gestellt</div>
        <div>Homepage: drohnenvermessung-roofergaming.de | Email: info@drohnenvermessung-roofergaming.de</div>
      </div>
    </div>
  `;
};
