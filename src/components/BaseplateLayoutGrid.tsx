import { useState, useMemo, useRef, useEffect } from "react";
import { useBaseplateLayout } from "./BaseplateLayoutContext";
import { useBaseplateConfig } from "./BaseplateConfigContext";
import {
  canPlaceBaseplate,
  canPlaceSpacer,
  createBaseplateItem,
  createSpacerPiece,
  spacerStripLength,
} from "../lib/baseplate-layout";
import type { SpacerSide } from "../lib/baseplate-layout";
import { getBinColor } from "../lib/bin-colors";
import { BaseplateShape, SpacerShape } from "./partShapes";

const GAP = 1;
const MIN_CELL_SIZE = 24;
const MAX_CELL_SIZE = 56;
const SPACER_THICKNESS = 14; // px visual thickness of spacer strips

type Interaction =
  | {
      type: "drawing-baseplate";
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    }
  | {
      type: "drawing-spacer";
      side: SpacerSide;
      startOffset: number;
      currentOffset: number;
    };

function rectFrom(a: number, b: number) {
  return { start: Math.min(a, b), end: Math.max(a, b) + 1 };
}

export function BaseplateLayoutGrid(): React.JSX.Element {
  const {
    layout,
    activeSpacerSides,
    selected,
    setSelected,
    placeBaseplate,
    removeBaseplate,
    placeSpacer,
    removeSpacer,
  } = useBaseplateLayout();
  const { baseplateConfig } = useBaseplateConfig();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [cellSize, setCellSize] = useState(32);
  const [interaction, setInteraction] = useState<Interaction | null>(null);

  // Account for spacer strips in available space when sizing cells.
  const padLeft = activeSpacerSides.left ? SPACER_THICKNESS + GAP : 0;
  const padRight = activeSpacerSides.right ? SPACER_THICKNESS + GAP : 0;
  const padTop = activeSpacerSides.top ? SPACER_THICKNESS + GAP : 0;
  const padBottom = activeSpacerSides.bottom ? SPACER_THICKNESS + GAP : 0;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      const availW = width - padLeft - padRight - GAP * 2;
      const availH = height - padTop - padBottom - GAP * 2;
      const maxW =
        layout.gridUnitsX > 0
          ? Math.floor(availW / layout.gridUnitsX) - GAP
          : MAX_CELL_SIZE;
      const maxH =
        layout.gridUnitsY > 0
          ? Math.floor(availH / layout.gridUnitsY) - GAP
          : MAX_CELL_SIZE;
      setCellSize(
        Math.max(MIN_CELL_SIZE, Math.min(maxW, maxH, MAX_CELL_SIZE))
      );
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [
    layout.gridUnitsX,
    layout.gridUnitsY,
    padLeft,
    padRight,
    padTop,
    padBottom,
  ]);

  const gridPx = (units: number) => units * (cellSize + GAP) + GAP;
  const gridW = gridPx(layout.gridUnitsX);
  const gridH = gridPx(layout.gridUnitsY);
  const gridLeft = padLeft;
  const gridTop = padTop;
  const svgWidth = gridLeft + gridW + padRight;
  const svgHeight = gridTop + gridH + padBottom;
  const labelFontSize = Math.max(10, Math.round(cellSize * 0.28));

  // Build occupancy map for baseplate cells
  const occupied = useMemo(() => {
    const m = new Map<string, string>();
    for (const item of layout.items) {
      for (let dx = 0; dx < item.gridUnitsX; dx++) {
        for (let dy = 0; dy < item.gridUnitsY; dy++) {
          m.set(`${item.gridX + dx},${item.gridY + dy}`, item.id);
        }
      }
    }
    return m;
  }, [layout.items]);

  const cellPx = (gridPos: number) => GAP + gridPos * (cellSize + GAP);

  function svgCoords(e: React.MouseEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function gridCellAt(px: number, py: number): { gx: number; gy: number } {
    const lx = px - gridLeft;
    const ly = py - gridTop;
    return {
      gx: Math.max(
        0,
        Math.min(
          Math.floor((lx - GAP) / (cellSize + GAP)),
          layout.gridUnitsX - 1
        )
      ),
      gy: Math.max(
        0,
        Math.min(
          Math.floor((ly - GAP) / (cellSize + GAP)),
          layout.gridUnitsY - 1
        )
      ),
    };
  }

  function spacerOffsetAt(side: SpacerSide, px: number, py: number): number {
    const stripLen = spacerStripLength(side, layout);
    if (side === "left" || side === "right") {
      const ly = py - gridTop;
      return Math.max(
        0,
        Math.min(Math.floor((ly - GAP) / (cellSize + GAP)), stripLen - 1)
      );
    }
    const lx = px - gridLeft;
    return Math.max(
      0,
      Math.min(Math.floor((lx - GAP) / (cellSize + GAP)), stripLen - 1)
    );
  }

  // ── Interaction handlers ──────────────────────────────────────────────────

  const baseplateDrawPreview =
    interaction?.type === "drawing-baseplate"
      ? (() => {
          const xr = rectFrom(interaction.startX, interaction.currentX);
          const yr = rectFrom(interaction.startY, interaction.currentY);
          return {
            gridX: xr.start,
            gridY: yr.start,
            w: xr.end - xr.start,
            h: yr.end - yr.start,
          };
        })()
      : null;

  const baseplateDrawValid = baseplateDrawPreview
    ? canPlaceBaseplate(
        createBaseplateItem(
          baseplateDrawPreview.gridX,
          baseplateDrawPreview.gridY,
          baseplateDrawPreview.w,
          baseplateDrawPreview.h
        ),
        layout
      )
    : false;

  const spacerDrawPreview =
    interaction?.type === "drawing-spacer"
      ? (() => {
          const r = rectFrom(interaction.startOffset, interaction.currentOffset);
          return { side: interaction.side, offset: r.start, length: r.end - r.start };
        })()
      : null;

  const spacerDrawValid = spacerDrawPreview
    ? canPlaceSpacer(
        createSpacerPiece(
          spacerDrawPreview.side,
          spacerDrawPreview.offset,
          spacerDrawPreview.length
        ),
        layout
      )
    : false;

  function handleCellMouseDown(gx: number, gy: number) {
    const itemId = occupied.get(`${gx},${gy}`);
    if (itemId) {
      setSelected({ kind: "baseplate", id: itemId });
      return;
    }
    setSelected(null);
    setInteraction({
      type: "drawing-baseplate",
      startX: gx,
      startY: gy,
      currentX: gx,
      currentY: gy,
    });
  }

  function handleSpacerMouseDown(
    side: SpacerSide,
    offset: number,
    hitId: string | null
  ) {
    if (hitId) {
      setSelected({ kind: "spacer", id: hitId });
      return;
    }
    setSelected(null);
    setInteraction({
      type: "drawing-spacer",
      side,
      startOffset: offset,
      currentOffset: offset,
    });
  }

  function handleSvgMouseMove(e: React.MouseEvent) {
    if (!interaction) return;
    const { x, y } = svgCoords(e);
    if (interaction.type === "drawing-baseplate") {
      const { gx, gy } = gridCellAt(x, y);
      setInteraction({ ...interaction, currentX: gx, currentY: gy });
    } else {
      const offset = spacerOffsetAt(interaction.side, x, y);
      setInteraction({ ...interaction, currentOffset: offset });
    }
  }

  function handleSvgMouseUp() {
    if (!interaction) return;
    if (
      interaction.type === "drawing-baseplate" &&
      baseplateDrawPreview &&
      baseplateDrawValid
    ) {
      placeBaseplate(
        baseplateDrawPreview.gridX,
        baseplateDrawPreview.gridY,
        baseplateDrawPreview.w,
        baseplateDrawPreview.h
      );
    } else if (
      interaction.type === "drawing-spacer" &&
      spacerDrawPreview &&
      spacerDrawValid
    ) {
      placeSpacer(
        spacerDrawPreview.side,
        spacerDrawPreview.offset,
        spacerDrawPreview.length
      );
    }
    setInteraction(null);
  }

  function handleSvgMouseLeave() {
    if (interaction) setInteraction(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Delete" || e.key === "Backspace") {
      if (selected?.kind === "baseplate") {
        removeBaseplate(selected.id);
        e.preventDefault();
      } else if (selected?.kind === "spacer") {
        removeSpacer(selected.id);
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      setSelected(null);
      setInteraction(null);
    }
  }

  // ── Spacer strip geometry helpers ─────────────────────────────────────────

  function stripRect(side: SpacerSide) {
    if (side === "left") {
      return { x: gridLeft - SPACER_THICKNESS - GAP, y: gridTop, w: SPACER_THICKNESS, h: gridH };
    }
    if (side === "right") {
      return { x: gridLeft + gridW + GAP, y: gridTop, w: SPACER_THICKNESS, h: gridH };
    }
    if (side === "top") {
      return { x: gridLeft, y: gridTop - SPACER_THICKNESS - GAP, w: gridW, h: SPACER_THICKNESS };
    }
    return { x: gridLeft, y: gridTop + gridH + GAP, w: gridW, h: SPACER_THICKNESS };
  }

  function spacerPiecePx(side: SpacerSide, offset: number, length: number) {
    const r = stripRect(side);
    if (side === "left" || side === "right") {
      return {
        x: r.x,
        y: gridTop + cellPx(offset),
        w: SPACER_THICKNESS,
        h: length * (cellSize + GAP) - GAP,
      };
    }
    return {
      x: gridLeft + cellPx(offset),
      y: r.y,
      w: length * (cellSize + GAP) - GAP,
      h: SPACER_THICKNESS,
    };
  }

  // Build spacer occupancy index: stripside -> Map<unitOffset, pieceId>
  const spacerOccupancy = new Map<SpacerSide, Map<number, string>>();
  for (const piece of layout.spacers) {
    let m = spacerOccupancy.get(piece.side);
    if (!m) {
      m = new Map();
      spacerOccupancy.set(piece.side, m);
    }
    for (let i = 0; i < piece.length; i++) m.set(piece.offset + i, piece.id);
  }

  function spacerHitAt(side: SpacerSide, offset: number): string | null {
    return spacerOccupancy.get(side)?.get(offset) ?? null;
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center"
    >
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        overflow="visible"
        className="rounded border border-zinc-700 bg-zinc-950 outline-none"
        data-testid="baseplate-layout-grid"
        tabIndex={0}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseLeave}
        onKeyDown={handleKeyDown}
      >
        {/* Spacer strips (background) */}
        {(["left", "right", "top", "bottom"] as SpacerSide[])
          .filter((side) => activeSpacerSides[side])
          .map((side) => {
            const r = stripRect(side);
            const stripLen = spacerStripLength(side, layout);
            return (
              <g key={`strip-${side}`}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={2}
                  fill="#1f1f23"
                  stroke="#3f3f46"
                  strokeDasharray="2 2"
                />
                {/* Hit cells along the strip */}
                {Array.from({ length: stripLen }, (_, i) => {
                  const px = spacerPiecePx(side, i, 1);
                  const hitId = spacerHitAt(side, i);
                  return (
                    <rect
                      key={`strip-${side}-${i}`}
                      x={px.x}
                      y={px.y}
                      width={px.w}
                      height={px.h}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseDown={() => {
                        handleSpacerMouseDown(side, i, hitId);
                      }}
                      data-testid={`spacer-cell-${side}-${i}`}
                    />
                  );
                })}
              </g>
            );
          })}

        {/* Placed spacer pieces */}
        {layout.spacers.map((piece) => {
          const isSelected =
            selected?.kind === "spacer" && selected.id === piece.id;
          const px = spacerPiecePx(piece.side, piece.offset, piece.length);
          const color = getBinColor(1, piece.length);
          return (
            <g key={piece.id} className="pointer-events-none">
              <SpacerShape
                x={px.x}
                y={px.y}
                width={px.w}
                height={px.h}
                color={color}
                opacity={0.9}
              />
              {isSelected && (
                <rect
                  x={px.x - 1}
                  y={px.y - 1}
                  width={px.w + 2}
                  height={px.h + 2}
                  rx={3}
                  fill="none"
                  stroke="#f5f5f5"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
              )}
            </g>
          );
        })}

        {/* Spacer draw preview */}
        {spacerDrawPreview && (
          <rect
            x={
              spacerPiecePx(
                spacerDrawPreview.side,
                spacerDrawPreview.offset,
                spacerDrawPreview.length
              ).x
            }
            y={
              spacerPiecePx(
                spacerDrawPreview.side,
                spacerDrawPreview.offset,
                spacerDrawPreview.length
              ).y
            }
            width={
              spacerPiecePx(
                spacerDrawPreview.side,
                spacerDrawPreview.offset,
                spacerDrawPreview.length
              ).w
            }
            height={
              spacerPiecePx(
                spacerDrawPreview.side,
                spacerDrawPreview.offset,
                spacerDrawPreview.length
              ).h
            }
            rx={2}
            fill={spacerDrawValid ? "#166534" : "#991b1b"}
            opacity={0.6}
            className="pointer-events-none"
          />
        )}

        {/* Grid cells */}
        <g transform={`translate(${gridLeft}, ${gridTop})`}>
          {Array.from({ length: layout.gridUnitsX }, (_, x) =>
            Array.from({ length: layout.gridUnitsY }, (_, y) => {
              const isOccupied = occupied.has(`${x},${y}`);
              let fill = "#27272a";
              if (
                baseplateDrawPreview &&
                x >= baseplateDrawPreview.gridX &&
                x < baseplateDrawPreview.gridX + baseplateDrawPreview.w &&
                y >= baseplateDrawPreview.gridY &&
                y < baseplateDrawPreview.gridY + baseplateDrawPreview.h
              ) {
                fill = baseplateDrawValid ? "#166534" : "#991b1b";
              }
              return (
                <rect
                  key={`${x},${y}`}
                  x={cellPx(x)}
                  y={cellPx(y)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={isOccupied ? "transparent" : fill}
                  className="cursor-crosshair"
                  onMouseDown={() => {
                    handleCellMouseDown(x, y);
                  }}
                  data-testid={`bp-cell-${x}-${y}`}
                  data-occupied={isOccupied ? "true" : undefined}
                />
              );
            })
          )}

          {/* Placed baseplates — realistic socket-grid rendering */}
          {layout.items.map((item) => {
            const isSelected =
              selected?.kind === "baseplate" && selected.id === item.id;
            const rimX = cellPx(item.gridX);
            const rimY = cellPx(item.gridY);
            const rimW = item.gridUnitsX * (cellSize + GAP) - GAP;
            const rimH = item.gridUnitsY * (cellSize + GAP) - GAP;
            const color = getBinColor(item.gridUnitsX, item.gridUnitsY);
            return (
              <g key={item.id}>
                <g
                  className="cursor-pointer"
                  onMouseDown={() => {
                    handleCellMouseDown(item.gridX, item.gridY);
                  }}
                >
                  <BaseplateShape
                    x={rimX}
                    y={rimY}
                    width={rimW}
                    height={rimH}
                    cellsX={item.gridUnitsX}
                    cellsY={item.gridUnitsY}
                    color={color}
                    showMagnetHoles={baseplateConfig.includeMagnetHoles}
                    showScrewHoles={baseplateConfig.includeScrewHoles}
                  />
                </g>
                {isSelected && (
                  <rect
                    x={rimX - 1}
                    y={rimY - 1}
                    width={rimW + 2}
                    height={rimH + 2}
                    rx={5}
                    fill="none"
                    stroke="#f5f5f5"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    className="pointer-events-none"
                  />
                )}
                <text
                  x={rimX + rimW / 2}
                  y={rimY + rimH / 2 + labelFontSize * 0.35}
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  className="pointer-events-none select-none fill-white font-mono"
                >
                  {item.gridUnitsX}×{item.gridUnitsY}
                </text>
              </g>
            );
          })}

          {/* Baseplate draw preview dimension label */}
          {baseplateDrawPreview && (
            <text
              x={
                cellPx(baseplateDrawPreview.gridX) +
                (baseplateDrawPreview.w * (cellSize + GAP) - GAP) / 2
              }
              y={
                cellPx(baseplateDrawPreview.gridY) +
                (baseplateDrawPreview.h * (cellSize + GAP) - GAP) / 2 +
                labelFontSize * 0.35
              }
              textAnchor="middle"
              fontSize={labelFontSize + 2}
              fontWeight="bold"
              className={`pointer-events-none select-none ${
                baseplateDrawValid ? "fill-green-400" : "fill-red-400"
              }`}
            >
              {baseplateDrawPreview.w}×{baseplateDrawPreview.h}
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
