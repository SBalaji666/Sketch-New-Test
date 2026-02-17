import { useState, useMemo, useRef } from "react";
import CutListView from "./components/views/CutListView";
import ElevationView from "./components/views/ElevationView";
import IsoView from "./components/views/IsoView";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FONT = "'DM Mono', 'Courier New', monospace";

const THEMES = {
  technical: {
    name: "Technical",
    canvas: "#ffffff",
    stroke: "#1c2b3a",
    strokeW: 1.4,
    frontFill: "#eef1f6",
    doorFill: "#dde4f0",
    sideFill: "#c8d3e8",
    topFill: "#d4dcea",
    shelfFill: "#bfcadc",
    drawerFace: "#d0d8ee",
    handle: "#6b7fa3",
    openFill: "#f5f7fc",
    openBack: "#e8ecf5",
    dim: "#2563eb",
    label: "#1c2b3a",
    ui: {
      bg: "#ffffff",
      panel: "#f7f9fc",
      border: "#d1d9e6",
      text: "#1c2b3a",
      accent: "#2563eb",
      muted: "#6b7a99",
      inputBg: "#f0f4f9",
      danger: "#ef4444",
      success: "#16a34a",
      warning: "#d97706",
    },
  },
  blueprint: {
    name: "Blueprint",
    canvas: "#0a1e35",
    stroke: "#5aaef7",
    strokeW: 1.2,
    frontFill: "#0d2545",
    doorFill: "#0f2d52",
    sideFill: "#0a1e38",
    topFill: "#0c2240",
    shelfFill: "#112d55",
    drawerFace: "#122f57",
    handle: "#7ec8f8",
    openFill: "#091828",
    openBack: "#0b2040",
    dim: "#60a5fa",
    label: "#93c5fd",
    ui: {
      bg: "#0d2137",
      panel: "#091828",
      border: "#1a3a60",
      text: "#bfdbfe",
      accent: "#3b82f6",
      muted: "#4a7fbb",
      inputBg: "#071525",
      danger: "#f87171",
      success: "#4ade80",
      warning: "#fbbf24",
    },
  },
  workshop: {
    name: "Workshop",
    canvas: "#fdf8f1",
    stroke: "#3b2a1a",
    strokeW: 1.6,
    frontFill: "#ece3d5",
    doorFill: "#ddd0bc",
    sideFill: "#c9b99e",
    topFill: "#d5c4ae",
    shelfFill: "#c0ae96",
    drawerFace: "#d4c5ae",
    handle: "#7a5c3a",
    openFill: "#f3ede3",
    openBack: "#e8dece",
    dim: "#8b4513",
    label: "#3b2a1a",
    ui: {
      bg: "#fdf8f1",
      panel: "#f5ede0",
      border: "#d4c0a0",
      text: "#3b2a1a",
      accent: "#8b4513",
      muted: "#8b7355",
      inputBg: "#ede3d4",
      danger: "#b91c1c",
      success: "#15803d",
      warning: "#b45309",
    },
  },
};

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULT_OVERALL = { length: 3500, height: 2800, depth: 550, unit: "mm" };
const DEFAULT_MAT = {
  carcass: 18,
  back: 9,
  drawerBottom: 6,
  door: 18,
  shelf: 18,
  drawerSide: 12,
};
const DEFAULT_TOL = { doorGap: 2, edgeBanding: 1, sawKerf: 3 };
const DEFAULT_SECTIONS = [
  {
    id: 1,
    label: "S1",
    width: 500,
    type: "closed",
    doors: 1,
    shelves: 0,
    drawers: { count: 6, height: 110, placement: "bottom" },
  },
  {
    id: 2,
    label: "S2",
    width: 500,
    type: "closed",
    doors: 1,
    shelves: 2,
    drawers: { count: 0, height: 120, placement: "bottom" },
  },
  {
    id: 3,
    label: "S3",
    width: 500,
    type: "closed",
    doors: 1,
    shelves: 2,
    drawers: { count: 0, height: 120, placement: "bottom" },
  },
  {
    id: 5,
    label: "S5",
    width: 500,
    type: "open",
    doors: 0,
    shelves: 4,
    drawers: { count: 0, height: 120, placement: "bottom" },
  },
  {
    id: 4,
    label: "S4",
    width: 500,
    type: "closed",
    doors: 1,
    shelves: 2,
    drawers: { count: 0, height: 120, placement: "bottom" },
  },
  {
    id: 6,
    label: "S6",
    width: 500,
    type: "closed",
    doors: 1,
    shelves: 2,
    drawers: { count: 0, height: 120, placement: "bottom" },
  },
  {
    id: 7,
    label: "S7",
    width: 500,
    type: "closed",
    doors: 1,
    shelves: 0,
    drawers: { count: 6, height: 110, placement: "bottom" },
  },
];

