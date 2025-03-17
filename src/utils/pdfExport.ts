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
    
    // Add container to document before building content
    document.body.appendChild(container);
    
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
    
    // Create footer as a string (simplified, no logo)
    const footerContent = createFooter();
    
    // Configure html2pdf options with increased bottom margin for footer
    const pdfOptions = {
      margin: [15, 15, 45, 15], // [top, right, bottom, left] - increased bottom margin for footer
      filename: `DrohnenGLB_Messung_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      },
      pagebreak: { mode: 'css' },
      footer: {
        height: '40mm', // Increased height for the footer
        contents: footerContent
      }
    };
    
    // Add a small delay to ensure DOM rendering is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Generate the PDF
    await html2pdf().from(container).set(pdfOptions).save();
    
    // Clean up - remove container from DOM
    document.body.removeChild(container);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Clean up in case of error
    const container = document.querySelector('.pdf-container');
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
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
  
  const exportDate = document.createElement('div');
  exportDate.textContent = `Erstellt am: ${new Date().toLocaleDateString('de-DE')}`;
  exportDate.style.fontSize = '14px';
  exportDate.style.color = '#000000';
  coverHeader.appendChild(exportDate);
  
  coverPage.appendChild(coverHeader);
  
  // Main content of cover page with improved layout
  const coverContent = document.createElement('div');
  coverContent.style.flex = '1';
  coverContent.style.display = 'flex';
  coverContent.style.flexDirection = 'column';
  coverContent.style.justifyContent = 'center';
  
  const infoWrapper = document.createElement('div');
  infoWrapper.style.maxWidth = '100%';
  infoWrapper.style.width = '100%';
  infoWrapper.style.margin = '0 auto';
  infoWrapper.style.padding = '10px 0';
  
  // Create table for layout with full width
  const infoTable = document.createElement('table');
  infoTable.style.width = '100%';
  infoTable.style.borderCollapse = 'collapse';
  
  // Create table rows for each piece of information
  const createInfoRow = (label: string, value: string) => {
    if (!value && label !== 'Bemerkungen') return null;
    
    const row = document.createElement('tr');
    row.style.marginBottom = '25px';
    row.style.verticalAlign = 'top';
    
    const labelCell = document.createElement('td');
    labelCell.style.width = '40%';
    labelCell.style.paddingBottom = '25px';
    labelCell.style.paddingRight = '20px';
    labelCell.style.fontWeight = 'normal';
    labelCell.style.color = '#666';
    labelCell.style.fontSize = '16px';
    labelCell.textContent = label;
    row.appendChild(labelCell);
    
    const valueCell = document.createElement('td');
    valueCell.style.width = '60%';
    valueCell.style.paddingBottom = '25px';
    valueCell.style.fontWeight = 'bold';
    valueCell.style.fontSize = '20px';
    valueCell.style.color = '#000000';
    valueCell.textContent = value || '';
    row.appendChild(valueCell);
    
    return row;
  };
  
  // Add rows for each field
  const companyRow = createInfoRow('Name des Betriebes', coverData.companyName);
  if (companyRow) infoTable.appendChild(companyRow);
  
  const addressRow = createInfoRow('Anschrift des Objekts', coverData.projectAddress);
  if (addressRow) infoTable.appendChild(addressRow);
  
  const contactRow = createInfoRow('Ansprechpartner', coverData.contactPerson);
  if (contactRow) infoTable.appendChild(contactRow);
  
  const droneDateRow = createInfoRow('Datum der Drohnenaufnahmen', coverData.droneDate ? new Date(coverData.droneDate).toLocaleDateString('de-DE') : '');
  if (droneDateRow) infoTable.appendChild(droneDateRow);
  
  // Add notes field even if empty (as per requirements)
  const notesRow = document.createElement('tr');
  notesRow.style.verticalAlign = 'top';
  
  const notesLabelCell = document.createElement('td');
  notesLabelCell.style.width = '40%';
  notesLabelCell.style.paddingRight = '20px';
  notesLabelCell.style.fontWeight = 'normal';
  notesLabelCell.style.color = '#666';
  notesLabelCell.style.fontSize = '16px';
  notesLabelCell.textContent = 'Bemerkungen';
  notesRow.appendChild(notesLabelCell);
  
  const notesValueCell = document.createElement('td');
  notesValueCell.style.width = '60%';
  notesValueCell.style.fontWeight = 'normal';
  notesValueCell.style.fontSize = '16px';
  notesValueCell.style.color = '#000000';
  notesValueCell.textContent = coverData.notes || '';
  notesRow.appendChild(notesValueCell);
  
  infoTable.appendChild(notesRow);
  
  infoWrapper.appendChild(infoTable);
  coverContent.appendChild(infoWrapper);
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
  
  // Modified: Single row layout for summary stats
  const summaryContent = document.createElement('div');
  summaryContent.style.display = 'flex';
  summaryContent.style.flexDirection = 'row';
  summaryContent.style.justifyContent = 'space-between';
  summaryContent.style.flexWrap = 'nowrap';
  summaryContent.style.gap = '10px';
  summaryContent.style.width = '100%';
  
  const createSummaryStat = (label: string, value: number, icon: string) => {
    const stat = document.createElement('div');
    stat.style.backgroundColor = '#f8f9fa';
    stat.style.borderRadius = '8px';
    stat.style.padding = '10px';
    stat.style.width = '24%';
    stat.style.minWidth = '80px';
    stat.style.boxSizing = 'border-box';
    stat.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    stat.style.textAlign = 'center';
    stat.style.flexShrink = '1';
    
    const statValue = document.createElement('div');
    statValue.style.fontSize = '22px';
    statValue.style.fontWeight = 'bold';
    statValue.style.marginBottom = '5px';
    statValue.style.color = '#000000';
    statValue.textContent = value.toString();
    stat.appendChild(statValue);
    
    const statLabel = document.createElement('div');
    statLabel.style.fontSize = '12px';
    statLabel.style.color = '#666';
    statLabel.style.display = 'flex';
    statLabel.style.justifyContent = 'center';
    statLabel.style.alignItems = 'center';
    statLabel.style.gap = '5px';
    statLabel.innerHTML = `${icon} ${label}`;
    stat.appendChild(statLabel);
    
    return stat;
  };
  
  // Modified order of summary stats and ensure they fit in a single row
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
      th.style.color = '#000000';
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
      numCell.style.color = '#000000';
      row.appendChild(numCell);
      
      // Description column
      const descCell = document.createElement('td');
      descCell.textContent = measurement.description || '–';
      descCell.style.padding = '10px';
      descCell.style.border = '1px solid #ddd';
      descCell.style.color = '#000000';
      row.appendChild(descCell);
      
      // Type column
      const typeCell = document.createElement('td');
      typeCell.textContent = measurement.type === 'length' ? 'Länge' : 
                           measurement.type === 'height' ? 'Höhe' : 
                           measurement.type === 'area' ? 'Fläche' : '–';
      typeCell.style.padding = '10px';
      typeCell.style.border = '1px solid #ddd';
      typeCell.style.color = '#000000';
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
      valueCell.style.color = '#000000';
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
      inclinationCell.style.color = '#000000';
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
        
        ['Teilmessung', 'Länge'].forEach(column => {
          const th = document.createElement('th');
          th.textContent = column;
          th.style.padding = '8px';
          th.style.textAlign = 'left';
          th.style.border = '1px solid #ddd';
          th.style.color = '#000000';
          segmentHeaderRow.appendChild(th);
        });
        
        segmentThead.appendChild(segmentHeaderRow);
        segmentTable.appendChild(segmentThead);
        
        // Segment table body
        const segmentTbody = document.createElement('tbody');
        
        measurement.segments.forEach((segment, sIndex) => {
          const segmentRow = document.createElement('tr');
          segmentRow.style.backgroundColor = sIndex % 2 === 0 ? '#ffffff' : '#f9fafb';
          
          // Segment number - rename to "Teilmessung"
          const segmentNumCell = document.createElement('td');
          segmentNumCell.textContent = `Teilmessung ${sIndex + 1}`;
          segmentNumCell.style.padding = '8px';
          segmentNumCell.style.border = '1px solid #ddd';
          segmentNumCell.style.color = '#000000';
          segmentRow.appendChild(segmentNumCell);
          
          // Segment length
          const segmentLengthCell = document.createElement('td');
          segmentLengthCell.textContent = `${segment.length.toFixed(2)} m`;
          segmentLengthCell.style.padding = '8px';
          segmentLengthCell.style.border = '1px solid #ddd';
          segmentLengthCell.style.color = '#000000';
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
  // Simplified footer without logo - just text content
  return `
    <div style="text-align: center; padding: 10px 15px; border-top: 1px solid #ddd; font-size: 11px; color: #666; width: 100%; margin-top: 10px;">
      <div style="font-weight: bold; margin-bottom: 5px;">Dieser Service wird kostenlos von Drohnenvermessung by RooferGaming® zur Verfügung gestellt</div>
      <div>Homepage: drohnenvermessung-roofergaming.de | Email: info@drohnenvermessung-roofergaming.de</div>
    </div>
  `;
};
