import { useState, useCallback, useEffect } from "react";
import { useLayout } from "./LayoutContext";
import { LayoutGrid } from "./LayoutGrid";
import { LayoutToolbar } from "./LayoutToolbar";
import type { LayoutMode } from "./LayoutGrid";

export function LayoutPanel(): React.JSX.Element {
  const { partsList, layout, selectedId, undoLayout, redoLayout } = useLayout();
  const [mode, setMode] = useState<LayoutMode>("draw");
  const [stampW, setStampW] = useState(1);
  const [stampH, setStampH] = useState(1);
  const [highlightFootprint, setHighlightFootprint] = useState<string | null>(
    null
  );

  const totalItems = layout.items.length;
  const totalCells = layout.gridUnitsX * layout.gridUnitsY;
  const occupiedCells = layout.items.reduce(
    (sum, item) => sum + item.gridUnitsX * item.gridUnitsY,
    0
  );

  const handleStampChange = useCallback((w: number, h: number) => {
    setStampW(w);
    setStampH(h);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoLayout();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redoLayout();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undoLayout, redoLayout]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Layout Planner</h2>
        <div className="flex gap-4 text-xs text-zinc-400">
          <span data-testid="layout-items">{totalItems} bins</span>
          <span data-testid="layout-coverage">
            {totalCells > 0
              ? ((occupiedCells / totalCells) * 100).toFixed(0)
              : 0}
            % filled
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <LayoutToolbar
        mode={mode}
        stampWidth={stampW}
        stampHeight={stampH}
        onModeChange={setMode}
        onStampChange={handleStampChange}
      />

      <p className="text-xs text-zinc-500">
        {mode === "draw"
          ? "Click + drag to draw bins. Click a bin to select it, then Delete to remove."
          : `Stamp mode: click to place ${stampW}×${stampH} bins. Click a bin to select it.`}
      </p>

      {/* Grid */}
      <div className="overflow-auto">
        <LayoutGrid
          mode={mode}
          stampWidth={stampW}
          stampHeight={stampH}
          highlightFootprint={highlightFootprint}
        />
      </div>

      {/* Selected bin info */}
      {selectedId && (
        <div className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-zinc-300">
          Bin selected — press <kbd className="rounded bg-zinc-700 px-1">Delete</kbd> to remove
        </div>
      )}

      {/* Parts List */}
      {partsList.length > 0 && (
        <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Parts List
          </h3>
          <div className="space-y-1 text-sm" data-testid="parts-list">
            {partsList.map((part) => {
              const key = `${part.gridUnitsX}x${part.gridUnitsY}`;
              return (
                <div
                  key={key}
                  className="flex cursor-pointer justify-between rounded px-1 hover:bg-zinc-800"
                  onMouseEnter={() => {
                    setHighlightFootprint(key);
                  }}
                  onMouseLeave={() => {
                    setHighlightFootprint(null);
                  }}
                >
                  <span className="font-mono text-zinc-300">
                    {part.gridUnitsX}×{part.gridUnitsY}
                  </span>
                  <span className="font-mono text-zinc-100">
                    ×{part.quantity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
