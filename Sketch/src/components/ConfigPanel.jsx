import React from 'react';
import { JOINERY_TYPES, DRAWER_SLIDES, HINGES, SHELF_SYSTEMS, PLINTH_SYSTEMS } from '../data/constants.js';
import { THEMES } from '../data/themes.js';

export default function ConfigPanel(props) {
  const {
    overall, setOverall, materials, setMaterials, tolerances, setTolerances,
    hardware, setHardware, sections, addSection, removeSection, updateSection,
    themeKey, setThemeKey, drawingView, setDrawingView, mainTab, totalMm, ui
  } = props;

  const inputStyle = {
    display: 'block', width: '100%', padding: '6px 8px', borderRadius: 6,
    border: `1px solid ${ui.border}`, background: ui.inputBg, color: ui.text,
    fontFamily: 'inherit', fontSize: 11, marginTop: 3,
  };

  const sectionStyle = {
    background: ui.bg, border: `1px solid ${ui.border}`, borderRadius: 10, padding: 12, marginBottom: 10,
  };

  const labelStyle = { fontSize: 10, color: ui.muted, fontWeight: 500 };
  const headerStyle = { fontSize: 10, fontWeight: 600, color: ui.accent, marginBottom: 8, letterSpacing: 1 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '85vh', overflowY: 'auto', paddingRight: 4 }}>
      
      {/* Overall dimensions */}
      <div style={sectionStyle}>
        <div style={headerStyle}>DIMENSIONS</div>
        {[['Length', 'length'], ['Height', 'height'], ['Depth', 'depth']].map(([lbl, key]) => (
          <label key={key} style={labelStyle}>
            {lbl} (mm)
            <input type="number" min={100} value={overall[key]}
              onChange={e => setOverall(o => ({ ...o, [key]: Number(e.target.value) }))}
              style={inputStyle} />
          </label>
        ))}
      </div>

      {/* Materials */}
      <div style={sectionStyle}>
        <div style={headerStyle}>MATERIALS (mm)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[['Carcass', 'carcass'], ['Back', 'back'], ['Shelf', 'shelf'], ['Door', 'door'], ['Drawer Side', 'drawerSide'], ['Drawer Base', 'drawerBottom']].map(([lbl, key]) => (
            <label key={key} style={labelStyle}>
              {lbl}
              <input type="number" min={3} max={36} value={materials[key]}
                onChange={e => setMaterials(m => ({ ...m, [key]: Number(e.target.value) }))}
                style={inputStyle} />
            </label>
          ))}
        </div>
      </div>

      {/* Hardware */}
      <div style={sectionStyle}>
        <div style={headerStyle}>HARDWARE</div>
        {[
          ['Joinery', 'joinery', Object.keys(JOINERY_TYPES).map(k => ({ v: k.toLowerCase(), l: JOINERY_TYPES[k].name }))],
          ['Hinge', 'hinge', Object.keys(HINGES).map(k => ({ v: k, l: HINGES[k].model }))],
          ['Drawer Slide', 'drawerSlide', Object.keys(DRAWER_SLIDES).map(k => ({ v: k, l: DRAWER_SLIDES[k].model }))],
          ['Shelf System', 'shelfSystem', Object.keys(SHELF_SYSTEMS).map(k => ({ v: k, l: SHELF_SYSTEMS[k].name }))],
          ['Plinth', 'plinth', Object.keys(PLINTH_SYSTEMS).map(k => ({ v: k, l: PLINTH_SYSTEMS[k].name }))],
        ].map(([lbl, key, opts]) => (
          <label key={key} style={{ ...labelStyle, marginBottom: 6 }}>
            {lbl}
            <select value={hardware[key]} onChange={e => setHardware(h => ({ ...h, [key]: e.target.value }))} style={inputStyle}>
              {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </label>
        ))}
      </div>

      {/* Theme (only for drawing tab) */}
      {mainTab === 'drawing' && (
        <div style={sectionStyle}>
          <div style={headerStyle}>VIEW OPTIONS</div>
          <label style={labelStyle}>
            Drawing View
            <select value={drawingView} onChange={e => setDrawingView(e.target.value)} style={inputStyle}>
              <option value="3d">3D Isometric</option>
              <option value="elevation">Front Elevation</option>
            </select>
          </label>
          <label style={{ ...labelStyle, marginTop: 6 }}>
            Theme
            <select value={themeKey} onChange={e => setThemeKey(e.target.value)} style={inputStyle}>
              {Object.keys(THEMES).map(k => <option key={k} value={k}>{THEMES[k].name}</option>)}
            </select>
          </label>
        </div>
      )}

      {/* Sections */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={headerStyle}>SECTIONS</div>
          <button onClick={addSection} style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 9, cursor: 'pointer',
            border: `1px dashed ${ui.accent}`, background: 'transparent', color: ui.accent,
            fontFamily: 'inherit', fontWeight: 600,
          }}>+ Add</button>
        </div>
        <div style={{ fontSize: 9, color: ui.muted, marginBottom: 8 }}>
          {sections.length} sections · {totalMm}mm {totalMm !== overall.length && `→ scaled to ${overall.length}mm`}
        </div>
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {sections.map(s => (
            <div key={s.id} style={{
              background: ui.panel, border: `1px solid ${ui.border}`, borderRadius: 6,
              padding: 8, marginBottom: 6, fontSize: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <input value={s.label} onChange={e => updateSection({ ...s, label: e.target.value })} style={{
                  ...inputStyle, width: 40, padding: '3px 6px', marginTop: 0, fontWeight: 600,
                }} />
                <button onClick={() => removeSection(s.id)} style={{
                  background: 'transparent', border: 'none', color: '#ef4444',
                  cursor: 'pointer', fontSize: 14, padding: 0,
                }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 4 }}>
                <label style={{ fontSize: 9, color: ui.muted }}>
                  Width
                  <input type="number" min={50} value={s.width}
                    onChange={e => updateSection({ ...s, width: Number(e.target.value) })}
                    style={{ ...inputStyle, padding: '3px 5px', fontSize: 10, marginTop: 2 }} />
                </label>
                <label style={{ fontSize: 9, color: ui.muted }}>
                  Type
                  <select value={s.type} onChange={e => updateSection({ ...s, type: e.target.value })}
                    style={{ ...inputStyle, padding: '3px 5px', fontSize: 10, marginTop: 2 }}>
                    <option value="closed">Closed</option>
                    <option value="open">Open</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
