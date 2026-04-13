import { useState, useEffect } from "react";
import { useLayout } from "../LayoutContext";
import { LayoutGrid } from "../LayoutGrid";
import { LayoutToolbar } from "../LayoutToolbar";

export function LayoutStep(): React.JSX.Element {
  const { partsList, layout, selectedId, undoLayout, redoLayout } = useLayout();
  const [highlightFootprint, setHighlightFootprint] = useState<string | null>(
    null
  );

  const totalItems = layout.items.length;
  const totalCells = layout.gridUnitsX * layout.gridUnitsY;
  const occupiedCells = layout.items.reduce(
    (sum, item) => sum + item.gridUnitsX * item.gridUnitsY,
    0
  );

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
    <div className="flex h-full gap-4">
      {/* Left sidebar */}
      <div className="flex w-[350px] shrink-0 flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Layout Planner</h2>
        </div>

        <p className="text-xs text-zinc-500">
          Draw bins on the grid by clicking and dragging. Select a placed bin to
          move, resize, or delete it.
        </p>

        <LayoutToolbar />

        {/* Stats */}
        <div className="flex gap-4 text-xs text-zinc-400">
          <span data-testid="layout-items">{totalItems} bins</span>
          <span data-testid="layout-coverage">
            {totalCells > 0
              ? ((occupiedCells / totalCells) * 100).toFixed(0)
              : 0}
            % filled
          </span>
        </div>

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

        {/* Selected bin info */}
        {selectedId && (
          <div className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-zinc-300">
            Bin selected — press{" "}
            <kbd className="rounded bg-zinc-700 px-1">Delete</kbd> to remove
          </div>
        )}
      </div>

      {/* Right: Layout Grid */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-950 p-2">
        <LayoutGrid highlightFootprint={highlightFootprint} />
      </div>
    </div>
  );
}
