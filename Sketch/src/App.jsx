import { useState, useMemo, useRef, useEffect } from "react";

// ─── THEMES ──────────────────────────────────────────────────────────────────
const THEMES = {
  technical: {
    name: "Technical",
    bg: "#f0f2f5",
    canvas: "#ffffff",
    stroke: "#1c2b3a",
    strokeW: 1.4,
    frontFill: "#eef1f6",
    doorFill: "#dde4f0",
    sideFill: "#c8d3e8",
    topFill: "#d4dcea",
    shelfFill: "#bfcadc",
    drawerFill: "#e4e9f4",
    drawerFace: "#d0d8ee",
    handle: "#6b7fa3",
    openFill: "#f5f7fc",
    openBack: "#e8ecf5",
    dim: "#2563eb",
    label: "#1c2b3a",
    ui: { bg: "#ffffff", border: "#d1d9e6", text: "#1c2b3a", accent: "#2563eb", muted: "#6b7a99", inputBg: "#f7f9fc" },
  },
  blueprint: {
    name: "Blueprint",
    bg: "#071525",
    canvas: "#0a1e35",
    stroke: "#5aaef7",
    strokeW: 1.2,
    frontFill: "#0d2545",
    doorFill: "#0f2d52",
    sideFill: "#0a1e38",
    topFill: "#0c2240",
    shelfFill: "#112d55",
    drawerFill: "#0f2d52",
    drawerFace: "#122f57",
    handle: "#7ec8f8",
    openFill: "#091828",
    openBack: "#0b2040",
    dim: "#60a5fa",
    label: "#93c5fd",
    ui: { bg: "#0d2137", border: "#1a3a60", text: "#bfdbfe", accent: "#3b82f6", muted: "#4a7fbb", inputBg: "#091828" },
  },
  workshop: {
    name: "Workshop",
    bg: "#f5efe6",
    canvas: "#fdf8f1",
    stroke: "#3b2a1a",
    strokeW: 1.6,
    frontFill: "#ece3d5",
    doorFill: "#ddd0bc",
    sideFill: "#c9b99e",
    topFill: "#d5c4ae",
    shelfFill: "#c0ae96",
    drawerFill: "#ddd0bc",
    drawerFace: "#d4c5ae",
    handle: "#7a5c3a",
    openFill: "#f3ede3",
    openBack: "#e8dece",
    dim: "#8b4513",
    label: "#3b2a1a",
    ui: { bg: "#fdf8f1", border: "#d4c0a0", text: "#3b2a1a", accent: "#8b4513", muted: "#8b7355", inputBg: "#f5ede0" },
  },
};

// ─── FONTS ───────────────────────────────────────────────────────────────────
const FONT = "'DM Mono', 'Courier New', monospace";

// ─── DEFAULT SPEC ─────────────────────────────────────────────────────────────
const DEFAULT_OVERALL = { length: 3500, height: 2800, depth: 550, unit: "mm" };
const DEFAULT_CARCASS_T = 18;

const newSection = (id) => ({
  id,
  label: `S${id}`,
  width: 450,
  type: "closed", // closed | open
  doors: 1,
  shelves: 2,
  drawers: { count: 0, height: 120, placement: "bottom" }, // placement: top | bottom | full
});

