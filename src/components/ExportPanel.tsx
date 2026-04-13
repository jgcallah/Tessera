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
import { useToast } from "./ui/Toast";
import type { LayoutItem, BinProperties } from "../lib/layout";

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
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

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
    setProgress(0);

    try {
      const stlFiles: { name: string; data: ArrayBuffer }[] = [];
      for (let i = 0; i < uniqueBins.length; i++) {
        const bin = uniqueBins[i]!;
        setProgress(Math.round(((i + 0.5) / uniqueBins.length) * 100));
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
        setProgress(Math.round(((i + 1) / uniqueBins.length) * 100));
      }

      const bed = createDefaultPrintBedConfig();
      const packingResult = packParts(packableItems, bed);
      const printPlan = generatePrintPlanMarkdown(packingResult);

      const blob = await createExportZip(stlFiles, printPlan);
      downloadBlob(blob, "tessera-export.zip");
      toast(`Exported ${stlFiles.length} STL files + print plan`, "success");
    } catch (err: unknown) {
      console.error("Export failed:", err);
      toast("Export failed — check console for details", "error");
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }, [uniqueBins, gridConfig, packableItems, toast]);

  const handleExportPrintPlan = useCallback(() => {
    if (uniqueBins.length === 0) return;
    const bed = createDefaultPrintBedConfig();
    const packingResult = packParts(packableItems, bed);
    const markdown = generatePrintPlanMarkdown(packingResult);
    const blob = new Blob([markdown], { type: "text/markdown" });
    downloadBlob(blob, "print-plan.md");
    toast("Print plan exported", "success");
  }, [uniqueBins, packableItems, toast]);

  const hasItems = layout.items.length > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Export</h2>

      {!hasItems ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-6 text-center">
          <p className="text-sm text-zinc-500">
            Place bins in the layout to enable export.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Export Summary
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Unique Parts</span>
                <span className="font-mono text-zinc-100">
                  {uniqueBins.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Instances</span>
                <span className="font-mono text-zinc-100">
                  {layout.items.length}
                </span>
              </div>
            </div>
            {/* File list preview */}
            <div className="mt-2 border-t border-zinc-800 pt-2">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">
                Files in ZIP
              </p>
              {uniqueBins.map((bin) => (
                <p key={bin.key} className="text-xs text-zinc-500">
                  {bin.label.replace(/[×]/g, "x").replace(/\s+/g, "-")}.stl{" "}
                  <span className="text-zinc-600">×{bin.quantity}</span>
                </p>
              ))}
              <p className="text-xs text-zinc-500">print-plan.md</p>
            </div>
          </div>

          {/* Export buttons */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={exporting}
              onClick={() => {
                void handleExportZip();
              }}
              className="relative w-full overflow-hidden rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-violet-600 disabled:cursor-wait disabled:opacity-70"
              data-testid="export-zip"
            >
              {exporting && (
                <div
                  className="absolute inset-y-0 left-0 bg-violet-500/30 transition-all"
                  style={{ width: `${progress}%` }}
                />
              )}
              <span className="relative">
                {exporting
                  ? `Generating... ${progress}%`
                  : "Download All STLs (.zip)"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportPrintPlan}
              className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              data-testid="export-print-plan"
            >
              Export Print Plan (.md)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
