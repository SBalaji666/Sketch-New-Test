import React, { useEffect, useMemo, useRef, useState } from 'react';
import rough from 'roughjs/bundled/rough.esm.js';

const THEMES = {
  pencil: {
    name: 'Pencil',
    bg1: '#fbfbfb',
    bg2: '#f6f6f6',
    paperOpacity: 0.25,
    stroke: '#1f1f1f',
    faintStroke: '#1f1f1f',
  },
  blueprint: {
    name: 'Blueprint',
    bg1: '#0b2b55',
    bg2: '#082244',
    paperOpacity: 0.18,
    stroke: '#e9f2ff',
    faintStroke: '#e9f2ff',
  },
  coffee: {
    name: 'Coffee',
    bg1: '#fbf6ef',
    bg2: '#f3eadf',
    paperOpacity: 0.22,
    stroke: '#3a2a1f',
    faintStroke: '#3a2a1f',
  },
  marker: {
    name: 'Marker',
    bg1: '#ffffff',
    bg2: '#f7f7f7',
    paperOpacity: 0.14,
    stroke: '#0f0f0f',
    faintStroke: '#0f0f0f',
  },
};

// ------------------ SAMPLE SPEC ------------------

const initialSpec = {
  type: 'Cupboard',
  dimensions: {
    overall: { length: 2000, height: 2200, depth: 550, unit: 'mm' },
  },
  materials: {
    carcass: { material: 'Plywood', thickness: 18 },
    backPanel: { material: 'Plywood', thickness: 9, type: 'Full' },
    drawerBottom: { material: 'Plywood', thickness: 6 },
  },
  tolerances: {
    doorGap: 2,
    internalClearance: 3,
    sawKerf: 3,
    edgeBanding: { thickness: 2 },
  },
  structure: {
    verticalPartitions: 4,
    horizontalPanels: { top: true, bottom: true },
  },
  sections: [
    {
      sectionId: 'S1',
      width: 400,
      type: 'Closed',
      doors: { count: 1, style: 'Hinged', overlay: 'Full', height: 2200 },
      internalLayout: {
        shelves: { count: 4, type: 'Adjustable', equalSpacing: true },
      },
    },
    {
      sectionId: 'S2',
      width: 400,
      type: 'Closed',
      doors: { count: 1, style: 'Hinged', overlay: 'Full', height: 2200 },
      internalLayout: {
        drawers: { count: 6, drawerType: 'Box', drawerHeight: 150 },
      },
    },
    {
      sectionId: 'S3',
      width: 400,
      type: 'Open',
      internalLayout: { shelves: { count: 2, type: 'Fixed' } },
    },
    {
      sectionId: 'S4',
      width: 400,
      type: 'Closed',
      doors: { count: 1, style: 'Hinged', overlay: 'Full', height: 2200 },
      internalLayout: {
        shelves: { count: 3, type: 'Adjustable', equalSpacing: true },
      },
    },
  ],
};

// ------------------ HELPERS ------------------

