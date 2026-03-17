/**
 * pvPdfExtensions.ts
 * Erweiterungen für den PDF-Export: Stringplan-Seite, Materialliste-Seite,
 * und verbesserte PV-Layout-Visualisierung mit farbigen Strings
 *
 * Wird als Erweiterungsmodul in pdfExport.ts eingebunden
 */

import { PVModuleInfo, Measurement } from '@/types/measurements';
import { StringPlan, PVString, CompleteMaterialList, MaterialItem, RoofType } from '@/types/pvPlanning';

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

const px = (n: number): string => `${n}px`;
const col = (hex: string, alpha = 1): string => {
  // hex → rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const createStyledDiv = (style: Partial<CSSStyleDeclaration>): HTMLDivElement => {
  const div = document.createElement('div');
  Object.assign(div.style, style);
  return div;
};

const createH = (level: 2 | 3 | 4, text: string, color = '#111'): HTMLElement => {
  const h = document.createElement(`h${level}`);
  h.textContent = text;
  h.style.color = color;
  h.style.marginBottom = '12px';
  h.style.marginTop = '0';
  if (level === 2) {
    h.style.fontSize = '18px';
    h.style.fontWeight = '700';
    h.style.borderBottom = '2px solid #2563eb';
    h.style.paddingBottom = '6px';
  } else if (level === 3) {
    h.style.fontSize = '14px';
    h.style.fontWeight = '600';
  } else {
    h.style.fontSize = '12px';
    h.style.fontWeight = '600';
  }
  return h;
};

const createInfoGrid = (entries: [string, string][], cols = 3): HTMLElement => {
  const grid = createStyledDiv({
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: '8px',
    marginBottom: '16px',
  });
  entries.forEach(([label, value]) => {
    const cell = createStyledDiv({
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      padding: '8px 10px',
    });
    const lbl = document.createElement('div');
    lbl.textContent = label;
    lbl.style.cssText = 'font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;';
    const val = document.createElement('div');
    val.textContent = value;
    val.style.cssText = 'font-size:13px;font-weight:600;color:#0f172a;margin-top:2px;';
    cell.appendChild(lbl);
    cell.appendChild(val);
    grid.appendChild(cell);
  });
  return grid;
};

