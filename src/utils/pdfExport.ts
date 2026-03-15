import { Measurement } from '@/types/measurements';
import { 
  getMeasurementTypeDisplayName, 
  getSegmentTypeDisplayName, 
  formatMeasurementValue, 
  calculateTotalArea, 
  calculateNetTotalArea, 
  groupSegmentsByType 
} from './exportUtils';
import { renderSolarLayout2D } from './renderPolygon2D';

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
  companyLogo?: string; // Base64-encoded company logo
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
 * Creates the calculation methods explanation section for the PDF appendix
 */
const createCalculationMethodsSection = (): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'page-break';
  container.style.pageBreakBefore = 'always';
  container.style.pageBreakAfter = 'always';
  container.style.marginTop = '0';
  container.style.padding = '20px';
  
  const title = document.createElement('h2');
  title.textContent = 'Anhang: Berechnungsmethoden';
  title.style.marginBottom = '20px';
  title.style.color = '#333';
  container.appendChild(title);
  
  const intro = document.createElement('p');
  intro.textContent = 'Die folgenden Formeln und Methoden werden zur Berechnung der Dachflächen verwendet:';
  intro.style.marginBottom = '20px';
  intro.style.color = '#666';
  container.appendChild(intro);
  
  // Triangle section
  const triangleSection = document.createElement('div');
  triangleSection.style.marginBottom = '25px';
  triangleSection.style.padding = '15px';
  triangleSection.style.backgroundColor = '#f8f9fa';
  triangleSection.style.borderRadius = '8px';
  triangleSection.style.border = '1px solid #e9ecef';
  
  const triangleTitle = document.createElement('h3');
  triangleTitle.textContent = 'Dreiecke (3 Eckpunkte) – Heronsche Formel';
  triangleTitle.style.marginBottom = '10px';
  triangleTitle.style.color = '#2563eb';
  triangleSection.appendChild(triangleTitle);
  
  const triangleDesc = document.createElement('p');
  triangleDesc.textContent = 'Benannt nach dem griechischen Mathematiker Heron von Alexandria. Diese Formel ermöglicht die Berechnung der Fläche eines Dreiecks allein aus den drei Seitenlängen (a, b, c).';
  triangleDesc.style.marginBottom = '10px';
  triangleSection.appendChild(triangleDesc);
  
  const triangleSteps = document.createElement('div');
  triangleSteps.style.fontFamily = 'monospace';
  triangleSteps.style.backgroundColor = '#fff';
  triangleSteps.style.padding = '10px';
  triangleSteps.style.borderRadius = '4px';
  triangleSteps.style.marginBottom = '10px';
  triangleSteps.innerHTML = `
    <strong>Schritt 1:</strong> Halbumfang berechnen<br/>
    <span style="margin-left: 20px;">s = (a + b + c) ÷ 2</span><br/><br/>
    <strong>Schritt 2:</strong> Fläche berechnen<br/>
    <span style="margin-left: 20px;">A = √(s × (s-a) × (s-b) × (s-c))</span>
  `;
  triangleSection.appendChild(triangleSteps);
  
  const triangleExample = document.createElement('div');
  triangleExample.style.backgroundColor = '#e7f3ff';
  triangleExample.style.padding = '10px';
  triangleExample.style.borderRadius = '4px';
  triangleExample.innerHTML = `
    <strong>Beispiel:</strong><br/>
    Seiten: a = 3,00 m, b = 4,00 m, c = 5,00 m<br/>
    Halbumfang: s = (3 + 4 + 5) ÷ 2 = 6 m<br/>
    Fläche: A = √(6 × 3 × 2 × 1) = √36 = <strong>6,00 m²</strong>
  `;
  triangleSection.appendChild(triangleExample);
  
  container.appendChild(triangleSection);
  
  // Quadrilateral section
  const quadSection = document.createElement('div');
  quadSection.style.marginBottom = '25px';
  quadSection.style.padding = '15px';
  quadSection.style.backgroundColor = '#f8f9fa';
  quadSection.style.borderRadius = '8px';
  quadSection.style.border = '1px solid #e9ecef';
  
  const quadTitle = document.createElement('h3');
  quadTitle.textContent = 'Vierecke (4 Eckpunkte) – Dreieckszerlegung';
  quadTitle.style.marginBottom = '10px';
  quadTitle.style.color = '#16a34a';
  quadSection.appendChild(quadTitle);
  
  const quadDesc = document.createElement('p');
  quadDesc.textContent = 'Die Fläche eines Vierecks wird durch Aufteilung in zwei Dreiecke berechnet. Eine Diagonale teilt das Viereck, und beide Teilflächen werden separat berechnet.';
  quadDesc.style.marginBottom = '10px';
  quadSection.appendChild(quadDesc);
  
  const quadSteps = document.createElement('div');
  quadSteps.style.fontFamily = 'monospace';
  quadSteps.style.backgroundColor = '#fff';
  quadSteps.style.padding = '10px';
  quadSteps.style.borderRadius = '4px';
  quadSteps.innerHTML = `
    <strong>Schritt 1:</strong> Viereck diagonal teilen<br/>
    <strong>Schritt 2:</strong> Beide Dreiecke mit Heronscher Formel berechnen<br/>
    <strong>Schritt 3:</strong> Flächen addieren<br/><br/>
    <span style="margin-left: 20px;">Gesamtfläche = Dreieck₁ + Dreieck₂</span>
  `;
  quadSection.appendChild(quadSteps);
  
  container.appendChild(quadSection);
  
  // Polygon section
  const polySection = document.createElement('div');
  polySection.style.marginBottom = '25px';
  polySection.style.padding = '15px';
  polySection.style.backgroundColor = '#f8f9fa';
  polySection.style.borderRadius = '8px';
  polySection.style.border = '1px solid #e9ecef';
  
  const polyTitle = document.createElement('h3');
  polyTitle.textContent = 'Polygone (5+ Eckpunkte) – Triangulation';
  polyTitle.style.marginBottom = '10px';
  polyTitle.style.color = '#9333ea';
  polySection.appendChild(polyTitle);
  
  const polyDesc = document.createElement('p');
  polyDesc.textContent = 'Komplexe Formen werden durch "Triangulation" berechnet – die automatische Zerlegung in mehrere Dreiecke.';
  polyDesc.style.marginBottom = '10px';
  polySection.appendChild(polyDesc);
  
  const polySteps = document.createElement('div');
  polySteps.style.fontFamily = 'monospace';
  polySteps.style.backgroundColor = '#fff';
  polySteps.style.padding = '10px';
  polySteps.style.borderRadius = '4px';
  polySteps.innerHTML = `
    <strong>Schritt 1:</strong> Polygon automatisch in Dreiecke zerlegen<br/>
    <strong>Schritt 2:</strong> Jedes Dreieck mit Heronscher Formel berechnen<br/>
    <strong>Schritt 3:</strong> Alle Dreiecksflächen summieren<br/><br/>
    <span style="margin-left: 20px;">Gesamtfläche = Σ aller Dreiecksflächen</span>
  `;
  polySection.appendChild(polySteps);
  
  const polyNote = document.createElement('div');
  polyNote.style.backgroundColor = '#fef3c7';
  polyNote.style.padding = '10px';
  polyNote.style.borderRadius = '4px';
  polyNote.style.marginTop = '10px';
  polyNote.innerHTML = `
    <strong>Hinweis:</strong> Ein Polygon mit n Ecken wird in (n-2) Dreiecke zerlegt.<br/>
    Beispiel: Fünfeck → 3 Dreiecke, Sechseck → 4 Dreiecke
  `;
  polySection.appendChild(polyNote);
  
  container.appendChild(polySection);
  
  // Inclination section
  const inclinationSection = document.createElement('div');
  inclinationSection.style.padding = '15px';
  inclinationSection.style.backgroundColor = '#f8f9fa';
  inclinationSection.style.borderRadius = '8px';
  inclinationSection.style.border = '1px solid #e9ecef';
  
  const inclinationTitle = document.createElement('h3');
  inclinationTitle.textContent = 'Neigungsberechnung';
  inclinationTitle.style.marginBottom = '10px';
  inclinationTitle.style.color = '#ea580c';
  inclinationSection.appendChild(inclinationTitle);
  
  const inclinationDesc = document.createElement('p');
  inclinationDesc.textContent = 'Die Dachneigung wird aus dem Winkel zwischen der Flächennormale und der vertikalen Achse (Y-Achse) berechnet.';
  inclinationDesc.style.marginBottom = '10px';
  inclinationSection.appendChild(inclinationDesc);
  
  const inclinationTable = document.createElement('table');
  inclinationTable.style.width = '100%';
  inclinationTable.style.borderCollapse = 'collapse';
  inclinationTable.innerHTML = `
    <tr style="background: #fff;">
      <td style="padding: 8px; border: 1px solid #e9ecef;"><strong>0°</strong></td>
      <td style="padding: 8px; border: 1px solid #e9ecef;">Waagerechte Fläche (Flachdach)</td>
    </tr>
    <tr style="background: #fff;">
      <td style="padding: 8px; border: 1px solid #e9ecef;"><strong>30° – 45°</strong></td>
      <td style="padding: 8px; border: 1px solid #e9ecef;">Typisches geneigtes Dach</td>
    </tr>
    <tr style="background: #fff;">
      <td style="padding: 8px; border: 1px solid #e9ecef;"><strong>90°</strong></td>
      <td style="padding: 8px; border: 1px solid #e9ecef;">Senkrechte Fläche (Wand)</td>
    </tr>
  `;
  inclinationSection.appendChild(inclinationTable);
  
  container.appendChild(inclinationSection);
  
  return container;
};

