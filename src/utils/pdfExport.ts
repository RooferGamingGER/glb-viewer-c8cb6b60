
import html2pdf from 'html2pdf.js';
import { Measurement } from '@/hooks/useMeasurements';

export interface PdfExportOptions {
  title?: string;
  includeDateTime?: boolean;
  showLogo?: boolean;
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

const defaultOptions: PdfExportOptions = {
  title: 'Messungen',
  includeDateTime: true,
  showLogo: true,
  pageSize: 'a4',
  orientation: 'portrait'
};

export const exportMeasurementsToPdf = async (
  measurements: Measurement[],
  options: PdfExportOptions = defaultOptions
): Promise<boolean> => {
  try {
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Create a container for the PDF content
    const container = document.createElement('div');
    container.className = 'pdf-container';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.padding = '20px';
    container.style.color = '#333';
    
    // Add header with title and date
    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    header.style.borderBottom = '2px solid #ddd';
    header.style.paddingBottom = '15px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    container.appendChild(header);
    
    // Left side: Logo and title
    const logoTitleContainer = document.createElement('div');
    logoTitleContainer.style.display = 'flex';
    logoTitleContainer.style.alignItems = 'center';
    logoTitleContainer.style.gap = '15px';
    
    // Add logo if requested
    if (mergedOptions.showLogo) {
      const logoContainer = document.createElement('div');
      logoContainer.style.width = '60px';
      logoContainer.style.height = '60px';
      // Use the RooferGaming logo - base64 encoded for reliability
      logoContainer.innerHTML = `
        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiM0RjQ2RTUiLz4KICAgIDxwYXRoIGQ9Ik03IDEySDE3TTEyIDdWMTciIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPg==" 
        alt="DrohnenGLB Logo" style="width: 100%; height: 100%;">
      `;
      logoTitleContainer.appendChild(logoContainer);
    }
    
    // Add title
    const titleContainer = document.createElement('div');
    
    const mainTitle = document.createElement('h1');
    mainTitle.textContent = "DrohnenGLB by RooferGaming";
    mainTitle.style.fontSize = '20px';
    mainTitle.style.fontWeight = 'bold';
    mainTitle.style.margin = '0 0 5px 0';
    mainTitle.style.color = '#4F46E5';
    titleContainer.appendChild(mainTitle);
    
    const subTitle = document.createElement('h2');
    subTitle.textContent = mergedOptions.title || 'Messungen';
    subTitle.style.fontSize = '16px';
    subTitle.style.fontWeight = 'normal';
    subTitle.style.margin = '0';
    subTitle.style.color = '#666';
    titleContainer.appendChild(subTitle);
    
    logoTitleContainer.appendChild(titleContainer);
    header.appendChild(logoTitleContainer);
    
    // Right side: Date
    if (mergedOptions.includeDateTime) {
      const dateContainer = document.createElement('div');
      dateContainer.style.textAlign = 'right';
      
      const dateLabel = document.createElement('div');
      dateLabel.textContent = 'Datum:';
      dateLabel.style.fontSize = '12px';
      dateLabel.style.color = '#666';
      dateLabel.style.marginBottom = '2px';
      dateContainer.appendChild(dateLabel);
      
      const dateValue = document.createElement('div');
      dateValue.textContent = new Date().toLocaleDateString('de-DE');
      dateValue.style.fontSize = '14px';
      dateValue.style.fontWeight = 'bold';
      dateContainer.appendChild(dateValue);
      
      header.appendChild(dateContainer);
    }
    
    // Add measurement summary
    const summary = document.createElement('div');
    summary.style.marginBottom = '30px';
    
    // Filter measurements by type
    const lengthMeasurements = measurements.filter(m => m.type === 'length');
    const heightMeasurements = measurements.filter(m => m.type === 'height');
    const areaMeasurements = measurements.filter(m => m.type === 'area');
    
    const summaryTitle = document.createElement('h2');
    summaryTitle.textContent = 'Übersicht';
    summaryTitle.style.fontSize = '18px';
    summaryTitle.style.marginBottom = '10px';
    summaryTitle.style.color = '#4F46E5';
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
    container.appendChild(summary);
    
    // Main title for measurement data
    const dataTitle = document.createElement('h2');
    dataTitle.textContent = 'Messdaten';
    dataTitle.style.fontSize = '18px';
    dataTitle.style.marginBottom = '15px';
    dataTitle.style.color = '#4F46E5';
    container.appendChild(dataTitle);
    
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
      container.appendChild(table);
    }
    
    // Add area measurement details tables
    if (areaMeasurements.length > 0) {
      const areaDetailsTitle = document.createElement('h2');
      areaDetailsTitle.textContent = 'Flächendetails';
      areaDetailsTitle.style.fontSize = '18px';
      areaDetailsTitle.style.marginBottom = '15px';
      areaDetailsTitle.style.color = '#4F46E5';
      container.appendChild(areaDetailsTitle);
      
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
          container.appendChild(areaTitle);
          
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
          container.appendChild(segmentTable);
        }
      });
    }
    
    // Add footer
    const footer = document.createElement('div');
    footer.style.marginTop = '40px';
    footer.style.borderTop = '1px solid #ddd';
    footer.style.paddingTop = '15px';
    footer.style.fontSize = '12px';
    footer.style.color = '#666';
    
    const footerService = document.createElement('p');
    footerService.textContent = 'Dieser Service wird kostenlos von Drohnenvermessung by RooferGaming® zur Verfügung gestellt';
    footerService.style.fontWeight = 'bold';
    footerService.style.marginBottom = '10px';
    footer.appendChild(footerService);
    
    const footerContact = document.createElement('p');
    footerContact.style.margin = '0';
    footer.appendChild(footerContact);
    
    const footerWebsite = document.createElement('span');
    footerWebsite.textContent = 'Homepage: drohnenvermessung-roofergaming.de';
    footerWebsite.style.marginRight = '20px';
    footerContact.appendChild(footerWebsite);
    
    const footerEmail = document.createElement('span');
    footerEmail.textContent = 'Email: info@drohnenvermessung-roofergaming.de';
    footerContact.appendChild(footerEmail);
    
    container.appendChild(footer);
    
    // Configure html2pdf options
    const pdfOptions = {
      margin: 10,
      filename: `DrohnenGLB_Messung_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { 
        unit: 'mm', 
        format: mergedOptions.pageSize, 
        orientation: mergedOptions.orientation
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