let _nextId = 6;

// ─── CUT LIST ENGINE ──────────────────────────────────────────────────────────
function generateCutList(overall, mat, tol, sections) {
  const { length: L, height: H, depth: D } = overall;
  const {
    carcass: ct,
    back: bt,
    shelf: sht,
    door: dt,
    drawerSide: dst,
    drawerBottom: dbt,
  } = mat;
  const { doorGap: dg, edgeBanding: eb, sawKerf: sk } = tol;
  const parts = [];
  let partNum = 1;

  const add = (part) => {
    parts.push({ ...part, id: partNum++ });
  };

  // ── CARCASS STRUCTURE ──────────────────────────────────────────────────────
  // Top Panel: full width, depth minus back panel
  add({
    part: "Top Panel",
    section: "Carcass",
    material: "Carcass 18mm",
    qty: 1,
    length: L,
    width: D - bt,
    thickness: ct,
    grain: "length",
    edgeBand: "front edge",
    note: "Full width top",
  });

  // Bottom Panel: same
  add({
    part: "Bottom Panel",
    section: "Carcass",
    material: "Carcass 18mm",
    qty: 1,
    length: L,
    width: D - bt,
    thickness: ct,
    grain: "length",
    edgeBand: "front edge",
    note: "Full width bottom",
  });

  // Left Side Panel: height minus top+bottom panels, depth minus back
  add({
    part: "Left Side",
    section: "Carcass",
    material: "Carcass 18mm",
    qty: 1,
    length: H - ct * 2,
    width: D - bt,
    thickness: ct,
    grain: "height",
    edgeBand: "front edge",
    note: "Left side panel",
  });

  // Right Side Panel
  add({
    part: "Right Side",
    section: "Carcass",
    material: "Carcass 18mm",
    qty: 1,
    length: H - ct * 2,
    width: D - bt,
    thickness: ct,
    grain: "height",
    edgeBand: "front edge",
    note: "Right side panel",
  });

  // Back Panel: full H × full L
  add({
    part: "Back Panel",
    section: "Carcass",
    material: "Back Panel 9mm",
    qty: 1,
    length: L - ct * 2,
    width: H,
    thickness: bt,
    grain: "height",
    edgeBand: "none",
    note: "Full back",
  });

  // ── VERTICAL DIVIDERS ─────────────────────────────────────────────────────
  // One divider between each section (n-1 dividers)
  const divQty = sections.length - 1;
  if (divQty > 0) {
    add({
      part: "Vertical Divider",
      section: "Carcass",
      material: "Carcass 18mm",
      qty: divQty,
      length: H - ct * 2,
      width: D - bt,
      thickness: ct,
      grain: "height",
      edgeBand: "front edge",
      note: `${divQty} internal dividers`,
    });
  }

  // ── SECTION-SPECIFIC PARTS ────────────────────────────────────────────────
  // Normalise section widths
  const totalW = sections.reduce((a, s) => a + s.width, 0) || 1;
  const normSec = sections.map((s) => ({
    ...s,
    _w: Math.round((s.width / totalW) * L),
  }));

  normSec.forEach((s) => {
    const sw = s._w; // section width (interior between dividers)
    // Interior width = section width minus divider thickness on each side
    // (outer sections have 1 side = outer wall, inner sections have dividers each side)
    const interiorW = sw - ct; // simplified: subtract one divider worth
    const interiorH = H - ct * 2;
    const interiorD = D - bt - ct; // depth available for shelves/drawers

    // ── DOORS ──
    if (s.type === "closed") {
      const doorW = sw - dg * 2;
      const doorH = H - dg * 2;
      add({
        part: `Door`,
        section: s.label,
        material: "Door 18mm",
        qty: 1,
        length: doorH,
        width: doorW,
        thickness: dt,
        grain: "height",
        edgeBand: "all 4 edges",
        note: `${s.label} full-overlay hinged door`,
      });
    }

    // ── SHELVES ──
    if (s.shelves > 0) {
      const shelfW = interiorW - eb * 2; // subtract edge banding clearance
      const shelfD = interiorD - eb;
      add({
        part: `Shelf`,
        section: s.label,
        material: "Shelf 18mm",
        qty: s.shelves,
        length: shelfW,
        width: shelfD,
        thickness: sht,
        grain: "width",
        edgeBand: "front edge",
        note: `${s.label} adjustable shelves`,
      });
    }

    // ── DRAWERS ──
    const dc = s.drawers.count;
    if (dc > 0) {
      const dh = s.drawers.height; // drawer box height
      const drawerBoxW = interiorW - eb * 2 - 26; // 26mm for slides each side
      const drawerBoxD = interiorD - 50; // 50mm setback for slides
      const drawerFaceW = sw - dg * 2;
      const drawerFaceH = dh - dg;

      // Drawer box sides (2 per drawer)
      add({
        part: `Drawer Side`,
        section: s.label,
        material: "Drawer Side 12mm",
        qty: dc * 2,
        length: drawerBoxD,
        width: dh - 12,
        thickness: dst,
        grain: "length",
        edgeBand: "none",
        note: `${s.label} drawer box sides (×2 per drawer)`,
      });

      // Drawer box front & back (2 per drawer)
      add({
        part: `Drawer Front/Back`,
        section: s.label,
        material: "Drawer Side 12mm",
        qty: dc * 2,
        length: drawerBoxW - dst * 2,
        width: dh - 12,
        thickness: dst,
        grain: "length",
        edgeBand: "none",
        note: `${s.label} drawer box front & back`,
      });

      // Drawer bottom
      add({
        part: `Drawer Bottom`,
        section: s.label,
        material: "Drawer Bottom 6mm",
        qty: dc,
        length: drawerBoxD - 10,
        width: drawerBoxW - dst * 2,
        thickness: dbt,
        grain: "length",
        edgeBand: "none",
        note: `${s.label} drawer base`,
      });

      // Drawer face (decorative front)
      add({
        part: `Drawer Face`,
        section: s.label,
        material: "Drawer Face 18mm",
        qty: dc,
        length: drawerFaceH,
        width: drawerFaceW,
        thickness: dt,
        grain: "height",
        edgeBand: "all 4 edges",
        note: `${s.label} decorative drawer face`,
      });
    }
  });

  return parts;
}

