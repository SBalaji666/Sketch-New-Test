import React from 'react';

export default function HardwareSchedule({ schedule, totalCost, ui }) {
  const groupedByCategory = schedule.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, color: ui.accent, fontWeight: 600, letterSpacing: 1 }}>
            HARDWARE BILL OF MATERIALS
          </h3>
          <div style={{ fontSize: 10, color: ui.muted, marginTop: 3 }}>
            Complete hardware schedule with quantities and costs
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: ui.accent, padding: '6px 14px', background: ui.panel, borderRadius: 6, border: `1px solid ${ui.accent}` }}>
          Total: £{totalCost.toFixed(2)}
        </div>
      </div>

      {/* Hardware table */}
      <div style={{ flex: 1, overflowY: 'auto', borderRadius: 10, border: `1px solid ${ui.border}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'inherit' }}>
          <thead style={{ position: 'sticky', top: 0, background: ui.panel, zIndex: 2 }}>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Category</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Item</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Quantity</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Unit Cost</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Total Cost</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: ui.muted, borderBottom: `2px solid ${ui.border}` }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedByCategory).map(([category, items], catIdx) => (
              <React.Fragment key={category}>
                {/* Category header */}
                <tr style={{ background: ui.inputBg }}>
                  <td colSpan={6} style={{ padding: '8px 12px', fontWeight: 700, fontSize: 11, color: ui.accent }}>
                    {category}
                  </td>
                </tr>
                {/* Category items */}
                {items.map((item, idx) => (
                  <tr
                    key={`${category}-${idx}`}
                    style={{ background: idx % 2 === 0 ? ui.bg : ui.panel }}
                    onMouseEnter={e => e.currentTarget.style.background = ui.inputBg}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? ui.bg : ui.panel}
                  >
                    <td style={{ padding: '10px 12px', color: ui.muted, fontSize: 10 }}>
                      {/* Empty for item rows */}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: ui.text }}>
                      {item.item}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: ui.accent }}>
                        {item.qty}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: ui.text }}>
                      £{item.unitCost.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: ui.accent }}>
                      £{item.totalCost.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', color: ui.muted, fontSize: 10 }}>
                      {item.note}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div style={{ padding: 12, background: ui.panel, borderRadius: 8, border: `1px solid ${ui.border}` }}>
          <div style={{ fontSize: 10, color: ui.muted, marginBottom: 4 }}>Total Items</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: ui.text }}>{schedule.length}</div>
        </div>
        <div style={{ padding: 12, background: ui.panel, borderRadius: 8, border: `1px solid ${ui.border}` }}>
          <div style={{ fontSize: 10, color: ui.muted, marginBottom: 4 }}>Total Pieces</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: ui.text }}>
            {schedule.reduce((sum, h) => sum + h.qty, 0)}
          </div>
        </div>
        <div style={{ padding: 12, background: ui.panel, borderRadius: 8, border: `1px solid ${ui.accent}` }}>
          <div style={{ fontSize: 10, color: ui.muted, marginBottom: 4 }}>Hardware Cost</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: ui.accent }}>£{totalCost.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
