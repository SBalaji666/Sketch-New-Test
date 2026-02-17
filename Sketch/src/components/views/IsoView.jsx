import { useState, useMemo, useRef } from "react";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
function normSections(totalMm, sections) {
  const sum = sections.reduce((a, s) => a + (s.width || 0), 0);
  if (!sum) return sections.map((s) => ({ ...s, _w: 0 }));
  return sections.map((s) => ({ ...s, _w: (s.width / sum) * totalMm }));
}

// ─── ISOMETRIC VIEW ───────────────────────────────────────────────────────────
function IsoView({
  overall,
  mat,
  tol,
  sections,
  theme: t,
  width,
  height,
  svgRef,
  FONT
}) {
  const { length: Lmm, height: Hmm, depth: Dmm } = overall;
  const ct = mat.carcass;
  const norm = useMemo(() => normSections(Lmm, sections), [Lmm, sections]);

  const ML = 50,
    MR = 160,
    MT = 50,
    MB = 60;
  const dw = width - ML - MR,
    dh = height - MT - MB;
  const ISO_DX = 0.43,
    ISO_DY = 0.28;
  const projX = Dmm * ISO_DX,
    projY = Dmm * ISO_DY;
  const scale = Math.min(dw / (Lmm + projX), dh / (Hmm + projY)) * 0.93;
  const mm = (v) => v * scale;
  const Wpx = mm(Lmm),
    Hpx = mm(Hmm);
  const dx = mm(Dmm) * ISO_DX,
    dy = mm(Dmm) * ISO_DY;
  const ctpx = mm(ct);
  const x0 = ML,
    y0 = MT + dy;
  const ip = (fx, fy, d = 0) => ({ x: fx + d * dx, y: fy - d * dy });
  const poly = (...pts) =>
    pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const FL = ip(x0, y0),
    FR = ip(x0 + Wpx, y0);
  const FBL = ip(x0, y0 + Hpx),
    FBR = ip(x0 + Wpx, y0 + Hpx);
  const BL = ip(x0, y0, 1),
    BR = ip(x0 + Wpx, y0, 1),
    BBR = ip(x0 + Wpx, y0 + Hpx, 1);

  let curX = 0;
  const secPx = norm.map((s) => {
    const out = { ...s, px: x0 + mm(curX), pw: mm(s._w) };
    curX += s._w;
    return out;
  });

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ background: t.canvas, display: "block" }}
    >
      <defs>
        <marker
          id="as3"
          markerWidth="7"
          markerHeight="7"
          refX="3.5"
          refY="3.5"
          orient="auto"
        >
          <path
            d="M7,1 L1,3.5 L7,6"
            fill="none"
            stroke={t.dim}
            strokeWidth="1.2"
          />
        </marker>
        <marker
          id="ae3"
          markerWidth="7"
          markerHeight="7"
          refX="3.5"
          refY="3.5"
          orient="auto"
        >
          <path
            d="M1,1 L7,3.5 L1,6"
            fill="none"
            stroke={t.dim}
            strokeWidth="1.2"
          />
        </marker>
      </defs>
      <text
        x={x0}
        y={28}
        fontSize="11"
        fill={t.label}
        fontFamily={FONT}
        fontWeight="600"
        opacity={0.85}
      >
        3D VIEW — {Lmm}×{Hmm}×{Dmm} {overall.unit}
      </text>

      {/* Top face */}
      <polygon
        points={poly(FL, FR, BR, BL)}
        fill={t.topFill}
        stroke={t.stroke}
        strokeWidth={t.strokeW}
      />
      {Array.from({ length: 10 }).map((_, i) => {
        const f = (i + 1) / 11;
        const p1 = { x: FL.x + f * (FR.x - FL.x), y: FL.y };
        const p2 = { x: BL.x + f * (BR.x - BL.x), y: BL.y };
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={t.stroke}
            strokeWidth={0.5}
            opacity={0.15}
          />
        );
      })}

      {/* Right face */}
      <polygon
        points={poly(FR, BR, BBR, FBR)}
        fill={t.sideFill}
        stroke={t.stroke}
        strokeWidth={t.strokeW}
      />
      {Array.from({ length: 8 }).map((_, i) => {
        const f = (i + 1) / 9;
        const p1 = {
          x: FR.x + f * (FBR.x - FR.x),
          y: FR.y + f * (FBR.y - FR.y),
        };
        const p2 = {
          x: BR.x + f * (BBR.x - BR.x),
          y: BR.y + f * (BBR.y - BR.y),
        };
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={t.stroke}
            strokeWidth={0.5}
            opacity={0.13}
          />
        );
      })}

      {/* Front face base */}
      <rect
        x={x0}
        y={y0}
        width={Wpx}
        height={Hpx}
        fill={t.frontFill}
        stroke={t.stroke}
        strokeWidth={t.strokeW}
      />
      <rect
        x={x0}
        y={y0}
        width={Wpx}
        height={ctpx}
        fill={t.sideFill}
        stroke={t.stroke}
        strokeWidth={t.strokeW * 0.8}
      />
      <rect
        x={x0}
        y={y0 + Hpx - ctpx}
        width={Wpx}
        height={ctpx}
        fill={t.sideFill}
        stroke={t.stroke}
        strokeWidth={t.strokeW * 0.8}
      />

      {/* Sections */}
      {secPx.map((s, i) => {
        const isFirst = i === 0,
          isLast = i === secPx.length - 1;
        const cx = s.px + (isFirst ? ctpx : 0),
          cy = y0 + ctpx;
        const cw = Math.max(
            2,
            s.pw - (isFirst ? ctpx : 0) - (isLast ? ctpx : 0),
          ),
          ch = Hpx - ctpx * 2;
        const dc = clamp(s.drawers.count, 0, 20);
        const dhPx = mm(s.drawers.height || 120);
        const totalDH = Math.min(dc * dhPx, ch),
          useDhPx = dc > 0 ? totalDH / dc : dhPx;
        const drawerAreaY =
          s.drawers.placement === "bottom" ? cy + ch - totalDH : cy;
        const shelfAreaY = s.drawers.placement === "bottom" ? cy : cy + totalDH;
        const shelfAreaH = ch - totalDH;

        return (
          <g key={s.id}>
            {i > 0 && (
              <polygon
                points={poly(
                  ip(s.px, y0, 0),
                  ip(s.px, y0, 1),
                  ip(s.px, y0 + Hpx, 1),
                  ip(s.px, y0 + Hpx, 0),
                )}
                fill={t.sideFill}
                stroke={t.stroke}
                strokeWidth={t.strokeW * 0.7}
              />
            )}
            {s.type === "open" ? (
              <>
                <rect
                  x={cx}
                  y={cy}
                  width={cw}
                  height={ch}
                  fill={t.openFill}
                  stroke={t.stroke}
                  strokeWidth={t.strokeW * 0.7}
                />
                <rect
                  x={cx + 2}
                  y={cy + 2}
                  width={cw - 4}
                  height={ch - 4}
                  fill={t.openBack}
                  stroke="none"
                  opacity={0.5}
                />
                {Array.from({ length: s.shelves }).map((_, k) => {
                  const sy = cy + ((k + 1) * ch) / (s.shelves + 1),
                    st = Math.max(4, ctpx * 0.4);
                  return (
                    <g key={k}>
                      <rect
                        x={cx + 2}
                        y={sy - st / 2}
                        width={cw - 4}
                        height={st}
                        fill={t.shelfFill}
                        stroke={t.stroke}
                        strokeWidth={t.strokeW * 0.6}
                      />
                      <polygon
                        points={poly(
                          ip(cx + 2, sy - st / 2, 0),
                          ip(cx + cw - 4, sy - st / 2, 0),
                          ip(cx + cw - 4, sy - st / 2, 0.55),
                          ip(cx + 2, sy - st / 2, 0.55),
                        )}
                        fill={t.topFill}
                        stroke={t.stroke}
                        strokeWidth={0.5}
                        opacity={0.7}
                      />
                    </g>
                  );
                })}
              </>
            ) : (
              <>
                <rect
                  x={s.px + 2}
                  y={y0 + 2}
                  width={s.pw - 4}
                  height={Hpx - 4}
                  fill={t.doorFill}
                  stroke={t.stroke}
                  strokeWidth={t.strokeW}
                />
                <rect
                  x={s.px + 9}
                  y={y0 + 9}
                  width={s.pw - 18}
                  height={Hpx - 18}
                  fill="none"
                  stroke={t.stroke}
                  strokeWidth={0.5}
                  opacity={0.2}
                />
                <rect
                  x={s.px + s.pw * 0.78 - 3}
                  y={y0 + Hpx * 0.42 + 1.5}
                  width={6}
                  height={Hpx * 0.16}
                  rx={3}
                  fill="rgba(0,0,0,0.12)"
                />
                <rect
                  x={s.px + s.pw * 0.78 - 3}
                  y={y0 + Hpx * 0.42}
                  width={6}
                  height={Hpx * 0.16}
                  rx={3}
                  fill={t.handle}
                  stroke={t.stroke}
                  strokeWidth={0.8}
                />
                {dc > 0 &&
                  Array.from({ length: dc }).map((_, k) => {
                    const dy2 = drawerAreaY + k * useDhPx;
                    return (
                      <g key={k} opacity={0.45}>
                        <rect
                          x={cx + 2}
                          y={dy2 + 2}
                          width={cw - 4}
                          height={useDhPx - 4}
                          fill={t.drawerFace}
                          stroke={t.stroke}
                          strokeWidth={0.8}
                        />
                        <line
                          x1={cx + cw * 0.2}
                          y1={dy2 + useDhPx / 2}
                          x2={cx + cw * 0.8}
                          y2={dy2 + useDhPx / 2}
                          stroke={t.handle}
                          strokeWidth={1.6}
                        />
                      </g>
                    );
                  })}
                {s.shelves > 0 &&
                  dc === 0 &&
                  Array.from({ length: s.shelves }).map((_, k) => {
                    const sy =
                      shelfAreaY + ((k + 1) * shelfAreaH) / (s.shelves + 1);
                    return (
                      <line
                        key={k}
                        x1={cx + 4}
                        y1={sy}
                        x2={cx + cw - 4}
                        y2={sy}
                        stroke={t.stroke}
                        strokeWidth={1}
                        opacity={0.22}
                      />
                    );
                  })}
              </>
            )}
            <text
              x={s.px + 6}
              y={y0 + 20}
              fontSize="10"
              fill={t.label}
              fontFamily={FONT}
              opacity={0.65}
            >
              {s.label}
            </text>
          </g>
        );
      })}

      <rect
        x={x0}
        y={y0}
        width={ctpx}
        height={Hpx}
        fill={t.sideFill}
        stroke={t.stroke}
        strokeWidth={t.strokeW}
      />
      <rect
        x={x0 + Wpx - ctpx}
        y={y0}
        width={ctpx}
        height={Hpx}
        fill={t.sideFill}
        stroke={t.stroke}
        strokeWidth={t.strokeW}
      />
      <rect
        x={x0}
        y={y0}
        width={Wpx}
        height={Hpx}
        fill="none"
        stroke={t.stroke}
        strokeWidth={t.strokeW * 1.8}
      />
      <line
        x1={FL.x}
        y1={FL.y}
        x2={BL.x}
        y2={BL.y}
        stroke={t.stroke}
        strokeWidth={t.strokeW * 1.4}
      />
      <line
        x1={FR.x}
        y1={FR.y}
        x2={BR.x}
        y2={BR.y}
        stroke={t.stroke}
        strokeWidth={t.strokeW * 1.4}
      />
      <line
        x1={FBR.x}
        y1={FBR.y}
        x2={BBR.x}
        y2={BBR.y}
        stroke={t.stroke}
        strokeWidth={t.strokeW * 1.4}
      />

      {/* Dims */}
      <line
        x1={x0}
        y1={y0 + Hpx + 22}
        x2={x0 + Wpx}
        y2={y0 + Hpx + 22}
        stroke={t.dim}
        strokeWidth={1}
        markerStart="url(#as3)"
        markerEnd="url(#ae3)"
      />
      <text
        x={(x0 * 2 + Wpx) / 2}
        y={y0 + Hpx + 36}
        fontSize="11"
        fill={t.dim}
        textAnchor="middle"
        fontFamily={FONT}
      >
        {Lmm}
        {overall.unit}
      </text>
      <line
        x1={x0}
        y1={y0 + Hpx + 10}
        x2={x0}
        y2={y0 + Hpx + 28}
        stroke={t.dim}
        strokeWidth={0.8}
      />
      <line
        x1={x0 + Wpx}
        y1={y0 + Hpx + 10}
        x2={x0 + Wpx}
        y2={y0 + Hpx + 28}
        stroke={t.dim}
        strokeWidth={0.8}
      />
      <line
        x1={x0 - 26}
        y1={y0}
        x2={x0 - 26}
        y2={y0 + Hpx}
        stroke={t.dim}
        strokeWidth={1}
        markerStart="url(#as3)"
        markerEnd="url(#ae3)"
      />
      <text
        x={x0 - 28}
        y={(y0 * 2 + Hpx) / 2}
        fontSize="11"
        fill={t.dim}
        textAnchor="middle"
        fontFamily={FONT}
        transform={`rotate(-90,${x0 - 28},${(y0 * 2 + Hpx) / 2})`}
      >
        {Hmm}
        {overall.unit}
      </text>
      <line
        x1={x0 - 10}
        y1={y0}
        x2={x0 - 30}
        y2={y0}
        stroke={t.dim}
        strokeWidth={0.8}
      />
      <line
        x1={x0 - 10}
        y1={y0 + Hpx}
        x2={x0 - 30}
        y2={y0 + Hpx}
        stroke={t.dim}
        strokeWidth={0.8}
      />
      <line
        x1={FR.x}
        y1={FR.y - 10}
        x2={BR.x}
        y2={BR.y - 10}
        stroke={t.dim}
        strokeWidth={1}
        markerStart="url(#as3)"
        markerEnd="url(#ae3)"
      />
      <text
        x={(FR.x + BR.x) / 2 + 6}
        y={(FR.y + BR.y) / 2 - 14}
        fontSize="11"
        fill={t.dim}
        fontFamily={FONT}
      >
        {Dmm}
        {overall.unit}
      </text>

      {/* Callouts */}
      {secPx
        .filter((s) => s.type === "open" || s.drawers.count > 0)
        .map((s, i) => {
          const lx = x0 + Wpx + dx + 14,
            ly = y0 + 40 + i * 50;
          const mx = s.px + s.pw / 2,
            my = y0 + Hpx * 0.5;
          const txt =
            s.type === "open"
              ? `${s.label}: Open ×${s.shelves} shelves`
              : `${s.label}: Drawers ×${s.drawers.count} [${s.drawers.placement}]`;
          return (
            <g key={s.id}>
              <line
                x1={lx}
                y1={ly}
                x2={mx + 8}
                y2={my}
                stroke={t.dim}
                strokeWidth={0.8}
                strokeDasharray="4,3"
                opacity={0.6}
              />
              <circle cx={mx + 8} cy={my} r={3} fill={t.dim} opacity={0.6} />
              <rect
                x={lx}
                y={ly - 13}
                width={152}
                height={18}
                rx={4}
                fill={t.canvas}
                stroke={t.dim}
                strokeWidth={0.8}
                opacity={0.9}
              />
              <text
                x={lx + 5}
                y={ly}
                fontSize="9.5"
                fill={t.dim}
                fontFamily={FONT}
              >
                {txt}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

export default IsoView