/**
 * Creates a total area summary section for the PDF
 */
const createTotalAreaSummary = (measurements: Measurement[]): HTMLElement => {
  const totalArea = calculateTotalArea(measurements);
  const netTotalArea = calculateNetTotalArea(measurements); // Get net total area
  const areaMeasurements = measurements.filter(m => m.type === 'area' || m.type === 'solar');
  const deductionMeasurements = measurements.filter(m => m.type === 'deductionarea'); // Get deduction areas
  
  const container = document.createElement('div');
  container.className = 'page-break'; // Ensure page break detection works
  container.style.marginTop = '0';
  container.style.pageBreakBefore = 'always';
  container.style.pageBreakAfter = 'always';
  container.style.padding = '20px';
  
  const summaryTitle = document.createElement('h2');
  summaryTitle.textContent = 'Gesamtübersicht';
  summaryTitle.style.marginTop = '0';
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
  
  // Regular areas
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

  // Add subtotal row for regular areas if there are deduction areas
  if (deductionMeasurements.length > 0) {
    const subtotalRow = document.createElement('tr');
    
    const subtotalLabelCell = document.createElement('td');
    subtotalLabelCell.textContent = 'Zwischensumme Flächen';
    subtotalLabelCell.style.fontWeight = 'bold';
    subtotalRow.appendChild(subtotalLabelCell);
    
    const subtotalValueCell = document.createElement('td');
    subtotalValueCell.textContent = `${totalArea.toFixed(2)} m²`;
    subtotalValueCell.style.fontWeight = 'bold';
    subtotalRow.appendChild(subtotalValueCell);
    
    tableBody.appendChild(subtotalRow);
  }
  
  // Deduction areas
  deductionMeasurements.forEach((measurement, index) => {
    const row = document.createElement('tr');
    row.className = 'deduction-row';
    
    const nameCell = document.createElement('td');
    nameCell.textContent = measurement.description || `Abzugsfläche ${index + 1}`;
    nameCell.style.color = '#F97316'; // Orange color for deduction areas
    row.appendChild(nameCell);
    
    const valueCell = document.createElement('td');
    valueCell.textContent = `- ${measurement.value.toFixed(2)} m²`;
    valueCell.style.color = '#F97316'; // Orange color for deduction areas
    row.appendChild(valueCell);
    
    tableBody.appendChild(row);
  });
  
  // Add total deduction area if there are deduction areas
  if (deductionMeasurements.length > 0) {
    const deductionTotalRow = document.createElement('tr');
    
    const deductionTotalLabelCell = document.createElement('td');
    deductionTotalLabelCell.textContent = 'Summe Abzugsflächen';
    deductionTotalLabelCell.style.fontWeight = 'bold';
    deductionTotalLabelCell.style.color = '#F97316'; // Orange color for deduction areas
    deductionTotalRow.appendChild(deductionTotalLabelCell);
    
    const deductionTotalValueCell = document.createElement('td');
    const totalDeduction = deductionMeasurements.reduce((sum, m) => sum + m.value, 0);
    deductionTotalValueCell.textContent = `- ${totalDeduction.toFixed(2)} m²`;
    deductionTotalValueCell.style.fontWeight = 'bold';
    deductionTotalValueCell.style.color = '#F97316'; // Orange color for deduction areas
    deductionTotalRow.appendChild(deductionTotalValueCell);
    
    tableBody.appendChild(deductionTotalRow);
  }
  
  // Net total row (after deductions)
  const totalRow = document.createElement('tr');
  totalRow.className = 'total-row';
  
  const totalLabelCell = document.createElement('td');
  totalLabelCell.textContent = deductionMeasurements.length > 0 ? 'Nettofläche' : 'Gesamtfläche';
  totalLabelCell.style.fontWeight = 'bold';
  totalRow.appendChild(totalLabelCell);
  
  const totalValueCell = document.createElement('td');
  totalValueCell.textContent = `${netTotalArea.toFixed(2)} m²`;
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
  
  const segmentTypeOrder = ['ridge', 'hip', 'valley', 'eave', 'verge', 'flashing', 'connection'];
  
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
  
  // Check for regular areas
  if (measurements.filter(m => m.type === 'area' || m.type === 'solar').length > 0) {
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
  
  // Check for deduction areas - add them as a separate entry in the TOC
  if (measurements.filter(m => m.type === 'deductionarea').length > 0) {
    const deductionRow = document.createElement('tr');
    const deductionLabel = document.createElement('td');
    deductionLabel.textContent = 'Abzugsflächen';
    deductionLabel.style.padding = '5px 0';
    deductionLabel.style.borderBottom = '1px solid #eee';
    
    const deductionPage = document.createElement('td');
    deductionPage.textContent = currentPage.toString();
    deductionPage.style.textAlign = 'right';
    deductionPage.style.padding = '5px 0';
    deductionPage.style.borderBottom = '1px solid #eee';
    
    deductionRow.appendChild(deductionLabel);
    deductionRow.appendChild(deductionPage);
    tbody.appendChild(deductionRow);
    
    currentPage++;
  }
  
  currentPage++;
  
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
  // Use net total area for the summary if there are deduction areas
  const areaValueText = summary.deductionAreas && summary.deductionAreas > 0 ?
    `${summary.netTotalArea ? summary.netTotalArea.toFixed(2) : '0.00'} m²` :
    `${summary.totalArea ? summary.totalArea.toFixed(2) : '0.00'} m²`;
  
  areaValue.textContent = areaValueText;
  areaValue.style.textAlign = 'right';
  areaValue.style.padding = '3px 0';
  areaValue.style.borderBottom = '1px solid #eee';
  
  areaRow.appendChild(areaLabel);
  areaRow.appendChild(areaValue);
  tbody.appendChild(areaRow);
  
  // Add deduction areas info if present
  if (summary.deductionAreas && summary.deductionAreas > 0) {
    const deductionRow = document.createElement('tr');
    
    const deductionLabel = document.createElement('td');
    deductionLabel.textContent = 'Abzugsflächen';
    deductionLabel.style.padding = '3px 0';
    deductionLabel.style.borderBottom = '1px solid #eee';
    
    const deductionValue = document.createElement('td');
    deductionValue.textContent = `${summary.deductionAreas} (${summary.totalDeductionArea.toFixed(2)} m²)`;
    deductionValue.style.textAlign = 'right';
    deductionValue.style.padding = '3px 0';
    deductionValue.style.borderBottom = '1px solid #eee';
    
    deductionRow.appendChild(deductionLabel);
    deductionRow.appendChild(deductionValue);
    tbody.appendChild(deductionRow);
  }
  
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
    
    // Preserve line breaks safely without parsing HTML
    notesContent.textContent = notes;
    
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
  
  // Preserve line breaks safely without parsing HTML
  notesContent.textContent = notes;
  
  container.appendChild(notesContent);
  
  return container;
};

/**
 * Export measurements to PDF with cover page
 */
export const exportMeasurementsToPdf = async (measurements: Measurement[], coverData: CoverPageData, outputMode: 'save' | 'blob' = 'save'): Promise<boolean | Blob> => {
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
        border-bottom: none; /* Entfernt die untere Linie explizit */
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
        margin-top: 40px;
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
    
    // ============ PAGE 1: DECKBLATT (Title Page with TOC and Footer) ============
    const coverPage = document.createElement('div');
    coverPage.className = 'cover-page'; // Remove page-break class to avoid empty first page
    coverPage.style.position = 'relative';
    coverPage.style.height = '277mm'; // Full A4 height minus margins
    coverPage.style.display = 'flex';
    coverPage.style.flexDirection = 'column';
    coverPage.style.boxSizing = 'border-box';
    coverPage.style.backgroundColor = '#fafbfc';
    coverPage.style.border = '1px solid #e5e7eb';
    coverPage.style.borderRadius = '4px';
    coverPage.style.padding = '20px';
    
    // Accent stripe at top
    const accentStripe = document.createElement('div');
    accentStripe.style.position = 'absolute';
    accentStripe.style.top = '0';
    accentStripe.style.left = '0';
    accentStripe.style.right = '0';
    accentStripe.style.height = '6px';
    accentStripe.style.backgroundColor = '#1e40af';
    accentStripe.style.borderRadius = '4px 4px 0 0';
    coverPage.appendChild(accentStripe);
    
    // Company Logo (if provided)
    if (coverData.companyLogo) {
      const logoContainer = document.createElement('div');
      logoContainer.style.textAlign = 'center';
      logoContainer.style.marginTop = '20px';
      logoContainer.style.marginBottom = '20px';
      
      const logo = document.createElement('img');
      logo.src = coverData.companyLogo;
      logo.alt = 'Firmenlogo';
      logo.style.maxWidth = '200px';
      logo.style.maxHeight = '80px';
      logo.style.objectFit = 'contain';
      
      logoContainer.appendChild(logo);
      coverPage.appendChild(logoContainer);
    }
    
    // Title (directly, without company header)
    const title = document.createElement('h1');
    title.className = 'cover-title';
    title.textContent = coverData.title;
    title.style.marginTop = coverData.companyLogo ? '10px' : '30px';
    coverPage.appendChild(title);
    
    // Info section (Projektdaten + Kundendaten)
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
    
    // Notes if present
    if (coverData.notes && coverData.notes.trim().length > 0) {
      const notesDiv = document.createElement('div');
      notesDiv.style.marginTop = '20px';
      notesDiv.style.padding = '15px';
      notesDiv.style.backgroundColor = '#f8fafc';
      notesDiv.style.border = '1px solid #e2e8f0';
      notesDiv.style.borderRadius = '8px';
      notesDiv.style.fontSize = '11px';
      notesDiv.style.lineHeight = '1.5';
      
      const notesLabel = document.createElement('strong');
      notesLabel.textContent = 'Bemerkungen: ';
      notesDiv.appendChild(notesLabel);
      
      const notesText = document.createTextNode(coverData.notes);
      notesDiv.appendChild(notesText);
      
      coverPage.appendChild(notesDiv);
    }
    
    // Table of Contents (Inhaltsverzeichnis)
    const tocSection = document.createElement('div');
    tocSection.style.marginTop = '30px';
    tocSection.style.padding = '20px';
    tocSection.style.backgroundColor = '#ffffff';
    tocSection.style.border = '1px solid #e5e7eb';
    tocSection.style.borderRadius = '8px';
    
    const tocTitle = document.createElement('h3');
    tocTitle.textContent = 'Inhaltsverzeichnis';
    tocTitle.style.margin = '0 0 15px 0';
    tocTitle.style.color = '#1e40af';
    tocTitle.style.fontSize = '14px';
    tocTitle.style.borderBottom = '2px solid #1e40af';
    tocTitle.style.paddingBottom = '8px';
    tocSection.appendChild(tocTitle);
    
    const tocList = document.createElement('div');
    tocList.style.display = 'flex';
    tocList.style.flexDirection = 'column';
    tocList.style.gap = '8px';
    
    // Build TOC entries dynamically
    let currentPage = 2;
    const tocEntries: { title: string; page: number }[] = [];
    
    // Page 2: Übersicht (Luftbild + Zusammenfassung)
    tocEntries.push({ title: 'Übersicht & Zusammenfassung', page: currentPage });
    currentPage++;
    
    // Page 3: Roof plan if available
    if ((measurements as any).roofPlan && ((measurements as any).placeRoofPlanOnPage2 || (measurements as any).roofPlanPageNumber === 2)) {
      tocEntries.push({ title: 'Dachplan Übersicht', page: currentPage });
      currentPage++;
    }
    
    // Page: Measurements overview
    tocEntries.push({ title: 'Messungen - Übersicht', page: currentPage });
    currentPage++;
    
    // Pages for individual areas
    const areaMeasurementsForToc = sortedMeasurements.filter(m => m.type === 'area' || m.type === 'solar');
    if (areaMeasurementsForToc.length > 0) {
      tocEntries.push({ title: `Einzelflächen (${areaMeasurementsForToc.length} Flächen)`, page: currentPage });
      currentPage += areaMeasurementsForToc.length;
    }
    
    // Gesamtübersicht
    if (areaMeasurementsForToc.length > 0) {
      tocEntries.push({ title: 'Gesamtübersicht', page: currentPage });
      currentPage++;
    }
    
    // Berechnungsmethoden
    tocEntries.push({ title: 'Anhang: Berechnungsmethoden', page: currentPage });
    currentPage++;
    
    // Solarplanung
    const solarMeasurementsForToc = sortedMeasurements.filter(m => m.type === 'solar' && m.pvModuleInfo);
    if (solarMeasurementsForToc.length > 0) {
      tocEntries.push({ title: `Solarplanung (${solarMeasurementsForToc.length} Flächen)`, page: currentPage });
    }
    
    tocEntries.forEach(entry => {
      const tocRow = document.createElement('div');
      tocRow.style.display = 'flex';
      tocRow.style.justifyContent = 'space-between';
      tocRow.style.alignItems = 'center';
      tocRow.style.padding = '6px 10px';
      tocRow.style.backgroundColor = '#f9fafb';
      tocRow.style.borderRadius = '4px';
      tocRow.style.fontSize = '12px';
      
      const tocText = document.createElement('span');
      tocText.textContent = entry.title;
      tocText.style.color = '#374151';
      tocRow.appendChild(tocText);
      
      const tocPage = document.createElement('span');
      tocPage.textContent = `Seite ${entry.page}`;
      tocPage.style.color = '#6b7280';
      tocPage.style.fontWeight = '500';
      tocRow.appendChild(tocPage);
      
      tocList.appendChild(tocRow);
    });
    
    tocSection.appendChild(tocList);
    coverPage.appendChild(tocSection);
    
    // Footer removed from cover page - now integrated into page numbering
    
    container.appendChild(coverPage);
    
    // ============ PAGE 2: ÜBERSICHT (Luftbild + Zusammenfassung) ============
    const overviewPage = document.createElement('div');
    overviewPage.className = 'page-break';
    overviewPage.style.pageBreakBefore = 'always';
    overviewPage.style.pageBreakAfter = 'always';
    overviewPage.style.padding = '20px';
    overviewPage.style.height = '267mm'; // A4 Höhe minus Ränder für optimale Nutzung
    overviewPage.style.display = 'flex';
    overviewPage.style.flexDirection = 'column';
    
    const overviewTitle = document.createElement('h2');
    overviewTitle.textContent = 'Übersicht & Zusammenfassung';
    overviewTitle.style.marginTop = '0';
    overviewTitle.style.marginBottom = '15px';
    overviewTitle.style.flexShrink = '0';
    overviewPage.appendChild(overviewTitle);
    
    // Luftbild (Top Down Screenshot) - Maximale Größe für volle Seitennutzung
    if ((measurements as any).topDownScreenshot) {
      const imageContainer = document.createElement('div');
      imageContainer.style.textAlign = 'center';
      imageContainer.style.marginBottom = '20px';
      imageContainer.style.flex = '1';
      imageContainer.style.display = 'flex';
      imageContainer.style.flexDirection = 'column';
      imageContainer.style.justifyContent = 'center';
      
      const modelImage = document.createElement('img');
      modelImage.src = (measurements as any).topDownScreenshot;
      modelImage.alt = 'Dachdraufsicht';
      modelImage.style.maxWidth = '100%';
      modelImage.style.maxHeight = '450px'; // Größere Höhe für bessere Seitennutzung
      modelImage.style.width = 'auto';
      modelImage.style.height = 'auto';
      modelImage.style.objectFit = 'contain';
      modelImage.style.border = '1px solid #e5e7eb';
      modelImage.style.borderRadius = '8px';
      modelImage.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
      
      imageContainer.appendChild(modelImage);
      
      const imageCaption = document.createElement('div');
      imageCaption.style.fontSize = '10px';
      imageCaption.style.color = '#6b7280';
      imageCaption.style.marginTop = '10px';
      imageCaption.textContent = 'Luftbild / Draufsicht des Objekts';
      imageContainer.appendChild(imageCaption);
      
      overviewPage.appendChild(imageContainer);
    }
    
    // Zusammenfassung
    const summarySection = document.createElement('div');
    summarySection.style.padding = '20px';
    summarySection.style.backgroundColor = '#f8fafc';
    summarySection.style.borderRadius = '8px';
    summarySection.style.border = '1px solid #e2e8f0';
    
    const summaryTitle = document.createElement('h3');
    summaryTitle.textContent = 'Zusammenfassung';
    summaryTitle.style.margin = '0 0 20px 0';
    summaryTitle.style.color = '#1e40af';
    summaryTitle.style.fontSize = '16px';
    summarySection.appendChild(summaryTitle);
    
    // Summary boxes
    const totalAreaBox = document.createElement('div');
    totalAreaBox.style.display = 'flex';
    totalAreaBox.style.gap = '20px';
    totalAreaBox.style.flexWrap = 'wrap';
    
    // Dachfläche gesamt
    const areaBox = document.createElement('div');
    areaBox.style.flex = '1';
    areaBox.style.minWidth = '150px';
    areaBox.style.backgroundColor = '#eff6ff';
    areaBox.style.border = '2px solid #3b82f6';
    areaBox.style.borderRadius = '8px';
    areaBox.style.padding = '20px';
    areaBox.style.textAlign = 'center';
    
    const areaLabel = document.createElement('div');
    areaLabel.style.fontSize = '12px';
    areaLabel.style.color = '#6b7280';
    areaLabel.style.marginBottom = '8px';
    areaLabel.textContent = 'Dachfläche gesamt';
    areaBox.appendChild(areaLabel);
    
    const areaValue = document.createElement('div');
    areaValue.style.fontSize = '28px';
    areaValue.style.fontWeight = 'bold';
    areaValue.style.color = '#1e40af';
    const totalArea = summaryData.totalArea || calculateTotalArea(sortedMeasurements);
    areaValue.textContent = `${totalArea.toFixed(2)} m²`;
    areaBox.appendChild(areaValue);
    
    totalAreaBox.appendChild(areaBox);
    
    // Anzahl Flächen
    const countBox = document.createElement('div');
    countBox.style.flex = '1';
    countBox.style.minWidth = '150px';
    countBox.style.backgroundColor = '#f0fdf4';
    countBox.style.border = '2px solid #22c55e';
    countBox.style.borderRadius = '8px';
    countBox.style.padding = '20px';
    countBox.style.textAlign = 'center';
    
    const countLabel = document.createElement('div');
    countLabel.style.fontSize = '12px';
    countLabel.style.color = '#6b7280';
    countLabel.style.marginBottom = '8px';
    countLabel.textContent = 'Anzahl Teilflächen';
    countBox.appendChild(countLabel);
    
    const areaMeasurementsForCount = sortedMeasurements.filter(m => m.type === 'area' || m.type === 'solar');
    const countValue = document.createElement('div');
    countValue.style.fontSize = '28px';
    countValue.style.fontWeight = 'bold';
    countValue.style.color = '#166534';
    countValue.textContent = `${areaMeasurementsForCount.length}`;
    countBox.appendChild(countValue);
    
    totalAreaBox.appendChild(countBox);
    
    // Messungen gesamt
    const measurementsBox = document.createElement('div');
    measurementsBox.style.flex = '1';
    measurementsBox.style.minWidth = '150px';
    measurementsBox.style.backgroundColor = '#fef3c7';
    measurementsBox.style.border = '2px solid #f59e0b';
    measurementsBox.style.borderRadius = '8px';
    measurementsBox.style.padding = '20px';
    measurementsBox.style.textAlign = 'center';
    
    const measurementsLabel = document.createElement('div');
    measurementsLabel.style.fontSize = '12px';
    measurementsLabel.style.color = '#6b7280';
    measurementsLabel.style.marginBottom = '8px';
    measurementsLabel.textContent = 'Messungen gesamt';
    measurementsBox.appendChild(measurementsLabel);
    
    const measurementsValue = document.createElement('div');
    measurementsValue.style.fontSize = '28px';
    measurementsValue.style.fontWeight = 'bold';
    measurementsValue.style.color = '#b45309';
    measurementsValue.textContent = `${sortedMeasurements.length}`;
    measurementsBox.appendChild(measurementsValue);
    
    totalAreaBox.appendChild(measurementsBox);
    summarySection.appendChild(totalAreaBox);
    
    overviewPage.appendChild(summarySection);
    container.appendChild(overviewPage);
    
    // PAGE 2: Roof plan (if available)
    if ((measurements as any).roofPlan && ((measurements as any).placeRoofPlanOnPage2 || (measurements as any).roofPlanPageNumber === 2)) {
      const roofPlanPage = document.createElement('div');
      roofPlanPage.className = 'page-break';
      roofPlanPage.style.pageBreakBefore = 'always';
      roofPlanPage.style.pageBreakAfter = 'always';
      roofPlanPage.style.padding = '20px';
      roofPlanPage.style.height = '270mm';
      roofPlanPage.style.position = 'relative';
      
      if (!(measurements as any).showRoofPlanWithoutHeader) {
        const roofPlanTitle = document.createElement('h2');
        roofPlanTitle.textContent = 'Dachplan Übersicht';
        roofPlanTitle.style.marginTop = '0';
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
      roofPlanImage.style.maxWidth = '100%';
      roofPlanImage.style.maxHeight = '100%';
      roofPlanImage.style.objectFit = 'contain';
      
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
    
    // PAGE 3: Measurements overview table
    const measurementSection = document.createElement('div');
    measurementSection.className = 'page-break measurement-section';
    measurementSection.style.pageBreakBefore = 'always';
    measurementSection.style.pageBreakAfter = 'always';
    measurementSection.style.padding = '20px';
    
    const measurementTitle = document.createElement('h2');
    measurementTitle.textContent = 'Messungen - Übersicht';
    measurementTitle.style.marginTop = '0';
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
    
    // PAGE 4+: Individual areas (each on its own page)
    const areaMeasurements = sortedMeasurements.filter(m => m.type === 'area' || m.type === 'solar');
    const lengthMeasurements = sortedMeasurements.filter(m => m.type === 'length');
    const heightMeasurements = sortedMeasurements.filter(m => m.type === 'height');
    const otherMeasurements = sortedMeasurements.filter(m => !['area', 'solar', 'length', 'height'].includes(m.type));
    
    if (areaMeasurements.length > 0) {
      // Each area gets its own page for better visibility
      areaMeasurements.forEach((measurement, index) => {
        const areaPage = document.createElement('div');
        areaPage.className = 'page-break';
        areaPage.style.pageBreakBefore = 'always';
        areaPage.style.pageBreakAfter = 'always';
        areaPage.style.pageBreakInside = 'avoid';
        
        // Page header with area title
        const areaHeader = document.createElement('div');
        areaHeader.style.borderBottom = '2px solid #3b82f6';
        areaHeader.style.paddingBottom = '10px';
        areaHeader.style.marginBottom = '20px';
        
        const areaTitle = document.createElement('h2');
        areaTitle.style.margin = '0';
        areaTitle.style.color = '#1e40af';
        areaTitle.textContent = `Fläche ${index + 1}${measurement.description ? `: ${measurement.description}` : ''}`;
        areaHeader.appendChild(areaTitle);
        
        areaPage.appendChild(areaHeader);
        
        // Two-column layout: Image left, details right
        const contentRow = document.createElement('div');
        contentRow.style.display = 'flex';
        contentRow.style.gap = '20px';
        contentRow.style.marginBottom = '20px';
        
        // Left column: Large area visualization
        const imageColumn = document.createElement('div');
        imageColumn.style.flex = '1';
        imageColumn.style.minWidth = '0';
        
        if (measurement.screenshot || measurement.polygon2D) {
          const visual = document.createElement('img');
          visual.src = measurement.screenshot || measurement.polygon2D || '';
          visual.style.width = '100%';
          visual.style.height = 'auto';
          visual.style.maxHeight = '350px';
          visual.style.objectFit = 'contain';
          visual.style.border = '1px solid #e5e7eb';
          visual.style.borderRadius = '8px';
          visual.style.backgroundColor = '#f9fafb';
          imageColumn.appendChild(visual);
        }
        
        contentRow.appendChild(imageColumn);
        
        // Right column: Key metrics
        const detailsColumn = document.createElement('div');
        detailsColumn.style.width = '200px';
        detailsColumn.style.flexShrink = '0';
        
        // Area value box
        const areaBox = document.createElement('div');
        areaBox.style.backgroundColor = '#eff6ff';
        areaBox.style.border = '1px solid #3b82f6';
        areaBox.style.borderRadius = '8px';
        areaBox.style.padding = '15px';
        areaBox.style.marginBottom = '15px';
        areaBox.style.textAlign = 'center';
        
        const areaLabel = document.createElement('div');
        areaLabel.style.fontSize = '12px';
        areaLabel.style.color = '#6b7280';
        areaLabel.style.marginBottom = '5px';
        areaLabel.textContent = 'Fläche';
        areaBox.appendChild(areaLabel);
        
        const areaValue = document.createElement('div');
        areaValue.style.fontSize = '24px';
        areaValue.style.fontWeight = 'bold';
        areaValue.style.color = '#1e40af';
        areaValue.textContent = `${measurement.value.toFixed(2)} m²`;
        areaBox.appendChild(areaValue);
        
        detailsColumn.appendChild(areaBox);
        
        // Inclination box if available
        if (measurement.inclination !== undefined) {
          const inclBox = document.createElement('div');
          inclBox.style.backgroundColor = '#f0fdf4';
          inclBox.style.border = '1px solid #22c55e';
          inclBox.style.borderRadius = '8px';
          inclBox.style.padding = '15px';
          inclBox.style.marginBottom = '15px';
          inclBox.style.textAlign = 'center';
          
          const inclLabel = document.createElement('div');
          inclLabel.style.fontSize = '12px';
          inclLabel.style.color = '#6b7280';
          inclLabel.style.marginBottom = '5px';
          inclLabel.textContent = 'Neigung';
          inclBox.appendChild(inclLabel);
          
          const inclValue = document.createElement('div');
          inclValue.style.fontSize = '24px';
          inclValue.style.fontWeight = 'bold';
          inclValue.style.color = '#166534';
          inclValue.textContent = `${Math.abs(measurement.inclination).toFixed(1)}°`;
          inclBox.appendChild(inclValue);
          
          detailsColumn.appendChild(inclBox);
        }
        
        // Point count if available
        if (measurement.points && measurement.points.length > 0) {
          const pointsBox = document.createElement('div');
          pointsBox.style.backgroundColor = '#fef3c7';
          pointsBox.style.border = '1px solid #f59e0b';
          pointsBox.style.borderRadius = '8px';
          pointsBox.style.padding = '15px';
          pointsBox.style.textAlign = 'center';
          
          const pointsLabel = document.createElement('div');
          pointsLabel.style.fontSize = '12px';
          pointsLabel.style.color = '#6b7280';
          pointsLabel.style.marginBottom = '5px';
          pointsLabel.textContent = 'Eckpunkte';
          pointsBox.appendChild(pointsLabel);
          
          const pointsValue = document.createElement('div');
          pointsValue.style.fontSize = '24px';
          pointsValue.style.fontWeight = 'bold';
          pointsValue.style.color = '#b45309';
          pointsValue.textContent = `${measurement.points.length}`;
          pointsBox.appendChild(pointsValue);
          
          detailsColumn.appendChild(pointsBox);
        }
        
        contentRow.appendChild(detailsColumn);
        areaPage.appendChild(contentRow);
        
        // Segments table below the image
        if (measurement.segments && measurement.segments.length > 0) {
          const segmentsSection = document.createElement('div');
          segmentsSection.style.marginTop = '10px';
          
          const segmentsTitle = document.createElement('h4');
          segmentsTitle.style.margin = '0 0 10px 0';
          segmentsTitle.style.color = '#374151';
          segmentsTitle.textContent = 'Kantenlängen';
          segmentsSection.appendChild(segmentsTitle);
          
          const segmentsTable = createAreaSegmentsTable(measurement, index);
          segmentsTable.style.marginTop = '0';
          segmentsSection.appendChild(segmentsTable);
          
          areaPage.appendChild(segmentsSection);
        }
        
        // Custom screenshots on the same page if space allows
        if (measurement.customScreenshots && measurement.customScreenshots.length > 0) {
          const screenshotsContainer = document.createElement('div');
          screenshotsContainer.style.marginTop = '20px';
          
          const screenshotsTitle = document.createElement('h4');
          screenshotsTitle.style.margin = '0 0 10px 0';
          screenshotsTitle.style.color = '#374151';
          screenshotsTitle.textContent = 'Zusätzliche Ansichten';
          screenshotsContainer.appendChild(screenshotsTitle);
          
          const screenshotsGrid = document.createElement('div');
          screenshotsGrid.style.display = 'flex';
          screenshotsGrid.style.flexWrap = 'wrap';
          screenshotsGrid.style.gap = '10px';
          
          measurement.customScreenshots.forEach(screenshot => {
            const screenshotImg = document.createElement('img');
            screenshotImg.src = screenshot;
            screenshotImg.style.width = 'calc(50% - 5px)';
            screenshotImg.style.height = 'auto';
            screenshotImg.style.maxHeight = '150px';
            screenshotImg.style.objectFit = 'contain';
            screenshotImg.style.border = '1px solid #e5e7eb';
            screenshotImg.style.borderRadius = '4px';
            screenshotsGrid.appendChild(screenshotImg);
          });
          
          screenshotsContainer.appendChild(screenshotsGrid);
          areaPage.appendChild(screenshotsContainer);
        }
        
        container.appendChild(areaPage);
      });
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
      const areaSummary = createTotalAreaSummary(sortedMeasurements.filter(m => m.type === 'area' || m.type === 'solar' || m.type === 'deductionarea'));
      container.appendChild(areaSummary);
      
      const hasSegments = areaMeasurements.some(
        m => m.segments && m.segments.length > 0
      );
      
      if (hasSegments) {
        const segmentSummary = createSegmentSummary(areaMeasurements);
        container.appendChild(segmentSummary);
      }
    }
    
    // Add calculation methods appendix
    const calculationMethodsSection = createCalculationMethodsSection();
    container.appendChild(calculationMethodsSection);

    // ============ SOLARPLANUNG PAGE(S) ============
    const solarMeasurements = sortedMeasurements.filter(m => m.type === 'solar' && m.pvModuleInfo);
    
    if (solarMeasurements.length > 0) {
      // Try to fetch AI string planning
      let stringPlanTexts: Record<string, string> = {};
      
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        if (supabaseUrl && supabaseKey) {
          for (const solarM of solarMeasurements) {
            const pvInfo = solarM.pvModuleInfo!;
            const activeModules = (pvInfo.moduleCount || 0) - (pvInfo.removedModuleIndices?.length || 0);
            
            const moduleLayout = {
              totalModules: activeModules,
              roofArea: {
                azimuth: pvInfo.roofAzimuth || 0,
                direction: pvInfo.roofDirection || 'unbekannt',
                inclination: pvInfo.roofInclination || 0,
                areaM2: solarM.value,
              },
              moduleSpec: {
                name: pvInfo.pvModuleSpec?.name || 'Standard-Modul',
                width: pvInfo.moduleWidth,
                height: pvInfo.moduleHeight,
                power: pvInfo.pvModuleSpec?.power || 400,
                U_oc: 41.5,  // Typical values for ~400W module
                U_mpp: 34.5,
                I_sc: 12.5,
                I_mpp: 11.6,
              },
              inverterSpec: {
                maxDcVoltage: 600,
                mppVoltageMin: 150,
                mppVoltageMax: 500,
                maxInputCurrent: 25,
                mppTrackers: 2,
              },
              totalPower_kWp: pvInfo.pvMaterials?.totalPower || 0,
            };
            
            try {
              const resp = await fetch(`${supabaseUrl}/functions/v1/solar-string-planning`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({ moduleLayout }),
              });
              
              if (resp.ok) {
                const data = await resp.json();
                if (data.stringPlan) {
                  stringPlanTexts[solarM.id] = data.stringPlan;
                }
              }
            } catch (aiError) {
              console.warn('AI string planning failed for measurement:', solarM.id, aiError);
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch string planning:', e);
      }
      
      for (const solarM of solarMeasurements) {
        const pvInfo = solarM.pvModuleInfo!;
        const solarPage = document.createElement('div');
        solarPage.className = 'page-break';
        solarPage.style.pageBreakBefore = 'always';
        solarPage.style.pageBreakAfter = 'always';
        solarPage.style.padding = '20px';
        
        // Header
        const solarHeader = document.createElement('div');
        solarHeader.style.borderBottom = '2px solid #f59e0b';
        solarHeader.style.paddingBottom = '10px';
        solarHeader.style.marginBottom = '15px';
        
        const solarTitle = document.createElement('h2');
        solarTitle.style.margin = '0';
        solarTitle.style.color = '#b45309';
        solarTitle.textContent = `Solarplanung${solarM.description ? `: ${solarM.description}` : ''}`;
        solarHeader.appendChild(solarTitle);
        solarPage.appendChild(solarHeader);
        
        // Two-column: Layout image left, specs right
        const solarContent = document.createElement('div');
        solarContent.style.display = 'flex';
        solarContent.style.gap = '20px';
        solarContent.style.marginBottom = '15px';
        
        // Left: Module layout rendering
        const layoutCol = document.createElement('div');
        layoutCol.style.flex = '1';
        layoutCol.style.minWidth = '0';
        
        const layoutImage = renderSolarLayout2D(solarM, 500, 400);
        if (layoutImage) {
          const img = document.createElement('img');
          img.src = layoutImage;
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.maxHeight = '350px';
          img.style.objectFit = 'contain';
          img.style.border = '1px solid #e5e7eb';
          img.style.borderRadius = '8px';
          layoutCol.appendChild(img);
        }
        solarContent.appendChild(layoutCol);
        
        // Right: PV specifications
        const specsCol = document.createElement('div');
        specsCol.style.width = '220px';
        specsCol.style.flexShrink = '0';
        
        const activeModules = (pvInfo.moduleCount || 0) - (pvInfo.removedModuleIndices?.length || 0);
        const totalPower = pvInfo.pvMaterials?.totalPower || 0;
        
        // Module count box
        const moduleBox = document.createElement('div');
        moduleBox.style.backgroundColor = '#fef3c7';
        moduleBox.style.border = '1px solid #f59e0b';
        moduleBox.style.borderRadius = '8px';
        moduleBox.style.padding = '12px';
        moduleBox.style.marginBottom = '10px';
        moduleBox.style.textAlign = 'center';
        
        const moduleLabel = document.createElement('div');
        moduleLabel.style.fontSize = '11px';
        moduleLabel.style.color = '#6b7280';
        moduleLabel.textContent = 'PV-Module';
        moduleBox.appendChild(moduleLabel);
        
        const moduleVal = document.createElement('div');
        moduleVal.style.fontSize = '22px';
        moduleVal.style.fontWeight = 'bold';
        moduleVal.style.color = '#b45309';
        moduleVal.textContent = `${activeModules}`;
        moduleBox.appendChild(moduleVal);
        specsCol.appendChild(moduleBox);
        
        // Power box
        const powerBox = document.createElement('div');
        powerBox.style.backgroundColor = '#ecfdf5';
        powerBox.style.border = '1px solid #10b981';
        powerBox.style.borderRadius = '8px';
        powerBox.style.padding = '12px';
        powerBox.style.marginBottom = '10px';
        powerBox.style.textAlign = 'center';
        
        const powerLabel = document.createElement('div');
        powerLabel.style.fontSize = '11px';
        powerLabel.style.color = '#6b7280';
        powerLabel.textContent = 'Gesamtleistung';
        powerBox.appendChild(powerLabel);
        
        const powerVal = document.createElement('div');
        powerVal.style.fontSize = '22px';
        powerVal.style.fontWeight = 'bold';
        powerVal.style.color = '#059669';
        powerVal.textContent = `${totalPower.toFixed(2)} kWp`;
        powerBox.appendChild(powerVal);
        specsCol.appendChild(powerBox);
        
        // Specs table
        const specsTable = document.createElement('table');
        specsTable.style.width = '100%';
        specsTable.style.fontSize = '11px';
        specsTable.style.borderCollapse = 'collapse';
        
        const specRows = [
          ['Modultyp', pvInfo.pvModuleSpec?.name || 'Standard'],
          ['Modulmaße', `${(pvInfo.moduleWidth * 100).toFixed(0)} × ${(pvInfo.moduleHeight * 100).toFixed(0)} cm`],
          ['Leistung/Modul', `${pvInfo.pvModuleSpec?.power || '?'} Wp`],
          ['Ausrichtung', pvInfo.roofDirection || '?'],
          ['Azimut', `${pvInfo.roofAzimuth?.toFixed(0) || '?'}°`],
          ['Dachneigung', `${pvInfo.roofInclination?.toFixed(1) || '?'}°`],
          ['Dachfläche', `${solarM.value.toFixed(2)} m²`],
        ];
        
        if (pvInfo.yieldFactor) {
          specRows.push(['Ertragsfaktor', `${pvInfo.yieldFactor.toFixed(0)} kWh/kWp`]);
          specRows.push(['Jahresertrag', `${(totalPower * pvInfo.yieldFactor).toFixed(0)} kWh`]);
        }
        
        specRows.forEach(([label, value]) => {
          const tr = document.createElement('tr');
          const tdLabel = document.createElement('td');
          tdLabel.style.padding = '3px 5px';
          tdLabel.style.borderBottom = '1px solid #eee';
          tdLabel.style.color = '#555';
          tdLabel.style.fontWeight = 'bold';
          tdLabel.textContent = label;
          tr.appendChild(tdLabel);
          
          const tdVal = document.createElement('td');
          tdVal.style.padding = '3px 5px';
          tdVal.style.borderBottom = '1px solid #eee';
          tdVal.textContent = value;
          tr.appendChild(tdVal);
          
          specsTable.appendChild(tr);
        });
        
        specsCol.appendChild(specsTable);
        solarContent.appendChild(specsCol);
        solarPage.appendChild(solarContent);
        
        // Materials list
        if (pvInfo.pvMaterials) {
          const materialsSection = document.createElement('div');
          materialsSection.style.marginTop = '10px';
          materialsSection.style.padding = '12px';
          materialsSection.style.backgroundColor = '#f9fafb';
          materialsSection.style.borderRadius = '8px';
          materialsSection.style.border = '1px solid #e5e7eb';
          
          const matTitle = document.createElement('h4');
          matTitle.style.margin = '0 0 8px 0';
          matTitle.style.fontSize = '12px';
          matTitle.style.color = '#374151';
          matTitle.textContent = 'Materialliste';
          materialsSection.appendChild(matTitle);
          
          const matTable = document.createElement('table');
          matTable.style.width = '100%';
          matTable.style.fontSize = '10px';
          matTable.style.borderCollapse = 'collapse';
          
          const mats = pvInfo.pvMaterials;
          const matRows = [
            ['Montageschienen', `${mats.mountingSystem.railLength.toFixed(1)} m`],
            ['Dachhaken', `${mats.mountingSystem.roofHookCount} Stk.`],
            ['Mittelklemmen', `${mats.mountingSystem.middleClampCount} Stk.`],
            ['Endklemmen', `${mats.mountingSystem.endClampCount} Stk.`],
            ['Schienenverbinder', `${mats.mountingSystem.railConnectorCount} Stk.`],
            ['Stringkabel', `${mats.electricalSystem.stringCableLength.toFixed(1)} m`],
            ['DC-Hauptkabel', `${mats.electricalSystem.mainCableLength.toFixed(1)} m`],
            ['Wechselrichter', `${mats.electricalSystem.inverterCount}× ${mats.electricalSystem.inverterPower.toFixed(1)} kW`],
            ['Strings', `${mats.electricalSystem.stringCount} (je ${mats.electricalSystem.modulesPerString} Module)`],
          ];
          
          matRows.forEach(([label, value]) => {
            const tr = document.createElement('tr');
            const tdL = document.createElement('td');
            tdL.style.padding = '2px 5px';
            tdL.style.borderBottom = '1px solid #eee';
            tdL.style.fontWeight = 'bold';
            tdL.style.color = '#555';
            tdL.textContent = label;
            tr.appendChild(tdL);
            const tdV = document.createElement('td');
            tdV.style.padding = '2px 5px';
            tdV.style.borderBottom = '1px solid #eee';
            tdV.textContent = value;
            tr.appendChild(tdV);
            matTable.appendChild(tr);
          });
          
          materialsSection.appendChild(matTable);
          solarPage.appendChild(materialsSection);
        }
        
        container.appendChild(solarPage);
        
        // AI String planning page (if available)
        if (stringPlanTexts[solarM.id]) {
          const stringPage = document.createElement('div');
          stringPage.className = 'page-break';
          stringPage.style.pageBreakBefore = 'always';
          stringPage.style.pageBreakAfter = 'always';
          stringPage.style.padding = '20px';
          
          const stringHeader = document.createElement('div');
          stringHeader.style.borderBottom = '2px solid #7c3aed';
          stringHeader.style.paddingBottom = '10px';
          stringHeader.style.marginBottom = '15px';
          
          const stringTitle = document.createElement('h2');
          stringTitle.style.margin = '0';
          stringTitle.style.color = '#6d28d9';
          stringTitle.textContent = `Stringplanung${solarM.description ? `: ${solarM.description}` : ''}`;
          stringHeader.appendChild(stringTitle);
          stringPage.appendChild(stringHeader);
          
          const stringContent = document.createElement('div');
          stringContent.style.fontSize = '11px';
          stringContent.style.lineHeight = '1.6';
          stringContent.style.whiteSpace = 'pre-wrap';
          stringContent.style.fontFamily = 'Arial, sans-serif';
          stringContent.textContent = stringPlanTexts[solarM.id];
          stringPage.appendChild(stringContent);
          
          const disclaimer = document.createElement('div');
          disclaimer.style.marginTop = '20px';
          disclaimer.style.padding = '10px';
          disclaimer.style.backgroundColor = '#fef3c7';
          disclaimer.style.borderRadius = '4px';
          disclaimer.style.fontSize = '9px';
          disclaimer.style.color = '#92400e';
          disclaimer.textContent = 'Hinweis: Diese Stringplanung wurde KI-gestützt erstellt und dient als Planungshilfe. Die endgültige Auslegung muss von einem qualifizierten Elektriker geprüft und freigegeben werden.';
          stringPage.appendChild(disclaimer);
          
          container.appendChild(stringPage);
        }
      }
    }
    
    const filename = `${coverData.title || 'Vermessungsbericht'}.pdf`;
    
    // Use html2canvas + jspdf directly (replacing vulnerable html2pdf.js)
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    
    // html2canvas requires the element to be in the DOM
    // Temporarily append container to body with hidden visibility
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // A4 width in pixels at 96 DPI
    document.body.appendChild(container);
    
    try {
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      const pageContentHeight = pdfHeight - (margin * 2);
      
      // Find all page-break elements to create separate pages
      const pageBreakElements = container.querySelectorAll('.page-break');
      const sections: HTMLElement[] = [];
      
      // If there are page break elements, split content by them
      if (pageBreakElements.length > 0) {
        // Get all direct children and group them by page breaks
        const allChildren = Array.from(container.children) as HTMLElement[];
        let currentSection: HTMLElement[] = [];
        
        allChildren.forEach((child) => {
          if (child.classList.contains('page-break') && currentSection.length > 0) {
            // Create a section from accumulated children
            const sectionDiv = document.createElement('div');
            sectionDiv.style.background = '#ffffff';
            sectionDiv.style.padding = '20px';
            currentSection.forEach(c => sectionDiv.appendChild(c.cloneNode(true)));
            sections.push(sectionDiv);
            currentSection = [child];
          } else {
            currentSection.push(child);
          }
        });
        
        // Add the last section
        if (currentSection.length > 0) {
          const sectionDiv = document.createElement('div');
          sectionDiv.style.background = '#ffffff';
          sectionDiv.style.padding = '20px';
          currentSection.forEach(c => sectionDiv.appendChild(c.cloneNode(true)));
          sections.push(sectionDiv);
        }
      }
      
      // If no page breaks found or sections are empty, render the entire container
      if (sections.length === 0) {
        sections.push(container);
      }
      
      // Render each section to its own page
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        // Add section to DOM temporarily if it's not the container
        if (section !== container) {
          section.style.position = 'absolute';
          section.style.left = '-9999px';
          section.style.top = '0';
          section.style.width = '794px';
          document.body.appendChild(section);
        }
        
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        // Remove temporary section from DOM
        if (section !== container && section.parentNode) {
          document.body.removeChild(section);
        }
        
        if (i > 0) {
          pdf.addPage();
        }
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = contentWidth / imgWidth;
        const scaledHeight = imgHeight * ratio;
        
        // If section is taller than one page, split it intelligently
        if (scaledHeight > pageContentHeight) {
          const pagesNeeded = Math.ceil(scaledHeight / pageContentHeight);
          
          for (let page = 0; page < pagesNeeded; page++) {
            if (page > 0) {
              pdf.addPage();
            }
            
            const sourceY = (page * pageContentHeight) / ratio;
            const sourceHeight = Math.min(pageContentHeight / ratio, imgHeight - sourceY);
            
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = imgWidth;
            pageCanvas.height = sourceHeight;
            const ctx = pageCanvas.getContext('2d');
            
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, imgWidth, sourceHeight);
              ctx.drawImage(
                canvas,
                0, sourceY, imgWidth, sourceHeight,
                0, 0, imgWidth, sourceHeight
              );
              
              const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
              const destHeight = sourceHeight * ratio;
              pdf.addImage(pageImgData, 'JPEG', margin, margin, contentWidth, destHeight);
            }
          }
        } else {
          // Section fits on one page
          const imgData = canvas.toDataURL('image/jpeg', 0.98);
          pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, scaledHeight);
        }
      }
      
      // Add page numbers with branding to all pages
      const totalPages = pdf.getNumberOfPages();
      const footerY = pdfHeight - 5;
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        pdf.setPage(pageNum);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        
        // Left: DrohnenGLB branding with link
        const leftText = 'DrohnenGLB | drohnenglb.de';
        pdf.textWithLink(leftText, margin, footerY, { url: 'https://drohnenglb.de' });
        
        // Center: Page number
        pdf.setFontSize(9);
        const centerText = `Seite ${pageNum} von ${totalPages}`;
        const centerTextWidth = pdf.getTextWidth(centerText);
        pdf.text(centerText, (pdfWidth - centerTextWidth) / 2, footerY);
        
        // Right: Service link
        pdf.setFontSize(8);
        const rightText = 'Drohnenaufmaß ab 90€ im Monat';
        const rightTextWidth = pdf.getTextWidth(rightText);
        pdf.textWithLink(rightText, pdfWidth - margin - rightTextWidth, footerY, { url: 'https://drohnenvermessung-roofergaming.de' });
      }
      
      // Remove container from DOM after rendering
      document.body.removeChild(container);
      
      if (outputMode === 'blob') {
        const blob = pdf.output('blob');
        return blob;
      } else {
        pdf.save(filename);
        return true;
      }
    } catch (renderError) {
      // Ensure container is removed from DOM even on error
      if (container.parentNode) {
        document.body.removeChild(container);
      }
      throw renderError;
    }
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};
