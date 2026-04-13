import { useState, useCallback } from "react";
import { useLayout } from "./LayoutContext";
import { canPlaceItem, createLayoutItem } from "../lib/layout";
import type { LayoutItem } from "../lib/layout";

const CELL_SIZE = 32;
const GAP = 1;

// Color palette for different footprint sizes
const SIZE_COLORS: Record<string, string> = {
  "1x1": "#6d28d9", // violet-700
  "2x1": "#2563eb", // blue-600
  "1x2": "#0891b2", // cyan-600
  "2x2": "#059669", // emerald-600
  "3x1": "#d97706", // amber-600
  "1x3": "#dc2626", // red-600
};
const DEFAULT_COLOR = "#7c3aed"; // violet-600

function getBinColor(item: LayoutItem): string {
  const key = `${item.gridUnitsX}x${item.gridUnitsY}`;
  return SIZE_COLORS[key] ?? DEFAULT_COLOR;
}

export type LayoutMode = "draw" | "stamp";

interface LayoutGridProps {
  mode: LayoutMode;
  stampWidth: number;
  stampHeight: number;
  highlightFootprint: string | null;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function getDragRect(drag: DragState) {
  const x1 = Math.min(drag.startX, drag.currentX);
  const y1 = Math.min(drag.startY, drag.currentY);
  const x2 = Math.max(drag.startX, drag.currentX);
  const y2 = Math.max(drag.startY, drag.currentY);
  return { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
}

export function LayoutGrid({
  mode,
  stampWidth,
  stampHeight,
  highlightFootprint,
}: LayoutGridProps): React.JSX.Element {
  const { layout, placeItem, removeLayoutItem, selectedId, setSelectedId } =
    useLayout();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(
    null
  );

  const svgWidth = layout.gridUnitsX * (CELL_SIZE + GAP) + GAP;
  const svgHeight = layout.gridUnitsY * (CELL_SIZE + GAP) + GAP;

  // Occupancy map
  const occupied = new Map<string, string>();
  for (const item of layout.items) {
    for (let dx = 0; dx < item.gridUnitsX; dx++) {
      for (let dy = 0; dy < item.gridUnitsY; dy++) {
        occupied.set(`${item.gridX + dx},${item.gridY + dy}`, item.id);
      }
    }
  }

  function cellPx(gridPos: number): number {
    return GAP + gridPos * (CELL_SIZE + GAP);
  }

  // Check if a prospective placement is valid
  const isPlacementValid = useCallback(
    (x: number, y: number, w: number, h: number) => {
      const testItem = createLayoutItem(x, y, w, h);
      return canPlaceItem(testItem, layout);
    },
    [layout]
  );

  // Compute the drag preview rectangle and validity
  const dragPreview = drag ? getDragRect(drag) : null;
  const dragValid = dragPreview
    ? isPlacementValid(dragPreview.x, dragPreview.y, dragPreview.w, dragPreview.h)
    : false;

  // Stamp preview validity
  const stampValid =
    hoverCell && mode === "stamp"
      ? isPlacementValid(hoverCell.x, hoverCell.y, stampWidth, stampHeight)
      : false;

  function handleMouseDown(gx: number, gy: number) {
    const itemId = occupied.get(`${gx},${gy}`);
    if (itemId) {
      // Click occupied cell = select
      setSelectedId(itemId === selectedId ? null : itemId);
      return;
    }

    if (mode === "stamp") {
      // Stamp: place immediately
      placeItem(gx, gy, stampWidth, stampHeight);
      return;
    }

    // Draw mode: start drag
    setSelectedId(null);
    setDrag({ startX: gx, startY: gy, currentX: gx, currentY: gy });
  }

  function handleMouseMove(gx: number, gy: number) {
    setHoverCell({ x: gx, y: gy });
    if (drag) {
      setDrag((prev) =>
        prev ? { ...prev, currentX: gx, currentY: gy } : null
      );
    }
  }

  function handleMouseUp() {
    if (drag && dragPreview && dragValid) {
      placeItem(dragPreview.x, dragPreview.y, dragPreview.w, dragPreview.h);
    }
    setDrag(null);
  }

  function handleMouseLeave() {
    setHoverCell(null);
    if (drag && dragPreview && dragValid) {
      placeItem(dragPreview.x, dragPreview.y, dragPreview.w, dragPreview.h);
    }
    setDrag(null);
  }

  // Keyboard handling
  function handleKeyDown(e: React.KeyboardEvent) {
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      selectedId
    ) {
      removeLayoutItem(selectedId);
      e.preventDefault();
    }
    if (e.key === "Escape") {
      setSelectedId(null);
    }
  }

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      className="rounded border border-zinc-700 bg-zinc-950 outline-none"
      data-testid="layout-grid"
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Grid cells */}
      {Array.from({ length: layout.gridUnitsX }, (_, x) =>
        Array.from({ length: layout.gridUnitsY }, (_, y) => {
          const isOccupied = occupied.has(`${x},${y}`);

          // Stamp hover preview
          const isStampPreview =
            mode === "stamp" &&
            hoverCell &&
            !drag &&
            !isOccupied &&
            x >= hoverCell.x &&
            x < hoverCell.x + stampWidth &&
            y >= hoverCell.y &&
            y < hoverCell.y + stampHeight;

          // Draw drag preview
          const isDragPreview =
            dragPreview &&
            !isOccupied &&
            x >= dragPreview.x &&
            x < dragPreview.x + dragPreview.w &&
            y >= dragPreview.y &&
            y < dragPreview.y + dragPreview.h;

          let fill: string;
          if (isOccupied) {
            fill = ""; // handled by item rects below
          } else if (isDragPreview) {
            fill = dragValid ? "#166534" : "#991b1b"; // green-800 or red-800
          } else if (isStampPreview) {
            fill = stampValid ? "#166534" : "#991b1b";
          } else {
            fill = "#27272a"; // zinc-800
          }

          return (
            <rect
              key={`${x},${y}`}
              x={cellPx(x)}
              y={cellPx(y)}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              fill={isOccupied ? "transparent" : fill}
              className="cursor-crosshair"
              onMouseDown={() => {
                handleMouseDown(x, y);
              }}
              onMouseMove={() => {
                handleMouseMove(x, y);
              }}
              data-testid={`cell-${x}-${y}`}
              data-occupied={isOccupied ? "true" : undefined}
            />
          );
        })
      )}

