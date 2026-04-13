import { useRef, useEffect, useState } from "react";
import { getBinColor } from "../lib/bin-colors";
import type { LayoutState } from "../lib/layout";

const GAP = 1;
const MIN_CELL_SIZE = 16;
const MAX_CELL_SIZE = 48;

interface MiniLayoutGridProps {
  layout: LayoutState;
  selectedIds: Set<string>;
  onSelectionChange: (newSelection: Set<string>) => void;
}

export function MiniLayoutGrid({
  layout,
  selectedIds,
  onSelectionChange,
}: MiniLayoutGridProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [cellSize, setCellSize] = useState(32);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;
      const maxW =
        layout.gridUnitsX > 0
          ? Math.floor((width - GAP) / layout.gridUnitsX) - GAP
          : MAX_CELL_SIZE;
      const maxH =
        layout.gridUnitsY > 0
          ? Math.floor((height - GAP) / layout.gridUnitsY) - GAP
          : MAX_CELL_SIZE;
      setCellSize(
        Math.max(MIN_CELL_SIZE, Math.min(maxW, maxH, MAX_CELL_SIZE))
      );
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [layout.gridUnitsX, layout.gridUnitsY]);

  const svgWidth = layout.gridUnitsX * (cellSize + GAP) + GAP;
  const svgHeight = layout.gridUnitsY * (cellSize + GAP) + GAP;
  const labelFontSize = Math.max(9, Math.round(cellSize * 0.28));

  function cellPx(gridPos: number): number {
    return GAP + gridPos * (cellSize + GAP);
  }

  // Build occupancy map: cell -> item id
  const occupied = new Map<string, string>();
  for (const item of layout.items) {
    for (let dx = 0; dx < item.gridUnitsX; dx++) {
      for (let dy = 0; dy < item.gridUnitsY; dy++) {
        occupied.set(`${item.gridX + dx},${item.gridY + dy}`, item.id);
      }
    }
  }

  function getGridCoords(e: React.MouseEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return {
      x: Math.max(
        0,
        Math.min(
          Math.floor((px - GAP) / (cellSize + GAP)),
          layout.gridUnitsX - 1
        )
      ),
      y: Math.max(
        0,
        Math.min(
          Math.floor((py - GAP) / (cellSize + GAP)),
          layout.gridUnitsY - 1
        )
      ),
    };
  }

  function handleBinClick(itemId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // Toggle this bin in/out of selection
      const next = new Set(selectedIds);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      onSelectionChange(next);
    } else {
      // Replace selection with just this bin
      onSelectionChange(new Set([itemId]));
    }
  }

  function handleCellClick(e: React.MouseEvent) {
    const coords = getGridCoords(e);
    const itemId = occupied.get(`${coords.x},${coords.y}`);
    if (itemId) {
      handleBinClick(itemId, e);
    } else if (!e.ctrlKey && !e.metaKey) {
      // Click on empty space deselects all
      onSelectionChange(new Set());
    }
  }

  if (layout.items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-700 p-6 text-center">
        <div>
          <p className="text-sm text-zinc-500">No bins placed yet.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Go back to the Layout step to place bins on the grid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <div ref={containerRef} className="min-h-0 flex-1">
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          overflow="visible"
          className="rounded border border-zinc-700 bg-zinc-950"
          onMouseDown={handleCellClick}
        >
          {/* Grid cells */}
          {Array.from({ length: layout.gridUnitsX }, (_, x) =>
            Array.from({ length: layout.gridUnitsY }, (_, y) => {
              const isOccupied = occupied.has(`${x},${y}`);
              return (
                <rect
                  key={`${x},${y}`}
                  x={cellPx(x)}
                  y={cellPx(y)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={isOccupied ? "transparent" : "#27272a"}
                  className="cursor-default"
                />
              );
            })
          )}

          {/* Placed bins */}
          {layout.items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const color = getBinColor(item.gridUnitsX, item.gridUnitsY);

            return (
              <g key={`bin-${item.id}`}>
                <rect
                  x={cellPx(item.gridX)}
                  y={cellPx(item.gridY)}
                  width={item.gridUnitsX * (cellSize + GAP) - GAP}
                  height={item.gridUnitsY * (cellSize + GAP) - GAP}
                  rx={3}
                  fill={color}
                  opacity={isSelected ? 1 : 0.7}
                  className="cursor-pointer"
                  onMouseDown={(e) => {
                    handleBinClick(item.id, e);
                  }}
                />
                {isSelected && (
                  <rect
                    x={cellPx(item.gridX) - 1}
                    y={cellPx(item.gridY) - 1}
                    width={item.gridUnitsX * (cellSize + GAP) - GAP + 2}
                    height={item.gridUnitsY * (cellSize + GAP) - GAP + 2}
                    rx={4}
                    fill="none"
                    stroke="#f5f5f5"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    className="pointer-events-none"
                  />
                )}
                <text
                  x={
                    cellPx(item.gridX) +
                    (item.gridUnitsX * (cellSize + GAP) - GAP) / 2
                  }
                  y={
                    cellPx(item.gridY) +
                    (item.gridUnitsY * (cellSize + GAP) - GAP) / 2 +
                    labelFontSize * 0.35
                  }
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  className="pointer-events-none select-none fill-white font-mono"
                >
                  {item.gridUnitsX}×{item.gridUnitsY}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selection controls */}
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => {
            onSelectionChange(
              new Set(layout.items.map((i) => i.id))
            );
          }}
          className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
        >
          Select All
        </button>
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={() => {
              onSelectionChange(new Set());
            }}
            className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          >
            Deselect All
          </button>
        )}
        {selectedIds.size > 0 && (
          <span className="self-center text-xs text-zinc-500">
            {selectedIds.size} selected
          </span>
        )}
      </div>
    </div>
  );
}
