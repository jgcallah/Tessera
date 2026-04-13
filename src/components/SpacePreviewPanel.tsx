import { useRef, useEffect, useState } from "react";
import { useSpaceConfig } from "./SpaceConfigContext";
import { useGridConfig } from "./GridConfigContext";

/**
 * SVG diagram showing the physical space, grid cells, and leftover margins.
 * Margins are clearly labeled with dimension lines.
 */
export function SpacePreviewPanel(): React.JSX.Element {
  const { spaceConfig, gridFit } = useSpaceConfig();
  const { config: gridConfig } = useGridConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 300 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: width, h: height });
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const spaceW = spaceConfig.width;
  const spaceL = spaceConfig.length;

  if (spaceW <= 0 || spaceL <= 0) {
    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center"
      >
        <p className="text-sm text-zinc-600">
          Enter space dimensions to see the grid layout.
        </p>
      </div>
    );
  }

  // Scale to fit container with padding for dimension labels
  const pad = 60;
  const availW = size.w - pad * 2;
  const availH = size.h - pad * 2;
  const scale = Math.min(availW / spaceW, availH / spaceL);
  const svgW = spaceW * scale;
  const svgH = spaceL * scale;
  const offsetX = (size.w - svgW) / 2;
  const offsetY = (size.h - svgH) / 2;

  const cellSize = gridConfig.baseUnit;
  const gridW = gridFit.unitsX * cellSize;
  const gridL = gridFit.unitsY * cellSize;
  const marginX = (spaceW - gridW) / 2;
  const marginY = (spaceL - gridL) / 2;

  const labelSize = Math.max(10, Math.min(13, 11 * scale));
  const dimLineOffset = 20; // offset for dimension lines outside the shape

  const mxPx = marginX * scale;
  const myPx = marginY * scale;
  const gwPx = gridW * scale;
  const glPx = gridL * scale;

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg width={size.w} height={size.h}>
        <defs>
          <pattern
            id="margin-hatch"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="#b45309"
              strokeWidth="1"
              opacity="0.4"
            />
          </pattern>
        </defs>
        <g transform={`translate(${offsetX}, ${offsetY})`}>
          {/* Space outline (solid rectangle) */}
          <rect
            x={0}
            y={0}
            width={svgW}
            height={svgH}
            fill="none"
            stroke="#a1a1aa"
            strokeWidth={2}
          />

          {/* Margin areas with hatching */}
          {marginX > 0 && (
            <>
              <rect
                x={0}
                y={myPx}
                width={mxPx}
                height={glPx}
                fill="url(#margin-hatch)"
              />
              <rect
                x={mxPx + gwPx}
                y={myPx}
                width={mxPx}
                height={glPx}
                fill="url(#margin-hatch)"
              />
            </>
          )}
          {marginY > 0 && (
            <>
              <rect
                x={0}
                y={0}
                width={svgW}
                height={myPx}
                fill="url(#margin-hatch)"
              />
              <rect
                x={0}
                y={myPx + glPx}
                width={svgW}
                height={myPx}
                fill="url(#margin-hatch)"
              />
            </>
          )}

          {/* Spacers (if enabled) */}
          {gridFit.spacerWidthX > 0 && (
            <>
              <rect
                x={spaceConfig.spacerClearance * scale}
                y={myPx}
                width={gridFit.spacerWidthX * scale}
                height={glPx}
                fill="#d97706"
                opacity={0.35}
                stroke="#f59e0b"
                strokeWidth={1}
                rx={1}
              />
              <rect
                x={svgW - (spaceConfig.spacerClearance + gridFit.spacerWidthX) * scale}
                y={myPx}
                width={gridFit.spacerWidthX * scale}
                height={glPx}
                fill="#d97706"
                opacity={0.35}
                stroke="#f59e0b"
                strokeWidth={1}
                rx={1}
              />
            </>
          )}
          {gridFit.spacerWidthY > 0 && (
            <>
              <rect
                x={mxPx}
                y={spaceConfig.spacerClearance * scale}
                width={gwPx}
                height={gridFit.spacerWidthY * scale}
                fill="#d97706"
                opacity={0.35}
                stroke="#f59e0b"
                strokeWidth={1}
                rx={1}
              />
              <rect
                x={mxPx}
                y={svgH - (spaceConfig.spacerClearance + gridFit.spacerWidthY) * scale}
                width={gwPx}
                height={gridFit.spacerWidthY * scale}
                fill="#d97706"
                opacity={0.35}
                stroke="#f59e0b"
                strokeWidth={1}
                rx={1}
              />
            </>
          )}

          {/* Grid cells */}
          {Array.from({ length: gridFit.unitsX }, (_, ix) =>
            Array.from({ length: gridFit.unitsY }, (_, iy) => (
              <rect
                key={`${ix}-${iy}`}
                x={mxPx + ix * cellSize * scale}
                y={myPx + iy * cellSize * scale}
                width={cellSize * scale - 1}
                height={cellSize * scale - 1}
                fill="#7c3aed"
                opacity={0.2}
                stroke="#a78bfa"
                strokeWidth={1}
                rx={2}
              />
            ))
          )}

          {/* Grid boundary */}
          <rect
            x={mxPx}
            y={myPx}
            width={gwPx}
            height={glPx}
            fill="none"
            stroke="#c4b5fd"
            strokeWidth={2}
          />

          {/* ── Dimension lines ─────────────────────────────────── */}

          {/* Top: full space width */}
          <DimLine
            x1={0}
            y1={-dimLineOffset}
            x2={svgW}
            y2={-dimLineOffset}
            label={`${spaceW}mm`}
            fontSize={labelSize}
            color="#a1a1aa"
          />

          {/* Right: full space length */}
          <DimLine
            x1={svgW + dimLineOffset}
            y1={0}
            x2={svgW + dimLineOffset}
            y2={svgH}
            label={`${spaceL}mm`}
            fontSize={labelSize}
            color="#a1a1aa"
            vertical
          />

          {/* Bottom: margin X left */}
          {marginX > 0 && mxPx > 20 && (
            <DimLine
              x1={0}
              y1={svgH + dimLineOffset}
              x2={mxPx}
              y2={svgH + dimLineOffset}
              label={marginX.toFixed(1)}
              fontSize={labelSize - 1}
              color="#d97706"
            />
          )}

          {/* Bottom: grid width */}
          <DimLine
            x1={mxPx}
            y1={svgH + dimLineOffset}
            x2={mxPx + gwPx}
            y2={svgH + dimLineOffset}
            label={`${gridW}mm`}
            fontSize={labelSize - 1}
            color="#c4b5fd"
          />

          {/* Bottom: margin X right */}
          {marginX > 0 && mxPx > 20 && (
            <DimLine
              x1={mxPx + gwPx}
              y1={svgH + dimLineOffset}
              x2={svgW}
              y2={svgH + dimLineOffset}
              label={marginX.toFixed(1)}
              fontSize={labelSize - 1}
              color="#d97706"
            />
          )}

          {/* Left: margin Y top */}
          {marginY > 0 && myPx > 20 && (
            <DimLine
              x1={-dimLineOffset}
              y1={0}
              x2={-dimLineOffset}
              y2={myPx}
              label={marginY.toFixed(1)}
              fontSize={labelSize - 1}
              color="#d97706"
              vertical
            />
          )}

          {/* Left: grid length */}
          <DimLine
            x1={-dimLineOffset}
            y1={myPx}
            x2={-dimLineOffset}
            y2={myPx + glPx}
            label={`${gridL}mm`}
            fontSize={labelSize - 1}
            color="#c4b5fd"
            vertical
          />

          {/* Left: margin Y bottom */}
          {marginY > 0 && myPx > 20 && (
            <DimLine
              x1={-dimLineOffset}
              y1={myPx + glPx}
              x2={-dimLineOffset}
              y2={svgH}
              label={marginY.toFixed(1)}
              fontSize={labelSize - 1}
              color="#d97706"
              vertical
            />
          )}

          {/* Center label */}
          <text
            x={svgW / 2}
            y={svgH / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={labelSize + 2}
            className="fill-violet-400"
          >
            {gridFit.unitsX}×{gridFit.unitsY} grid
          </text>
        </g>
      </svg>
    </div>
  );
}

