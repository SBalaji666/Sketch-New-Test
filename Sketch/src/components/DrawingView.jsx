import React, { useMemo } from 'react';

function normSections(totalMm, sections) {
  const sum = sections.reduce((a, s) => a + (s.width || 0), 0);
  if (!sum) return sections.map(s => ({ ...s, _w: 0 }));
  return sections.map(s => ({ ...s, _w: (s.width / sum) * totalMm }));
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

// ── ELEVATION VIEW ────────────────────────────────────────────────────────────
function ElevationView({ config, theme: t, width, height }) {
  const { overall, materials, sections } = config;
  const { length: Lmm, height: Hmm, unit } = overall;
  const ct = materials.carcass;
  const norm = useMemo(() => normSections(Lmm, sections), [Lmm, sections]);

  const ML = 64, MR = 20, MT = 36, MB = 56;
  const dw = width - ML - MR, dh = height - MT - MB;
  const scale = Math.min(dw / Lmm, dh / Hmm);
  const mm = v => v * scale;
  const Wpx = mm(Lmm), Hpx = mm(Hmm);
  const x0 = ML + (dw - Wpx) / 2, y0 = MT + (dh - Hpx) / 2;
  const ctpx = mm(ct);

  let curX = 0;
  const secPx = norm.map(s => {
    const out = { ...s, px: x0 + mm(curX), pw: mm(s._w) };
    curX += s._w;
    return out;
  });

  return (
    <svg width={width} height={height} style={{ background: t.canvas, display: 'block', borderRadius: 10 }}>
      <defs>
        <marker id="as" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M7,1 L1,3.5 L7,6" fill="none" stroke={t.dim} strokeWidth="1.2" />
        </marker>
        <marker id="ae" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M1,1 L7,3.5 L1,6" fill="none" stroke={t.dim} strokeWidth="1.2" />
        </marker>
      </defs>

      <text x={x0} y={MT - 10} fontSize="11" fill={t.label} fontFamily="inherit" fontWeight="600" opacity={0.85}>
        FRONT ELEVATION — {Lmm}×{Hmm} {unit}
      </text>

      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill={t.frontFill} stroke={t.stroke} strokeWidth={t.strokeW * 1.5} />
      <rect x={x0} y={y0} width={Wpx} height={ctpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      <rect x={x0} y={y0 + Hpx - ctpx} width={Wpx} height={ctpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      <rect x={x0} y={y0} width={ctpx} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      <rect x={x0 + Wpx - ctpx} y={y0} width={ctpx} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />

      {secPx.map((s, i) => {
        const isFirst = i === 0, isLast = i === secPx.length - 1;
        const cx = s.px + (isFirst ? ctpx : 0);
        const cy = y0 + ctpx;
        const cw = Math.max(2, s.pw - (isFirst ? ctpx : 0) - (isLast ? ctpx : 0));
        const ch = Hpx - ctpx * 2;
        const dc = clamp(s.drawers?.count || 0, 0, 20);
        const dhPx = mm(s.drawers?.height || 120);
        const totalDH = Math.min(dc * dhPx, ch);
        const useDhPx = dc > 0 ? totalDH / dc : dhPx;
        const drawerAreaY = s.drawers?.placement === 'bottom' ? cy + ch - totalDH : cy;

        return (
          <g key={s.id}>
            {i > 0 && <rect x={s.px} y={y0} width={ctpx} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />}
            {s.type === 'open' ? (
              <>
                <rect x={cx} y={cy} width={cw} height={ch} fill={t.openFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.7} />
                <rect x={cx + 2} y={cy + 2} width={cw - 4} height={ch - 4} fill={t.openBack} stroke="none" opacity={0.5} />
                {Array.from({ length: s.shelves || 0 }).map((_, k) => {
                  const sy = cy + ((k + 1) * ch) / ((s.shelves || 0) + 1);
                  const st = Math.max(4, ctpx * 0.4);
                  return <rect key={k} x={cx + 3} y={sy - st / 2} width={cw - 6} height={st} fill={t.shelfFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.6} />;
                })}
              </>
            ) : (
              <>
                <rect x={s.px + 2} y={y0 + 2} width={s.pw - 4} height={Hpx - 4} fill={t.doorFill} stroke={t.stroke} strokeWidth={t.strokeW} />
                <rect x={s.px + 9} y={y0 + 9} width={s.pw - 18} height={Hpx - 18} fill="none" stroke={t.stroke} strokeWidth={0.5} opacity={0.22} />
                <rect x={s.px + s.pw * 0.78 - 3} y={y0 + Hpx * 0.42} width={6} height={Hpx * 0.16} rx={3} fill={t.handle} stroke={t.stroke} strokeWidth={0.8} />
                {dc > 0 && Array.from({ length: dc }).map((_, k) => {
                  const dy = drawerAreaY + k * useDhPx;
                  return (
                    <g key={k} opacity={0.5}>
                      <rect x={cx + 2} y={dy + 2} width={cw - 4} height={useDhPx - 4} fill={t.drawerFace} stroke={t.stroke} strokeWidth={0.8} />
                      <line x1={cx + cw * 0.2} y1={dy + useDhPx / 2} x2={cx + cw * 0.8} y2={dy + useDhPx / 2} stroke={t.handle} strokeWidth={1.8} />
                    </g>
                  );
                })}
              </>
            )}
            <text x={s.px + 6} y={y0 + 20} fontSize="10" fill={t.label} fontFamily="inherit" opacity={0.7}>{s.label}</text>
          </g>
        );
      })}

      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill="none" stroke={t.stroke} strokeWidth={t.strokeW * 1.8} />

      {/* Dimensions */}
      <line x1={x0} y1={y0 + Hpx + 22} x2={x0 + Wpx} y2={y0 + Hpx + 22} stroke={t.dim} strokeWidth={1} markerStart="url(#as)" markerEnd="url(#ae)" />
      <text x={(x0 * 2 + Wpx) / 2} y={y0 + Hpx + 36} fontSize="11" fill={t.dim} textAnchor="middle" fontFamily="inherit">{Lmm}{unit}</text>
      <line x1={x0} y1={y0 + Hpx + 10} x2={x0} y2={y0 + Hpx + 28} stroke={t.dim} strokeWidth={0.8} />
      <line x1={x0 + Wpx} y1={y0 + Hpx + 10} x2={x0 + Wpx} y2={y0 + Hpx + 28} stroke={t.dim} strokeWidth={0.8} />
      <line x1={x0 - 26} y1={y0} x2={x0 - 26} y2={y0 + Hpx} stroke={t.dim} strokeWidth={1} markerStart="url(#as)" markerEnd="url(#ae)" />
      <text x={x0 - 28} y={(y0 * 2 + Hpx) / 2} fontSize="11" fill={t.dim} textAnchor="middle" fontFamily="inherit" transform={`rotate(-90,${x0 - 28},${(y0 * 2 + Hpx) / 2})`}>{Hmm}{unit}</text>
      <line x1={x0 - 10} y1={y0} x2={x0 - 30} y2={y0} stroke={t.dim} strokeWidth={0.8} />
      <line x1={x0 - 10} y1={y0 + Hpx} x2={x0 - 30} y2={y0 + Hpx} stroke={t.dim} strokeWidth={0.8} />
    </svg>
  );
}

// ── ISOMETRIC VIEW ────────────────────────────────────────────────────────────
function IsoView({ config, theme: t, width, height }) {
  const { overall, materials, sections } = config;
  const { length: Lmm, height: Hmm, depth: Dmm, unit } = overall;
  const ct = materials.carcass;
  const norm = useMemo(() => normSections(Lmm, sections), [Lmm, sections]);

  const ML = 50, MR = 160, MT = 50, MB = 60;
  const dw = width - ML - MR, dh = height - MT - MB;
  const ISO_DX = 0.43, ISO_DY = 0.28;
  const projX = Dmm * ISO_DX, projY = Dmm * ISO_DY;
  const scale = Math.min(dw / (Lmm + projX), dh / (Hmm + projY)) * 0.93;
  const mm = v => v * scale;
  const Wpx = mm(Lmm), Hpx = mm(Hmm);
  const dx = mm(Dmm) * ISO_DX, dy = mm(Dmm) * ISO_DY;
  const ctpx = mm(ct);
  const x0 = ML, y0 = MT + dy;
  const ip = (fx, fy, d = 0) => ({ x: fx + d * dx, y: fy - d * dy });
  const poly = (...pts) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const FL = ip(x0, y0), FR = ip(x0 + Wpx, y0);
  const FBL = ip(x0, y0 + Hpx), FBR = ip(x0 + Wpx, y0 + Hpx);
  const BL = ip(x0, y0, 1), BR = ip(x0 + Wpx, y0, 1), BBR = ip(x0 + Wpx, y0 + Hpx, 1);

  let curX = 0;
  const secPx = norm.map(s => {
    const out = { ...s, px: x0 + mm(curX), pw: mm(s._w) };
    curX += s._w;
    return out;
  });

  return (
    <svg width={width} height={height} style={{ background: t.canvas, display: 'block', borderRadius: 10 }}>
      <defs>
        <marker id="as3" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M7,1 L1,3.5 L7,6" fill="none" stroke={t.dim} strokeWidth="1.2" />
        </marker>
        <marker id="ae3" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M1,1 L7,3.5 L1,6" fill="none" stroke={t.dim} strokeWidth="1.2" />
        </marker>
      </defs>

      <text x={x0} y={28} fontSize="11" fill={t.label} fontFamily="inherit" fontWeight="600" opacity={0.85}>
        3D VIEW — {Lmm}×{Hmm}×{Dmm} {unit}
      </text>

      {/* Top face */}
      <polygon points={poly(FL, FR, BR, BL)} fill={t.topFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      {Array.from({ length: 10 }).map((_, i) => {
        const f = (i + 1) / 11;
        const p1 = { x: FL.x + f * (FR.x - FL.x), y: FL.y };
        const p2 = { x: BL.x + f * (BR.x - BL.x), y: BL.y };
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={t.stroke} strokeWidth={0.5} opacity={0.15} />;
      })}

      {/* Right face */}
      <polygon points={poly(FR, BR, BBR, FBR)} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />

      {/* Front face base */}
      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill={t.frontFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      <rect x={x0} y={y0} width={Wpx} height={ctpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />
      <rect x={x0} y={y0 + Hpx - ctpx} width={Wpx} height={ctpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.8} />

      {/* Sections */}
      {secPx.map((s, i) => {
        const isFirst = i === 0, isLast = i === secPx.length - 1;
        const cx = s.px + (isFirst ? ctpx : 0), cy = y0 + ctpx;
        const cw = Math.max(2, s.pw - (isFirst ? ctpx : 0) - (isLast ? ctpx : 0)), ch = Hpx - ctpx * 2;
        const dc = clamp(s.drawers?.count || 0, 0, 20);
        const dhPx = mm(s.drawers?.height || 120);
        const totalDH = Math.min(dc * dhPx, ch), useDhPx = dc > 0 ? totalDH / dc : dhPx;
        const drawerAreaY = s.drawers?.placement === 'bottom' ? cy + ch - totalDH : cy;

        return (
          <g key={s.id}>
            {i > 0 && <polygon points={poly(ip(s.px, y0, 0), ip(s.px, y0, 1), ip(s.px, y0 + Hpx, 1), ip(s.px, y0 + Hpx, 0))} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.7} />}
            {s.type === 'open' ? (
              <>
                <rect x={cx} y={cy} width={cw} height={ch} fill={t.openFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.7} />
                <rect x={cx + 2} y={cy + 2} width={cw - 4} height={ch - 4} fill={t.openBack} stroke="none" opacity={0.5} />
                {Array.from({ length: s.shelves || 0 }).map((_, k) => {
                  const sy = cy + ((k + 1) * ch) / ((s.shelves || 0) + 1), st = Math.max(4, ctpx * 0.4);
                  return (
                    <g key={k}>
                      <rect x={cx + 2} y={sy - st / 2} width={cw - 4} height={st} fill={t.shelfFill} stroke={t.stroke} strokeWidth={t.strokeW * 0.6} />
                      <polygon points={poly(ip(cx + 2, sy - st / 2, 0), ip(cx + cw - 4, sy - st / 2, 0), ip(cx + cw - 4, sy - st / 2, 0.55), ip(cx + 2, sy - st / 2, 0.55))} fill={t.topFill} stroke={t.stroke} strokeWidth={0.5} opacity={0.7} />
                    </g>
                  );
                })}
              </>
            ) : (
              <>
                <rect x={s.px + 2} y={y0 + 2} width={s.pw - 4} height={Hpx - 4} fill={t.doorFill} stroke={t.stroke} strokeWidth={t.strokeW} />
                <rect x={s.px + 9} y={y0 + 9} width={s.pw - 18} height={Hpx - 18} fill="none" stroke={t.stroke} strokeWidth={0.5} opacity={0.2} />
                <rect x={s.px + s.pw * 0.78 - 3} y={y0 + Hpx * 0.42} width={6} height={Hpx * 0.16} rx={3} fill={t.handle} stroke={t.stroke} strokeWidth={0.8} />
                {dc > 0 && Array.from({ length: dc }).map((_, k) => {
                  const dy2 = drawerAreaY + k * useDhPx;
                  return (
                    <g key={k} opacity={0.45}>
                      <rect x={cx + 2} y={dy2 + 2} width={cw - 4} height={useDhPx - 4} fill={t.drawerFace} stroke={t.stroke} strokeWidth={0.8} />
                      <line x1={cx + cw * 0.2} y1={dy2 + useDhPx / 2} x2={cx + cw * 0.8} y2={dy2 + useDhPx / 2} stroke={t.handle} strokeWidth={1.6} />
                    </g>
                  );
                })}
              </>
            )}
            <text x={s.px + 6} y={y0 + 20} fontSize="10" fill={t.label} fontFamily="inherit" opacity={0.65}>{s.label}</text>
          </g>
        );
      })}

      <rect x={x0} y={y0} width={ctpx} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      <rect x={x0 + Wpx - ctpx} y={y0} width={ctpx} height={Hpx} fill={t.sideFill} stroke={t.stroke} strokeWidth={t.strokeW} />
      <rect x={x0} y={y0} width={Wpx} height={Hpx} fill="none" stroke={t.stroke} strokeWidth={t.strokeW * 1.8} />
      <line x1={FL.x} y1={FL.y} x2={BL.x} y2={BL.y} stroke={t.stroke} strokeWidth={t.strokeW * 1.4} />
      <line x1={FR.x} y1={FR.y} x2={BR.x} y2={BR.y} stroke={t.stroke} strokeWidth={t.strokeW * 1.4} />
      <line x1={FBR.x} y1={FBR.y} x2={BBR.x} y2={BBR.y} stroke={t.stroke} strokeWidth={t.strokeW * 1.4} />

      {/* Dimensions */}
      <line x1={x0} y1={y0 + Hpx + 22} x2={x0 + Wpx} y2={y0 + Hpx + 22} stroke={t.dim} strokeWidth={1} markerStart="url(#as3)" markerEnd="url(#ae3)" />
      <text x={(x0 * 2 + Wpx) / 2} y={y0 + Hpx + 36} fontSize="11" fill={t.dim} textAnchor="middle" fontFamily="inherit">{Lmm}{unit}</text>
    </svg>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function DrawingView({ config, theme, drawingView, svgRef, downloading, onDownloadSVG, onDownloadPNG, ui }) {
  const canvasW = 820, canvasH = 520;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: ui.accent, letterSpacing: 1 }}>
          {drawingView === '3d' ? '3D ISOMETRIC' : 'FRONT ELEVATION'} VIEW
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onDownloadSVG} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
            border: `1.5px solid ${ui.border}`, background: ui.inputBg, color: ui.text,
            fontFamily: 'inherit', fontWeight: 600,
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ marginRight: 4, verticalAlign: 'middle' }}>
              <path d="M8 2v9M4 7l4 4 4-4M2 13h12" stroke={ui.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            SVG
          </button>
          <button onClick={onDownloadPNG} disabled={downloading} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 10, cursor: downloading ? 'wait' : 'pointer',
            border: `1.5px solid ${downloading ? ui.border : ui.accent}`,
            background: downloading ? ui.inputBg : ui.accent,
            color: downloading ? ui.muted : '#fff',
            fontFamily: 'inherit', fontWeight: 600,
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ marginRight: 4, verticalAlign: 'middle' }}>
              <path d="M8 2v9M4 7l4 4 4-4M2 13h12" stroke={downloading ? ui.muted : '#fff'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {downloading ? 'Saving…' : 'PNG 2×'}
          </button>
        </div>
      </div>

      <div ref={svgRef} style={{ borderRadius: 10, border: `1px solid ${ui.border}`, overflow: 'hidden' }}>
        {drawingView === '3d' 
          ? <IsoView config={config} theme={theme} width={canvasW} height={canvasH} />
          : <ElevationView config={config} theme={theme} width={canvasW} height={canvasH} />
        }
      </div>

      <div style={{ marginTop: 8, fontSize: 9, color: ui.muted }}>
        Cabinet: {config.overall.length}×{config.overall.height}×{config.overall.depth} {config.overall.unit} · 
        Joinery: {config.hardware.joinery} · 
        Plinth: {config.hardware.plinth}
      </div>
    </div>
  );
}
