import { useState } from "react";
import { useLayout } from "./LayoutContext";

const CELL_SIZE = 32; // px per grid unit
const GAP = 1; // px gap between cells

interface LayoutGridProps {
  brushWidth: number;
  brushHeight: number;
}

export function LayoutGrid({
  brushWidth,
  brushHeight,
}: LayoutGridProps): React.JSX.Element {
  const { layout, placeItem, removeLayoutItem } = useLayout();
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(
    null
  );

  const svgWidth = layout.gridUnitsX * (CELL_SIZE + GAP) + GAP;
  const svgHeight = layout.gridUnitsY * (CELL_SIZE + GAP) + GAP;

  // Build an occupancy map for coloring
  const occupied = new Map<string, string>();
  for (const item of layout.items) {
    for (let dx = 0; dx < item.gridUnitsX; dx++) {
      for (let dy = 0; dy < item.gridUnitsY; dy++) {
        occupied.set(`${item.gridX + dx},${item.gridY + dy}`, item.id);
      }
    }
  }

  function cellX(gridX: number): number {
    return GAP + gridX * (CELL_SIZE + GAP);
  }

  function cellY(gridY: number): number {
    return GAP + gridY * (CELL_SIZE + GAP);
  }

  function handleCellClick(gridX: number, gridY: number) {
    // If clicking an occupied cell, remove that item
    const itemId = occupied.get(`${gridX},${gridY}`);
    if (itemId) {
      removeLayoutItem(itemId);
      return;
    }
    // Otherwise place the current brush
    placeItem(gridX, gridY, brushWidth, brushHeight);
  }

  function handleMouseMove(gridX: number, gridY: number) {
    setHoverCell({ x: gridX, y: gridY });
  }

  function handleMouseLeave() {
    setHoverCell(null);
  }

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      className="rounded border border-zinc-700 bg-zinc-950"
      data-testid="layout-grid"
      onMouseLeave={handleMouseLeave}
    >
      {/* Grid cells */}
      {Array.from({ length: layout.gridUnitsX }, (_, x) =>
        Array.from({ length: layout.gridUnitsY }, (_, y) => {
          const isOccupied = occupied.has(`${x},${y}`);
          const isHover =
            hoverCell &&
            !isOccupied &&
            x >= hoverCell.x &&
            x < hoverCell.x + brushWidth &&
            y >= hoverCell.y &&
            y < hoverCell.y + brushHeight;

          return (
            <rect
              key={`${x},${y}`}
              x={cellX(x)}
              y={cellY(y)}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              className={
                isOccupied
                  ? "cursor-pointer fill-violet-700 hover:fill-violet-600"
                  : isHover
                    ? "cursor-pointer fill-violet-900"
                    : "cursor-pointer fill-zinc-800 hover:fill-zinc-700"
              }
              onClick={() => {
                handleCellClick(x, y);
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

      {/* Item outlines (drawn on top of cells) */}
      {layout.items.map((item) => (
        <rect
          key={`outline-${item.id}`}
          x={cellX(item.gridX)}
          y={cellY(item.gridY)}
          width={
            item.gridUnitsX * (CELL_SIZE + GAP) - GAP
          }
          height={
            item.gridUnitsY * (CELL_SIZE + GAP) - GAP
          }
          rx={3}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={2}
          className="pointer-events-none"
        />
      ))}
    </svg>
  );
}