// ─── SHEET OPTIMISER (bin-packing for material sheets) ────────────────────────
const SHEET_SIZES = {
  "Carcass 18mm": { w: 2440, h: 1220, cost: 85 },
  "Back Panel 9mm": { w: 2440, h: 1220, cost: 52 },
  "Door 18mm": { w: 2440, h: 1220, cost: 95 },
  "Shelf 18mm": { w: 2440, h: 1220, cost: 85 },
  "Drawer Side 12mm": { w: 2440, h: 1220, cost: 62 },
  "Drawer Bottom 6mm": { w: 2440, h: 1220, cost: 38 },
  "Drawer Face 18mm": { w: 2440, h: 1220, cost: 95 },
};

function calcSheetUsage(parts) {
  const byMat = {};
  parts.forEach((p) => {
    if (!byMat[p.material]) byMat[p.material] = { parts: [], totalArea: 0 };
    const area = p.length * p.width * p.qty;
    byMat[p.material].parts.push(p);
    byMat[p.material].totalArea += area;
  });

  return Object.entries(byMat)
    .map(([mat, data]) => {
      const sheet = SHEET_SIZES[mat];
      if (!sheet) return null;
      const sheetArea = sheet.w * sheet.h;
      // Add 15% waste factor
      const sheetsNeeded = Math.ceil((data.totalArea / sheetArea) * 1.15);
      const usedArea = data.totalArea;
      const totalArea = sheetsNeeded * sheetArea;
      const efficiency = Math.round((usedArea / totalArea) * 100);
      return {
        material: mat,
        sheetsNeeded,
        efficiency,
        cost: sheetsNeeded * sheet.cost,
        totalArea: Math.round((usedArea / 1e6) * 100) / 100, // m²
        sheetDims: `${sheet.w}×${sheet.h}mm`,
      };
    })
    .filter(Boolean);
}

