import { Suspense, useMemo, useState } from "react";
import { useBaseplateConfig } from "../BaseplateConfigContext";
import { useBaseplateLayout } from "../BaseplateLayoutContext";
import { useGridConfig } from "../GridConfigContext";
import { usePrinterConfig } from "../PrinterConfigContext";
import { BaseplateLayoutGrid } from "../BaseplateLayoutGrid";
import { BaseplatePreviewPanel } from "../BaseplatePreviewPanel";
import type { BaseplatePreviewItem } from "../BaseplatePreviewPanel";
import {
  createBaseplateConfig,
  validateBaseplateConfig,
} from "../../lib/baseplate-config";
import type {
  BaseplateConfig,
  BaseplateStyle,
} from "../../lib/baseplate-config";

type ViewMode = "2d" | "3d";

const STYLES: { value: BaseplateStyle; label: string; description: string }[] =
  [
    {
      value: "standard",
      label: "Standard",
      description: "Normal wall thickness (2.4mm)",
    },
    {
      value: "skeleton",
      label: "Skeleton",
      description: "Thin walls (1.2mm) — minimal material",
    },
  ];

export function BaseplateEditorStep(): React.JSX.Element {
  const { baseplateConfig, updateBaseplateConfig } = useBaseplateConfig();
  const { config: gridConfig } = useGridConfig();
  const { printerConfig } = usePrinterConfig();
  const printerMaxX = Math.max(
    1,
    Math.floor(printerConfig.bedWidth / gridConfig.baseUnit)
  );
  const printerMaxY = Math.max(
    1,
    Math.floor(printerConfig.bedLength / gridConfig.baseUnit)
  );
  // Spacer strips are 1×N; the long axis packs along either bed axis, so the
  // generous ceiling is the larger of the two dimensions in grid units.
  const printerMaxSpacer = Math.max(printerMaxX, printerMaxY);
  const matchesPrinter =
    baseplateConfig.maxAutoSizeX === printerMaxX &&
    baseplateConfig.maxAutoSizeY === printerMaxY &&
    baseplateConfig.maxSpacerLength === printerMaxSpacer;
  const {
    layout,
    baseplateParts,
    spacerParts,
    snapCount,
    activeSpacerSides,
    selected,
    setSelected,
    autoFill,
    clearAll,
  } = useBaseplateLayout();
  const validation = validateBaseplateConfig(baseplateConfig);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");

  const previewItems: BaseplatePreviewItem[] = useMemo(
    () =>
      layout.items.map((item) => ({
        id: item.id,
        gridX: item.gridX,
        gridY: item.gridY,
        gridUnitsX: item.gridUnitsX,
        gridUnitsY: item.gridUnitsY,
        baseplateConfig: createBaseplateConfig({
          ...baseplateConfig,
          gridUnitsX: item.gridUnitsX,
          gridUnitsY: item.gridUnitsY,
        }),
      })),
    [layout.items, baseplateConfig]
  );

  function handleNumberChange(key: keyof BaseplateConfig, value: string) {
    const num = parseInt(value, 10);
    if (!isNaN(num)) {
      updateBaseplateConfig({ [key]: num });
    }
  }

  function handleToggle(key: keyof BaseplateConfig) {
    updateBaseplateConfig({ [key]: !baseplateConfig[key] });
  }

  const hasAnySpacerSide =
    activeSpacerSides.left ||
    activeSpacerSides.right ||
    activeSpacerSides.top ||
    activeSpacerSides.bottom;

  const totalCells = layout.gridUnitsX * layout.gridUnitsY;
  const coveredCells = layout.items.reduce(
    (sum, i) => sum + i.gridUnitsX * i.gridUnitsY,
    0
  );

  return (
    <div className="flex h-full gap-4">
      {/* Left sidebar */}
      <div className="flex w-[350px] shrink-0 flex-col gap-4 overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold">Baseplate Layout</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Draw baseplates on the grid. Spacer strips hug the margins.
            Use Auto to tile the whole area, or draw pieces by hand.
          </p>
        </div>

        {/* Auto-fill controls */}
        <div className="space-y-3 rounded border border-zinc-700 bg-zinc-900 p-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Auto Fill
          </h3>
          <div className="flex gap-3">
            <div>
              <label
                htmlFor="bp-max-x"
                className="mb-1 block text-xs font-medium text-zinc-400"
              >
                Max Size X
              </label>
              <input
                id="bp-max-x"
                type="number"
                min={1}
                step={1}
                value={baseplateConfig.maxAutoSizeX}
                onChange={(e) => {
                  handleNumberChange("maxAutoSizeX", e.target.value);
                }}
                className="w-24 rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label
                htmlFor="bp-max-y"
                className="mb-1 block text-xs font-medium text-zinc-400"
              >
                Max Size Y
              </label>
              <input
                id="bp-max-y"
                type="number"
                min={1}
                step={1}
                value={baseplateConfig.maxAutoSizeY}
                onChange={(e) => {
                  handleNumberChange("maxAutoSizeY", e.target.value);
                }}
                className="w-24 rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              updateBaseplateConfig({
                maxAutoSizeX: printerMaxX,
                maxAutoSizeY: printerMaxY,
                maxSpacerLength: printerMaxSpacer,
              });
            }}
            disabled={matchesPrinter}
            className="w-full rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            data-testid="match-printer-btn"
            title={`Fit the build plate (${printerConfig.bedWidth}×${printerConfig.bedLength}mm at ${gridConfig.baseUnit}mm/cell)`}
          >
            Match Printer ({printerMaxX}×{printerMaxY}, spacer {printerMaxSpacer})
          </button>
          {hasAnySpacerSide && (
            <div>
              <label
                htmlFor="bp-max-spacer"
                className="mb-1 block text-xs font-medium text-zinc-400"
              >
                Max Spacer Length
              </label>
              <input
                id="bp-max-spacer"
                type="number"
                min={1}
                step={1}
                value={baseplateConfig.maxSpacerLength}
                onChange={(e) => {
                  handleNumberChange("maxSpacerLength", e.target.value);
                }}
                className="w-24 rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={autoFill}
              className="flex-1 rounded bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600"
              data-testid="auto-fill-btn"
            >
              Auto Fill
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={
                layout.items.length === 0 && layout.spacers.length === 0
              }
              className="rounded bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
              data-testid="clear-btn"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Global Settings */}
        <div className="space-y-3 rounded border border-zinc-700 bg-zinc-900 p-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Style
          </h3>
          <div className="flex gap-1 rounded-lg bg-zinc-800 p-1">
            {STYLES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={baseplateConfig.style === value}
                onClick={() => {
                  updateBaseplateConfig({ style: value });
                }}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  baseplateConfig.style === value
                    ? "bg-zinc-600 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            {STYLES.find((s) => s.value === baseplateConfig.style)?.description}
          </p>

          <div className="space-y-2 border-t border-zinc-700 pt-3">
            <label
              htmlFor="bp-magnets"
              className="flex items-center gap-2 text-sm text-zinc-300"
            >
              <input
                id="bp-magnets"
                type="checkbox"
                checked={baseplateConfig.includeMagnetHoles}
                onChange={() => {
                  handleToggle("includeMagnetHoles");
                }}
                className="rounded border-zinc-600 bg-zinc-900"
              />
              Magnet Holes
            </label>
            <label
              htmlFor="bp-screws"
              className={`flex items-center gap-2 text-sm ${
                baseplateConfig.includeMagnetHoles
                  ? "text-zinc-300"
                  : "text-zinc-600"
              }`}
            >
              <input
                id="bp-screws"
                type="checkbox"
                checked={baseplateConfig.includeScrewHoles}
                disabled={!baseplateConfig.includeMagnetHoles}
                onChange={() => {
                  handleToggle("includeScrewHoles");
                }}
                className="rounded border-zinc-600 bg-zinc-900"
              />
              Screw Holes
            </label>
            <label
              htmlFor="bp-snap"
              className="flex items-center gap-2 text-sm text-zinc-300"
            >
              <input
                id="bp-snap"
                type="checkbox"
                checked={baseplateConfig.includeSnapConnectors}
                onChange={() => {
                  handleToggle("includeSnapConnectors");
                }}
                className="rounded border-zinc-600 bg-zinc-900"
              />
              Snap-in Connectors
            </label>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-xs text-zinc-400">
          <span data-testid="bp-count">{layout.items.length} baseplates</span>
          <span data-testid="bp-coverage">
            {totalCells > 0
              ? ((coveredCells / totalCells) * 100).toFixed(0)
              : 0}
            % covered
          </span>
          {hasAnySpacerSide && (
            <span data-testid="sp-count">
              {layout.spacers.length} spacers
            </span>
          )}
          {baseplateConfig.includeSnapConnectors && (
            <span data-testid="snap-count">{snapCount} snaps</span>
          )}
        </div>

        {/* Parts List */}
        {(baseplateParts.length > 0 ||
          spacerParts.length > 0 ||
          (baseplateConfig.includeSnapConnectors && snapCount > 0)) && (
          <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Parts List
            </h3>
            {baseplateParts.length > 0 && (
              <div className="space-y-1 text-sm" data-testid="bp-parts">
                {baseplateParts.map((p) => (
                  <div
                    key={`bp-${p.gridUnitsX}x${p.gridUnitsY}`}
                    className="flex justify-between"
                  >
                    <span className="font-mono text-zinc-300">
                      Baseplate {p.gridUnitsX}×{p.gridUnitsY}
                    </span>
                    <span className="font-mono text-zinc-100">
                      ×{p.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {spacerParts.length > 0 && (
              <div
                className="mt-2 space-y-1 border-t border-zinc-700 pt-2 text-sm"
                data-testid="sp-parts"
              >
                {spacerParts.map((p) => (
                  <div
                    key={`sp-${p.side}-${p.length}`}
                    className="flex justify-between"
                  >
                    <span className="font-mono text-zinc-300">
                      Spacer ({p.side}) len {p.length}
                    </span>
                    <span className="font-mono text-zinc-100">
                      ×{p.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {baseplateConfig.includeSnapConnectors && snapCount > 0 && (
              <div
                className="mt-2 space-y-1 border-t border-zinc-700 pt-2 text-sm"
                data-testid="snap-parts"
              >
                <div className="flex justify-between">
                  <span className="font-mono text-zinc-300">Snap Clip</span>
                  <span className="font-mono text-zinc-100">
                    ×{snapCount}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Validation */}
        {!validation.valid && (
          <div
            role="alert"
            className="space-y-1 rounded border border-red-800 bg-red-950 p-3"
          >
            {validation.errors.map((error) => (
              <p key={error} className="text-xs text-red-400">
                {error}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Right: Baseplate visualization (2D / 3D toggle) */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-950">
        <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-lg bg-zinc-800/80 p-1">
          {(["2d", "3d"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => {
                setViewMode(mode);
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium uppercase transition-colors ${
                viewMode === mode
                  ? "bg-zinc-600 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              data-testid={`view-${mode}-btn`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="min-h-0 min-w-0 flex-1 p-2">
          {viewMode === "2d" ? (
            <BaseplateLayoutGrid />
          ) : previewItems.length > 0 ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <span className="text-xs text-zinc-500">Loading 3D...</span>
                </div>
              }
            >
              <BaseplatePreviewPanel
                items={previewItems}
                selectedId={
                  selected?.kind === "baseplate" ? selected.id : null
                }
                gridConfig={gridConfig}
                onItemClick={(id) => {
                  setSelected({ kind: "baseplate", id });
                }}
                onBackgroundClick={() => {
                  setSelected(null);
                }}
              />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="px-4 text-center text-sm text-zinc-600">
                No baseplates placed yet — use Auto Fill or draw in 2D view.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
