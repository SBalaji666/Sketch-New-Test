import React, { useEffect, useMemo, useRef, useState } from 'react';

// ─── THEMES ──────────────────────────────────────────────────────────────────
const THEMES = {
  clean: {
    name: 'Technical',
    bg: '#f8f9fa',
    panelBg: '#ffffff',
    stroke: '#1a1a2e',
    strokeW: 1.5,
    doorFill: '#eef2f7',
    sideFill: '#d8e0ea',
    topFill: '#e8edf4',
    shelfFill: '#dde4ee',
    drawerFill: '#e8edf4',
    drawerFaceFill: '#f0f4fa',
    handleColor: '#555e7a',
    annotationColor: '#2563eb',
    labelColor: '#1a1a2e',
    openSectionFill: '#f5f7fa',
    shadowColor: 'rgba(0,0,0,0.12)',
  },
  blueprint: {
    name: 'Blueprint',
    bg: '#0d2137',
    panelBg: '#0a1929',
    stroke: '#7eb8f7',
    strokeW: 1.2,
    doorFill: '#0e2647',
    sideFill: '#0b1e38',
    topFill: '#0c2040',
    shelfFill: '#112850',
    drawerFill: '#0e2647',
    drawerFaceFill: '#102d55',
    handleColor: '#93c5fd',
    annotationColor: '#60a5fa',
    labelColor: '#bfdbfe',
    openSectionFill: '#091828',
    shadowColor: 'rgba(0,0,0,0.4)',
  },
  sketch: {
    name: 'Pencil Sketch',
    bg: '#faf8f3',
    panelBg: '#fdfcf8',
    stroke: '#2c2416',
    strokeW: 1.8,
    doorFill: '#f5f1e8',
    sideFill: '#ede7d8',
    topFill: '#f0ece0',
    shelfFill: '#e8e2d4',
    drawerFill: '#ede7d8',
    drawerFaceFill: '#f2ede4',
    handleColor: '#4a3f2e',
    annotationColor: '#4a3f2e',
    labelColor: '#2c2416',
    openSectionFill: '#f8f5ee',
    shadowColor: 'rgba(44,36,22,0.15)',
  },
};

