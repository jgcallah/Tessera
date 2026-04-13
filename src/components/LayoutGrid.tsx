import { useState, useCallback, useRef, useEffect } from "react";
import { useLayout } from "./LayoutContext";
import { canPlaceItem, createLayoutItem } from "../lib/layout";
import type { LayoutItem } from "../lib/layout";

const GAP = 1;
const MIN_CELL_SIZE = 24;
const MAX_CELL_SIZE = 64;
const HANDLE_SIZE = 8;

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

type ResizeHandle =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

function getHandleCursor(handle: ResizeHandle): string {
  switch (handle) {
    case "top":
    case "bottom":
      return "ns-resize";
    case "left":
    case "right":
      return "ew-resize";
    case "top-left":
    case "bottom-right":
      return "nwse-resize";
    case "top-right":
    case "bottom-left":
      return "nesw-resize";
  }
}

type Interaction =
  | {
      type: "drawing";
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    }
  | {
      type: "moving";
      itemId: string;
      offsetX: number;
      offsetY: number;
      currentX: number;
      currentY: number;
    }
  | {
      type: "resizing";
      itemId: string;
      handle: ResizeHandle;
      originalItem: LayoutItem;
      currentX: number;
      currentY: number;
    };

function getDragRect(drag: {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}) {
  const x1 = Math.min(drag.startX, drag.currentX);
  const y1 = Math.min(drag.startY, drag.currentY);
  const x2 = Math.max(drag.startX, drag.currentX);
  const y2 = Math.max(drag.startY, drag.currentY);
  return { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
}

interface LayoutGridProps {
  highlightFootprint: string | null;
}

export function LayoutGrid({
  highlightFootprint,
}: LayoutGridProps): React.JSX.Element {
  const {
    layout,
    placeItem,
    removeLayoutItem,
    moveLayoutItem,
    resizeLayoutItem,
    selectedId,
    setSelectedId,
  } = useLayout();

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [cellSize, setCellSize] = useState(32);

  // Dynamic cell sizing based on available container space
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
    return () => observer.disconnect();
  }, [layout.gridUnitsX, layout.gridUnitsY]);

  const svgWidth = layout.gridUnitsX * (cellSize + GAP) + GAP;
  const svgHeight = layout.gridUnitsY * (cellSize + GAP) + GAP;
  const labelFontSize = Math.max(10, Math.round(cellSize * 0.28));

  // Occupancy map
  const occupied = new Map<string, string>();
  for (const item of layout.items) {
    for (let dx = 0; dx < item.gridUnitsX; dx++) {
      for (let dy = 0; dy < item.gridUnitsY; dy++) {
        occupied.set(`${item.gridX + dx},${item.gridY + dy}`, item.id);
      }
    }
  }

  const selectedItem = selectedId
    ? (layout.items.find((i) => i.id === selectedId) ?? null)
    : null;

  function cellPx(gridPos: number): number {
    return GAP + gridPos * (cellSize + GAP);
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

  const isPlacementValid = useCallback(
    (x: number, y: number, w: number, h: number) => {
      const testItem = createLayoutItem(x, y, w, h);
      return canPlaceItem(testItem, layout);
    },
    [layout]
  );

  // ── Previews ──────────────────────────────────────────────────────────────

  const drawPreview =
    interaction?.type === "drawing" ? getDragRect(interaction) : null;
  const drawValid = drawPreview
    ? isPlacementValid(
        drawPreview.x,
        drawPreview.y,
        drawPreview.w,
        drawPreview.h
      )
    : false;

  const movePreview = (() => {
    if (interaction?.type !== "moving") return null;
    const item = layout.items.find((i) => i.id === interaction.itemId);
    if (!item) return null;
    const newX = interaction.currentX - interaction.offsetX;
    const newY = interaction.currentY - interaction.offsetY;
    const moved = { ...item, gridX: newX, gridY: newY };
    return {
      x: newX,
      y: newY,
      w: item.gridUnitsX,
      h: item.gridUnitsY,
      valid: canPlaceItem(moved, layout),
    };
  })();

  const resizePreview = (() => {
    if (interaction?.type !== "resizing") return null;
    const { originalItem, handle, currentX, currentY } = interaction;

    const origRight = originalItem.gridX + originalItem.gridUnitsX;
    const origBottom = originalItem.gridY + originalItem.gridUnitsY;

    let newX = originalItem.gridX;
    let newY = originalItem.gridY;
    let newW = originalItem.gridUnitsX;
    let newH = originalItem.gridUnitsY;

    // Horizontal: left edge moves
    if (
      handle === "left" ||
      handle === "top-left" ||
      handle === "bottom-left"
    ) {
      newX = Math.min(currentX, origRight - 1);
      newW = origRight - newX;
    }
    // Horizontal: right edge moves
    if (
      handle === "right" ||
      handle === "top-right" ||
      handle === "bottom-right"
    ) {
      newW = Math.max(1, currentX - originalItem.gridX + 1);
    }
    // Vertical: top edge moves
    if (
      handle === "top" ||
      handle === "top-left" ||
      handle === "top-right"
    ) {
      newY = Math.min(currentY, origBottom - 1);
      newH = origBottom - newY;
    }
    // Vertical: bottom edge moves
    if (
      handle === "bottom" ||
      handle === "bottom-left" ||
      handle === "bottom-right"
    ) {
      newH = Math.max(1, currentY - originalItem.gridY + 1);
    }

    const resized = {
      ...originalItem,
      gridX: newX,
      gridY: newY,
      gridUnitsX: newW,
      gridUnitsY: newH,
    };
    return {
      x: newX,
      y: newY,
      w: newW,
      h: newH,
      valid: canPlaceItem(resized, layout),
    };
  })();

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCellMouseDown(gx: number, gy: number) {
    const itemId = occupied.get(`${gx},${gy}`);

    if (itemId) {
      if (itemId === selectedId) {
        const item = layout.items.find((i) => i.id === itemId);
        if (item) {
          setInteraction({
            type: "moving",
            itemId,
            offsetX: gx - item.gridX,
            offsetY: gy - item.gridY,
            currentX: gx,
            currentY: gy,
          });
        }
      } else {
        setSelectedId(itemId);
      }
      return;
    }

    setSelectedId(null);
    setInteraction({
      type: "drawing",
      startX: gx,
      startY: gy,
      currentX: gx,
      currentY: gy,
    });
  }

  function handleResizeMouseDown(
    handle: ResizeHandle,
    e: React.MouseEvent
  ) {
    e.stopPropagation();
    if (!selectedItem) return;
    const coords = getGridCoords(e);
    setInteraction({
      type: "resizing",
      itemId: selectedItem.id,
      handle,
      originalItem: selectedItem,
      currentX: coords.x,
      currentY: coords.y,
    });
  }

  function handleSvgMouseMove(e: React.MouseEvent) {
    const coords = getGridCoords(e);
    if (interaction) {
      setInteraction(
        (prev) =>
          prev
            ? ({
                ...prev,
                currentX: coords.x,
                currentY: coords.y,
              } as Interaction)
            : null
      );
    }
  }

  function handleSvgMouseUp() {
    if (!interaction) return;

    if (interaction.type === "drawing") {
      const rect = getDragRect(interaction);
      if (isPlacementValid(rect.x, rect.y, rect.w, rect.h)) {
        placeItem(rect.x, rect.y, rect.w, rect.h);
      }
    } else if (interaction.type === "moving" && movePreview) {
      const item = layout.items.find((i) => i.id === interaction.itemId);
      if (
        movePreview.valid &&
        item &&
        (movePreview.x !== item.gridX || movePreview.y !== item.gridY)
      ) {
        moveLayoutItem(interaction.itemId, movePreview.x, movePreview.y);
      } else if (
        item &&
        movePreview.x === item.gridX &&
        movePreview.y === item.gridY
      ) {
        setSelectedId(null);
      }
    } else if (interaction.type === "resizing" && resizePreview?.valid) {
      resizeLayoutItem(
        interaction.itemId,
        resizePreview.x,
        resizePreview.y,
        resizePreview.w,
        resizePreview.h
      );
    }

    setInteraction(null);
  }

  function handleSvgMouseLeave() {
    if (interaction) {
      if (interaction.type === "drawing") {
        const rect = getDragRect(interaction);
        if (isPlacementValid(rect.x, rect.y, rect.w, rect.h)) {
          placeItem(rect.x, rect.y, rect.w, rect.h);
        }
      }
      setInteraction(null);
    }
  }

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
      setInteraction(null);
    }
  }

  // ── Rendering helpers ─────────────────────────────────────────────────────

  function getCellFill(
    x: number,
    y: number,
    isOccupied: boolean
  ): string {
    if (isOccupied) return "";

    if (
      drawPreview &&
      x >= drawPreview.x &&
      x < drawPreview.x + drawPreview.w &&
      y >= drawPreview.y &&
      y < drawPreview.y + drawPreview.h
    ) {
      return drawValid ? "#166534" : "#991b1b";
    }

    return "#27272a";
  }

  const movingItemId =
    interaction?.type === "moving" ? interaction.itemId : null;

  const svgCursor =
    interaction?.type === "moving"
      ? "grabbing"
      : interaction?.type === "resizing"
        ? getHandleCursor(interaction.handle)
        : undefined;

  // ── Resize handle definitions ─────────────────────────────────────────────

  const handleDefs: {
    handle: ResizeHandle;
    cx: number;
    cy: number;
  }[] = [];

  if (selectedItem && !interaction) {
    const binLeft = cellPx(selectedItem.gridX);
    const binTop = cellPx(selectedItem.gridY);
    const binW = selectedItem.gridUnitsX * (cellSize + GAP) - GAP;
    const binH = selectedItem.gridUnitsY * (cellSize + GAP) - GAP;
    const binRight = binLeft + binW;
    const binBottom = binTop + binH;
    const midX = binLeft + binW / 2;
    const midY = binTop + binH / 2;

    handleDefs.push(
      { handle: "top-left", cx: binLeft, cy: binTop },
      { handle: "top", cx: midX, cy: binTop },
      { handle: "top-right", cx: binRight, cy: binTop },
      { handle: "left", cx: binLeft, cy: midY },
      { handle: "right", cx: binRight, cy: midY },
      { handle: "bottom-left", cx: binLeft, cy: binBottom },
      { handle: "bottom", cx: midX, cy: binBottom },
      { handle: "bottom-right", cx: binRight, cy: binBottom }
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        overflow="visible"
        className="rounded border border-zinc-700 bg-zinc-950 outline-none"
        data-testid="layout-grid"
        style={svgCursor ? { cursor: svgCursor } : undefined}
        onMouseMove={handleSvgMouseMove}
        onMouseUp={handleSvgMouseUp}
        onMouseLeave={handleSvgMouseLeave}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Grid cells */}
        {Array.from({ length: layout.gridUnitsX }, (_, x) =>
          Array.from({ length: layout.gridUnitsY }, (_, y) => {
            const isOccupied = occupied.has(`${x},${y}`);
            const fill = getCellFill(x, y, isOccupied);

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
                data-testid={`cell-${x}-${y}`}
                data-occupied={isOccupied ? "true" : undefined}
              />
            );
          })
        )}

        {/* Placed bin rectangles */}
        {layout.items.map((item) => {
          const isSelected = item.id === selectedId;
          const isMoving = item.id === movingItemId;
          const isHighlighted =
            highlightFootprint ===
            `${item.gridUnitsX}x${item.gridUnitsY}`;
          const color = getBinColor(item);

          return (
            <g key={`bin-${item.id}`}>
              <rect
                x={cellPx(item.gridX)}
                y={cellPx(item.gridY)}
                width={item.gridUnitsX * (cellSize + GAP) - GAP}
                height={item.gridUnitsY * (cellSize + GAP) - GAP}
                rx={3}
                fill={color}
                opacity={isMoving ? 0.3 : isHighlighted ? 1 : 0.8}
                style={{
                  cursor: isSelected ? "grab" : "pointer",
                }}
                onMouseDown={(e) => {
                  const coords = getGridCoords(e);
                  handleCellMouseDown(coords.x, coords.y);
                }}
              />
              {isSelected && !isMoving && (
                <rect
                  x={cellPx(item.gridX) - 1}
                  y={cellPx(item.gridY) - 1}
                  width={
                    item.gridUnitsX * (cellSize + GAP) - GAP + 2
                  }
                  height={
                    item.gridUnitsY * (cellSize + GAP) - GAP + 2
                  }
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
                opacity={isMoving ? 0.3 : 1}
              >
                {item.gridUnitsX}×{item.gridUnitsY}
              </text>
            </g>
          );
        })}

        {/* Move preview ghost */}
        {movePreview && (
          <g className="pointer-events-none">
            <rect
              x={cellPx(movePreview.x)}
              y={cellPx(movePreview.y)}
              width={movePreview.w * (cellSize + GAP) - GAP}
              height={movePreview.h * (cellSize + GAP) - GAP}
              rx={3}
              fill={movePreview.valid ? "#166534" : "#991b1b"}
              opacity={0.5}
              stroke={movePreview.valid ? "#22c55e" : "#ef4444"}
              strokeWidth={2}
            />
            <text
              x={
                cellPx(movePreview.x) +
                (movePreview.w * (cellSize + GAP) - GAP) / 2
              }
              y={
                cellPx(movePreview.y) +
                (movePreview.h * (cellSize + GAP) - GAP) / 2 +
                labelFontSize * 0.35
              }
              textAnchor="middle"
              fontSize={labelFontSize}
              className="select-none font-mono"
              fill={movePreview.valid ? "#22c55e" : "#ef4444"}
            >
              {movePreview.w}×{movePreview.h}
            </text>
          </g>
        )}

        {/* Resize preview outline */}
        {resizePreview && (
          <g className="pointer-events-none">
            <rect
              x={cellPx(resizePreview.x)}
              y={cellPx(resizePreview.y)}
              width={resizePreview.w * (cellSize + GAP) - GAP}
              height={resizePreview.h * (cellSize + GAP) - GAP}
              rx={3}
              fill={resizePreview.valid ? "#166534" : "#991b1b"}
              opacity={0.3}
              stroke={
                resizePreview.valid ? "#22c55e" : "#ef4444"
              }
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            <text
              x={
                cellPx(resizePreview.x) +
                (resizePreview.w * (cellSize + GAP) - GAP) / 2
              }
              y={
                cellPx(resizePreview.y) +
                (resizePreview.h * (cellSize + GAP) - GAP) / 2 +
                labelFontSize * 0.35
              }
              textAnchor="middle"
              fontSize={labelFontSize + 2}
              fontWeight="bold"
              className="select-none"
              fill={
                resizePreview.valid ? "#22c55e" : "#ef4444"
              }
            >
              {resizePreview.w}×{resizePreview.h}
            </text>
          </g>
        )}

        {/* Draw preview dimension label */}
        {drawPreview && (
          <text
            x={
              cellPx(drawPreview.x) +
              (drawPreview.w * (cellSize + GAP) - GAP) / 2
            }
            y={
              cellPx(drawPreview.y) +
              (drawPreview.h * (cellSize + GAP) - GAP) / 2 +
              labelFontSize * 0.35
            }
            textAnchor="middle"
            fontSize={labelFontSize + 2}
            fontWeight="bold"
            className={`pointer-events-none select-none ${
              drawValid ? "fill-green-400" : "fill-red-400"
            }`}
          >
            {drawPreview.w}×{drawPreview.h}
          </text>
        )}

        {/* Resize handles — all 8 edges and corners */}
        {handleDefs.map(({ handle, cx, cy }) => (
          <rect
            key={handle}
            x={cx - HANDLE_SIZE / 2}
            y={cy - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            rx={2}
            fill="#f5f5f5"
            stroke="#71717a"
            strokeWidth={1}
            style={{ cursor: getHandleCursor(handle) }}
            onMouseDown={(e) => {
              handleResizeMouseDown(handle, e);
            }}
            data-testid={`handle-${handle}`}
          />
        ))}
      </svg>
    </div>
  );
}