// ─── SECTION ROW ──────────────────────────────────────────────────────────────
function SectionRow({ s, onChange, onRemove, ui, isDragging, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        background: ui.bg,
        border: `1.5px solid ${isDragging ? ui.accent : ui.border}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 8,
        cursor: "grab",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, opacity: 0.3 }}>⠿</span>
          <input
            value={s.label}
            onChange={(e) => onChange({ ...s, label: e.target.value })}
            style={{
              width: 44,
              padding: "4px 6px",
              borderRadius: 6,
              border: `1px solid ${ui.border}`,
              background: ui.inputBg,
              color: ui.text,
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 600,
            }}
          />
          <select
            value={s.type}
            onChange={(e) => onChange({ ...s, type: e.target.value })}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: `1px solid ${ui.border}`,
              background: ui.inputBg,
              color: ui.text,
              fontFamily: FONT,
              fontSize: 11,
            }}
          >
            <option value="closed">Closed</option>
            <option value="open">Open</option>
          </select>
        </div>
        <button
          onClick={onRemove}
          style={{
            background: "transparent",
            border: "none",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            padding: "0 4px",
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <label style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}>
          Width (mm)
          <input
            type="number"
            min={50}
            max={2000}
            value={s.width}
            onChange={(e) => onChange({ ...s, width: Number(e.target.value) })}
            style={{
              display: "block",
              width: "100%",
              padding: "5px 7px",
              borderRadius: 6,
              border: `1px solid ${ui.border}`,
              background: ui.inputBg,
              color: ui.text,
              fontFamily: FONT,
              fontSize: 12,
              marginTop: 3,
            }}
          />
        </label>
        <label style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}>
          Shelves
          <input
            type="number"
            min={0}
            max={20}
            value={s.shelves}
            onChange={(e) =>
              onChange({ ...s, shelves: Number(e.target.value) })
            }
            style={{
              display: "block",
              width: "100%",
              padding: "5px 7px",
              borderRadius: 6,
              border: `1px solid ${ui.border}`,
              background: ui.inputBg,
              color: ui.text,
              fontFamily: FONT,
              fontSize: 12,
              marginTop: 3,
            }}
          />
        </label>
      </div>
      {/* Drawers */}
      <div
        style={{
          background: ui.inputBg,
          borderRadius: 8,
          padding: "8px 10px",
          border: `1px solid ${ui.border}`,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: ui.accent,
            fontFamily: FONT,
            marginBottom: 5,
            fontWeight: 600,
            letterSpacing: 0.8,
          }}
        >
          DRAWERS
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
          }}
        >
          {[
            ["Count", 0, 20, "count"],
            ["Height mm", 40, 500, "height"],
          ].map(([lbl, mn, mx, key]) => (
            <label
              key={key}
              style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}
            >
              {lbl}
              <input
                type="number"
                min={mn}
                max={mx}
                value={s.drawers[key]}
                onChange={(e) =>
                  onChange({
                    ...s,
                    drawers: { ...s.drawers, [key]: Number(e.target.value) },
                  })
                }
                style={{
                  display: "block",
                  width: "100%",
                  padding: "4px 6px",
                  borderRadius: 5,
                  border: `1px solid ${ui.border}`,
                  background: ui.bg,
                  color: ui.text,
                  fontFamily: FONT,
                  fontSize: 11,
                  marginTop: 2,
                }}
              />
            </label>
          ))}
          <label style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}>
            Placement
            <select
              value={s.drawers.placement}
              onChange={(e) =>
                onChange({
                  ...s,
                  drawers: { ...s.drawers, placement: e.target.value },
                })
              }
              style={{
                display: "block",
                width: "100%",
                padding: "4px 6px",
                borderRadius: 5,
                border: `1px solid ${ui.border}`,
                background: ui.bg,
                color: ui.text,
                fontFamily: FONT,
                fontSize: 11,
                marginTop: 2,
              }}
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="full">Full</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [overall, setOverall] = useState(DEFAULT_OVERALL);
  const [mat, setMat] = useState(DEFAULT_MAT);
  const [tol, setTol] = useState(DEFAULT_TOL);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [themeKey, setThemeKey] = useState("technical");
  const [mainTab, setMainTab] = useState("drawing"); // drawing | cutlist
  const [drawingView, setDrawingView] = useState("3d");
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const svgRef = useRef(null);

  const theme = THEMES[themeKey];
  const ui = theme.ui;
  const canvasW = 820,
    canvasH = 520;

  // ── Generate cut list ──
  const cutList = useMemo(
    () => generateCutList(overall, mat, tol, sections),
    [overall, mat, tol, sections],
  );
  const sheetUsage = useMemo(() => calcSheetUsage(cutList), [cutList]);

  // ── Download helpers ──
  const getFilename = (ext) =>
    `cabinet_${overall.length}x${overall.height}x${overall.depth}_${drawingView}.${ext}`;

  const downloadSVG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = getFilename("svg");
    a.click();
  };

  const downloadPNG = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    setDownloading(true);
    try {
      const clone = svg.cloneNode(true);
      clone.setAttribute("width", canvasW);
      clone.setAttribute("height", canvasH);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const svgData = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const w = canvasW * scale;
        const h = canvasH * scale;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (theme.canvas) {
          ctx.fillStyle = theme.canvas;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = getFilename("png");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloading(false);
      };
      img.onerror = (e) => {
        console.error("Image loading failed", e);
        URL.revokeObjectURL(url);
        setDownloading(false);
      };
      img.src = url;
    } catch (e) {
      console.error("PNG export error:", e);
      setDownloading(false);
    }
  };

  const downloadCSV = () => {
    const headers = [
      "#",
      "Part",
      "Section",
      "Material",
      "Qty",
      "Length(mm)",
      "Width(mm)",
      "Thickness(mm)",
      "Grain",
      "Edge Band",
      "Notes",
    ];
    const rows = cutList.map((p) => [
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
      p.note,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cutlist_${overall.length}x${overall.height}x${overall.depth}.csv`;
    a.click();
  };

  // ── Drag reorder ──
  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => {
    e.preventDefault();
    setOverIdx(i);
  };
  const handleDrop = () => {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const n = [...sections];
    const [m] = n.splice(dragIdx, 1);
    n.splice(overIdx, 0, m);
    setSections(n);
    setDragIdx(null);
    setOverIdx(null);
  };

  const addSection = () =>
    setSections((p) => [
      ...p,
      {
        id: _nextId++,
        label: `S${_nextId - 1}`,
        width: 350,
        type: "closed",
        shelves: 2,
        drawers: { count: 0, height: 120, placement: "bottom" },
      },
    ]);
  const removeSection = (id) =>
    setSections((p) => p.filter((s) => s.id !== id));
  const updateSection = (upd) =>
    setSections((p) => p.map((s) => (s.id === upd.id ? upd : s)));
  const totalMm = sections.reduce((a, s) => a + s.width, 0);

  const containerBg =
    themeKey === "blueprint"
      ? "linear-gradient(135deg,#071525,#0d2137)"
      : themeKey === "workshop"
        ? "linear-gradient(135deg,#f5efe6,#ece3d5)"
        : "linear-gradient(135deg,#eef2f8,#f5f7fb)";

  const tabBtn = (label, key, icon) => (
    <button
      onClick={() => setMainTab(key)}
      style={{
        padding: "8px 18px",
        borderRadius: 8,
        fontFamily: FONT,
        fontSize: 12,
        cursor: "pointer",
        fontWeight: 600,
        border: `2px solid ${mainTab === key ? ui.accent : ui.border}`,
        background: mainTab === key ? ui.accent : ui.bg,
        color: mainTab === key ? "#fff" : ui.text,
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.15s",
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: containerBg,
        padding: 20,
        fontFamily: FONT,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              color: ui.text,
              fontFamily: FONT,
              fontWeight: 600,
              letterSpacing: "-0.5px",
            }}
          >
            Cabinet Designer
          </h1>
          <span style={{ fontSize: 10, color: ui.muted }}>
            Configure · Visualise · Cut List
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {tabBtn(
            "Drawing",
            "drawing",
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect
                x="2"
                y="2"
                width="12"
                height="12"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="2"
                y1="6"
                x2="14"
                y2="6"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="6"
                y1="6"
                x2="6"
                y2="14"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>,
          )}
          {tabBtn(
            `Cut List (${cutList.reduce((a, p) => a + p.qty, 0)})`,
            "cutlist",
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <line
                x1="3"
                y1="4"
                x2="13"
                y2="4"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="3"
                y1="8"
                x2="10"
                y2="8"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="3"
                y1="12"
                x2="12"
                y2="12"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>,
          )}
        </div>
      </div>

      <div
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        {/* ─── LEFT CONFIG PANEL ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Dimensions */}
          <div
            style={{
              background: ui.bg,
              border: `1px solid ${ui.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: ui.accent,
                marginBottom: 10,
                letterSpacing: 1,
              }}
            >
              CABINET DIMENSIONS
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
                marginBottom: 8,
              }}
            >
              {[
                ["Length", "length"],
                ["Height", "height"],
                ["Depth", "depth"],
              ].map(([lbl, key]) => (
                <label key={key} style={{ fontSize: 10, color: ui.muted }}>
                  {lbl} (mm)
                  <input
                    type="number"
                    min={100}
                    value={overall[key]}
                    onChange={(e) =>
                      setOverall((o) => ({
                        ...o,
                        [key]: Number(e.target.value),
                      }))
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: 7,
                      border: `1px solid ${ui.border}`,
                      background: ui.inputBg,
                      color: ui.text,
                      fontFamily: FONT,
                      fontSize: 12,
                      marginTop: 3,
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Materials */}
          <div
            style={{
              background: ui.bg,
              border: `1px solid ${ui.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: ui.accent,
                marginBottom: 10,
                letterSpacing: 1,
              }}
            >
              MATERIAL THICKNESS (mm)
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              {[
                ["Carcass", "carcass"],
                ["Back Panel", "back"],
                ["Shelf", "shelf"],
                ["Door", "door"],
                ["Drawer Side", "drawerSide"],
                ["Drawer Base", "drawerBottom"],
              ].map(([lbl, key]) => (
                <label key={key} style={{ fontSize: 10, color: ui.muted }}>
                  {lbl}
                  <input
                    type="number"
                    min={3}
                    max={36}
                    value={mat[key]}
                    onChange={(e) =>
                      setMat((m) => ({ ...m, [key]: Number(e.target.value) }))
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "5px 7px",
                      borderRadius: 6,
                      border: `1px solid ${ui.border}`,
                      background: ui.inputBg,
                      color: ui.text,
                      fontFamily: FONT,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Tolerances */}
          <div
            style={{
              background: ui.bg,
              border: `1px solid ${ui.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: ui.accent,
                marginBottom: 10,
                letterSpacing: 1,
              }}
            >
              TOLERANCES (mm)
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8,
              }}
            >
              {[
                ["Door Gap", "doorGap"],
                ["Edge Band", "edgeBanding"],
                ["Saw Kerf", "sawKerf"],
              ].map(([lbl, key]) => (
                <label key={key} style={{ fontSize: 10, color: ui.muted }}>
                  {lbl}
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={tol[key]}
                    onChange={(e) =>
                      setTol((t) => ({ ...t, [key]: Number(e.target.value) }))
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "5px 7px",
                      borderRadius: 6,
                      border: `1px solid ${ui.border}`,
                      background: ui.inputBg,
                      color: ui.text,
                      fontFamily: FONT,
                      fontSize: 11,
                      marginTop: 2,
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Theme (drawing only) */}
          {mainTab === "drawing" && (
            <div
              style={{
                background: ui.bg,
                border: `1px solid ${ui.border}`,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 10, color: ui.muted }}>VIEW</span>
                {["3d", "elevation"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setDrawingView(v)}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 7,
                      fontFamily: FONT,
                      fontSize: 11,
                      cursor: "pointer",
                      border: `1.5px solid ${drawingView === v ? ui.accent : ui.border}`,
                      background: drawingView === v ? ui.accent : ui.inputBg,
                      color: drawingView === v ? "#fff" : ui.text,
                    }}
                  >
                    {v === "3d" ? "3D Isometric" : "Front Elevation"}
                  </button>
                ))}
                <span style={{ fontSize: 10, color: ui.muted, marginLeft: 6 }}>
                  THEME
                </span>
                <select
                  value={themeKey}
                  onChange={(e) => setThemeKey(e.target.value)}
                  style={{
                    padding: "5px 9px",
                    borderRadius: 7,
                    border: `1px solid ${ui.border}`,
                    background: ui.inputBg,
                    color: ui.text,
                    fontFamily: FONT,
                    fontSize: 11,
                  }}
                >
                  {Object.entries(THEMES).map(([k, th]) => (
                    <option key={k} value={k}>
                      {th.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Sections */}
          <div
            style={{
              background: ui.bg,
              border: `1px solid ${ui.border}`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: ui.accent,
                    letterSpacing: 1,
                  }}
                >
                  SECTIONS
                </span>
                <span style={{ fontSize: 10, color: ui.muted, marginLeft: 8 }}>
                  {sections.length} · {totalMm}mm
                  {totalMm !== overall.length && (
                    <span style={{ color: "#d97706", marginLeft: 4 }}>
                      → scaled
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={addSection}
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: `1.5px dashed ${ui.accent}`,
                  background: "transparent",
                  color: ui.accent,
                  cursor: "pointer",
                  fontFamily: FONT,
                  fontSize: 10,
                }}
              >
                + Add
              </button>
            </div>
            <div style={{ maxHeight: 360, overflowY: "auto", paddingRight: 2 }}>
              {sections.map((s, i) => (
                <div
                  key={s.id}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={handleDrop}
                  style={{
                    opacity: dragIdx === i ? 0.4 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  <SectionRow
                    s={s}
                    ui={ui}
                    isDragging={dragIdx === i}
                    onDragStart={() => handleDragStart(i)}
                    onChange={updateSection}
                    onRemove={() => removeSection(s.id)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div
            style={{
              background: ui.bg,
              border: `1px solid ${ui.border}`,
              borderRadius: 10,
              padding: "9px 14px",
            }}
          >
            <div style={{ fontSize: 10, color: ui.muted }}>
              {sections.filter((s) => s.type === "open").length} open ·{" "}
              {sections.filter((s) => s.type === "closed").length} closed ·{" "}
              {sections.filter((s) => s.drawers.count > 0).length} w/ drawers ·{" "}
              {sections.reduce((a, s) => a + s.drawers.count, 0)} total drawers
              ·{" "}
              <span style={{ color: ui.accent }}>
                £{sheetUsage.reduce((a, s) => a + s.cost, 0)} est. material
              </span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT CONTENT PANEL ─── */}
        <div
          style={{
            background: ui.bg,
            border: `1px solid ${ui.border}`,
            borderRadius: 12,
            padding: 14,
            minHeight: 600,
          }}
        >
          {mainTab === "drawing" ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: ui.accent,
                    letterSpacing: 1,
                  }}
                >
                  {drawingView === "3d" ? "3D ISOMETRIC" : "FRONT ELEVATION"}{" "}
                  OUTPUT
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={downloadSVG}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 12px",
                      borderRadius: 7,
                      fontFamily: FONT,
                      fontSize: 10,
                      cursor: "pointer",
                      border: `1.5px solid ${ui.border}`,
                      background: ui.inputBg,
                      color: ui.text,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 2v9M4 7l4 4 4-4M2 13h12"
                        stroke={ui.text}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    SVG
                  </button>
                  <button
                    onClick={downloadPNG}
                    disabled={downloading}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 14px",
                      borderRadius: 7,
                      fontFamily: FONT,
                      fontSize: 10,
                      cursor: downloading ? "wait" : "pointer",
                      border: `1.5px solid ${downloading ? ui.border : ui.accent}`,
                      background: downloading ? ui.inputBg : ui.accent,
                      color: downloading ? ui.muted : "#fff",
                      opacity: downloading ? 0.7 : 1,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 2v9M4 7l4 4 4-4M2 13h12"
                        stroke={downloading ? ui.muted : "#fff"}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {downloading ? "Saving…" : "PNG"}
                  </button>
                </div>
              </div>
              <div
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  border: `1px solid ${ui.border}`,
                }}
              >
                {drawingView === "3d" ? (
                  <IsoView
                    overall={overall}
                    mat={mat}
                    tol={tol}
                    sections={sections}
                    theme={theme}
                    width={canvasW}
                    height={canvasH}
                    svgRef={svgRef}
                    FONT={FONT}
                  />
                ) : (
                  <ElevationView
                    overall={overall}
                    mat={mat}
                    tol={tol}
                    sections={sections}
                    theme={theme}
                    width={canvasW}
                    height={canvasH}
                    svgRef={svgRef}
                    FONT={FONT}
                  />
                )}
              </div>
              <div style={{ marginTop: 8, fontSize: 9, color: ui.muted }}>
                Drag sections to reorder · SVG = vector · PNG = 2× retina
              </div>
            </>
          ) : (
            <CutListView
              parts={cutList}
              sheetUsage={sheetUsage}
              ui={ui}
              overall={overall}
              onDownloadCSV={downloadCSV}
              FONT={FONT}
            />
          )}
        </div>
      </div>
    </div>
  );
}
