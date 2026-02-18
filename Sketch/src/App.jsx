import React, { useState, useMemo, useRef } from 'react';
import { THEMES } from './data/themes.js';
import { DEFAULTS } from './data/constants.js';
import { generateCutList, generateHardwareSchedule, generateMachiningSchedule } from './utils/cutListEngine.js';
import { optimizeSheetLayout, generateNestingSVG, calculateMaterialCost } from './utils/sheetOptimizer.js';
import CutListTable from './components/CutListTable.jsx';
import SheetOptimizationView from './components/SheetOptimizationView.jsx';
import HardwareSchedule from './components/HardwareSchedule.jsx';
import MachiningSchedule from './components/MachiningSchedule.jsx';
import DrawingView from './components/DrawingView.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';

const FONT = "'IBM Plex Mono', 'Courier New', monospace";

let _nextSectionId = 6;

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [overall, setOverall] = useState(DEFAULTS.overall);
  const [materials, setMaterials] = useState(DEFAULTS.materials);
  const [tolerances, setTolerances] = useState(DEFAULTS.tolerances);
  const [hardware, setHardware] = useState({
    joinery: DEFAULTS.joinery,
    drawerSlide: DEFAULTS.drawerSlide,
    hinge: DEFAULTS.hinge,
    shelfSystem: DEFAULTS.shelfSystem,
    plinth: DEFAULTS.plinth,
    construction: DEFAULTS.construction,
    doorOverlay: DEFAULTS.doorOverlay,
    edgeBanding: DEFAULTS.edgeBanding,
  });
  
  const [sections, setSections] = useState([
    { id: 1, label: 'S1', width: 500, type: 'closed', shelves: 0, drawers: { count: 6, height: 110, placement: 'full' } },
    { id: 2, label: 'S2', width: 500, type: 'closed', shelves: 2, drawers: { count: 0, height: 120, placement: 'bottom' } },
    { id: 3, label: 'S3', width: 500, type: 'closed', shelves: 2, drawers: { count: 0, height: 120, placement: 'bottom' } },
    { id: 4, label: 'S4', width: 500, type: 'closed', shelves: 2, drawers: { count: 0, height: 120, placement: 'bottom' } },
    { id: 5, label: 'S5', width: 500, type: 'open', shelves: 4, drawers: { count: 0, height: 120, placement: 'bottom' } },
    { id: 6, label: 'S6', width: 500, type: 'open', shelves: 4, drawers: { count: 0, height: 120, placement: 'bottom' } },
    { id: 7, label: 'S7', width: 500, type: 'closed', shelves: 2, drawers: { count: 0, height: 120, placement: 'bottom' } },
  ]);

  const [themeKey, setThemeKey] = useState('technical');
  const [mainTab, setMainTab] = useState('drawing'); // drawing | cutlist | optimization | hardware | machining
  const [drawingView, setDrawingView] = useState('3d');
  const [downloading, setDownloading] = useState(false);

  const theme = THEMES[themeKey];
  const ui = theme.ui;
  const svgRef = useRef(null);

  // ── Build configuration object ─────────────────────────────────────────────
  const config = useMemo(() => ({
    overall,
    materials,
    tolerances,
    sections,
    hardware,
  }), [overall, materials, tolerances, sections, hardware]);

  // ── Generate all outputs ───────────────────────────────────────────────────
  const cutList = useMemo(() => generateCutList(config), [config]);
  const hardwareSchedule = useMemo(() => generateHardwareSchedule(config), [config]);
  const machiningSchedule = useMemo(() => generateMachiningSchedule(cutList, config), [cutList, config]);
  const sheetLayout = useMemo(() => optimizeSheetLayout(cutList, tolerances.sawKerf), [cutList, tolerances.sawKerf]);
  const materialCost = useMemo(() => calculateMaterialCost(sheetLayout), [sheetLayout]);

  // ── Export functions ───────────────────────────────────────────────────────
  const downloadCSV = () => {
    const headers = ['#', 'Part', 'Section', 'Material', 'Qty', 'Length(mm)', 'Width(mm)', 'Thickness(mm)', 'Grain', 'Edge Band', 'Machining', 'Hardware', 'Notes'];
    const rows = cutList.map(p => [
      p.id,
      p.part,
      p.section,
      p.material,
      p.qty,
      Math.round(p.length),
      Math.round(p.width),
      p.thickness,
      p.grain,
      p.edgeBand,
      p.machining || '',
      p.hardware || '',
      p.note,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cutlist_${overall.length}x${overall.height}x${overall.depth}.csv`;
    a.click();
  };

  const downloadNesting = (material) => {
    const svg = generateNestingSVG(sheetLayout, material);
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nesting_${material.replace(/\s+/g, '_')}.svg`;
    a.click();
  };

  const downloadDrawingSVG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cabinet_${overall.length}x${overall.height}x${overall.depth}_${drawingView}.svg`;
    a.click();
  };

  const downloadDrawingPNG = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    setDownloading(true);
    const scale = 2;
    const w = 820 * scale, h = 520 * scale;
    const svgData = new XMLSerializer().serializeToString(svg).replace('<svg', `<svg xmlns="http://www.w3.org/2000/svg"`);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = theme.canvas;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `cabinet_${overall.length}x${overall.height}x${overall.depth}_${drawingView}.png`;
      a.click();
      setDownloading(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setDownloading(false);
    };
    img.src = url;
  };

  // ── Section management ─────────────────────────────────────────────────────
  const addSection = () => {
    setSections(prev => [...prev, {
      id: _nextSectionId++,
      label: `S${_nextSectionId - 1}`,
      width: 350,
      type: 'closed',
      shelves: 2,
      drawers: { count: 0, height: 120, placement: 'bottom' },
    }]);
  };

  const removeSection = (id) => setSections(prev => prev.filter(s => s.id !== id));
  const updateSection = (updated) => setSections(prev => prev.map(s => s.id === updated.id ? updated : s));

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalParts: cutList.reduce((a, p) => a + p.qty, 0),
    uniqueParts: cutList.length,
    totalSheets: Object.values(sheetLayout).reduce((a, l) => a + l.totalSheets, 0),
    materialCost: materialCost.totalCost,
    hardwareCost: hardwareSchedule.reduce((a, h) => a + h.totalCost, 0),
    avgEfficiency: Object.values(sheetLayout).reduce((sum, l) => sum + l.averageEfficiency, 0) / Object.keys(sheetLayout).length,
  }), [cutList, sheetLayout, materialCost, hardwareSchedule]);

  const totalMm = sections.reduce((a, s) => a + s.width, 0);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const containerBg = themeKey === 'blueprint'
    ? 'linear-gradient(135deg, #071525 0%, #0d2137 100%)'
    : themeKey === 'workshop'
    ? 'linear-gradient(135deg, #f5efe6 0%, #ece3d5 100%)'
    : 'linear-gradient(135deg, #eef2f8 0%, #f5f7fb 100%)';

  const tabBtn = (label, key, icon, badge = null) => (
    <button
      onClick={() => setMainTab(key)}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        fontFamily: FONT,
        fontSize: 11,
        cursor: 'pointer',
        fontWeight: 600,
        border: `2px solid ${mainTab === key ? ui.accent : ui.border}`,
        background: mainTab === key ? ui.accent : ui.bg,
        color: mainTab === key ? '#fff' : ui.text,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      {icon}
      {label}
      {badge !== null && (
        <span style={{
          position: 'absolute',
          top: -6,
          right: -6,
          background: '#ef4444',
          color: '#fff',
          borderRadius: 10,
          padding: '2px 6px',
          fontSize: 9,
          fontWeight: 700,
        }}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: containerBg, padding: 20, fontFamily: FONT }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ maxWidth: 1360, margin: '0 auto 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: ui.text, fontFamily: FONT, fontWeight: 600, letterSpacing: '-0.5px' }}>
            Cabinet Designer Pro
          </h1>
          <div style={{ fontSize: 10, color: ui.muted, marginTop: 2 }}>
            Production-Ready Manufacturing System · {stats.totalParts} parts · {stats.totalSheets} sheets · £{Math.round(stats.materialCost + stats.hardwareCost)} total
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tabBtn('Drawing', 'drawing',
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" /><line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.5" /><line x1="6" y1="6" x2="6" y2="14" stroke="currentColor" strokeWidth="1.5" /></svg>
          )}
          {tabBtn('Cut List', 'cutlist',
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><line x1="3" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.5" /><line x1="3" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="1.5" /><line x1="3" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" /></svg>,
            stats.totalParts
          )}
          {tabBtn('Nesting', 'optimization',
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="6" height="4" stroke="currentColor" strokeWidth="1.5" /><rect x="9" y="2" width="5" height="6" stroke="currentColor" strokeWidth="1.5" /><rect x="2" y="7" width="4" height="7" stroke="currentColor" strokeWidth="1.5" /></svg>,
            stats.totalSheets
          )}
          {tabBtn('Hardware', 'hardware',
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" /><circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M7 7l2 2" stroke="currentColor" strokeWidth="1.5" /></svg>,
            hardwareSchedule.length
          )}
          {tabBtn('Machining', 'machining',
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
            machiningSchedule.length
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1360, margin: '0 auto', display: 'grid', gridTemplateColumns: '340px 1fr', gap: 12, alignItems: 'start' }}>
        
        {/* Left: Configuration panel */}
        <ConfigPanel
          overall={overall}
          setOverall={setOverall}
          materials={materials}
          setMaterials={setMaterials}
          tolerances={tolerances}
          setTolerances={setTolerances}
          hardware={hardware}
          setHardware={setHardware}
          sections={sections}
          setSections={setSections}
          addSection={addSection}
          removeSection={removeSection}
          updateSection={updateSection}
          themeKey={themeKey}
          setThemeKey={setThemeKey}
          drawingView={drawingView}
          setDrawingView={setDrawingView}
          mainTab={mainTab}
          totalMm={totalMm}
          ui={ui}
        />

        {/* Right: Main content area */}
        <div style={{ background: ui.bg, border: `1px solid ${ui.border}`, borderRadius: 12, padding: 16, minHeight: 680 }}>
          
          {mainTab === 'drawing' && (
            <DrawingView
              config={config}
              theme={theme}
              drawingView={drawingView}
              svgRef={svgRef}
              downloading={downloading}
              onDownloadSVG={downloadDrawingSVG}
              onDownloadPNG={downloadDrawingPNG}
              ui={ui}
            />
          )}

          {mainTab === 'cutlist' && (
            <CutListTable
              parts={cutList}
              onExportCSV={downloadCSV}
              ui={ui}
            />
          )}

          {mainTab === 'optimization' && (
            <SheetOptimizationView
              sheetLayout={sheetLayout}
              materialCost={materialCost}
              onDownloadNesting={downloadNesting}
              ui={ui}
            />
          )}

          {mainTab === 'hardware' && (
            <HardwareSchedule
              schedule={hardwareSchedule}
              totalCost={stats.hardwareCost}
              ui={ui}
            />
          )}

          {mainTab === 'machining' && (
            <MachiningSchedule
              schedule={machiningSchedule}
              config={config}
              ui={ui}
            />
          )}

        </div>
      </div>
    </div>
  );
}
