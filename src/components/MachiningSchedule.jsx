import React, { useState } from 'react';

export default function MachiningSchedule({ schedule, config, ui }) {
  const [groupBy, setGroupBy] = useState('operation'); // operation | part | section

  const grouped = schedule.reduce((acc, item) => {
    const key = item[groupBy] || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, color: ui.accent, fontWeight: 600, letterSpacing: 1 }}>
            CNC MACHINING SCHEDULE
          </h3>
          <div style={{ fontSize: 10, color: ui.muted, marginTop: 3 }}>
            Complete boring and drilling coordinates for panel processing
          </div>
        </div>

        {/* Group by selector */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: ui.muted, marginRight: 4 }}>Group by:</span>
          {['operation', 'part', 'section'].map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 10,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: `1.5px solid ${groupBy === g ? ui.accent : ui.border}`,
                background: groupBy === g ? ui.accent : ui.inputBg,
                color: groupBy === g ? '#fff' : ui.text,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Info panel */}
      <div style={{ padding: 12, background: ui.panel, borderRadius: 8, border: `1px solid ${ui.border}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 10 }}>
          <div>
            <span style={{ color: ui.muted }}>Total Operations:</span>{' '}
            <span style={{ fontWeight: 700, color: ui.text }}>{schedule.length}</span>
          </div>
          <div>
            <span style={{ color: ui.muted }}>Joinery Method:</span>{' '}
            <span style={{ fontWeight: 700, color: ui.text, textTransform: 'capitalize' }}>{config.hardware.joinery}</span>
          </div>
          <div>
            <span style={{ color: ui.muted }}>Hinge Model:</span>{' '}
            <span style={{ fontWeight: 700, color: ui.text }}>{config.hardware.hinge}</span>
          </div>
          <div>
            <span style={{ color: ui.muted }}>Shelf System:</span>{' '}
            <span style={{ fontWeight: 700, color: ui.text }}>{config.hardware.shelfSystem}</span>
          </div>
        </div>
      </div>

      {/* Machining table */}
      <div style={{ flex: 1, overflowY: 'auto', borderRadius: 10, border: `1px solid ${ui.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'inherit' }}>
          <thead style={{ position: 'sticky', top: 0, background: ui.panel, zIndex: 2 }}>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Part</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Section</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Operation</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Tool</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Ø</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Depth</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>X</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Y</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Face/Notes</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([groupName, items], grpIdx) => (
              <React.Fragment key={groupName}>
                {/* Group header */}
                <tr style={{ background: ui.inputBg }}>
                  <td colSpan={9} style={{ padding: '8px 12px', fontWeight: 700, fontSize: 11, color: ui.accent }}>
                    {groupName} ({items.length} operations)
                  </td>
                </tr>
                {/* Group items */}
                {items.map((item, idx) => (
                  <tr
                    key={`${groupName}-${idx}`}
                    style={{ background: idx % 2 === 0 ? ui.bg : ui.panel }}
                    onMouseEnter={e => e.currentTarget.style.background = ui.inputBg}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? ui.bg : ui.panel}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: ui.text }}>
                      {item.part}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 9,
                        background: ui.inputBg,
                        color: ui.accent,
                        border: `1px solid ${ui.border}`,
                        fontWeight: 600,
                      }}>
                        {item.section}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: ui.text }}>
                      {item.operation}
                    </td>
                    <td style={{ padding: '10px 12px', color: ui.muted, fontSize: 10 }}>
                      {item.tool}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: ui.text }}>
                      {item.diameter}mm
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: ui.text }}>
                      {item.depth}mm
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace', color: ui.accent }}>
                      {item.xPos ? `${item.xPos}mm` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace', color: ui.accent }}>
                      {item.yPos ? `${item.yPos}mm` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: ui.muted, fontSize: 10 }}>
                      {item.face || item.note || '—'}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export info */}
      <div style={{ padding: 12, background: ui.panel, borderRadius: 8, border: `1px solid ${ui.border}`, fontSize: 10, color: ui.muted }}>
        <strong style={{ color: ui.text }}>Export Format:</strong> This schedule can be exported to CNC/CAM software.
        Common formats include DXF, CSV with X/Y/Z coordinates, or proprietary machine formats (Biesse, Homag, SCM).
        Contact your CNC manufacturer for the specific import format required.
      </div>
    </div>
  );
}
