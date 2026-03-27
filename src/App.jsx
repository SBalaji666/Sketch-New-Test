import React, { useState, useMemo } from 'react';
import { THEMES } from './data/themes.js';
import { DEFAULTS } from './data/constants.js';
import { generateCutList, generateHardwareSchedule, generateMachiningSchedule } from './utils/cutListEngine.js';
import { optimizeSheetLayout, calculateMaterialCost } from './utils/sheetOptimizer.js';
import ThreeDViewer from './components/ThreeDViewer.jsx';
import CutListTable from './components/CutListTable.jsx';
import SheetOptimizationView from './components/SheetOptimizationView.jsx';
import HardwareSchedule from './components/HardwareSchedule.jsx';
import MachiningSchedule from './components/MachiningSchedule.jsx';
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
    { id: 1, label: 'S1', width: 600, type: 'closed', shelves: 0, drawers: { count: 6, height: 160, placement: 'bottom' } },
    { id: 2, label: 'S2', width: 500, type: 'closed', shelves: 2, drawers: { count: 0, height: 120, placement: 'bottom' } },
    { id: 3, label: 'S3', width: 500, type: 'closed', shelves: 2, drawers: { count: 0, height: 120, placement: 'bottom' } },
    { id: 4, label: 'S5', width: 300, type: 'open', shelves: 4, drawers: { count: 0, height: 120, placement: 'bottom' } },
    { id: 5, label: 'S6', width: 500, type: 'closed', shelves: 2, drawers: { count: 0, height: 120, placement: 'bottom' } },
    { id: 6, label: 'S7', width: 500, type: 'closed', shelves: 2, drawers: { count: 0, height: 120, placement: 'bottom' } },
    { id: 7, label: 'S7', width: 600, type: 'closed', shelves: 0, drawers: { count: 6, height: 160, placement: 'bottom' } },
  ]);

  const [themeKey, setThemeKey] = useState('technical');
  const [mainTab, setMainTab] = useState('3d-view'); // 3d-view | cutlist | optimization | hardware | machining
  const [selectedSection, setSelectedSection] = useState(null);

  const theme = THEMES[themeKey];
  const ui = theme.ui;

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
      p.id, p.part, p.section, p.material, p.qty,
      Math.round(p.length), Math.round(p.width), p.thickness,
      p.grain, p.edgeBand, p.machining || '', p.hardware || '', p.note,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cutlist_${overall.length}x${overall.height}x${overall.depth}.csv`;
    a.click();
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
        padding: '9px 18px',
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
        gap: 7,
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

  const handleSectionSelect = (section) => {
    setSelectedSection(section);
    // Highlight in config panel
    const element = document.getElementById(`section-${section.id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: containerBg, padding: 20, fontFamily: FONT }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ maxWidth: 1400, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: ui.text, fontFamily: FONT, fontWeight: 600, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 32 }}>🏗️</span>
            Cabinet Designer 3D
          </h1>
          <div style={{ fontSize: 10, color: ui.muted, marginTop: 3 }}>
            3D Designer · {stats.totalParts} parts · {stats.totalSheets} sheets · £{Math.round(stats.materialCost + stats.hardwareCost)} total
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {tabBtn('3D View', '3d-view',
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          )}
          {tabBtn('Cut List', 'cutlist',
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>,
            stats.totalParts
          )}
          {tabBtn('Nesting', 'optimization',
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>,
            stats.totalSheets
          )}
          {tabBtn('Hardware', 'hardware',
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6M1 12h6m6 0h6"/>
            </svg>,
            hardwareSchedule.length
          )}
          {tabBtn('Machining', 'machining',
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>,
            machiningSchedule.length
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '340px 1fr', gap: 14, alignItems: 'start' }}>
        
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
          mainTab={mainTab}
          totalMm={totalMm}
          ui={ui}
        />

        {/* Right: Main content area */}
        <div style={{ background: ui.bg, border: `1px solid ${ui.border}`, borderRadius: 12, padding: 16, minHeight: 680 }}>
          
          {mainTab === '3d-view' && (
            <ThreeDViewer
              config={config}
              onSectionSelect={handleSectionSelect}
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
              onDownloadNesting={() => {}}
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

      {/* Selected Section Info */}
      {selectedSection && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: ui.accent,
          color: '#fff',
          padding: 12,
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 1000,
        }}>
          Selected: {selectedSection.label} · {selectedSection.width}mm · {selectedSection.type}
          <button
            onClick={() => setSelectedSection(null)}
            style={{
              marginLeft: 12,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: 4,
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