// ── Dimension line helper ───────────────────────────────────────────────────

function DimLine({
  x1,
  y1,
  x2,
  y2,
  label,
  fontSize,
  color,
  vertical = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  fontSize: number;
  color: string;
  vertical?: boolean;
}): React.JSX.Element {
  const tickLen = 4;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g>
      {/* Main line */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} />
      {/* End ticks */}
      {vertical ? (
        <>
          <line
            x1={x1 - tickLen}
            y1={y1}
            x2={x1 + tickLen}
            y2={y1}
            stroke={color}
            strokeWidth={1}
          />
          <line
            x1={x2 - tickLen}
            y1={y2}
            x2={x2 + tickLen}
            y2={y2}
            stroke={color}
            strokeWidth={1}
          />
        </>
      ) : (
        <>
          <line
            x1={x1}
            y1={y1 - tickLen}
            x2={x1}
            y2={y1 + tickLen}
            stroke={color}
            strokeWidth={1}
          />
          <line
            x1={x2}
            y1={y2 - tickLen}
            x2={x2}
            y2={y2 + tickLen}
            stroke={color}
            strokeWidth={1}
          />
        </>
      )}
      {/* Label */}
      <text
        x={midX + (vertical ? -2 : 0)}
        y={midY + (vertical ? 0 : -4)}
        textAnchor={vertical ? "end" : "middle"}
        dominantBaseline={vertical ? "middle" : "auto"}
        fontSize={fontSize}
        fill={color}
      >
        {label}
      </text>
    </g>
  );
}