function safeJsonParse(text) {
  try {
    const v = JSON.parse(text);
    return { ok: true, value: v };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * If section widths do not sum to overall.length, scale them proportionally.
 */
function normalizeSections(overallLength, sections) {
  const safeSections = Array.isArray(sections) ? sections : [];
  const sum = safeSections.reduce((a, s) => a + (Number(s.width) || 0), 0);

  if (!overallLength || sum <= 0) {
    return safeSections.map((s) => ({
      ...s,
      _normWidth: Number(s.width) || 0,
    }));
  }
  const scale = sum === overallLength ? 1 : overallLength / sum;
  return safeSections.map((s) => ({
    ...s,
    _normWidth: (Number(s.width) || 0) * scale,
  }));
}

// ------------------ 1) SKETCH VIEW (RoughJS) ------------------

function SketchView({ spec, theme, width, height }) {
  const svgRef = useRef(null);

  const overall = spec?.dimensions?.overall || {};
  const Lmm = Number(overall.length || 0);
  const Hmm = Number(overall.height || 0);
  const unit = overall.unit || 'mm';

  const carcassThicknessMm = Number(spec?.materials?.carcass?.thickness ?? 18);
  const doorGapMm = Number(spec?.tolerances?.doorGap ?? 2);

  const sectionsNorm = useMemo(
    () => normalizeSections(Lmm, spec?.sections),
    [Lmm, spec?.sections]
  );

  const pad = 26;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const scale = Math.min(innerW / (Lmm || 1), innerH / (Hmm || 1));
  const mmToPx = (mm) => mm * scale;

  const Wpx = Lmm * scale;
  const Hpx = Hmm * scale;
  const x0 = (width - Wpx) / 2;
  const y0 = (height - Hpx) / 2;

  const sectionsPx = useMemo(() => {
    let curX = 0;
    return sectionsNorm.map((s) => {
      const w = Number(s._normWidth || 0);
      const out = {
        ...s,
        xMm: curX,
        wMm: w,
        xPx: x0 + mmToPx(curX),
        wPx: mmToPx(w),
      };
      curX += w;
      return out;
    });
  }, [sectionsNorm, x0, mmToPx]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // remove previous rough drawings
    Array.from(svg.querySelectorAll("[data-rough='1']")).forEach((n) =>
      n.remove()
    );

    const rc = rough.svg(svg);

    const stroke = theme.stroke;
    const faint = theme.faintStroke;

    const roughBase = {
      roughness: theme.name === 'Marker' ? 1.2 : 1.9,
      bowing: theme.name === 'Blueprint' ? 1.2 : 1.7,
      strokeWidth: theme.name === 'Marker' ? 2.2 : 1.6,
      disableMultiStroke: false,
      preserveVertices: false,
      stroke,
    };

    const thick = {
      ...roughBase,
      strokeWidth: Math.max(
        2.4,
        mmToPx(Math.min(carcassThicknessMm, 25)) * 0.2
      ),
      roughness: roughBase.roughness + 0.2,
    };

    // Outer carcass
    const outer = rc.rectangle(x0, y0, Wpx, Hpx, thick);
    outer.setAttribute('data-rough', '1');
    svg.appendChild(outer);

    // Section dividers
    sectionsPx.slice(1).forEach((s) => {
      const ln = rc.line(s.xPx, y0, s.xPx, y0 + Hpx, {
        ...roughBase,
        strokeWidth: 1.1,
        roughness: roughBase.roughness - 0.3,
        stroke: faint,
      });
      ln.setAttribute('data-rough', '1');
      ln.style.opacity = '0.9';
      svg.appendChild(ln);
    });

    // Section contents
    sectionsPx.forEach((s) => {
      const bx = s.xPx;
      const bw = s.wPx;

      const inset = Math.max(8, mmToPx(carcassThicknessMm) * 0.25);
      const innerX = bx + inset;
      const innerY = y0 + inset;
      const innerW = Math.max(0, bw - inset * 2);
      const innerH = Math.max(0, Hpx - inset * 2);

      const isOpen = (s.type || 'Closed') === 'Open';

      // Open/Closed frame
      if (isOpen) {
        const openRect = rc.rectangle(innerX, innerY, innerW, innerH, {
          ...roughBase,
          strokeWidth: 1.1,
          roughness: roughBase.roughness + 0.4,
          stroke: faint,
        });
        openRect.setAttribute('data-rough', '1');
        openRect.style.opacity = '0.65';
        svg.appendChild(openRect);
      } else {
        const gap = mmToPx(doorGapMm);
        const doorRect = rc.rectangle(
          innerX + gap,
          innerY + gap,
          Math.max(0, innerW - gap * 2),
          Math.max(0, innerH - gap * 2),
          {
            ...roughBase,
            strokeWidth: 1.1,
            roughness: roughBase.roughness - 0.1,
            stroke: faint,
          }
        );
        doorRect.setAttribute('data-rough', '1');
        doorRect.style.opacity = theme.name === 'Blueprint' ? '0.65' : '0.45';
        svg.appendChild(doorRect);

        // Handle
        const hy = innerY + innerH * 0.5;
        const hx1 = innerX + innerW * 0.62 - 18;
        const hx2 = innerX + innerW * 0.62 + 18;
        const handle = rc.line(hx1, hy, hx2, hy, {
          ...roughBase,
          strokeWidth: theme.name === 'Marker' ? 3.2 : 2.1,
          roughness: 1.2,
          stroke: faint,
        });
        handle.setAttribute('data-rough', '1');
        handle.style.opacity = '0.65';
        svg.appendChild(handle);
      }

      // Shelves
      const shelvesCount = clamp(
        Number(s?.internalLayout?.shelves?.count ?? 0),
        0,
        30
      );
      if (shelvesCount > 0) {
        const equal = !!s?.internalLayout?.shelves?.equalSpacing;
        for (let k = 0; k < shelvesCount; k++) {
          const y =
            innerY +
            (equal
              ? ((k + 1) * innerH) / (shelvesCount + 1)
              : ((k + 1) * innerH) / (shelvesCount + 1));

          const shelfLine = rc.line(innerX + 6, y, innerX + innerW - 6, y, {
            ...roughBase,
            strokeWidth: theme.name === 'Marker' ? 2.0 : 1.3,
            roughness: roughBase.roughness - 0.2,
            stroke: faint,
          });
          shelfLine.setAttribute('data-rough', '1');
          shelfLine.style.opacity = '0.85';
          svg.appendChild(shelfLine);
        }
      }

      // Drawers
      const drawerCount = clamp(
        Number(s?.internalLayout?.drawers?.count ?? 0),
        0,
        30
      );
      if (drawerCount > 0) {
        const drawerHeightMm = Number(
          s?.internalLayout?.drawers?.drawerHeight ?? 150
        );
        const dhPx = mmToPx(drawerHeightMm);

        // Keep drawers in bottom 45% of section height
        const maxArea = innerH * 0.45;
        const totalWanted = dhPx * drawerCount;
        const useDh = totalWanted <= maxArea ? dhPx : maxArea / drawerCount;

        const areaH = useDh * drawerCount;
        const areaTop = innerY + innerH - areaH;

        for (let k = 0; k < drawerCount; k++) {
          const y = areaTop + k * useDh;

          const rect = rc.rectangle(
            innerX + 8,
            y + 5,
            innerW - 16,
            useDh - 10,
            {
              ...roughBase,
              strokeWidth: theme.name === 'Marker' ? 2.1 : 1.3,
              roughness: roughBase.roughness - 0.1,
              stroke: faint,
            }
          );
          rect.setAttribute('data-rough', '1');
          rect.style.opacity = '0.92';
          svg.appendChild(rect);

          const hy = y + useDh / 2;
          const handle = rc.line(
            innerX + innerW * 0.35,
            hy,
            innerX + innerW * 0.65,
            hy,
            {
              ...roughBase,
              strokeWidth: theme.name === 'Marker' ? 3.0 : 2.0,
              roughness: 1.2,
              stroke: faint,
            }
          );
          handle.setAttribute('data-rough', '1');
          handle.style.opacity = '0.65';
          svg.appendChild(handle);
        }
      }

      // Section label
      const label = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );
      label.setAttribute('x', String(bx + 10));
      label.setAttribute('y', String(y0 + 26));
      label.setAttribute('font-size', '12');
      label.setAttribute('fill', theme.stroke);
      label.setAttribute(
        'opacity',
        theme.name === 'Blueprint' ? '0.9' : '0.75'
      );
      label.setAttribute('data-rough', '1');
      label.textContent = `${s.sectionId} (${Math.round(s.wMm)}${unit})`;
      svg.appendChild(label);
    });
  }, [
    spec,
    theme,
    sectionsPx,
    x0,
    y0,
    Wpx,
    Hpx,
    carcassThicknessMm,
    doorGapMm,
  ]);

  const bg = `linear-gradient(${theme.bg1}, ${theme.bg2})`;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ background: bg, border: '1px solid #ddd', borderRadius: 12 }}
    >
      <defs>
        <filter id="paper">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.08" />
          </feComponentTransfer>
        </filter>
      </defs>

      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        filter="url(#paper)"
        opacity={theme.paperOpacity}
      />

      <text x={18} y={18} fontSize="14" fill={theme.stroke} opacity="0.9">
        {spec?.type ?? 'Item'} — {spec?.dimensions?.overall?.length ?? '?'}×
        {spec?.dimensions?.overall?.height ?? '?'} {unit} • View: Sketch
      </text>
    </svg>
  );
}

