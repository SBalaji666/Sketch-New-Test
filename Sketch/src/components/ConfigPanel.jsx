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

  const labelStyle = { fontSize: 10, color: ui.muted, fontWeight: 500, marginBottom: 6, display: 'block' };
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
          <label key={key} style={labelStyle}>
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
          <label style={labelStyle}>
            Theme
            <select value={themeKey} onChange={e => setThemeKey(e.target.value)} style={inputStyle}>
              {Object.keys(THEMES).map(k => <option key={k} value={k}>{THEMES[k].name}</option>)}
            </select>
          </label>
        </div>
      )}

      {/* Sections - FULL VERSION */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={headerStyle}>SECTIONS</div>
          <button onClick={addSection} style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
            border: `1.5px dashed ${ui.accent}`, background: 'transparent', color: ui.accent,
            fontFamily: 'inherit', fontWeight: 600,
          }}>+ Add</button>
        </div>
        <div style={{ fontSize: 9, color: ui.muted, marginBottom: 10 }}>
          {sections.length} sections · {totalMm}mm {totalMm !== overall.length && `→ scaled to ${overall.length}mm`}
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
          {sections.map(s => (
            <div key={s.id} style={{
              background: ui.panel, border: `1px solid ${ui.border}`, borderRadius: 8,
              padding: 10, marginBottom: 8,
            }}>
              {/* Header with label and remove button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <input value={s.label} onChange={e => updateSection({ ...s, label: e.target.value })} style={{
                  padding: '4px 8px', borderRadius: 5, border: `1px solid ${ui.border}`,
                  background: ui.inputBg, color: ui.text, fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 700, width: 60,
                }} />
                <button onClick={() => removeSection(s.id)} style={{
                  background: 'transparent', border: 'none', color: '#ef4444',
                  cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1,
                }}>×</button>
              </div>

              {/* Width and Type row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <label style={{ fontSize: 10, color: ui.muted }}>
                  Width (mm)
                  <input type="number" min={50} max={2000} value={s.width}
                    onChange={e => updateSection({ ...s, width: Number(e.target.value) })}
                    style={{ ...inputStyle, padding: '5px 7px', fontSize: 11 }} />
                </label>
                <label style={{ fontSize: 10, color: ui.muted }}>
                  Type
                  <select value={s.type} onChange={e => updateSection({ ...s, type: e.target.value })}
                    style={{ ...inputStyle, padding: '5px 7px', fontSize: 11 }}>
                    <option value="closed">Closed</option>
                    <option value="open">Open</option>
                  </select>
                </label>
              </div>

              {/* Shelves */}
              <label style={{ fontSize: 10, color: ui.muted, marginBottom: 8, display: 'block' }}>
                Shelves
                <input type="number" min={0} max={20} value={s.shelves || 0}
                  onChange={e => updateSection({ ...s, shelves: Number(e.target.value) })}
                  style={{ ...inputStyle, padding: '5px 7px', fontSize: 11 }} />
              </label>

              {/* Drawers section */}
              <div style={{
                background: ui.bg, borderRadius: 6, padding: 8,
                border: `1px solid ${ui.border}`, marginTop: 8,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: ui.accent, marginBottom: 6, letterSpacing: 0.5 }}>
                  DRAWERS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <label style={{ fontSize: 9, color: ui.muted }}>
                    Count
                    <input type="number" min={0} max={20} value={s.drawers?.count || 0}
                      onChange={e => updateSection({ 
                        ...s, 
                        drawers: { ...(s.drawers || {}), count: Number(e.target.value) } 
                      })}
                      style={{ ...inputStyle, padding: '4px 6px', fontSize: 10, marginTop: 2 }} />
                  </label>
                  <label style={{ fontSize: 9, color: ui.muted }}>
                    Height (mm)
                    <input type="number" min={40} max={500} value={s.drawers?.height || 120}
                      onChange={e => updateSection({ 
                        ...s, 
                        drawers: { ...(s.drawers || {}), height: Number(e.target.value) } 
                      })}
                      style={{ ...inputStyle, padding: '4px 6px', fontSize: 10, marginTop: 2 }} />
                  </label>
                  <label style={{ fontSize: 9, color: ui.muted }}>
                    Placement
                    <select value={s.drawers?.placement || 'bottom'}
                      onChange={e => updateSection({ 
                        ...s, 
                        drawers: { ...(s.drawers || {}), placement: e.target.value } 
                      })}
                      style={{ ...inputStyle, padding: '4px 6px', fontSize: 10, marginTop: 2 }}>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="full">Full</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