// ─── INITIAL SPEC ─────────────────────────────────────────────────────────────
const initialSpec = {
  type: 'Cupboard',
  dimensions: { overall: { length: 2000, height: 2200, depth: 550, unit: 'mm' } },
  materials: {
    carcass: { material: 'Plywood', thickness: 18 },
    backPanel: { material: 'Plywood', thickness: 9, type: 'Full' },
  },
  tolerances: { doorGap: 2, internalClearance: 3, sawKerf: 3, edgeBanding: { thickness: 2 } },
  structure: { verticalPartitions: 4, horizontalPanels: { top: true, bottom: true } },
  sections: [
    {
      sectionId: 'S1', width: 280, type: 'Closed',
      doors: { count: 1, style: 'Hinged', overlay: 'Full', height: 2200 },
      internalLayout: { drawers: { count: 6, drawerType: 'Box', drawerHeight: 120 } },
    },
    {
      sectionId: 'S2', width: 380, type: 'Closed',
      doors: { count: 1, style: 'Hinged', overlay: 'Full', height: 2200 },
      internalLayout: { shelves: { count: 2, type: 'Fixed', equalSpacing: true } },
    },
    {
      sectionId: 'S3', width: 380, type: 'Closed',
      doors: { count: 1, style: 'Hinged', overlay: 'Full', height: 2200 },
      internalLayout: { shelves: { count: 2, type: 'Fixed', equalSpacing: true } },
    },
    {
      sectionId: 'S4', width: 380, type: 'Closed',
      doors: { count: 1, style: 'Hinged', overlay: 'Full', height: 2200 },
      internalLayout: { shelves: { count: 2, type: 'Fixed', equalSpacing: true } },
    },
    {
      sectionId: 'S5', width: 380, type: 'Closed',
      doors: { count: 1, style: 'Hinged', overlay: 'Full', height: 2200 },
      internalLayout: { shelves: { count: 2, type: 'Fixed', equalSpacing: true } },
    },
    {
      sectionId: 'S6', width: 200, type: 'Open',
      internalLayout: { shelves: { count: 4, type: 'Adjustable', equalSpacing: true } },
    },
  ],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function safeJsonParse(text) {
  try { return { ok: true, value: JSON.parse(text) }; }
  catch (e) { return { ok: false, error: e.message }; }
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function normalizeSections(overallLength, sections) {
  const safeSections = Array.isArray(sections) ? sections : [];
  const sum = safeSections.reduce((a, s) => a + (Number(s.width) || 0), 0);
  if (!overallLength || sum <= 0) return safeSections.map(s => ({ ...s, _normWidth: Number(s.width) || 0 }));
  const scale = overallLength / sum;
  return safeSections.map(s => ({ ...s, _normWidth: (Number(s.width) || 0) * scale }));
}

// ─── DIMENSION ARROW COMPONENT ────────────────────────────────────────────────
function DimArrow({ x1, y1, x2, y2, label, color, offset = 0, vertical = false }) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const arrowSize = 6;

  if (vertical) {
    const ox = x1 + offset;
    return (
      <g>
        <line x1={ox} y1={y1} x2={ox} y2={y2} stroke={color} strokeWidth={1} markerStart="url(#arr-start)" markerEnd="url(#arr-end)" />
        <line x1={x1} y1={y1} x2={ox + 8} y2={y1} stroke={color} strokeWidth={0.8} strokeDasharray="3,2" />
        <line x1={x1} y1={y2} x2={ox + 8} y2={y2} stroke={color} strokeWidth={0.8} strokeDasharray="3,2" />
        <text x={ox - 6} y={midY + 4} fontSize="11" fill={color} textAnchor="middle" fontFamily="'Roboto Mono', monospace" transform={`rotate(-90, ${ox - 6}, ${midY + 4})`}>{label}</text>
      </g>
    );
  }
  return (
    <g>
      <line x1={x1} y1={midY + offset} x2={x2} y2={midY + offset} stroke={color} strokeWidth={1} markerStart="url(#arr-start)" markerEnd="url(#arr-end)" />
      <line x1={x1} y1={y1} x2={x1} y2={midY + offset + 8} stroke={color} strokeWidth={0.8} strokeDasharray="3,2" />
      <line x1={x2} y1={y2} x2={x2} y2={midY + offset + 8} stroke={color} strokeWidth={0.8} strokeDasharray="3,2" />
      <text x={midX} y={midY + offset + 14} fontSize="11" fill={color} textAnchor="middle" fontFamily="'Roboto Mono', monospace">{label}</text>
    </g>
  );
}

// ─── SKETCH VIEW (FRONT ELEVATION) ───────────────────────────────────────────
function SketchView({ spec, theme, width, height }) {
  const t = theme;
  const overall = spec?.dimensions?.overall || {};
  const Lmm = Number(overall.length || 2000);
  const Hmm = Number(overall.height || 2200);
  const unit = overall.unit || 'mm';
  const carcassT = Number(spec?.materials?.carcass?.thickness ?? 18);
  const doorGap = Number(spec?.tolerances?.doorGap ?? 2);

  const sectionsNorm = useMemo(() => normalizeSections(Lmm, spec?.sections), [Lmm, spec?.sections]);

  // Layout
  const marginL = 60, marginR = 24, marginT = 40, marginB = 60;
  const drawW = width - marginL - marginR;
  const drawH = height - marginT - marginB;
  const scale = Math.min(drawW / Lmm, drawH / Hmm);
  const mmToPx = mm => mm * scale;

  const Wpx = Lmm * scale;
  const Hpx = Hmm * scale;
  const x0 = marginL + (drawW - Wpx) / 2;
  const y0 = marginT + (drawH - Hpx) / 2;

  const sectionsPx = useMemo(() => {
    let curX = 0;
    return sectionsNorm.map(s => {
      const w = s._normWidth;
      const out = { ...s, xMm: curX, wMm: w, xPx: x0 + mmToPx(curX), wPx: mmToPx(w) };
      curX += w;
      return out;
    });
  }, [sectionsNorm, x0, scale]);

  const carcassPx = mmToPx(carcassT);

  return (
    <svg width={width} height={height} style={{ background: t.bg }}>
      <defs>
        <marker id="arr-start" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M6,1 L1,3 L6,5" fill="none" stroke={t.annotationColor} strokeWidth="1" />
        </marker>
        <marker id="arr-end" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M1,1 L6,3 L1,5" fill="none" stroke={t.annotationColor} strokeWidth="1" />
        </marker>
        <filter id="shadow" x="-5%" y="-5%" width="115%" height="115%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor={t.shadowColor} />
        </filter>
      </defs>

      {/* Title */}
      <text x={x0} y={marginT - 14} fontSize="13" fill={t.labelColor} fontFamily="'Roboto Mono', monospace" fontWeight="600">
        {spec?.type} — FRONT ELEVATION
      </text>
      <text x={x0 + Wpx} y={marginT - 14} fontSize="11" fill={t.annotationColor} fontFamily="'Roboto Mono', monospace" textAnchor="end">
        {Lmm}×{Hmm} {unit}
      </text>

      {/* Carcass outer shell */}
      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill={t.doorFill} stroke={t.stroke} strokeWidth={t.strokeW * 1.5} />

      {/* Top & Bottom rails */}
      <rect x={x0} y={y0} width={Wpx} height={carcassPx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      <rect x={x0} y={y0 + Hpx - carcassPx} width={Wpx} height={carcassPx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />

      {/* Section contents */}
      {sectionsPx.map((s, i) => {
        const bx = s.xPx;
        const bw = s.wPx;
        const contentX = bx + carcassPx;
        const contentY = y0 + carcassPx;
        const contentW = Math.max(0, bw - (i === 0 ? carcassPx : 0) - (i === sectionsPx.length - 1 ? carcassPx : 0));
        const contentH = Hpx - carcassPx * 2;
        const isOpen = s.type === 'Open';
        const shelvesCount = clamp(Number(s?.internalLayout?.shelves?.count ?? 0), 0, 20);
        const drawerCount = clamp(Number(s?.internalLayout?.drawers?.count ?? 0), 0, 20);
        const drawerHmm = Number(s?.internalLayout?.drawers?.drawerHeight ?? 150);

        // Divider line
        if (i > 0) {
          const divX = bx;
          return (
            <g key={`sec-${i}`}>
              <rect x={divX} y={y0} width={carcassPx} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />
              <SectionContents
                isOpen={isOpen} contentX={contentX} contentY={contentY}
                contentW={contentW} contentH={contentH} shelvesCount={shelvesCount}
                drawerCount={drawerCount} drawerHmm={drawerHmm} mmToPx={mmToPx}
                t={t} s={s} doorGap={doorGap} bx={bx} bw={bw} y0={y0} Hpx={Hpx}
              />
            </g>
          );
        }
        return (
          <g key={`sec-${i}`}>
            <SectionContents
              isOpen={isOpen} contentX={contentX} contentY={contentY}
              contentW={contentW} contentH={contentH} shelvesCount={shelvesCount}
              drawerCount={drawerCount} drawerHmm={drawerHmm} mmToPx={mmToPx}
              t={t} s={s} doorGap={doorGap} bx={bx} bw={bw} y0={y0} Hpx={Hpx}
            />
          </g>
        );
      })}

      {/* Dimension annotations */}
      {/* Width */}
      <DimArrow x1={x0} y1={y0 + Hpx + 10} x2={x0 + Wpx} y2={y0 + Hpx + 10}
        label={`${Lmm}${unit}`} color={t.annotationColor} offset={20} />
      {/* Height */}
      <DimArrow x1={x0 - 10} y1={y0} x2={x0 - 10} y2={y0 + Hpx}
        label={`${Hmm}${unit}`} color={t.annotationColor} offset={-30} vertical />
    </svg>
  );
}

function SectionContents({ isOpen, contentX, contentY, contentW, contentH, shelvesCount, drawerCount, drawerHmm, mmToPx, t, s, doorGap, bx, bw, y0, Hpx }) {
  const gapPx = Math.max(1.5, mmToPx(doorGap));

  if (isOpen) {
    // Open section — show shelves inside visible cavity
    return (
      <g>
        <rect x={contentX} y={contentY} width={contentW} height={contentH} fill={t.openSectionFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.7} />
        {Array.from({ length: shelvesCount }).map((_, k) => {
          const shelfY = contentY + ((k + 1) * contentH) / (shelvesCount + 1);
          return (
            <g key={k}>
              <rect x={contentX + 2} y={shelfY - 3} width={contentW - 4} height={6} fill={t.shelfFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.7} />
            </g>
          );
        })}
        <text x={contentX + 6} y={contentY + 18} fontSize="10" fill={t.labelColor} fontFamily="'Roboto Mono', monospace" opacity={0.7}>
          {s.sectionId}
        </text>
      </g>
    );
  }

  // Closed section — show door panel
  const doorX = bx + gapPx;
  const doorY = y0 + gapPx;
  const doorW = bw - gapPx * 2;
  const doorH = Hpx - gapPx * 2;
  const handleX = doorX + doorW * 0.82;
  const handleY1 = doorY + doorH * 0.42;
  const handleY2 = doorY + doorH * 0.58;

  return (
    <g>
      {/* Door panel with slight inset shadow */}
      <rect x={doorX} y={doorY} width={doorW} height={doorH} fill={t.doorFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      {/* Inner panel detail */}
      <rect x={doorX + 8} y={doorY + 8} width={doorW - 16} height={doorH - 16}
        fill="none" stroke={t.stroke} strokeWidth={t.strokeW * 0.4} opacity={0.4} />

      {/* Handle bar */}
      <rect x={handleX - 3} y={handleY1} width={6} height={handleY2 - handleY1}
        rx={3} fill={t.handleColor} stroke={t.stroke} strokeWidth={0.8} />

      {/* Section label */}
      <text x={doorX + 8} y={doorY + 20} fontSize="10" fill={t.labelColor} fontFamily="'Roboto Mono', monospace" opacity={0.6}>
        {s.sectionId}
      </text>
    </g>
  );
}

// ─── 3D ISOMETRIC VIEW ────────────────────────────────────────────────────────
function Sketch3DView({ spec, theme, width, height }) {
  const t = theme;
  const overall = spec?.dimensions?.overall || {};
  const Lmm = Number(overall.length || 2000);
  const Hmm = Number(overall.height || 2200);
  const Dmm = Number(overall.depth || 550);
  const unit = overall.unit || 'mm';
  const carcassT = Number(spec?.materials?.carcass?.thickness ?? 18);

  const sectionsNorm = useMemo(() => normalizeSections(Lmm, spec?.sections), [Lmm, spec?.sections]);

  // Reserve space: left margin for depth projection, right & top margins
  const marginL = 50, marginR = 40, marginT = 50, marginB = 70;
  const drawW = width - marginL - marginR;
  const drawH = height - marginT - marginB;

  // Isometric parameters
  const ISO_ANGLE_X = 0.42;  // depth horizontal factor
  const ISO_ANGLE_Y = 0.28;  // depth vertical factor (upward)

  // Scale to fit front face + depth projection
  const depthProjX = Dmm * ISO_ANGLE_X;
  const depthProjY = Dmm * ISO_ANGLE_Y;
  const totalNeededW = Lmm + depthProjX;
  const totalNeededH = Hmm + depthProjY;
  const scale = Math.min(drawW / totalNeededW, drawH / totalNeededH) * 0.92;
  const mmToPx = mm => mm * scale;

  const Wpx = Lmm * scale;
  const Hpx = Hmm * scale;
  const dx = Dmm * ISO_ANGLE_X * scale;  // isometric depth offset x
  const dy = Dmm * ISO_ANGLE_Y * scale;  // isometric depth offset y (upward)

  // Position: front face bottom-left
  const x0 = marginL;
  const y0 = marginT + dy;  // push down to make room for top face

  const sectionsPx = useMemo(() => {
    let curX = 0;
    return sectionsNorm.map(s => {
      const w = s._normWidth;
      const out = { ...s, xMm: curX, wMm: w, xPx: x0 + mmToPx(curX), wPx: mmToPx(w) };
      curX += w;
      return out;
    });
  }, [sectionsNorm, x0, scale]);

  const carcassPx = mmToPx(carcassT);

  // Helper: convert front-face point to isometric
  // iso = (fx + dxRatio*dx, fy - dyRatio*dy) where dxRatio,dyRatio are 0..1 of depth
  const iso = (fx, fy, depthRatio = 0) => ({
    x: fx + depthRatio * dx,
    y: fy - depthRatio * dy,
  });

  const poly = (...pts) => pts.map(p => `${p.x},${p.y}`).join(' ');

  // ── Front face corners ─────────────────
  const FL = { x: x0, y: y0 };                    // front top-left
  const FR = { x: x0 + Wpx, y: y0 };              // front top-right
  const BL = iso(x0, y0, 1);                      // back top-left
  const BR = iso(x0 + Wpx, y0, 1);                // back top-right

  const FBL = { x: x0, y: y0 + Hpx };             // front bottom-left
  const FBR = { x: x0 + Wpx, y: y0 + Hpx };       // front bottom-right
  const BBL = iso(x0, y0 + Hpx, 1);               // back bottom-left
  const BBR = iso(x0 + Wpx, y0 + Hpx, 1);         // back bottom-right

  // ── Annotation for 3D dims ─────────────
  const dimColor = t.annotationColor;

  return (
    <svg width={width} height={height} style={{ background: t.bg }}>
      <defs>
        <marker id="arr-start" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M6,1 L1,3 L6,5" fill="none" stroke={dimColor} strokeWidth="1" />
        </marker>
        <marker id="arr-end" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M1,1 L6,3 L1,5" fill="none" stroke={dimColor} strokeWidth="1" />
        </marker>
        <filter id="drop" x="-5%" y="-5%" width="120%" height="120%">
          <feDropShadow dx="3" dy="4" stdDeviation="5" floodColor={t.shadowColor} />
        </filter>
      </defs>

      {/* Title */}
      <text x={x0} y={32} fontSize="13" fill={t.labelColor} fontFamily="'Roboto Mono', monospace" fontWeight="600">
        {spec?.type} — 3D VIEW
      </text>
      <text x={x0 + Wpx + dx + 10} y={32} fontSize="11" fill={t.annotationColor} fontFamily="'Roboto Mono', monospace">
        {Lmm}×{Hmm}×{Dmm} {unit}
      </text>

      {/* ── TOP FACE ─────────────────────────── */}
      <polygon
        points={poly(FL, FR, BR, BL)}
        fill={t.topFill} stroke={t.stroke} strokeWidth={t.strokeW}
        filter="url(#drop)"
      />
      {/* Top face hatching */}
      {Array.from({ length: 12 }).map((_, i) => {
        const frac = (i + 1) / 13;
        const p1 = { x: FL.x + frac * (FR.x - FL.x), y: FL.y };
        const p2 = { x: BL.x + frac * (BR.x - BL.x), y: BL.y };
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={t.stroke} strokeWidth={0.5} opacity={0.2} />;
      })}

      {/* ── SIDE (RIGHT) FACE ──────────────────── */}
      <polygon
        points={poly(FR, BR, BBR, FBR)}
        fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW}
      />
      {/* Side face hatching (diagonal) */}
      {Array.from({ length: 10 }).map((_, i) => {
        const frac = (i + 1) / 11;
        const p1 = { x: FR.x + frac * (BR.x - FR.x), y: FR.y + frac * (BR.y - FR.y) };
        const p2 = { x: FBR.x + frac * (BBR.x - FBR.x), y: FBR.y + frac * (BBR.y - FBR.y) };
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={t.stroke} strokeWidth={0.5} opacity={0.2} />;
      })}

      {/* ── FRONT FACE BASE ────────────────────── */}
      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill={t.doorFill} stroke={t.stroke} strokeWidth={t.strokeW} />

      {/* Top carcass panel on front */}
      <rect x={x0} y={y0} width={Wpx} height={carcassPx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />
      {/* Bottom carcass panel */}
      <rect x={x0} y={y0 + Hpx - carcassPx} width={Wpx} height={carcassPx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />

      {/* ── SECTIONS ────────────────────────────── */}
      {sectionsPx.map((s, i) => {
        const bx = s.xPx;
        const bw = s.wPx;
        const isFirst = i === 0;
        const isLast = i === sectionsPx.length - 1;
        const contentX = bx + (isFirst ? carcassPx : 0);
        const contentY = y0 + carcassPx;
        const contentW = Math.max(4, bw - (isFirst ? carcassPx : 0) - (isLast ? carcassPx : 0));
        const contentH = Hpx - carcassPx * 2;
        const isOpen = s.type === 'Open';

        const shelvesCount = clamp(Number(s?.internalLayout?.shelves?.count ?? 0), 0, 20);
        const drawerCount = clamp(Number(s?.internalLayout?.drawers?.count ?? 0), 0, 20);
        const drawerHmm = Number(s?.internalLayout?.drawers?.drawerHeight ?? 150);
        const drawerHpx = Math.min(mmToPx(drawerHmm), contentH * 0.14);

        // Vertical divider (except first)
        const divPoly = i > 0 ? poly(
          iso(bx, y0, 0), iso(bx, y0, 1),
          iso(bx, y0 + Hpx, 1), iso(bx, y0 + Hpx, 0)
        ) : null;

        return (
          <g key={`sec-${i}`}>
            {/* Divider panel */}
            {divPoly && (
              <polygon points={divPoly} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />
            )}

            {isOpen ? (
              // Open section: show interior cavity + shelves
              <g>
                <rect x={contentX} y={contentY} width={contentW} height={contentH}
                  fill={t.openSectionFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.7} />
                {/* Back panel visible */}
                <rect x={contentX + 2} y={contentY + 2} width={contentW - 4} height={contentH - 4}
                  fill={t.panelBg} stroke={t.stroke} strokeWidth={0.5} opacity={0.6} />
                {/* Shelves with thickness */}
                {Array.from({ length: shelvesCount }).map((_, k) => {
                  const sy = contentY + ((k + 1) * contentH) / (shelvesCount + 1);
                  const shelfThick = Math.max(4, mmToPx(18));
                  return (
                    <g key={k}>
                      <rect x={contentX + 2} y={sy - shelfThick / 2} width={contentW - 4} height={shelfThick}
                        fill={t.shelfFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.6} />
                      {/* Shelf depth on 3D */}
                      <polygon
                        points={poly(
                          iso(contentX + 2, sy - shelfThick / 2, 0),
                          iso(contentX + 2, sy - shelfThick / 2, 0.6),
                          iso(contentX + 2, sy + shelfThick / 2, 0.6),
                          iso(contentX + 2, sy + shelfThick / 2, 0)
                        )}
                        fill={t.sideFill} stroke={t.stroke} strokeWidth={0.5} opacity={0.7}
                      />
                    </g>
                  );
                })}
                {/* Label */}
                <text x={contentX + 5} y={contentY + 20} fontSize="10" fill={t.labelColor}
                  fontFamily="'Roboto Mono', monospace" opacity={0.8}>{s.sectionId}</text>
              </g>
            ) : (
              // Closed section: door panel with handle
              <g>
                {/* Door face */}
                <rect x={bx + 2} y={y0 + 2} width={bw - 4} height={Hpx - 4}
                  fill={t.doorFill} stroke={t.stroke} strokeWidth={t.strokeW} />
                {/* Inner panel detail */}
                <rect x={bx + 10} y={y0 + 10} width={bw - 20} height={Hpx - 20}
                  fill="none" stroke={t.stroke} strokeWidth={0.5} opacity={0.3} />

                {/* Handle — vertical bar */}
                {(() => {
                  const hx = bx + bw * 0.78;
                  const hy1 = y0 + Hpx * 0.42;
                  const hy2 = y0 + Hpx * 0.58;
                  const hw = 6;
                  return (
                    <g>
                      {/* Handle shadow */}
                      <rect x={hx - hw / 2 + 1} y={hy1 + 1} width={hw} height={hy2 - hy1} rx={3} fill={t.shadowColor} />
                      {/* Handle body */}
                      <rect x={hx - hw / 2} y={hy1} width={hw} height={hy2 - hy1} rx={3}
                        fill={t.handleColor} stroke={t.stroke} strokeWidth={0.8} />
                    </g>
                  );
                })()}

                {/* Drawers if present */}
                {drawerCount > 0 && (
                  <g>
                    {/* Show drawer stack on right-open side in 3D (beside door) */}
                    {Array.from({ length: drawerCount }).map((_, k) => {
                      const dy2 = contentY + k * drawerHpx;
                      if (dy2 + drawerHpx > contentY + contentH) return null;
                      return (
                        <g key={k}>
                          <rect x={contentX + 2} y={dy2 + 2} width={contentW - 4} height={drawerHpx - 4}
                            fill={t.drawerFaceFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />
                          {/* Drawer handle */}
                          <line x1={contentX + contentW * 0.25} y1={dy2 + drawerHpx / 2}
                            x2={contentX + contentW * 0.75} y2={dy2 + drawerHpx / 2}
                            stroke={t.handleColor} strokeWidth={2} />
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Section label */}
                <text x={bx + 6} y={y0 + 22} fontSize="10" fill={t.labelColor}
                  fontFamily="'Roboto Mono', monospace" opacity={0.65}>{s.sectionId}</text>
              </g>
            )}
          </g>
        );
      })}

      {/* ── OUTER FRAME FRONT EDGES (on top of sections) ─── */}
      {/* Left carcass side */}
      <rect x={x0} y={y0} width={carcassPx} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      {/* Right carcass side */}
      <rect x={x0 + Wpx - carcassPx} y={y0} width={carcassPx} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />

      {/* Outer border */}
      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill="none" stroke={t.stroke} strokeWidth={t.strokeW * 1.6} />

      {/* Depth edges (front-to-back visible lines) */}
      <line x1={FL.x} y1={FL.y} x2={BL.x} y2={BL.y} stroke={t.stroke} strokeWidth={t.strokeW * 1.4} />
      <line x1={FR.x} y1={FR.y} x2={BR.x} y2={BR.y} stroke={t.stroke} strokeWidth={t.strokeW * 1.4} />
      <line x1={FBR.x} y1={FBR.y} x2={BBR.x} y2={BBR.y} stroke={t.stroke} strokeWidth={t.strokeW * 1.4} />

      {/* ── DIMENSION ANNOTATIONS ──────────────────── */}
      {/* Width annotation (bottom) */}
      <g>
        <line x1={x0} y1={y0 + Hpx + 22} x2={x0 + Wpx} y2={y0 + Hpx + 22}
          stroke={dimColor} strokeWidth={1} markerStart="url(#arr-start)" markerEnd="url(#arr-end)" />
        <text x={(x0 + x0 + Wpx) / 2} y={y0 + Hpx + 36} fontSize="11" fill={dimColor}
          textAnchor="middle" fontFamily="'Roboto Mono', monospace">{Lmm}{unit}</text>
        <line x1={x0} y1={y0 + Hpx + 10} x2={x0} y2={y0 + Hpx + 26} stroke={dimColor} strokeWidth={0.8} />
        <line x1={x0 + Wpx} y1={y0 + Hpx + 10} x2={x0 + Wpx} y2={y0 + Hpx + 26} stroke={dimColor} strokeWidth={0.8} />
      </g>

      {/* Height annotation (left side) */}
      <g>
        <line x1={x0 - 26} y1={y0} x2={x0 - 26} y2={y0 + Hpx}
          stroke={dimColor} strokeWidth={1} markerStart="url(#arr-start)" markerEnd="url(#arr-end)" />
        <text x={x0 - 28} y={(y0 + y0 + Hpx) / 2} fontSize="11" fill={dimColor}
          textAnchor="middle" fontFamily="'Roboto Mono', monospace"
          transform={`rotate(-90, ${x0 - 28}, ${(y0 + y0 + Hpx) / 2})`}>{Hmm}{unit}</text>
        <line x1={x0 - 10} y1={y0} x2={x0 - 30} y2={y0} stroke={dimColor} strokeWidth={0.8} />
        <line x1={x0 - 10} y1={y0 + Hpx} x2={x0 - 30} y2={y0 + Hpx} stroke={dimColor} strokeWidth={0.8} />
      </g>

      {/* Depth annotation (top-right diagonal) */}
      <g>
        <line x1={FR.x} y1={FR.y - 8} x2={BR.x} y2={BR.y - 8}
          stroke={dimColor} strokeWidth={1} markerStart="url(#arr-start)" markerEnd="url(#arr-end)" />
        <text x={(FR.x + BR.x) / 2 + 8} y={(FR.y + BR.y) / 2 - 14} fontSize="11" fill={dimColor}
          textAnchor="middle" fontFamily="'Roboto Mono', monospace">{Dmm}{unit}</text>
      </g>

      {/* Callout labels for specific sections */}
      {sectionsPx.filter(s => s.type === 'Open' || (s?.internalLayout?.drawers?.count ?? 0) > 0).map((s, i) => {
        const labelX = x0 + Wpx + dx + 12;
        const labelY = y0 + Hpx * 0.25 + i * 48;
        const targetX = s.xPx + s.wPx / 2;
        const targetY = y0 + Hpx * 0.5;
        const isDrawer = (s?.internalLayout?.drawers?.count ?? 0) > 0;
        const label = isDrawer ? `${s.sectionId} Drawer Stack` : `${s.sectionId} Open Shelves`;

        return (
          <g key={`label-${i}`}>
            <line x1={labelX} y1={labelY} x2={targetX + 10} y2={targetY}
              stroke={dimColor} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.7} />
            <circle cx={targetX + 10} cy={targetY} r={3} fill={dimColor} opacity={0.7} />
            <rect x={labelX} y={labelY - 13} width={130} height={18} rx={4}
              fill={t.panelBg} stroke={dimColor} strokeWidth={0.8} opacity={0.9} />
            <text x={labelX + 6} y={labelY} fontSize="10" fill={dimColor}
              fontFamily="'Roboto Mono', monospace">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [spec, setSpec] = useState(initialSpec);
  const [jsonText, setJsonText] = useState(JSON.stringify(initialSpec, null, 2));
  const [jsonError, setJsonError] = useState('');
  const [themeKey, setThemeKey] = useState('clean');
  const theme = THEMES[themeKey] || THEMES.clean;
  const [mode, setMode] = useState('3d');

  function applyJson() {
    const parsed = safeJsonParse(jsonText);
    if (!parsed.ok) { setJsonError(parsed.error); return; }
    setSpec(parsed.value);
    setJsonError('');
  }

  const containerStyle = {
    minHeight: '100vh',
    background: themeKey === 'blueprint' ? '#0a1929' : '#f1f4f8',
    padding: '20px',
    fontFamily: "'Roboto Mono', 'Courier New', monospace",
  };

  const panelStyle = {
    background: themeKey === 'blueprint' ? '#0d2137' : '#ffffff',
    border: `1px solid ${themeKey === 'blueprint' ? '#1e3a5f' : '#dde3ec'}`,
    borderRadius: '12px',
    padding: '16px',
    color: themeKey === 'blueprint' ? '#bfdbfe' : '#1a1a2e',
  };

  const btnStyle = (active) => ({
    padding: '8px 14px',
    borderRadius: '8px',
    border: `1px solid ${themeKey === 'blueprint' ? '#1e3a5f' : '#dde3ec'}`,
    background: active
      ? (themeKey === 'blueprint' ? '#1e4080' : '#2563eb')
      : (themeKey === 'blueprint' ? '#0d2137' : '#f1f4f8'),
    color: active ? '#fff' : (themeKey === 'blueprint' ? '#93c5fd' : '#1a1a2e'),
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: "inherit",
    transition: 'all 0.15s',
  });

  const selectStyle = {
    padding: '8px 10px',
    borderRadius: '8px',
    border: `1px solid ${themeKey === 'blueprint' ? '#1e3a5f' : '#dde3ec'}`,
    background: themeKey === 'blueprint' ? '#0d2137' : '#f7f9fc',
    color: themeKey === 'blueprint' ? '#bfdbfe' : '#1a1a2e',
    fontSize: '12px',
    fontFamily: "inherit",
  };

  const canvasW = 820;
  const canvasH = 530;

  return (
    <div style={containerStyle}>
      <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: themeKey === 'blueprint' ? '#bfdbfe' : '#1a1a2e', fontFamily: "inherit" }}>
            🪵 Interior Furniture Sketcher
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.6, color: themeKey === 'blueprint' ? '#93c5fd' : '#555' }}>
            Edit the JSON spec and apply to regenerate the drawing
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 14, alignItems: 'start' }}>
          {/* Left: JSON editor */}
          <div style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Spec JSON</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, opacity: 0.6 }}>View</span>
                {['3d', 'elevation'].map(v => (
                  <button key={v} style={btnStyle(mode === v)} onClick={() => setMode(v)}>
                    {v === '3d' ? '3D View' : 'Elevation'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 11, opacity: 0.6 }}>Theme</span>
              <select value={themeKey} onChange={e => setThemeKey(e.target.value)} style={selectStyle}>
                {Object.entries(THEMES).map(([k, th]) => (
                  <option key={k} value={k}>{th.name}</option>
                ))}
              </select>
            </div>

            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%', height: 390, borderRadius: 8,
                border: `1px solid ${themeKey === 'blueprint' ? '#1e3a5f' : '#cdd5e0'}`,
                padding: 10, fontFamily: "inherit", fontSize: 11,
                background: themeKey === 'blueprint' ? '#091828' : '#fafbfc',
                color: themeKey === 'blueprint' ? '#7eb8f7' : '#1a1a2e',
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={applyJson} style={{ ...btnStyle(true), flex: 1 }}>▶ Apply JSON</button>
              <button onClick={() => { setSpec(initialSpec); setJsonText(JSON.stringify(initialSpec, null, 2)); setJsonError(''); }}
                style={{ ...btnStyle(false) }}>Reset</button>
            </div>

            {jsonError && (
              <div style={{ marginTop: 8, color: '#ef4444', fontSize: 11, fontFamily: "inherit" }}>
                ✗ {jsonError}
              </div>
            )}
          </div>

          {/* Right: Output */}
          <div style={panelStyle}>
            <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 13 }}>Output</div>
            {mode === '3d'
              ? <Sketch3DView spec={spec} theme={theme} width={canvasW} height={canvasH} />
              : <SketchView spec={spec} theme={theme} width={canvasW} height={canvasH} />
            }
          </div>
        </div>
      </div>
    </div>
  );
}