      {/* Placed bin rectangles (color-coded by size) */}
      {layout.items.map((item) => {
        const isSelected = item.id === selectedId;
        const isHighlighted =
          highlightFootprint ===
          `${item.gridUnitsX}x${item.gridUnitsY}`;
        const color = getBinColor(item);

        return (
          <g key={`bin-${item.id}`}>
            <rect
              x={cellPx(item.gridX)}
              y={cellPx(item.gridY)}
              width={item.gridUnitsX * (CELL_SIZE + GAP) - GAP}
              height={item.gridUnitsY * (CELL_SIZE + GAP) - GAP}
              rx={3}
              fill={color}
              opacity={isHighlighted ? 1 : 0.8}
              className="cursor-pointer"
              onMouseDown={() => {
                handleMouseDown(item.gridX, item.gridY);
              }}
              onMouseMove={() => {
                handleMouseMove(item.gridX, item.gridY);
              }}
            />
            {/* Selection highlight */}
            {isSelected && (
              <rect
                x={cellPx(item.gridX) - 1}
                y={cellPx(item.gridY) - 1}
                width={item.gridUnitsX * (CELL_SIZE + GAP) - GAP + 2}
                height={item.gridUnitsY * (CELL_SIZE + GAP) - GAP + 2}
                rx={4}
                fill="none"
                stroke="#f5f5f5"
                strokeWidth={2}
                strokeDasharray="4 2"
                className="pointer-events-none"
              />
            )}
            {/* Dimension label */}
            <text
              x={
                cellPx(item.gridX) +
                (item.gridUnitsX * (CELL_SIZE + GAP) - GAP) / 2
              }
              y={
                cellPx(item.gridY) +
                (item.gridUnitsY * (CELL_SIZE + GAP) - GAP) / 2 +
                4
              }
              textAnchor="middle"
              className="pointer-events-none select-none fill-white text-[10px] font-mono"
            >
              {item.gridUnitsX}×{item.gridUnitsY}
            </text>
          </g>
        );
      })}

      {/* Drag preview dimension label */}
      {dragPreview && (
        <text
          x={
            cellPx(dragPreview.x) +
            (dragPreview.w * (CELL_SIZE + GAP) - GAP) / 2
          }
          y={
            cellPx(dragPreview.y) +
            (dragPreview.h * (CELL_SIZE + GAP) - GAP) / 2 +
            4
          }
          textAnchor="middle"
          className={`pointer-events-none select-none text-xs font-bold ${
            dragValid ? "fill-green-400" : "fill-red-400"
          }`}
        >
          {dragPreview.w}×{dragPreview.h}
        </text>
      )}
    </svg>
  );
}
