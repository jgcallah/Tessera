import { useState, useMemo, useCallback } from "react";
import { useLayout } from "./LayoutContext";
import { useGridConfig } from "./GridConfigContext";
import {
  createDefaultPrintBedConfig,
  packParts,
} from "../lib/print-planner";
import type { PackableItem } from "../lib/print-planner";
import { getBinDimensions, createBinConfig } from "../lib/bin-config";
import { generateBinMesh } from "../lib/bin-generator";
import {
  meshToStlBinary,
  createExportZip,
  generatePrintPlanMarkdown,
  downloadBlob,
} from "../lib/export";
import type { LayoutItem, BinProperties } from "../lib/layout";

/** Create a unique key for a bin's full configuration */
function binConfigKey(item: LayoutItem): string {
  const p = item.binProperties;
  return `${item.gridUnitsX}x${item.gridUnitsY}_h${p.heightUnits}_lip${p.includeStackingLip ? 1 : 0}_mag${p.includeMagnetHoles ? 1 : 0}_scr${p.includeScrewHoles ? 1 : 0}_dx${p.dividersX}_dy${p.dividersY}`;
}

interface UniqueBin {
  key: string;
  gridUnitsX: number;
  gridUnitsY: number;
  properties: BinProperties;
  quantity: number;
  label: string;
}

export function ExportPanel(): React.JSX.Element {
  const { layout } = useLayout();
  const { config: gridConfig } = useGridConfig();
  const [exporting, setExporting] = useState(false);

  // Group layout items by full config (not just footprint)
  const uniqueBins: UniqueBin[] = useMemo(() => {
    const map = new Map<string, UniqueBin>();
    for (const item of layout.items) {
      const key = binConfigKey(item);
      const existing = map.get(key);
      if (existing) {
        existing.quantity++;
      } else {
        const p = item.binProperties;
        map.set(key, {
          key,
          gridUnitsX: item.gridUnitsX,
          gridUnitsY: item.gridUnitsY,
          properties: p,
          quantity: 1,
          label: `Bin ${item.gridUnitsX}×${item.gridUnitsY}×${p.heightUnits}u`,
        });
      }
    }
    return [...map.values()];
  }, [layout.items]);

  const packableItems: PackableItem[] = useMemo(() => {
    return uniqueBins.map((bin) => {
      const dims = getBinDimensions(
        createBinConfig({
          gridUnitsX: bin.gridUnitsX,
          gridUnitsY: bin.gridUnitsY,
          heightUnits: bin.properties.heightUnits,
        }),
        gridConfig
      );
      return {
        id: bin.key,
        width: dims.exteriorWidth,
        length: dims.exteriorLength,
        quantity: bin.quantity,
        label: bin.label,
      };
    });
  }, [uniqueBins, gridConfig]);

  const handleExportZip = useCallback(async () => {
    if (uniqueBins.length === 0) return;
    setExporting(true);

    try {
      const stlFiles: { name: string; data: ArrayBuffer }[] = [];
      for (const bin of uniqueBins) {
        const binConfig = createBinConfig({
          gridUnitsX: bin.gridUnitsX,
          gridUnitsY: bin.gridUnitsY,
          heightUnits: bin.properties.heightUnits,
          includeStackingLip: bin.properties.includeStackingLip,
          includeMagnetHoles: bin.properties.includeMagnetHoles,
          includeScrewHoles: bin.properties.includeScrewHoles,
        });
        const manifold = await generateBinMesh(binConfig, gridConfig);
        const mesh = manifold.getMesh();
        const stl = meshToStlBinary(mesh);
        manifold.delete();

        const name = `${bin.label.replace(/[×]/g, "x").replace(/\s+/g, "-")}.stl`;
        stlFiles.push({ name, data: stl });
      }

      const bed = createDefaultPrintBedConfig();
      const packingResult = packParts(packableItems, bed);
      const printPlan = generatePrintPlanMarkdown(packingResult);

      const blob = await createExportZip(stlFiles, printPlan);
      downloadBlob(blob, "tessera-export.zip");
    } catch (err: unknown) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [uniqueBins, gridConfig, packableItems]);

  const handleExportPrintPlan = useCallback(() => {
    if (uniqueBins.length === 0) return;
    const bed = createDefaultPrintBedConfig();
    const packingResult = packParts(packableItems, bed);
    const markdown = generatePrintPlanMarkdown(packingResult);
    const blob = new Blob([markdown], { type: "text/markdown" });
    downloadBlob(blob, "print-plan.md");
  }, [uniqueBins, packableItems]);

  const hasItems = layout.items.length > 0;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Export</h2>

      {!hasItems ? (
        <p className="text-sm text-zinc-500">
          Place bins in the layout to enable export.
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            {uniqueBins.length} unique part
            {uniqueBins.length !== 1 ? "s" : ""},{" "}
            {layout.items.length} total
          </p>

          <button
            type="button"
            disabled={exporting}
            onClick={() => {
              void handleExportZip();
            }}
            className="w-full rounded bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:cursor-wait disabled:opacity-50"
            data-testid="export-zip"
          >
            {exporting ? "Generating..." : "Download All STLs (.zip)"}
          </button>

          <button
            type="button"
            onClick={handleExportPrintPlan}
            className="w-full rounded bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600"
            data-testid="export-print-plan"
          >
            Export Print Plan (.md)
          </button>
        </>
      )}
    </div>
  );
}