const DEFAULT_SECTIONS = [
  { id: 1, label: "S1", width: 500, type: "closed", doors: 1, shelves: 0, drawers: { count: 6, height: 110, placement: "bottom" } },
  { id: 2, label: "S2", width: 500, type: "closed", doors: 1, shelves: 2, drawers: { count: 0, height: 120, placement: "bottom" } },
  { id: 3, label: "S3", width: 500, type: "closed", doors: 1, shelves: 2, drawers: { count: 0, height: 120, placement: "bottom" } },
  { id: 5, label: "S5", width: 500, type: "open",   doors: 0, shelves: 4, drawers: { count: 0, height: 120, placement: "bottom" } },
  { id: 4, label: "S4", width: 500, type: "closed", doors: 1, shelves: 2, drawers: { count: 0, height: 120, placement: "bottom" } },
  { id: 6, label: "S6", width: 500, type: "closed", doors: 1, shelves: 2, drawers: { count: 0, height: 120, placement: "bottom" } },
  { id: 7, label: "S7", width: 500, type: "closed", doors: 1, shelves: 0, drawers: { count: 6, height: 110, placement: "bottom" } },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function normSections(totalMm, sections) {
  const sum = sections.reduce((a, s) => a + (s.width || 0), 0);
  if (!sum) return sections.map(s => ({ ...s, _w: 0 }));
  const k = totalMm / sum;
  return sections.map(s => ({ ...s, _w: (s.width || 0) * k }));
}

// ─── ELEVATION VIEW ──────────────────────────────────────────────────────────
function ElevationView({ overall, carcassT, sections, theme: t, width, height, svgRef }) {
  const { length: Lmm, height: Hmm, unit } = overall;
  const norm = useMemo(() => normSections(Lmm, sections), [Lmm, sections]);

  const ML = 64, MR = 20, MT = 36, MB = 56;
  const dw = width - ML - MR, dh = height - MT - MB;
  const scale = Math.min(dw / Lmm, dh / Hmm);
  const mm = v => v * scale;
  const Wpx = mm(Lmm), Hpx = mm(Hmm);
  const x0 = ML + (dw - Wpx) / 2, y0 = MT + (dh - Hpx) / 2;
  const ct = mm(carcassT);

  let curX = 0;
  const secPx = norm.map(s => {
    const out = { ...s, px: x0 + mm(curX), pw: mm(s._w) };
    curX += s._w;
    return out;
  });

  return (
    <svg ref={svgRef} width={width} height={height} style={{ background: t.canvas, borderRadius: 10 }}>
      <defs>
        <marker id="as" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M7,1 L1,3.5 L7,6" fill="none" stroke={t.dim} strokeWidth="1.2" />
        </marker>
        <marker id="ae" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M1,1 L7,3.5 L1,6" fill="none" stroke={t.dim} strokeWidth="1.2" />
        </marker>
      </defs>

      {/* Title */}
      <text x={x0} y={MT - 10} fontSize="12" fill={t.label} fontFamily={FONT} fontWeight="600" opacity={0.85}>
        FRONT ELEVATION — {Lmm}×{Hmm} {unit}
      </text>

      {/* Outer shell */}
      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill={t.frontFill} stroke={t.stroke} strokeWidth={t.strokeW * 1.5} />

      {/* Top/bottom rails */}
      <rect x={x0} y={y0} width={Wpx} height={ct} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      <rect x={x0} y={y0 + Hpx - ct} width={Wpx} height={ct} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />

      {/* Left/right sides */}
      <rect x={x0} y={y0} width={ct} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      <rect x={x0 + Wpx - ct} y={y0} width={ct} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />

      {/* Sections */}
      {secPx.map((s, i) => {
        const isFirst = i === 0, isLast = i === secPx.length - 1;
        const cx = s.px + (isFirst ? ct : 0);
        const cy = y0 + ct;
        const cw = Math.max(2, s.pw - (isFirst ? ct : 0) - (isLast ? ct : 0));
        const ch = Hpx - ct * 2;

        // Divider panel (not first)
        const divEl = i > 0 && (
          <rect x={s.px} y={y0} width={ct} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />
        );

        if (s.type === "open") {
          return (
            <g key={s.id}>
              {divEl}
              <rect x={cx} y={cy} width={cw} height={ch} fill={t.openFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.7} />
              <rect x={cx + 2} y={cy + 2} width={cw - 4} height={ch - 4} fill={t.openBack} stroke="none" opacity={0.5} />
              {/* Shelves */}
              {Array.from({ length: s.shelves }).map((_, k) => {
                const sy = cy + ((k + 1) * ch) / (s.shelves + 1);
                const st = Math.max(4, mm(carcassT) * 0.4);
                return <rect key={k} x={cx + 3} y={sy - st / 2} width={cw - 6} height={st} fill={t.shelfFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.6} />;
              })}
              <text x={cx + 6} y={cy + 18} fontSize="10" fill={t.label} fontFamily={FONT} opacity={0.7}>{s.label}</text>
            </g>
          );
        }

        // Closed — door + optional shelves + drawers
        const dc = clamp(s.drawers.count, 0, 20);
        const placement = s.drawers.placement || "bottom";
        const dhPx = mm(s.drawers.height || 120);
        const shelvesCount = s.shelves || 0;

        // Drawer area height
        const totalDrawerH = dc * dhPx;
        // Decide where drawer block starts
        let drawerAreaY;
        if (placement === "top") drawerAreaY = cy;
        else if (placement === "bottom") drawerAreaY = cy + ch - totalDrawerH;
        else drawerAreaY = cy; // full = start from top

        // Clamp to content area
        const safeDrawerH = Math.min(totalDrawerH, ch);
        const safeDrawerAreaY = placement === "bottom" ? cy + ch - safeDrawerH : cy;
        const useDhPx = dc > 0 ? safeDrawerH / dc : dhPx;

        // Shelf area: remaining space
        const shelfAreaY = placement === "bottom" || placement === "full" ? cy : cy + safeDrawerH;
        const shelfAreaH = ch - safeDrawerH;

        return (
          <g key={s.id}>
            {divEl}
            {/* Door face */}
            <rect x={s.px + 2} y={y0 + 2} width={s.pw - 4} height={Hpx - 4} fill={t.doorFill} stroke={t.stroke} strokeWidth={t.strokeW} />
            <rect x={s.px + 9} y={y0 + 9} width={s.pw - 18} height={Hpx - 18} fill="none" stroke={t.stroke} strokeWidth={0.5} opacity={0.25} />

            {/* Handle */}
            {(() => {
              const hx = s.px + s.pw * 0.78;
              const hy1 = y0 + Hpx * 0.42;
              const hy2 = y0 + Hpx * 0.58;
              return (
                <>
                  <rect x={hx - 3} y={hy1 + 1} width={6} height={hy2 - hy1} rx={3} fill="rgba(0,0,0,0.1)" />
                  <rect x={hx - 3} y={hy1} width={6} height={hy2 - hy1} rx={3} fill={t.handle} stroke={t.stroke} strokeWidth={0.8} />
                </>
              );
            })()}

            {/* Drawers (rendered as they'd appear inside — visible through ghost door) */}
            {dc > 0 && Array.from({ length: dc }).map((_, k) => {
              const dy = safeDrawerAreaY + k * useDhPx;
              return (
                <g key={k}>
                  <rect x={cx + 2} y={dy + 2} width={cw - 4} height={useDhPx - 4} fill={t.drawerFace} stroke={t.stroke} strokeWidth={t.strokeW * 0.7} opacity={0.55} />
                  <line x1={cx + cw * 0.25} y1={dy + useDhPx / 2} x2={cx + cw * 0.75} y2={dy + useDhPx / 2} stroke={t.handle} strokeWidth={1.8} opacity={0.55} />
                </g>
              );
            })}

            {/* Shelves (ghost) */}
            {shelvesCount > 0 && dc < 1 && Array.from({ length: shelvesCount }).map((_, k) => {
              const sy = shelfAreaY + ((k + 1) * shelfAreaH) / (shelvesCount + 1);
              return <line key={k} x1={cx + 4} y1={sy} x2={cx + cw - 4} y2={sy} stroke={t.stroke} strokeWidth={1.1} opacity={0.3} />;
            })}

            <text x={s.px + 6} y={y0 + 20} fontSize="10" fill={t.label} fontFamily={FONT} opacity={0.6}>{s.label}</text>
          </g>
        );
      })}

      {/* Outer border on top */}
      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill="none" stroke={t.stroke} strokeWidth={t.strokeW * 1.8} />

      {/* Width dim */}
      <line x1={x0} y1={y0 + Hpx + 22} x2={x0 + Wpx} y2={y0 + Hpx + 22} stroke={t.dim} strokeWidth={1} markerStart="url(#as)" markerEnd="url(#ae)" />
      <text x={(x0 + x0 + Wpx) / 2} y={y0 + Hpx + 36} fontSize="11" fill={t.dim} textAnchor="middle" fontFamily={FONT}>{Lmm}{unit}</text>
      <line x1={x0} y1={y0 + Hpx + 10} x2={x0} y2={y0 + Hpx + 26} stroke={t.dim} strokeWidth={0.8} />
      <line x1={x0 + Wpx} y1={y0 + Hpx + 10} x2={x0 + Wpx} y2={y0 + Hpx + 26} stroke={t.dim} strokeWidth={0.8} />

      {/* Height dim */}
      <line x1={x0 - 26} y1={y0} x2={x0 - 26} y2={y0 + Hpx} stroke={t.dim} strokeWidth={1} markerStart="url(#as)" markerEnd="url(#ae)" />
      <text x={x0 - 28} y={(y0 * 2 + Hpx) / 2} fontSize="11" fill={t.dim} textAnchor="middle" fontFamily={FONT} transform={`rotate(-90,${x0 - 28},${(y0 * 2 + Hpx) / 2})`}>{Hmm}{unit}</text>
      <line x1={x0 - 10} y1={y0} x2={x0 - 30} y2={y0} stroke={t.dim} strokeWidth={0.8} />
      <line x1={x0 - 10} y1={y0 + Hpx} x2={x0 - 30} y2={y0 + Hpx} stroke={t.dim} strokeWidth={0.8} />
    </svg>
  );
}

// ─── 3D ISOMETRIC VIEW ────────────────────────────────────────────────────────
function IsoView({ overall, carcassT, sections, theme: t, width, height, svgRef }) {
  const { length: Lmm, height: Hmm, depth: Dmm, unit } = overall;
  const norm = useMemo(() => normSections(Lmm, sections), [Lmm, sections]);

  const ML = 50, MR = 160, MT = 50, MB = 60;
  const dw = width - ML - MR, dh = height - MT - MB;

  const ISO_DX = 0.43, ISO_DY = 0.28;
  const projX = Dmm * ISO_DX, projY = Dmm * ISO_DY;
  const scale = Math.min(dw / (Lmm + projX), dh / (Hmm + projY)) * 0.93;
  const mm = v => v * scale;

  const Wpx = mm(Lmm), Hpx = mm(Hmm);
  const dx = mm(Dmm) * ISO_DX, dy = mm(Dmm) * ISO_DY;
  const ct = mm(carcassT);

  const x0 = ML, y0 = MT + dy;

  // iso transform
  const ip = (fx, fy, d = 0) => ({ x: fx + d * dx, y: fy - d * dy });
  const poly = (...pts) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Front face corners
  const FL = ip(x0, y0), FR = ip(x0 + Wpx, y0);
  const FBL = ip(x0, y0 + Hpx), FBR = ip(x0 + Wpx, y0 + Hpx);
  const BL = ip(x0, y0, 1), BR = ip(x0 + Wpx, y0, 1);
  const BBR = ip(x0 + Wpx, y0 + Hpx, 1);

  let curX = 0;
  const secPx = norm.map(s => {
    const out = { ...s, px: x0 + mm(curX), pw: mm(s._w) };
    curX += s._w;
    return out;
  });

  return (
    <svg ref={svgRef} width={width} height={height} style={{ background: t.canvas, borderRadius: 10 }}>
      <defs>
        <marker id="as3" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M7,1 L1,3.5 L7,6" fill="none" stroke={t.dim} strokeWidth="1.2" />
        </marker>
        <marker id="ae3" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M1,1 L7,3.5 L1,6" fill="none" stroke={t.dim} strokeWidth="1.2" />
        </marker>
        <filter id="sh"><feDropShadow dx="3" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.18)" /></filter>
      </defs>

      {/* Title */}
      <text x={x0} y={30} fontSize="12" fill={t.label} fontFamily={FONT} fontWeight="600" opacity={0.85}>
        3D VIEW — {Lmm}×{Hmm}×{Dmm} {unit}
      </text>

      {/* TOP FACE */}
      <polygon points={poly(FL, FR, BR, BL)} fill={t.topFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      {Array.from({ length: 10 }).map((_, i) => {
        const f = (i + 1) / 11;
        const p1 = { x: FL.x + f * (FR.x - FL.x), y: FL.y };
        const p2 = { x: BL.x + f * (BR.x - BL.x), y: BL.y };
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={t.stroke} strokeWidth={0.5} opacity={0.18} />;
      })}

      {/* SIDE (right) FACE */}
      <polygon points={poly(FR, BR, BBR, FBR)} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      {Array.from({ length: 8 }).map((_, i) => {
        const f = (i + 1) / 9;
        const p1 = { x: FR.x + f * (FBR.x - FR.x), y: FR.y + f * (FBR.y - FR.y) };
        const p2 = { x: BR.x + f * (BBR.x - BR.x), y: BR.y + f * (BBR.y - BR.y) };
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={t.stroke} strokeWidth={0.5} opacity={0.15} />;
      })}

      {/* FRONT BASE */}
      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill={t.frontFill} stroke={t.stroke} strokeWidth={t.strokeW} />

      {/* Top & bottom rails */}
      <rect x={x0} y={y0} width={Wpx} height={ct} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />
      <rect x={x0} y={y0 + Hpx - ct} width={Wpx} height={ct} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />

      {/* SECTIONS */}
      {secPx.map((s, i) => {
        const isFirst = i === 0, isLast = i === secPx.length - 1;
        const cx = s.px + (isFirst ? ct : 0);
        const cy = y0 + ct;
        const cw = Math.max(2, s.pw - (isFirst ? ct : 0) - (isLast ? ct : 0));
        const ch = Hpx - ct * 2;
        const dc = clamp(s.drawers.count, 0, 20);
        const placement = s.drawers.placement || "bottom";
        const dhPx = mm(s.drawers.height || 120);
        const totalDH = dc * dhPx;
        const safeDrawerH = Math.min(totalDH, ch);
        const useDhPx = dc > 0 ? safeDrawerH / dc : dhPx;
        const safeDrawerAreaY = placement === "bottom" ? cy + ch - safeDrawerH : cy;
        const shelfAreaY = placement === "bottom" ? cy : cy + safeDrawerH;
        const shelfAreaH = ch - safeDrawerH;

        // Divider 3D panel (not for first)
        const divEl = i > 0 && (
          <polygon
            key={`div-${i}`}
            points={poly(ip(s.px, y0, 0), ip(s.px, y0, 1), ip(s.px, y0 + Hpx, 1), ip(s.px, y0 + Hpx, 0))}
            fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.7}
          />
        );

        if (s.type === "open") {
          const shelvesCount = s.shelves || 0;
          return (
            <g key={s.id}>
              {divEl}
              {/* Interior visible */}
              <rect x={cx} y={cy} width={cw} height={ch} fill={t.openFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.7} />
              <rect x={cx + 2} y={cy + 2} width={cw - 4} height={ch - 4} fill={t.openBack} stroke="none" opacity={0.5} />
              {/* 3D Shelves */}
              {Array.from({ length: shelvesCount }).map((_, k) => {
                const sy = cy + ((k + 1) * ch) / (shelvesCount + 1);
                const st = Math.max(4, ct * 0.4);
                const shelfDepth = 0.55; // partial depth
                return (
                  <g key={k}>
                    <rect x={cx + 2} y={sy - st / 2} width={cw - 4} height={st} fill={t.shelfFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.6} />
                    {/* Shelf top face in 3D */}
                    <polygon
                      points={poly(ip(cx + 2, sy - st / 2, 0), ip(cx + cw - 4, sy - st / 2, 0), ip(cx + cw - 4, sy - st / 2, shelfDepth), ip(cx + 2, sy - st / 2, shelfDepth))}
                      fill={t.topFill} stroke={t.stroke} strokeWidth={0.5} opacity={0.7}
                    />
                  </g>
                );
              })}
              <text x={cx + 5} y={cy + 18} fontSize="10" fill={t.label} fontFamily={FONT} opacity={0.75}>{s.label}</text>
            </g>
          );
        }

        // Closed section
        return (
          <g key={s.id}>
            {divEl}
            {/* Door */}
            <rect x={s.px + 2} y={y0 + 2} width={s.pw - 4} height={Hpx - 4} fill={t.doorFill} stroke={t.stroke} strokeWidth={t.strokeW} />
            <rect x={s.px + 9} y={y0 + 9} width={s.pw - 18} height={Hpx - 18} fill="none" stroke={t.stroke} strokeWidth={0.5} opacity={0.22} />
            {/* Handle */}
            {(() => {
              const hx = s.px + s.pw * 0.78;
              const hy1 = y0 + Hpx * 0.42;
              const hy2 = y0 + Hpx * 0.58;
              return (
                <>
                  <rect x={hx - 3} y={hy1 + 1.5} width={6} height={hy2 - hy1} rx={3} fill="rgba(0,0,0,0.12)" />
                  <rect x={hx - 3} y={hy1} width={6} height={hy2 - hy1} rx={3} fill={t.handle} stroke={t.stroke} strokeWidth={0.8} />
                  {/* Handle top face (3D) */}
                  <polygon
                    points={poly(ip(hx - 3, hy1, 0), ip(hx + 3, hy1, 0), ip(hx + 3, hy1, 0.15), ip(hx - 3, hy1, 0.15))}
                    fill={t.handle} stroke={t.stroke} strokeWidth={0.5} opacity={0.5}
                  />
                </>
              );
            })()}
            {/* Ghost drawer stacks */}
            {dc > 0 && Array.from({ length: dc }).map((_, k) => {
              const dy2 = safeDrawerAreaY + k * useDhPx;
              return (
                <g key={k} opacity={0.45}>
                  <rect x={cx + 2} y={dy2 + 2} width={cw - 4} height={useDhPx - 4} fill={t.drawerFace} stroke={t.stroke} strokeWidth={0.8} />
                  <line x1={cx + cw * 0.2} y1={dy2 + useDhPx / 2} x2={cx + cw * 0.8} y2={dy2 + useDhPx / 2} stroke={t.handle} strokeWidth={1.6} />
                </g>
              );
            })}
            {/* Ghost shelves */}
            {s.shelves > 0 && dc === 0 && Array.from({ length: s.shelves }).map((_, k) => {
              const sy = shelfAreaY + ((k + 1) * shelfAreaH) / (s.shelves + 1);
              return <line key={k} x1={cx + 4} y1={sy} x2={cx + cw - 4} y2={sy} stroke={t.stroke} strokeWidth={1} opacity={0.25} />;
            })}
            <text x={s.px + 6} y={y0 + 20} fontSize="10" fill={t.label} fontFamily={FONT} opacity={0.6}>{s.label}</text>
          </g>
        );
      })}

      {/* Left/right carcass sides (front) */}
      <rect x={x0} y={y0} width={ct} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      <rect x={x0 + Wpx - ct} y={y0} width={ct} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />

      {/* Outer border */}
      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill="none" stroke={t.stroke} strokeWidth={t.strokeW * 1.8} />

      {/* Depth lines */}
      <line x1={FL.x} y1={FL.y} x2={BL.x} y2={BL.y} stroke={t.stroke} strokeWidth={t.strokeW * 1.4} />
      <line x1={FR.x} y1={FR.y} x2={BR.x} y2={BR.y} stroke={t.stroke} strokeWidth={t.strokeW * 1.4} />
      <line x1={FBR.x} y1={FBR.y} x2={BBR.x} y2={BBR.y} stroke={t.stroke} strokeWidth={t.strokeW * 1.4} />

      {/* Dims */}
      {/* Width */}
      <line x1={x0} y1={y0 + Hpx + 22} x2={x0 + Wpx} y2={y0 + Hpx + 22} stroke={t.dim} strokeWidth={1} markerStart="url(#as3)" markerEnd="url(#ae3)" />
      <text x={(x0 * 2 + Wpx) / 2} y={y0 + Hpx + 36} fontSize="11" fill={t.dim} textAnchor="middle" fontFamily={FONT}>{Lmm}{unit}</text>
      <line x1={x0} y1={y0 + Hpx + 10} x2={x0} y2={y0 + Hpx + 26} stroke={t.dim} strokeWidth={0.8} />
      <line x1={x0 + Wpx} y1={y0 + Hpx + 10} x2={x0 + Wpx} y2={y0 + Hpx + 26} stroke={t.dim} strokeWidth={0.8} />

      {/* Height */}
      <line x1={x0 - 26} y1={y0} x2={x0 - 26} y2={y0 + Hpx} stroke={t.dim} strokeWidth={1} markerStart="url(#as3)" markerEnd="url(#ae3)" />
      <text x={x0 - 28} y={(y0 * 2 + Hpx) / 2} fontSize="11" fill={t.dim} textAnchor="middle" fontFamily={FONT} transform={`rotate(-90,${x0 - 28},${(y0 * 2 + Hpx) / 2})`}>{Hmm}{unit}</text>
      <line x1={x0 - 10} y1={y0} x2={x0 - 30} y2={y0} stroke={t.dim} strokeWidth={0.8} />
      <line x1={x0 - 10} y1={y0 + Hpx} x2={x0 - 30} y2={y0 + Hpx} stroke={t.dim} strokeWidth={0.8} />

      {/* Depth */}
      <line x1={FR.x} y1={FR.y - 10} x2={BR.x} y2={BR.y - 10} stroke={t.dim} strokeWidth={1} markerStart="url(#as3)" markerEnd="url(#ae3)" />
      <text x={(FR.x + BR.x) / 2 + 6} y={(FR.y + BR.y) / 2 - 14} fontSize="11" fill={t.dim} fontFamily={FONT}>{Dmm}{unit}</text>

      {/* Callout labels — right side */}
      {secPx.filter(s => s.type === "open" || s.drawers.count > 0).map((s, i) => {
        const labelX = x0 + Wpx + dx + 14;
        const labelY = y0 + 40 + i * 52;
        const mid = { x: s.px + s.pw / 2, y: y0 + Hpx * 0.5 };
        const isOpen = s.type === "open";
        const text = isOpen ? `${s.label}: Open Shelves (${s.shelves})` : `${s.label}: Drawers ×${s.drawers.count} [${s.drawers.placement}]`;
        return (
          <g key={s.id}>
            <line x1={labelX} y1={labelY} x2={mid.x + 8} y2={mid.y} stroke={t.dim} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.6} />
            <circle cx={mid.x + 8} cy={mid.y} r={3} fill={t.dim} opacity={0.6} />
            <rect x={labelX} y={labelY - 13} width={148} height={18} rx={4} fill={t.canvas} stroke={t.dim} strokeWidth={0.8} opacity={0.9} />
            <text x={labelX + 6} y={labelY} fontSize="9.5" fill={t.dim} fontFamily={FONT}>{text}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── SECTION FORM ROW ─────────────────────────────────────────────────────────
function SectionRow({ s, onChange, onRemove, ui, isDragging, onDragStart }) {
  const inp = (field, val, type = "number", min, max) => (
    <input
      type={type} value={val} min={min} max={max}
      onChange={e => onChange({ ...s, [field]: type === "number" ? Number(e.target.value) : e.target.value })}
      style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: `1px solid ${ui.border}`, background: ui.inputBg, color: ui.text, fontFamily: FONT, fontSize: 11 }}
    />
  );
  const sel = (field, val, opts) => (
    <select
      value={val}
      onChange={e => onChange({ ...s, [field]: e.target.value })}
      style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: `1px solid ${ui.border}`, background: ui.inputBg, color: ui.text, fontFamily: FONT, fontSize: 11 }}
    >
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );

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
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.35 }}>⠿</span>
          <input
            value={s.label}
            onChange={e => onChange({ ...s, label: e.target.value })}
            style={{ width: 44, padding: "4px 6px", borderRadius: 6, border: `1px solid ${ui.border}`, background: ui.inputBg, color: ui.text, fontFamily: FONT, fontSize: 12, fontWeight: 600 }}
          />
          <span style={{ fontSize: 11, color: ui.muted }}>ID: {s.id}</span>
        </div>
        <button onClick={onRemove} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <label style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}>
          Width (mm)
          {inp("width", s.width, "number", 50, 2000)}
        </label>
        <label style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}>
          Type
          {sel("type", s.type, [{ v: "closed", l: "Closed" }, { v: "open", l: "Open" }])}
        </label>
        <label style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}>
          Shelves
          {inp("shelves", s.shelves, "number", 0, 20)}
        </label>
      </div>

      {/* Drawer controls */}
      <div style={{ marginTop: 8, background: ui.inputBg, borderRadius: 8, padding: "8px 10px", border: `1px solid ${ui.border}` }}>
        <div style={{ fontSize: 10, color: ui.accent, fontFamily: FONT, marginBottom: 6, fontWeight: 600 }}>DRAWERS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <label style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}>
            Count
            <input
              type="number" min={0} max={20} value={s.drawers.count}
              onChange={e => onChange({ ...s, drawers: { ...s.drawers, count: Number(e.target.value) } })}
              style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: `1px solid ${ui.border}`, background: ui.bg, color: ui.text, fontFamily: FONT, fontSize: 11 }}
            />
          </label>
          <label style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}>
            Height (mm)
            <input
              type="number" min={40} max={500} value={s.drawers.height}
              onChange={e => onChange({ ...s, drawers: { ...s.drawers, height: Number(e.target.value) } })}
              style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: `1px solid ${ui.border}`, background: ui.bg, color: ui.text, fontFamily: FONT, fontSize: 11 }}
            />
          </label>
          <label style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}>
            Placement
            <select
              value={s.drawers.placement}
              onChange={e => onChange({ ...s, drawers: { ...s.drawers, placement: e.target.value } })}
              style={{ width: "100%", padding: "5px 7px", borderRadius: 6, border: `1px solid ${ui.border}`, background: ui.bg, color: ui.text, fontFamily: FONT, fontSize: 11 }}
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="full">Full Height</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
let nextId = DEFAULT_SECTIONS.reduce((m, s) => Math.max(m, s.id), 0) + 1;

