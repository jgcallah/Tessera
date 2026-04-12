import { useState, useMemo } from "react";
import { useLayout } from "./LayoutContext";
import { useGridConfig } from "./GridConfigContext";
import {
  createDefaultPrintBedConfig,
  createPrintBedConfig,
  packParts,
  validatePrintBedConfig,
} from "../lib/print-planner";
import type { PrintBedConfig, PackableItem, PrintSheet } from "../lib/print-planner";
import { getBinDimensions } from "../lib/bin-config";
import { createBinConfig } from "../lib/bin-config";

const SHEET_SCALE = 0.8; // px per mm for sheet visualization

export function PrintPlanPanel(): React.JSX.Element {
  const { partsList } = useLayout();
  const { config: gridConfig } = useGridConfig();
  const [bedConfig, setBedConfig] = useState<PrintBedConfig>(
    createDefaultPrintBedConfig
  );

  const validation = validatePrintBedConfig(bedConfig);

  // Convert layout parts to packable items with real mm dimensions
  const packableItems: PackableItem[] = useMemo(() => {
    return partsList.map((part) => {
      const dims = getBinDimensions(
        createBinConfig({
          gridUnitsX: part.gridUnitsX,
          gridUnitsY: part.gridUnitsY,
          heightUnits: part.heightUnits,
        }),
        gridConfig
      );
      return {
        id: `${part.gridUnitsX}x${part.gridUnitsY}x${part.heightUnits}`,
        width: dims.exteriorWidth,
        length: dims.exteriorLength,
        quantity: part.quantity,
        label: `Bin ${part.gridUnitsX}×${part.gridUnitsY}×${part.heightUnits}u`,
      };
    });
  }, [partsList, gridConfig]);

  const packingResult = useMemo(
    () => (validation.valid ? packParts(packableItems, bedConfig) : null),
    [packableItems, bedConfig, validation.valid]
  );

  function handleBedChange(key: keyof PrintBedConfig, value: string) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setBedConfig((prev) => createPrintBedConfig({ ...prev, [key]: num }));
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Print Planner</h2>

      {/* Bed Config */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label
            htmlFor="bed-width"
            className="mb-1 block text-xs text-zinc-400"
          >
            Bed Width <span className="text-zinc-600">(mm)</span>
          </label>
          <input
            id="bed-width"
            type="number"
            step={10}
            value={bedConfig.bedWidth}
            onChange={(e) => {
              handleBedChange("bedWidth", e.target.value);
            }}
            className="w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="bed-length"
            className="mb-1 block text-xs text-zinc-400"
          >
            Bed Length <span className="text-zinc-600">(mm)</span>
          </label>
          <input
            id="bed-length"
            type="number"
            step={10}
            value={bedConfig.bedLength}
            onChange={(e) => {
              handleBedChange("bedLength", e.target.value);
            }}
            className="w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
          />
        </div>
      </div>

      {partsList.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Place bins in the layout planner to generate a print plan.
        </p>
      ) : packingResult ? (
        <>
          {/* Summary */}
          <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Total Sheets</span>
              <span
                data-testid="total-sheets"
                className="font-mono font-bold text-zinc-100"
              >
                {packingResult.totalSheets}
              </span>
            </div>
          </div>

          {/* Unpacked warnings */}
          {packingResult.unpacked.length > 0 && (
            <div
              role="alert"
              className="rounded border border-red-800 bg-red-950 p-3"
            >
              <p className="text-xs text-red-400">
                {packingResult.unpacked.length} part(s) too large for bed
              </p>
            </div>
          )}

          {/* Sheet Visualizations */}
          <div className="space-y-3" data-testid="sheet-list">
            {packingResult.sheets.map((sheet) => (
              <SheetView
                key={sheet.index}
                sheet={sheet}
                bedConfig={bedConfig}
              />
            ))}
          </div>

          {/* Inventory */}
          <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Print Inventory
            </h3>
            <div className="space-y-1 text-sm" data-testid="print-inventory">
              {packingResult.inventory.map((entry) => (
                <div key={entry.label} className="flex justify-between">
                  <span className="text-zinc-300">{entry.label}</span>
                  <span className="font-mono text-zinc-100">
                    ×{entry.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

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
  );
}

function SheetView({
  sheet,
  bedConfig,
}: {
  sheet: PrintSheet;
  bedConfig: PrintBedConfig;
}) {
  const svgW = bedConfig.bedWidth * SHEET_SCALE;
  const svgH = bedConfig.bedLength * SHEET_SCALE;

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-zinc-400">
        Sheet {sheet.index + 1}{" "}
        <span className="text-zinc-600">
          ({sheet.placements.length} parts)
        </span>
      </p>
      <svg
        width={svgW}
        height={svgH}
        className="rounded border border-zinc-700 bg-zinc-950"
        data-testid={`sheet-${sheet.index}`}
      >
        {sheet.placements.map((p, i) => (
          <rect
            key={i}
            x={p.x * SHEET_SCALE}
            y={p.y * SHEET_SCALE}
            width={p.item.width * SHEET_SCALE}
            height={p.item.length * SHEET_SCALE}
            rx={2}
            className="fill-violet-700 stroke-violet-500"
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>
  );
}
