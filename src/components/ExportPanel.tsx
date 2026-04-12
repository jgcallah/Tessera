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

export function ExportPanel(): React.JSX.Element {
  const { partsList } = useLayout();
  const { config: gridConfig } = useGridConfig();
  const [exporting, setExporting] = useState(false);

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

  const handleExportZip = useCallback(async () => {
    if (partsList.length === 0) return;
    setExporting(true);

    try {
      // Generate STL for each unique part
      const stlFiles: { name: string; data: ArrayBuffer }[] = [];
      for (const part of partsList) {
        const binConfig = createBinConfig({
          gridUnitsX: part.gridUnitsX,
          gridUnitsY: part.gridUnitsY,
          heightUnits: part.heightUnits,
        });
        const manifold = await generateBinMesh(binConfig, gridConfig);
        const mesh = manifold.getMesh();
        const stl = meshToStlBinary(mesh);
        manifold.delete();

        const name = `bin-${part.gridUnitsX}x${part.gridUnitsY}x${part.heightUnits}u.stl`;
        stlFiles.push({ name, data: stl });
      }

      // Generate print plan
      const bed = createDefaultPrintBedConfig();
      const packingResult = packParts(packableItems, bed);
      const printPlan = generatePrintPlanMarkdown(packingResult);

      // Create and download ZIP
      const blob = await createExportZip(stlFiles, printPlan);
      downloadBlob(blob, "tessera-export.zip");
    } catch (err: unknown) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [partsList, gridConfig, packableItems]);

  const handleExportPrintPlan = useCallback(() => {
    if (partsList.length === 0) return;
    const bed = createDefaultPrintBedConfig();
    const packingResult = packParts(packableItems, bed);
    const markdown = generatePrintPlanMarkdown(packingResult);
    const blob = new Blob([markdown], { type: "text/markdown" });
    downloadBlob(blob, "print-plan.md");
  }, [partsList, packableItems]);

  const hasItems = partsList.length > 0;

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
            {partsList.length} unique part{partsList.length !== 1 ? "s" : ""},{" "}
            {partsList.reduce((sum, p) => sum + p.quantity, 0)} total
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