export default function App() {
  const [overall, setOverall] = useState(DEFAULT_OVERALL);
  const [carcassT, setCarcassT] = useState(DEFAULT_CARCASS_T);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [themeKey, setThemeKey] = useState("technical");
  const [view, setView] = useState("3d");
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const theme = THEMES[themeKey];
  const ui = theme.ui;
  const svgRef = useRef(null);

  const getFilename = (ext) => {
    const name = `cabinet_${overall.length}x${overall.height}x${overall.depth}_${view}`;
    return `${name}.${ext}`;
  };

  const downloadSVG = () => {
    const svg = svgRef.current;
    if (!svg) return;
    // Inline the font so it travels with the SVG
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = getFilename("svg"); a.click();
    URL.revokeObjectURL(url);
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
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
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

  // Drag-to-reorder
  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => { e.preventDefault(); setOverIdx(i); };
  const handleDrop = () => {
    if (dragIdx === null || overIdx === null || dragIdx === overIdx) { setDragIdx(null); setOverIdx(null); return; }
    const next = [...sections];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(overIdx, 0, moved);
    setSections(next);
    setDragIdx(null); setOverIdx(null);
  };

  const addSection = () => {
    setSections(prev => [...prev, newSection(nextId++)]);
  };

  const removeSection = (id) => setSections(prev => prev.filter(s => s.id !== id));
  const updateSection = (updated) => setSections(prev => prev.map(s => s.id === updated.id ? updated : s));

  const totalMm = sections.reduce((a, s) => a + s.width, 0);

  const containerBg = themeKey === "blueprint"
    ? "linear-gradient(135deg, #071525 0%, #0d2137 100%)"
    : themeKey === "workshop"
    ? "linear-gradient(135deg, #f5efe6 0%, #ece3d5 100%)"
    : "linear-gradient(135deg, #eef2f8 0%, #f5f7fb 100%)";

  const canvasW = 820, canvasH = 520;

  return (
    <div style={{ minHeight: "100vh", background: containerBg, padding: 20, fontFamily: FONT }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ maxWidth: 1340, margin: "0 auto 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 20, color: ui.text, fontFamily: FONT, fontWeight: 600, letterSpacing: "-0.5px" }}>
            Furniture Sketcher
          </h1>
          <span style={{ fontSize: 11, color: ui.muted }}>Configure sections → View rendered drawing</span>
        </div>
      </div>

      <div style={{ maxWidth: 1340, margin: "0 auto", display: "grid", gridTemplateColumns: "390px 1fr", gap: 14, alignItems: "start" }}>

        {/* ─── LEFT PANEL ─── */}
        <div>
          {/* Overall dimensions */}
          <div style={{ background: ui.bg, border: `1px solid ${ui.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: ui.accent, marginBottom: 10, letterSpacing: 1 }}>CABINET DIMENSIONS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              {[["Length", "length"], ["Height", "height"], ["Depth", "depth"]].map(([label, key]) => (
                <label key={key} style={{ fontSize: 10, color: ui.muted }}>
                  {label} (mm)
                  <input
                    type="number" min={100} value={overall[key]}
                    onChange={e => setOverall(o => ({ ...o, [key]: Number(e.target.value) }))}
                    style={{ display: "block", width: "100%", padding: "6px 8px", borderRadius: 7, border: `1px solid ${ui.border}`, background: ui.inputBg, color: ui.text, fontFamily: FONT, fontSize: 12, marginTop: 3 }}
                  />
                </label>
              ))}
            </div>
            <label style={{ fontSize: 10, color: ui.muted }}>
              Panel Thickness (mm)
              <input
                type="number" min={6} max={36} value={carcassT}
                onChange={e => setCarcassT(Number(e.target.value))}
                style={{ display: "block", width: "50%", padding: "6px 8px", borderRadius: 7, border: `1px solid ${ui.border}`, background: ui.inputBg, color: ui.text, fontFamily: FONT, fontSize: 12, marginTop: 3 }}
              />
            </label>
          </div>

          {/* View + Theme controls */}
          <div style={{ background: ui.bg, border: `1px solid ${ui.border}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: ui.muted, marginRight: 2 }}>VIEW</span>
              {["3d", "elevation"].map(v => (
                <button key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: "6px 12px", borderRadius: 7, fontFamily: FONT, fontSize: 11, cursor: "pointer",
                    border: `1.5px solid ${view === v ? ui.accent : ui.border}`,
                    background: view === v ? ui.accent : ui.inputBg,
                    color: view === v ? "#fff" : ui.text,
                    transition: "all 0.15s",
                  }}
                >{v === "3d" ? "3D Isometric" : "Front Elevation"}</button>
              ))}
              <span style={{ fontSize: 10, color: ui.muted, marginLeft: 8 }}>THEME</span>
              <select
                value={themeKey}
                onChange={e => setThemeKey(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${ui.border}`, background: ui.inputBg, color: ui.text, fontFamily: FONT, fontSize: 11 }}
              >
                {Object.entries(THEMES).map(([k, th]) => <option key={k} value={k}>{th.name}</option>)}
              </select>
            </div>
          </div>

          {/* Sections editor */}
          <div style={{ background: ui.bg, border: `1px solid ${ui.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: ui.accent, letterSpacing: 1 }}>SECTIONS</span>
                <span style={{ fontSize: 10, color: ui.muted, marginLeft: 8 }}>
                  {sections.length} sections · {totalMm}mm total
                  {totalMm !== overall.length && (
                    <span style={{ color: "#f59e0b", marginLeft: 6 }}>→ scaled to {overall.length}mm</span>
                  )}
                </span>
              </div>
              <button
                onClick={addSection}
                style={{ padding: "6px 12px", borderRadius: 7, border: `1.5px dashed ${ui.accent}`, background: "transparent", color: ui.accent, cursor: "pointer", fontFamily: FONT, fontSize: 11 }}
              >+ Add Section</button>
            </div>

            <div style={{ maxHeight: 400, overflowY: "auto", paddingRight: 4 }}>
              {sections.map((s, i) => (
                <div
                  key={s.id}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={handleDrop}
                  style={{ opacity: dragIdx === i ? 0.4 : 1, transition: "opacity 0.15s" }}
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

          {/* Summary */}
          <div style={{ background: ui.bg, border: `1px solid ${ui.border}`, borderRadius: 10, padding: "10px 14px", marginTop: 10 }}>
            <div style={{ fontSize: 10, color: ui.muted, fontFamily: FONT }}>
              {sections.filter(s => s.type === "open").length} open · {sections.filter(s => s.type === "closed").length} closed ·{" "}
              {sections.filter(s => s.drawers.count > 0).length} w/ drawers ·{" "}
              {sections.reduce((a, s) => a + s.drawers.count, 0)} total drawers
            </div>
          </div>
        </div>

        {/* ─── RIGHT PANEL (canvas) ─── */}
        <div style={{ background: ui.bg, border: `1px solid ${ui.border}`, borderRadius: 12, padding: 14, position: "sticky", top: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: ui.accent, letterSpacing: 1 }}>
              OUTPUT — {view === "3d" ? "3D ISOMETRIC" : "FRONT ELEVATION"}
            </div>
            {/* Download buttons */}
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={downloadSVG}
                title="Download as SVG vector file"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 7, fontFamily: FONT, fontSize: 11, cursor: "pointer",
                  border: `1.5px solid ${ui.border}`,
                  background: ui.inputBg, color: ui.text,
                  transition: "all 0.15s",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v9M4 7l4 4 4-4M2 13h12" stroke={ui.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                SVG
              </button>
              <button
                onClick={downloadPNG}
                disabled={downloading}
                title="Download as PNG image (2× retina)"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 14px", borderRadius: 7, fontFamily: FONT, fontSize: 11, cursor: downloading ? "wait" : "pointer",
                  border: `1.5px solid ${downloading ? ui.border : ui.accent}`,
                  background: downloading ? ui.inputBg : ui.accent,
                  color: downloading ? ui.muted : "#fff",
                  transition: "all 0.15s",
                  opacity: downloading ? 0.7 : 1,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v9M4 7l4 4 4-4M2 13h12" stroke={downloading ? ui.muted : "#fff"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {downloading ? "Saving…" : "PNG"}
              </button>
            </div>
          </div>
          <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${ui.border}` }}>
            {view === "3d"
              ? <IsoView overall={overall} carcassT={carcassT} sections={sections} theme={theme} width={canvasW} height={canvasH} svgRef={svgRef} />
              : <ElevationView overall={overall} carcassT={carcassT} sections={sections} theme={theme} width={canvasW} height={canvasH} svgRef={svgRef} />
            }
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: ui.muted }}>
            Tip: Drag section rows to reorder · PNG exports at 2× resolution · SVG is infinitely scalable
          </div>
        </div>
      </div>
    </div>
  );
}