// ------------------ 2) 3D SKETCH (Isometric SVG) ------------------

function Sketch3DView({ spec, theme, width, height }) {
  const overall = spec?.dimensions?.overall || {};
  const Lmm = Number(overall.length || 0);
  const Hmm = Number(overall.height || 0);
  const Dmm = Number(overall.depth || 0);
  const unit = overall.unit || 'mm';

  const carcassThicknessMm = Number(spec?.materials?.carcass?.thickness ?? 18);
  const doorGapMm = Number(spec?.tolerances?.doorGap ?? 2);

  const sectionsNorm = useMemo(
    () => normalizeSections(Lmm, spec?.sections),
    [Lmm, spec?.sections]
  );

  const pad = 26;
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);

  // smaller scale to leave room for depth projection
  const scale = Math.min(
    (innerW * 0.82) / (Lmm || 1),
    (innerH * 0.82) / (Hmm || 1)
  );
  const mmToPx = (mm) => mm * scale;

  const Wpx = Lmm * scale;
  const Hpx = Hmm * scale;
  const x0 = (width - Wpx) / 2;
  const y0 = (height - Hpx) / 2;

  // isometric offsets (tweak for stronger "rendered" feel)
  const dx = mmToPx(Dmm) * 0.42;
  const dy = -mmToPx(Dmm) * 0.28;

  const sectionsPx = useMemo(() => {
    let curX = 0;
    return sectionsNorm.map((s) => {
      const w = Number(s._normWidth || 0);
      const out = {
        ...s,
        xMm: curX,
        wMm: w,
        xPx: x0 + mmToPx(curX),
        wPx: mmToPx(w),
      };
      curX += w;
      return out;
    });
  }, [sectionsNorm, x0, mmToPx]);

  const bg = `linear-gradient(${theme.bg1}, ${theme.bg2})`;

  // helpers for hatching
  const hatchId = `hatch-${theme.name.replace(/\s+/g, '')}`;
  const hatch2Id = `hatch2-${theme.name.replace(/\s+/g, '')}`;

  // face points
  const front = {
    x: x0,
    y: y0,
    w: Wpx,
    h: Hpx,
  };

  const topPoly = `${front.x},${front.y} ${front.x + front.w},${front.y} ${
    front.x + front.w + dx
  },${front.y + dy} ${front.x + dx},${front.y + dy}`;
  const sidePoly = `${front.x + front.w},${front.y} ${front.x + front.w + dx},${
    front.y + dy
  } ${front.x + front.w + dx},${front.y + front.h + dy} ${front.x + front.w},${
    front.y + front.h
  }`;

  return (
    <svg
      width={width}
      height={height}
      style={{ background: bg, border: '1px solid #ddd', borderRadius: 12 }}
    >
      <defs>
        {/* paper noise */}
        <filter id="paper3d">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.07" />
          </feComponentTransfer>
        </filter>

        {/* hatch patterns */}
        <pattern
          id={hatchId}
          patternUnits="userSpaceOnUse"
          width="10"
          height="10"
          patternTransform="rotate(-25)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="10"
            stroke={theme.faintStroke}
            strokeWidth="1"
            opacity="0.25"
          />
        </pattern>
        <pattern
          id={hatch2Id}
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
          patternTransform="rotate(35)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke={theme.faintStroke}
            strokeWidth="1"
            opacity="0.18"
          />
        </pattern>
      </defs>

      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        filter="url(#paper3d)"
        opacity={theme.paperOpacity}
      />

      <text x={18} y={18} fontSize="14" fill={theme.stroke} opacity="0.92">
        {spec?.type ?? 'Item'} — {Lmm}×{Hmm}×{Dmm} {unit} • View: 3D Sketch
      </text>

      {/* --- TOP FACE (shaded) --- */}
      <polygon
        points={topPoly}
        fill={`url(#${hatch2Id})`}
        stroke={theme.stroke}
        strokeWidth={2}
        opacity={0.95}
      />

      {/* --- SIDE FACE (shaded) --- */}
      <polygon
        points={sidePoly}
        fill={`url(#${hatchId})`}
        stroke={theme.stroke}
        strokeWidth={2}
        opacity={0.95}
      />

      {/* --- FRONT FACE OUTLINE --- */}
      <rect
        x={front.x}
        y={front.y}
        width={front.w}
        height={front.h}
        fill="none"
        stroke={theme.stroke}
        strokeWidth={2}
        opacity={0.95}
      />

      {/* depth edges (make it feel “generated”) */}
      <line
        x1={front.x}
        y1={front.y}
        x2={front.x + dx}
        y2={front.y + dy}
        stroke={theme.stroke}
        opacity={0.85}
        strokeWidth={2}
      />
      <line
        x1={front.x}
        y1={front.y + front.h}
        x2={front.x + dx}
        y2={front.y + front.h + dy}
        stroke={theme.stroke}
        opacity={0.85}
        strokeWidth={2}
      />
      <line
        x1={front.x + front.w}
        y1={front.y + front.h}
        x2={front.x + front.w + dx}
        y2={front.y + front.h + dy}
        stroke={theme.stroke}
        opacity={0.85}
        strokeWidth={2}
      />

      {/* --- FRONT SECTION DIVIDERS + PROJECTIONS --- */}
      {sectionsPx.slice(1).map((s, idx) => (
        <g key={`div-${idx}`}>
          {/* front divider */}
          <line
            x1={s.xPx}
            y1={front.y}
            x2={s.xPx}
            y2={front.y + front.h}
            stroke={theme.faintStroke}
            strokeWidth={1.2}
            opacity={0.9}
          />
          {/* top projection of divider */}
          <line
            x1={s.xPx}
            y1={front.y}
            x2={s.xPx + dx}
            y2={front.y + dy}
            stroke={theme.faintStroke}
            strokeWidth={1}
            opacity={0.55}
          />
          {/* side projection if divider is near the right (optional subtle) */}
        </g>
      ))}

      {/* --- SECTION DETAILS ON FRONT FACE --- */}
      {sectionsPx.map((s, i) => {
        const inset = Math.max(10, mmToPx(carcassThicknessMm) * 0.22);
        const gap = Math.max(1.5, mmToPx(doorGapMm));

        const innerX = s.xPx + inset;
        const innerY = front.y + inset;
        const innerW = Math.max(0, s.wPx - inset * 2);
        const innerH = Math.max(0, front.h - inset * 2);

        const isOpen = (s.type || 'Closed') === 'Open';

        const shelvesCount = clamp(
          Number(s?.internalLayout?.shelves?.count ?? 0),
          0,
          30
        );
        const drawerCount = clamp(
          Number(s?.internalLayout?.drawers?.count ?? 0),
          0,
          30
        );
        const drawerHeightMm = Number(
          s?.internalLayout?.drawers?.drawerHeight ?? 150
        );

        return (
          <g key={`sec-${i}`}>
            {/* open/closed framing */}
            {isOpen ? (
              <rect
                x={innerX}
                y={innerY}
                width={innerW}
                height={innerH}
                fill="none"
                stroke={theme.faintStroke}
                strokeWidth={1.2}
                opacity={0.55}
              />
            ) : (
              <>
                <rect
                  x={innerX + gap}
                  y={innerY + gap}
                  width={Math.max(0, innerW - gap * 2)}
                  height={Math.max(0, innerH - gap * 2)}
                  fill="none"
                  stroke={theme.faintStroke}
                  strokeWidth={1.2}
                  opacity={0.45}
                />
                {/* handle */}
                <line
                  x1={innerX + innerW * 0.62 - 16}
                  y1={innerY + innerH * 0.5}
                  x2={innerX + innerW * 0.62 + 16}
                  y2={innerY + innerH * 0.5}
                  stroke={theme.faintStroke}
                  strokeWidth={2.2}
                  opacity={0.55}
                />
              </>
            )}

            {/* shelves */}
            {Array.from({ length: shelvesCount }).map((_, k) => {
              const y = innerY + ((k + 1) * innerH) / (shelvesCount + 1);
              return (
                <line
                  key={`sh-${i}-${k}`}
                  x1={innerX + 6}
                  y1={y}
                  x2={innerX + innerW - 6}
                  y2={y}
                  stroke={theme.faintStroke}
                  strokeWidth={1.3}
                  opacity={0.85}
                />
              );
            })}

            {/* drawers (stack bottom area, outlined) */}
            {drawerCount > 0 &&
              (() => {
                const dhPx = mmToPx(drawerHeightMm);
                const maxArea = innerH * 0.45;
                const totalWanted = dhPx * drawerCount;
                const useDh =
                  totalWanted <= maxArea ? dhPx : maxArea / drawerCount;

                const areaH = useDh * drawerCount;
                const areaTop = innerY + innerH - areaH;

                return Array.from({ length: drawerCount }).map((_, k) => {
                  const y = areaTop + k * useDh;
                  return (
                    <g key={`dr-${i}-${k}`}>
                      <rect
                        x={innerX + 8}
                        y={y + 5}
                        width={Math.max(0, innerW - 16)}
                        height={Math.max(0, useDh - 10)}
                        fill="none"
                        stroke={theme.faintStroke}
                        strokeWidth={1.3}
                        opacity={0.9}
                      />
                      <line
                        x1={innerX + innerW * 0.35}
                        y1={y + useDh / 2}
                        x2={innerX + innerW * 0.65}
                        y2={y + useDh / 2}
                        stroke={theme.faintStroke}
                        strokeWidth={2.0}
                        opacity={0.55}
                      />
                    </g>
                  );
                });
              })()}

            {/* label */}
            <text
              x={s.xPx + 10}
              y={front.y + 30}
              fontSize="12"
              fill={theme.stroke}
              opacity={0.75}
            >
              {s.sectionId}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ------------------ APP ------------------

export default function App() {
  const [spec, setSpec] = useState(initialSpec);
  const [jsonText, setJsonText] = useState(
    JSON.stringify(initialSpec, null, 2)
  );
  const [jsonError, setJsonError] = useState('');

  const [themeKey, setThemeKey] = useState('pencil');
  const theme = THEMES[themeKey] || THEMES.pencil;

  // ✅ only these two modes now
  const [mode, setMode] = useState('sketch'); // sketch | 3d-sketch

  function applyJson() {
    const parsed = safeJsonParse(jsonText);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    setSpec(parsed.value);
    setJsonError('');
  }

  return (
    <div
      style={{
        padding: 16,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      }}
    >
      <h2 style={{ margin: '0 0 12px 0' }}>Interior Sketcher (Cupboard)</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '460px 1fr',
          gap: 12,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <h3 style={{ margin: 0 }}>Spec JSON</h3>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <span style={{ fontSize: 12, opacity: 0.75 }}>View</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid #bbb',
                  background: '#f7f7f7',
                }}
              >
                <option value="sketch">Sketch</option>
                <option value="3d-sketch">3D Sketch</option>
              </select>

              <span style={{ fontSize: 12, opacity: 0.75, marginLeft: 8 }}>
                Theme
              </span>
              <select
                value={themeKey}
                onChange={(e) => setThemeKey(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid #bbb',
                  background: '#f7f7f7',
                }}
              >
                {Object.entries(THEMES).map(([key, t]) => (
                  <option key={key} value={key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              height: 520,
              borderRadius: 10,
              border: '1px solid #ccc',
              padding: 10,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 12,
              marginTop: 10,
            }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={applyJson}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #bbb',
                background: '#f7f7f7',
                cursor: 'pointer',
              }}
            >
              Apply JSON
            </button>

            <button
              onClick={() => {
                setSpec(initialSpec);
                setJsonText(JSON.stringify(initialSpec, null, 2));
                setJsonError('');
              }}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #bbb',
                background: '#f7f7f7',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>

          {jsonError && (
            <div style={{ marginTop: 10, color: '#b00020', fontWeight: 600 }}>
              JSON error: {jsonError}
            </div>
          )}
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 10,
            padding: 12,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Output</h3>

          {mode === 'sketch' && (
            <SketchView spec={spec} theme={theme} width={980} height={560} />
          )}

          {mode === '3d-sketch' && (
            <Sketch3DView spec={spec} theme={theme} width={980} height={560} />
          )}
        </div>
      </div>
    </div>
  );
}
