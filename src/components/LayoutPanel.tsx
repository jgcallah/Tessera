import { useState } from "react";
import { useLayout } from "./LayoutContext";
import { LayoutGrid } from "./LayoutGrid";

export function LayoutPanel(): React.JSX.Element {
  const { partsList, clearLayout, layout } = useLayout();
  const [brushW, setBrushW] = useState(1);
  const [brushH, setBrushH] = useState(1);
  const [brushHU, setBrushHU] = useState(3);

  const totalItems = layout.items.length;
  const totalCells = layout.gridUnitsX * layout.gridUnitsY;
  const occupiedCells = layout.items.reduce(
    (sum, item) => sum + item.gridUnitsX * item.gridUnitsY,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Layout Planner</h2>
        {totalItems > 0 && (
          <button
            type="button"
            onClick={clearLayout}
            className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Brush Controls */}
      <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Bin to Place
        </h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <label
              htmlFor="brush-w"
              className="mb-1 block text-xs text-zinc-400"
            >
              W
            </label>
            <input
              id="brush-w"
              type="number"
              min={1}
              step={1}
              value={brushW}
              onChange={(e) => {
                setBrushW(Math.max(1, parseInt(e.target.value) || 1));
              }}
              className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="brush-h"
              className="mb-1 block text-xs text-zinc-400"
            >
              L
            </label>
            <input
              id="brush-h"
              type="number"
              min={1}
              step={1}
              value={brushH}
              onChange={(e) => {
                setBrushH(Math.max(1, parseInt(e.target.value) || 1));
              }}
              className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="brush-hu"
              className="mb-1 block text-xs text-zinc-400"
            >
              H
            </label>
            <input
              id="brush-hu"
              type="number"
              min={1}
              step={1}
              value={brushHU}
              onChange={(e) => {
                setBrushHU(Math.max(1, parseInt(e.target.value) || 1));
              }}
              className="w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Click empty cells to place. Click occupied cells to remove.
        </p>
      </div>

      {/* Grid */}
      <div className="overflow-auto">
        <LayoutGrid
          brushWidth={brushW}
          brushHeight={brushH}
          brushHeightUnits={brushHU}
        />
      </div>

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
            {partsList.map((part) => (
              <div
                key={`${part.gridUnitsX}x${part.gridUnitsY}x${part.heightUnits}`}
                className="flex justify-between"
              >
                <span className="font-mono text-zinc-300">
                  {part.gridUnitsX}×{part.gridUnitsY}×{part.heightUnits}u
                </span>
                <span className="font-mono text-zinc-100">
                  ×{part.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