const createTable = (
  headers: string[],
  rows: (string | HTMLElement)[][],
  options: { compact?: boolean; firstColBold?: boolean } = {}
): HTMLElement => {
  const table = document.createElement('table');
  table.style.cssText = `width:100%;border-collapse:collapse;font-size:${options.compact ? '9' : '11'}px;`;

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.style.cssText = 'background:#2563eb;color:white;padding:5px 8px;text-align:left;font-weight:600;';
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row, ri) => {
    const tr = document.createElement('tr');
    tr.style.background = ri % 2 === 0 ? '#ffffff' : '#f8fafc';
    row.forEach((cell, ci) => {
      const td = document.createElement('td');
      td.style.cssText = `padding:4px 8px;border-bottom:1px solid #e2e8f0;${options.firstColBold && ci === 0 ? 'font-weight:600;' : ''}`;
      if (typeof cell === 'string') {
        td.textContent = cell;
      } else {
        td.appendChild(cell);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
};

// ============================================================================
// STRINGPLAN-SEITE
// ============================================================================

/**
 * Erstellt eine vollständige Stringplan-Seite für den PDF-Export
 */
export const createStringPlanPage = (
  stringPlan: StringPlan,
  pvInfoMap: Map<string, PVModuleInfo>,
  measurements: Measurement[]
): HTMLElement => {
  const container = createStyledDiv({
    pageBreakBefore: 'always',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  });

  // Titel
  container.appendChild(createH(2, 'Stringplanung PV-Anlage'));

  // Systemübersicht
  const allOk = stringPlan.dcVoltageOk && stringPlan.mppRangeOk && stringPlan.currentOk;
  const statusColor = allOk ? '#16a34a' : '#dc2626';
  const statusBox = createStyledDiv({
    background: allOk ? '#f0fdf4' : '#fef2f2',
    border: `1px solid ${allOk ? '#86efac' : '#fca5a5'}`,
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  });
  const statusIcon = document.createElement('span');
  statusIcon.textContent = allOk ? '✓' : '✗';
  statusIcon.style.cssText = `font-size:16px;font-weight:700;color:${statusColor};`;
  const statusText = document.createElement('span');
  statusText.textContent = allOk ? 'Alle Prüfungen bestanden – Stringplanung technisch korrekt' : 'Prüffehler – bitte Warnungen beachten';
  statusText.style.cssText = `font-size:12px;font-weight:600;color:${statusColor};`;
  statusBox.appendChild(statusIcon);
  statusBox.appendChild(statusText);
  container.appendChild(statusBox);

  // Systemdaten
  container.appendChild(createInfoGrid([
    ['Gesamtleistung', `${stringPlan.totalPower.toFixed(2)} kWp`],
    ['Anzahl Module', `${stringPlan.totalModules} Stk.`],
    ['Strings gesamt', `${stringPlan.allStrings.length}`],
    ['Wechselrichter', `${stringPlan.inverter.manufacturer} ${stringPlan.inverter.model}`],
    ['WR Anzahl', `${stringPlan.inverterCount}×`],
    ['MPPT-Tracker', `${stringPlan.inverter.mpptCount}`],
  ]));

  // WR-Technische Daten
  container.appendChild(createH(3, 'Wechselrichter-Parameter'));
  container.appendChild(createInfoGrid([
    ['Nennleistung AC', `${stringPlan.inverter.nominalPowerAC} kW`],
    ['Max. DC-Spannung', `${stringPlan.inverter.maxDCVoltage} V`],
    ['MPP-Bereich', `${stringPlan.inverter.mppVoltageMin}–${stringPlan.inverter.mppVoltageMax} V`],
    ['Max. Strom/MPPT', `${stringPlan.inverter.maxCurrentPerMPPT} A`],
    ['Phasen', `${stringPlan.inverter.phases}-phasig`],
    ['Wirkungsgrad', `${stringPlan.inverter.efficiency}%`],
  ]));

  // Stringbelegungstabelle
  container.appendChild(createH(3, 'Stringbelegung'));

  const stringRows: string[][] = stringPlan.allStrings.map(s => [
    s.id,
    `MPPT-T${s.mpptTracker}`,
    `${s.moduleCount}`,
    `${s.uocTotal.toFixed(0)} V`,
    `${s.umppTotal.toFixed(0)} V`,
    `${s.isc.toFixed(1)} A`,
    s.valid ? '✓ OK' : `✗ ${s.warning || 'Fehler'}`,
  ]);

  const stringTable = createTable(
    ['String', 'MPPT-Tracker', 'Module', 'Voc (−10°C)', 'Vmpp (STC)', 'Isc', 'Status'],
    stringRows.map((r, i) => {
      const stringObj = stringPlan.allStrings[i];
      return r.map((cell, ci) => {
        const td = document.createElement('span');
        if (ci === 0) {
          // Farbiger String-Badge
          const badge = createStyledDiv({
            display: 'inline-block',
            background: stringObj.color,
            color: 'white',
            borderRadius: '4px',
            padding: '2px 8px',
            fontWeight: '600',
            fontSize: '10px',
          });
          badge.textContent = cell;
          return badge;
        }
        if (ci === 6) {
          const ok = stringObj.valid;
          const span = document.createElement('span');
          span.textContent = cell;
          span.style.color = ok ? '#16a34a' : '#dc2626';
          span.style.fontWeight = '600';
          return span;
        }
        td.textContent = cell;
        return td;
      });
    })
  );
  container.appendChild(stringTable);

  // MPPT-Tracker-Übersicht
  if (stringPlan.mpptTrackers.length > 0) {
    const trackerSection = createStyledDiv({ marginTop: '20px' });
    trackerSection.appendChild(createH(3, 'MPPT-Tracker-Übersicht'));

    const trackerRows: (string | HTMLElement)[][] = stringPlan.mpptTrackers.map(t => [
      `Tracker ${t.trackerId}`,
      `${t.strings.length}`,
      `${t.totalModules}`,
      `${t.uocMax.toFixed(0)} V`,
      `${t.umppRange.min.toFixed(0)}–${t.umppRange.max.toFixed(0)} V`,
      `${t.totalPower.toFixed(2)} kWp`,
      `${t.currentBalance.toFixed(0)}%`,
    ]);

    trackerSection.appendChild(createTable(
      ['Tracker', 'Strings', 'Module', 'Voc max', 'Vmpp-Bereich', 'Leistung', 'Strombalance'],
      trackerRows
    ));
    container.appendChild(trackerSection);
  }

  // Kabelplanung
  const cableSection = createStyledDiv({ marginTop: '20px' });
  cableSection.appendChild(createH(3, 'Kabelplanung'));
  cableSection.appendChild(createInfoGrid([
    ['DC-Kabel gesamt', `${stringPlan.totalCableLength.toFixed(0)} m`],
    ['Ø je String', `${stringPlan.stringCableLengthPerString.toFixed(0)} m`],
    ['AC-Kabel (Schätzung)', `${stringPlan.acCableLength.toFixed(0)} m`],
    ['Kabelquerschnitt DC', '6 mm² H1Z2Z2-K'],
    ['DC-Trenner', stringPlan.dcDisconnectRequired ? 'Erforderlich' : 'Optional'],
    ['ÜSS DC', stringPlan.surgeProtectionRequired ? 'Empfohlen' : 'Optional'],
  ]));
  container.appendChild(cableSection);

  // Warnungen
  if (stringPlan.warnings.length > 0 || stringPlan.errors.length > 0) {
    const warnSection = createStyledDiv({ marginTop: '16px' });
    warnSection.appendChild(createH(3, 'Hinweise & Warnungen'));
    [...stringPlan.errors.map(e => ({ text: e, type: 'error' as const })),
     ...stringPlan.warnings.map(w => ({ text: w, type: 'warning' as const }))].forEach(item => {
      const box = createStyledDiv({
        background: item.type === 'error' ? '#fef2f2' : '#fff7ed',
        border: `1px solid ${item.type === 'error' ? '#fca5a5' : '#fed7aa'}`,
        borderRadius: '4px',
        padding: '6px 10px',
        marginBottom: '6px',
        fontSize: '10px',
      });
      box.textContent = `${item.type === 'error' ? '✗ ' : '⚠ '}${item.text}`;
      box.style.color = item.type === 'error' ? '#dc2626' : '#92400e';
      warnSection.appendChild(box);
    });
    container.appendChild(warnSection);
  }

  // Normhinweise
  const normBox = createStyledDiv({
    marginTop: '20px',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '9px',
    color: '#475569',
  });
  normBox.innerHTML = `
    <strong>Normative Grundlagen:</strong><br/>
    VDE 0100-712 (PV-Anlagen), IEC 62548 (Stringplanung), DIN EN 50548 (DC-Steckverbinder),
    IEC 61215 (Modulprüfung), VDE 0100-410 (Schutzmaßnahmen), DIN VDE 0298-4 (Kabelquerschnitte)<br/><br/>
    <strong>Temperaturkorrektur:</strong> Voc bei −10°C (Faktor: 1,14), Vmpp bei 70°C (Faktor: 0,84)<br/>
    <strong>Hinweis:</strong> Spannungsangaben sind Näherungswerte. Vor Ausführung mit Modulhersteller-Datenblatt verifizieren.
  `;
  container.appendChild(normBox);

  return container;
};

// ============================================================================
// MATERIALLISTE-SEITE
// ============================================================================

const ROOF_TYPE_LABELS: Record<RoofType, string> = {
  pitched: 'Steildach',
  flat: 'Flachdach',
  green: 'Gründach',
};

/**
 * Erstellt eine vollständige Materiallisten-Seite für den PDF-Export
 */
export const createMaterialListPage = (
  materialList: CompleteMaterialList,
  projectInfo?: { projectNumber?: string; address?: string }
): HTMLElement => {
  const container = createStyledDiv({
    pageBreakBefore: 'always',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  });

  // Titel
  const titleRow = createStyledDiv({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' });
  const titleDiv = document.createElement('div');
  titleDiv.appendChild(createH(2, 'Materialliste PV-Anlage'));
  const subtitleDiv = createStyledDiv({
    textAlign: 'right',
    fontSize: '10px',
    color: '#64748b',
  });
  subtitleDiv.innerHTML = `
    Dachtyp: <strong>${ROOF_TYPE_LABELS[materialList.roofType]}</strong><br/>
    Montagesystem: <strong>${materialList.mountingSystem}</strong><br/>
    ${projectInfo?.projectNumber ? `Projektnr.: ${projectInfo.projectNumber}` : ''}
    ${projectInfo?.address ? `<br/>Objekt: ${projectInfo.address}` : ''}
  `;
  titleRow.appendChild(titleDiv);
  titleRow.appendChild(subtitleDiv);
  container.appendChild(titleRow);

  // Positionsnummer-Zähler
  let posCounter = 1;

  // Sektionen
  materialList.sections.forEach(section => {
    if (section.items.length === 0) return;

    // Abschnittsüberschrift
    const sectionHeader = createStyledDiv({
      background: '#2563eb',
      color: 'white',
      padding: '6px 10px',
      borderRadius: '4px 4px 0 0',
      fontSize: '11px',
      fontWeight: '700',
      marginTop: '16px',
    });
    sectionHeader.textContent = section.title;
    container.appendChild(sectionHeader);

    // Tabelle
    const rows: (string | HTMLElement)[][] = section.items.map(item => {
      const posSpan = document.createElement('span');
      posSpan.textContent = String(posCounter++);
      posSpan.style.fontWeight = '600';

      const descDiv = document.createElement('div');
      const descText = document.createElement('div');
      descText.textContent = item.description;
      descText.style.fontWeight = '500';
      descDiv.appendChild(descText);

      if (item.manufacturer || item.articleNumber) {
        const mfg = document.createElement('div');
        mfg.textContent = [item.manufacturer, item.articleNumber].filter(Boolean).join(' · ');
        mfg.style.cssText = 'font-size:8px;color:#94a3b8;margin-top:1px;';
        descDiv.appendChild(mfg);
      }
      if (item.notes) {
        const note = document.createElement('div');
        note.textContent = `ℹ ${item.notes}`;
        note.style.cssText = 'font-size:8px;color:#64748b;margin-top:2px;font-style:italic;';
        descDiv.appendChild(note);
      }

      return [
        posSpan,
        descDiv,
        item.unit,
        `${item.quantity}`,
        item.pricePerUnit !== undefined ? `${item.pricePerUnit.toFixed(2)} €` : '–',
        item.totalPrice !== undefined ? `${item.totalPrice.toFixed(2)} €` : '–',
      ];
    });

    const table = createTable(
      ['Pos.', 'Bezeichnung / Artikel', 'Einheit', 'Menge', 'EP netto', 'GP netto'],
      rows,
      { compact: true, firstColBold: true }
    );
    table.style.borderTop = 'none';
    table.style.borderRadius = '0 0 4px 4px';
    container.appendChild(table);

    // Abschnitts-Summe
    const sectionTotal = section.items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    if (sectionTotal > 0) {
      const sumRow = createStyledDiv({
        background: '#f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 10px',
        fontSize: '10px',
        fontWeight: '600',
        borderTop: '1px solid #e2e8f0',
      });
      const sumLabel = document.createElement('span');
      sumLabel.textContent = `Summe ${section.title}:`;
      const sumValue = document.createElement('span');
      sumValue.textContent = `${sectionTotal.toFixed(2)} €`;
      sumRow.appendChild(sumLabel);
      sumRow.appendChild(sumValue);
      container.appendChild(sumRow);
    }
  });

  // Gesamtsumme
  const totalBox = createStyledDiv({
    marginTop: '20px',
    border: '2px solid #2563eb',
    borderRadius: '8px',
    overflow: 'hidden',
  });

  const totalRows = [
    ['Gesamtpreis netto:', `${materialList.totalNetPrice.toFixed(2)} €`],
    ['MwSt. 19%:', `${(materialList.totalGrossPrice - materialList.totalNetPrice).toFixed(2)} €`],
  ];

  totalRows.forEach(([label, value]) => {
    const row = createStyledDiv({
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 12px',
      fontSize: '11px',
      background: 'white',
    });
    const l = document.createElement('span');
    l.textContent = label;
    l.style.color = '#64748b';
    const v = document.createElement('span');
    v.textContent = value;
    row.appendChild(l);
    row.appendChild(v);
    totalBox.appendChild(row);
  });

  const grossRow = createStyledDiv({
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: '700',
    background: '#2563eb',
    color: 'white',
  });
  const gLabel = document.createElement('span');
  gLabel.textContent = 'Gesamtpreis brutto:';
  const gValue = document.createElement('span');
  gValue.textContent = `${materialList.totalGrossPrice.toFixed(2)} €`;
  grossRow.appendChild(gLabel);
  grossRow.appendChild(gValue);
  totalBox.appendChild(grossRow);
  container.appendChild(totalBox);

  // Disclaimer
  const disclaimer = createStyledDiv({
    marginTop: '12px',
    fontSize: '8px',
    color: '#94a3b8',
    fontStyle: 'italic',
  });
  disclaimer.textContent =
    'Alle Preisangaben sind unverbindliche Richtwerte (Nettomaterialpreise). Montage-, Transport- und Planungskosten sind nicht enthalten. ' +
    'Aktuelle Preise bitte beim jeweiligen Lieferanten erfragen. Für Gründach-Komponenten gelten ggf. besondere Anforderungen (DIN 4062, DIN 18195).';
  container.appendChild(disclaimer);

  return container;
};

// ============================================================================
// ERWEITERTE PV-LAYOUT-SEITE mit String-Farbgebung
// ============================================================================

/**
 * Zeichnet das PV-Modulraster auf einem Canvas mit String-Farben
 */
export const renderPVLayoutWithStrings = (
  canvas: HTMLCanvasElement,
  pvInfo: PVModuleInfo,
  stringPlan: StringPlan | null,
  measurementId: string,
  canvasWidth: number = 800,
  canvasHeight: number = 600
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Hintergrund
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const totalModules = pvInfo.moduleCorners?.length || pvInfo.moduleCount || 0;
  if (totalModules === 0) return;

  // String-Zuordnung aufbauen
  const moduleStringMap = new Map<number, PVString>();
  if (stringPlan) {
    for (const str of stringPlan.allStrings) {
      if (str.roofFaceIds.includes(measurementId)) {
        for (const mod of str.modules) {
          if (mod.roofFaceId === measurementId) {
            moduleStringMap.set(mod.moduleIndex, str);
          }
        }
      }
    }
  }

  const removedSet = new Set(pvInfo.removedModuleIndices || []);
  const cols = pvInfo.columns || Math.ceil(Math.sqrt(totalModules));
  const rows = Math.ceil(totalModules / cols);

  const padding = 30;
  const cellW = (canvasWidth - padding * 2) / cols;
  const cellH = (canvasHeight - padding * 2) / rows;
  const moduleW = cellW * 0.9;
  const moduleH = cellH * 0.9;

  // Grid zeichnen
  for (let idx = 0; idx < totalModules; idx++) {
    const row = Math.floor(idx / cols);
    const col2 = idx % cols;
    const x = padding + col2 * cellW + (cellW - moduleW) / 2;
    const y = padding + row * cellH + (cellH - moduleH) / 2;

    if (removedSet.has(idx)) {
      // Entferntes Modul grau
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(x, y, moduleW, moduleH);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, moduleW, moduleH);
      continue;
    }

    const pvString = moduleStringMap.get(idx);
    const fillColor = pvString ? pvString.color : '#1e40af';

    // Modul-Fläche
    ctx.fillStyle = fillColor;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, y, moduleW, moduleH);
    ctx.globalAlpha = 1;

    // Rahmen
    ctx.strokeStyle = pvString ? pvString.color : '#1e3a8a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, moduleW, moduleH);

    // String-Label (nur wenn genug Platz)
    if (pvString && moduleW > 20 && moduleH > 14) {
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.min(11, moduleH * 0.3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pvString.id, x + moduleW / 2, y + moduleH / 2);
    }

    // Modul-Nummer
    if (moduleW > 15 && moduleH > 10) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${Math.min(8, moduleH * 0.2)}px Arial`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(idx + 1), x + moduleW - 2, y + moduleH - 1);
    }
  }

  // Legende
  if (stringPlan && moduleStringMap.size > 0) {
    const uniqueStrings = [...new Set([...moduleStringMap.values()])];
    const legendY = canvasHeight - 20;
    const legendX = padding;
    ctx.font = '10px Arial';
    ctx.textBaseline = 'middle';
    let lx = legendX;
    uniqueStrings.forEach(str => {
      if (lx + 80 > canvasWidth) return;
      ctx.fillStyle = str.color;
      ctx.fillRect(lx, legendY - 6, 12, 12);
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.fillText(`${str.id} (${str.moduleCount} Mod.)`, lx + 15, legendY);
      lx += 95;
    });
  }
};

// ============================================================================
// STRINGPLAN-CANVAS (für PDF-Rendering)
// ============================================================================

/**
 * Erstellt eine HTML-Seite mit Canvas-Rendering des PV-Layouts für alle Dachflächen
 */
export const createPVLayoutPageWithStrings = (
  pvInfoMap: Map<string, PVModuleInfo>,
  measurements: Measurement[],
  stringPlan: StringPlan | null
): HTMLElement => {
  const container = createStyledDiv({
    pageBreakBefore: 'always',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  });

  container.appendChild(createH(2, 'PV-Modulbelegung & Stringzuordnung'));

  if (!stringPlan) {
    const noplan = document.createElement('p');
    noplan.textContent = 'Keine Stringplanung vorhanden – Module ohne Stringzuordnung dargestellt.';
    noplan.style.color = '#94a3b8';
    container.appendChild(noplan);
  }

  pvInfoMap.forEach((pvInfo, measurementId) => {
    if (!pvInfo || pvInfo.moduleCount === 0) return;

    const measurement = measurements.find(m => m.id === measurementId);
    const faceTitle = measurement?.description || measurement?.label || `Dachfläche ${measurementId.slice(0, 6)}`;

    container.appendChild(createH(3, faceTitle));

    // Info-Kacheln
    const info = createInfoGrid([
      ['Module', `${pvInfo.moduleCount} Stk.`],
      ['Leistung', `${(pvInfo.moduleCount * (pvInfo.pvModuleSpec?.power || 420) / 1000).toFixed(2)} kWp`],
      ['Ausrichtung', pvInfo.roofAzimuth !== undefined ? `${pvInfo.roofAzimuth.toFixed(0)}° (${pvInfo.roofDirection || ''})` : '–'],
      ['Neigung', pvInfo.roofInclination !== undefined ? `${pvInfo.roofInclination.toFixed(0)}°` : '–'],
      ['Modultyp', pvInfo.pvModuleSpec?.name || '–'],
      ['Dachtyp', pvInfo.roofType === 'flat' ? 'Flachdach' : 'Steildach'],
    ]);
    container.appendChild(info);

    // Canvas
    const canvasWrapper = createStyledDiv({
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '16px',
    });
    const canvas = document.createElement('canvas');
    renderPVLayoutWithStrings(canvas, pvInfo, stringPlan, measurementId, 780, 420);
    canvas.style.cssText = 'width:100%;display:block;';
    canvasWrapper.appendChild(canvas);
    container.appendChild(canvasWrapper);
  });

  return container;
};
