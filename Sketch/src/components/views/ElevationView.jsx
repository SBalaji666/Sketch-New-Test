import { useState, useMemo, useRef } from "react";

// ─── ELEVATION VIEW ───────────────────────────────────────────────────────────
function ElevationView({
  overall,
  mat,
  tol,
  sections,
  theme: t,
  width,
  height,
  svgRef,
}) {
  const { length: Lmm, height: Hmm } = overall;
  const ct = mat.carcass;
  const norm = useMemo(() => normSections(Lmm, sections), [Lmm, sections]);

  const ML = 64,
    MR = 20,
    MT = 36,
    MB = 56;
  const dw = width - ML - MR,
    dh = height - MT - MB;
  const scale = Math.min(dw / Lmm, dh / Hmm);
  const mm = (v) => v * scale;
  const Wpx = mm(Lmm),
    Hpx = mm(Hmm);
  const x0 = ML + (dw - Wpx) / 2,
    y0 = MT + (dh - Hpx) / 2;
  const ctpx = mm(ct);

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
          id="as"
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
          id="ae"
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
        y={MT - 10}
        fontSize="11"
        fill={t.label}
        fontFamily={FONT}
        fontWeight="600"
        opacity={0.85}
      >
        FRONT ELEVATION — {Lmm}×{Hmm} {overall.unit}
      </text>
      <rect
        x={x0}
        y={y0}
        width={Wpx}
        height={Hpx}
        fill={t.frontFill}
        stroke={t.stroke}
        strokeWidth={t.strokeW * 1.5}
      />
      <rect
        x={x0}
        y={y0}
        width={Wpx}
        height={ctpx}
        fill={t.sideFill}
        stroke={t.stroke}
        strokeWidth={t.strokeW}
      />
      <rect
        x={x0}
        y={y0 + Hpx - ctpx}
        width={Wpx}
        height={ctpx}
        fill={t.sideFill}
        stroke={t.stroke}
        strokeWidth={t.strokeW}
      />
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

      {secPx.map((s, i) => {
        const isFirst = i === 0,
          isLast = i === secPx.length - 1;
        const cx = s.px + (isFirst ? ctpx : 0);
        const cy = y0 + ctpx;
        const cw = Math.max(
          2,
          s.pw - (isFirst ? ctpx : 0) - (isLast ? ctpx : 0),
        );
        const ch = Hpx - ctpx * 2;
        const dc = clamp(s.drawers.count, 0, 20);
        const dhPx = mm(s.drawers.height || 120);
        const totalDH = Math.min(dc * dhPx, ch);
        const useDhPx = dc > 0 ? totalDH / dc : dhPx;
        const drawerAreaY =
          s.drawers.placement === "bottom" ? cy + ch - totalDH : cy;
        const shelfAreaY = s.drawers.placement === "bottom" ? cy : cy + totalDH;
        const shelfAreaH = ch - totalDH;

        return (
          <g key={s.id}>
            {i > 0 && (
              <rect
                x={s.px}
                y={y0}
                width={ctpx}
                height={Hpx}
                fill={t.sideFill}
                stroke={t.stroke}
                strokeWidth={t.strokeW * 0.8}
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
                  const sy = cy + ((k + 1) * ch) / (s.shelves + 1);
                  const st = Math.max(4, ctpx * 0.4);
                  return (
                    <rect
                      key={k}
                      x={cx + 3}
                      y={sy - st / 2}
                      width={cw - 6}
                      height={st}
                      fill={t.shelfFill}
                      stroke={t.stroke}
                      strokeWidth={t.strokeW * 0.6}
                    />
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
                  opacity={0.22}
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
                    const dy = drawerAreaY + k * useDhPx;
                    return (
                      <g key={k} opacity={0.5}>
                        <rect
                          x={cx + 2}
                          y={dy + 2}
                          width={cw - 4}
                          height={useDhPx - 4}
                          fill={t.drawerFace}
                          stroke={t.stroke}
                          strokeWidth={0.8}
                        />
                        <line
                          x1={cx + cw * 0.2}
                          y1={dy + useDhPx / 2}
                          x2={cx + cw * 0.8}
                          y2={dy + useDhPx / 2}
                          stroke={t.handle}
                          strokeWidth={1.8}
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
                        strokeWidth={1.1}
                        opacity={0.3}
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
              opacity={0.7}
            >
              {s.label}
            </text>
          </g>
        );
      })}
      <rect
        x={x0}
        y={y0}
        width={Wpx}
        height={Hpx}
        fill="none"
        stroke={t.stroke}
        strokeWidth={t.strokeW * 1.8}
      />
      {/* Dims */}
      <line
        x1={x0}
        y1={y0 + Hpx + 22}
        x2={x0 + Wpx}
        y2={y0 + Hpx + 22}
        stroke={t.dim}
        strokeWidth={1}
        markerStart="url(#as)"
        markerEnd="url(#ae)"
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
        markerStart="url(#as)"
        markerEnd="url(#ae)"
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
    </svg>
  );
}

export default ElevationView