import { useState, useMemo, useRef } from "react";

// ─── MATERIAL COLORS for cut list ─────────────────────────────────────────────
const MAT_COLORS = {
  "Carcass 18mm": "#6b7fa3",
  "Back Panel 9mm": "#9b7fa3",
  "Drawer Bottom 6mm": "#7fa39b",
  "Door 18mm": "#a38f7f",
  "Shelf 18mm": "#7fa36b",
  "Drawer Side 12mm": "#a37f6b",
  "Drawer Face 18mm": "#a36b7f",
};

// ─── CUT LIST VIEW ────────────────────────────────────────────────────────────
function CutListView({ parts, sheetUsage, ui, overall, onDownloadCSV, FONT }) {
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState(1);
  const [expandedMat, setExpandedMat] = useState(null);

  const materials = [
    "All",
    ...Array.from(new Set(parts.map((p) => p.material))),
  ];

  const filtered = parts
    .filter((p) => filter === "All" || p.material === filter)
    .sort((a, b) => {
      const va = a[sortBy],
        vb = b[sortBy];
      if (typeof va === "number") return (va - vb) * sortDir;
      return String(va).localeCompare(String(vb)) * sortDir;
    });

  const totalParts = parts.reduce((a, p) => a + p.qty, 0);
  const totalCost = sheetUsage.reduce((a, s) => a + s.cost, 0);

  const col = (label, key, w = "auto") => (
    <th
      onClick={() => {
        if (sortBy === key) setSortDir((d) => -d);
        else {
          setSortBy(key);
          setSortDir(1);
        }
      }}
      style={{
        padding: "8px 10px",
        textAlign: "left",
        fontSize: 10,
        color: ui.muted,
        cursor: "pointer",
        whiteSpace: "nowrap",
        userSelect: "none",
        width: w,
        borderBottom: `2px solid ${ui.border}`,
      }}
    >
      {label} {sortBy === key ? (sortDir === 1 ? "↑" : "↓") : ""}
    </th>
  );

  const matDot = (mat) => (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 2,
        background: MAT_COLORS[mat] || "#aaa",
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 12,
        height: "100%",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {materials.map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                fontSize: 10,
                cursor: "pointer",
                fontFamily: FONT,
                border: `1.5px solid ${filter === m ? ui.accent : ui.border}`,
                background: filter === m ? ui.accent : ui.inputBg,
                color: filter === m ? "#fff" : ui.text,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {m !== "All" && matDot(m)}
              {m !== "All"
                ? m
                    .replace(" 18mm", "")
                    .replace(" 9mm", "")
                    .replace(" 12mm", "")
                    .replace(" 6mm", "")
                : "All Parts"}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <div
            style={{
              fontSize: 11,
              color: ui.muted,
              padding: "5px 10px",
              background: ui.inputBg,
              borderRadius: 6,
              border: `1px solid ${ui.border}`,
            }}
          >
            {filtered.reduce((a, p) => a + p.qty, 0)} parts shown
          </div>
          <button
            onClick={onDownloadCSV}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 10,
              cursor: "pointer",
              fontFamily: FONT,
              border: `1.5px solid ${ui.accent}`,
              background: ui.accent,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2v9M4 7l4 4 4-4M2 13h12"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          overflowY: "auto",
          borderRadius: 10,
          border: `1px solid ${ui.border}`,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 11,
            fontFamily: FONT,
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              background: ui.panel,
              zIndex: 2,
            }}
          >
            <tr>
              {col("#", "id", 36)}
              {col("Part Name", "part")}
              {col("Section", "section", 60)}
              {col("Material", "material")}
              {col("Qty", "qty", 44)}
              {col("Length", "length", 72)}
              {col("Width", "width", 72)}
              {col("Thick", "thickness", 60)}
              {col("Grain", "grain", 60)}
              {col("Edge Band", "edgeBand")}
              <th
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  fontSize: 10,
                  color: ui.muted,
                  borderBottom: `2px solid ${ui.border}`,
                }}
              >
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                style={{
                  background: i % 2 === 0 ? ui.bg : ui.panel,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = ui.inputBg)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    i % 2 === 0 ? ui.bg : ui.panel)
                }
              >
                <td style={{ padding: "7px 10px", color: ui.muted }}>{p.id}</td>
                <td
                  style={{
                    padding: "7px 10px",
                    fontWeight: 500,
                    color: ui.text,
                  }}
                >
                  {p.part}
                </td>
                <td style={{ padding: "7px 10px" }}>
                  <span
                    style={{
                      padding: "2px 7px",
                      borderRadius: 4,
                      fontSize: 10,
                      background: ui.inputBg,
                      color: ui.accent,
                      border: `1px solid ${ui.border}`,
                    }}
                  >
                    {p.section}
                  </span>
                </td>
                <td style={{ padding: "7px 10px" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 5 }}
                  >
                    {matDot(p.material)}
                    <span style={{ color: ui.text }}>{p.material}</span>
                  </div>
                </td>
                <td style={{ padding: "7px 10px", textAlign: "center" }}>
                  <span
                    style={{ fontWeight: 700, color: ui.accent, fontSize: 13 }}
                  >
                    {p.qty}
                  </span>
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    color: ui.text,
                    fontWeight: 500,
                  }}
                >
                  {Math.round(p.length)}{" "}
                  <span style={{ color: ui.muted, fontSize: 9 }}>mm</span>
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    color: ui.text,
                    fontWeight: 500,
                  }}
                >
                  {Math.round(p.width)}{" "}
                  <span style={{ color: ui.muted, fontSize: 9 }}>mm</span>
                </td>
                <td style={{ padding: "7px 10px", color: ui.muted }}>
                  {p.thickness}
                </td>
                <td style={{ padding: "7px 10px" }}>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 9,
                      background: p.grain === "length" ? "#dbeafe" : "#dcfce7",
                      color: p.grain === "length" ? "#1d4ed8" : "#15803d",
                    }}
                  >
                    {p.grain}
                  </span>
                </td>
                <td
                  style={{ padding: "7px 10px", color: ui.muted, fontSize: 10 }}
                >
                  {p.edgeBand}
                </td>
                <td
                  style={{ padding: "7px 10px", color: ui.muted, fontSize: 10 }}
                >
                  {p.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet usage + summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          alignItems: "start",
        }}
      >
        {/* Sheet usage breakdown */}
        <div
          style={{
            background: ui.panel,
            borderRadius: 10,
            padding: 12,
            border: `1px solid ${ui.border}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: ui.accent,
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            SHEET USAGE ESTIMATE
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {sheetUsage.map((s) => (
              <div
                key={s.material}
                style={{
                  background: ui.bg,
                  borderRadius: 8,
                  padding: "8px 12px",
                  border: `1px solid ${ui.border}`,
                  minWidth: 140,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 4,
                  }}
                >
                  {matDot(s.material)}
                  <span style={{ fontSize: 10, color: ui.muted }}>
                    {s.material}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: ui.text,
                    lineHeight: 1,
                  }}
                >
                  {s.sheetsNeeded}
                </div>
                <div style={{ fontSize: 9, color: ui.muted, marginTop: 2 }}>
                  sheets of {s.sheetDims}
                </div>
                <div
                  style={{
                    marginTop: 5,
                    height: 4,
                    borderRadius: 2,
                    background: ui.inputBg,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${s.efficiency}%`,
                      background:
                        s.efficiency > 80
                          ? "#16a34a"
                          : s.efficiency > 60
                            ? "#d97706"
                            : "#ef4444",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div style={{ fontSize: 9, color: ui.muted, marginTop: 2 }}>
                  {s.efficiency}% efficient · {s.totalArea}m² ·{" "}
                  <span style={{ color: ui.accent }}>£{s.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary box */}
        <div
          style={{
            background: ui.panel,
            borderRadius: 10,
            padding: 12,
            border: `1px solid ${ui.border}`,
            minWidth: 160,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: ui.accent,
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            SUMMARY
          </div>
          {[
            ["Total Parts", totalParts],
            ["Unique Part Types", parts.length],
            ["Sections", `${overall.length}mm wide`],
            ["Est. Material Cost", `£${totalCost}`],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
                gap: 16,
              }}
            >
              <span style={{ fontSize: 10, color: ui.muted }}>{k}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: ui.text }}>
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CutListView