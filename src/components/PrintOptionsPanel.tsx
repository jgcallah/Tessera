import { useState, useCallback } from "react";
import type {
  PrintBedConfig,
  PackingResult,
} from "../lib/print-planner";
import type { ValidationResult } from "../lib/grid-config";
import { generateBinMesh } from "../lib/bin-generator";
import { generateBaseplateMesh } from "../lib/baseplate-generator";
import { generateSpacerMesh } from "../lib/spacer-generator";
import { useGridConfig } from "./GridConfigContext";
import {
  meshToStlBinary,
  combineSheetStl,
  createExportZip,
  generatePrintPlanMarkdown,
  downloadBlob,
} from "../lib/export";
import type { ExportFile, MeshTransform } from "../lib/export";
import { useToast } from "./ui/Toast";
import type { PackableInventory } from "./usePackableItems";

interface MeshDataLike {
  triVerts: Uint32Array;
  vertProperties: Float32Array;
  numProp: number;
}

interface PrintOptionsPanelProps {
  printerConfig: PrintBedConfig;
  validation: ValidationResult;
  packingResult: PackingResult | null;
  inventory: PackableInventory;
}

export function PrintOptionsPanel({
  printerConfig,
  validation,
  packingResult,
  inventory,
}: PrintOptionsPanelProps): React.JSX.Element {
  const { config: gridConfig } = useGridConfig();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const totalParts =
    inventory.uniqueBins.length +
    inventory.uniqueBaseplates.length +
    inventory.uniqueSpacers.length;
  const hasItems = totalParts > 0 || inventory.snapClipPackable !== null;

  const handleExportZip = useCallback(async () => {
    if (!packingResult) return;
    setExporting(true);
    setProgress(0);

    try {
      const meshes = new Map<string, MeshDataLike>();
      const totalUnique =
        inventory.uniqueBins.length +
        inventory.uniqueBaseplates.length +
        inventory.uniqueSpacers.length;
      let done = 0;
      const tick = () => {
        done++;
        // Generation is ~70% of the work; sheet assembly is the remaining 30%.
        setProgress(Math.round((done / totalUnique) * 70));
      };

      // Generate every unique part's mesh once and cache it.
      for (const bin of inventory.uniqueBins) {
        const m = await generateBinMesh(bin.binConfig, gridConfig);
        meshes.set(bin.id, m.getMesh());
        m.delete();
        tick();
      }
      for (const bp of inventory.uniqueBaseplates) {
        const m = await generateBaseplateMesh(bp.baseplateConfig, gridConfig);
        meshes.set(bp.id, m.getMesh());
        m.delete();
        tick();
      }
      for (const sp of inventory.uniqueSpacers) {
        const m = await generateSpacerMesh(
          sp.thickness,
          sp.length,
          sp.baseplateConfig,
          gridConfig
        );
        meshes.set(sp.id, m.getMesh());
        m.delete();
        tick();
      }

      const files: ExportFile[] = [];

      // Per-part STLs
      for (const [id, mesh] of meshes) {
        files.push({
          path: `parts/${id}.stl`,
          data: meshToStlBinary(mesh),
        });
      }

      // Per-plate combined STLs
      const sheetCount = packingResult.sheets.length;
      packingResult.sheets.forEach((sheet, idx) => {
        const sheetParts: { mesh: MeshDataLike; transform: MeshTransform }[] =
          [];
        for (const placement of sheet.placements) {
          const mesh = meshes.get(placement.item.id);
          if (!mesh) continue; // snap clips and other un-meshed items
          const transform: MeshTransform = {
            tx: placement.x + placement.item.width / 2,
            ty: placement.y + placement.item.length / 2,
            tz: 0,
            rotated: placement.rotated,
          };
          sheetParts.push({ mesh, transform });
        }
        if (sheetParts.length > 0) {
          files.push({
            path: `plates/plate-${idx + 1}.stl`,
            data: combineSheetStl(sheetParts),
          });
        }
        setProgress(70 + Math.round(((idx + 1) / sheetCount) * 30));
      });

      const printPlan = generatePrintPlanMarkdown(packingResult);
      const blob = await createExportZip(files, printPlan);
      downloadBlob(blob, "tessera-export.zip");
      toast(
        `Exported ${totalUnique} part STLs + ${sheetCount} plate STLs`,
        "success"
      );
    } catch (err: unknown) {
      console.error("Export failed:", err);
      toast("Export failed — check console for details", "error");
    } finally {
      setExporting(false);
      setProgress(0);
    }
  }, [inventory, packingResult, gridConfig, toast]);

  const handleExportPlan = useCallback(() => {
    if (!packingResult) return;
    const md = generatePrintPlanMarkdown(packingResult);
    const blob = new Blob([md], { type: "text/markdown" });
    downloadBlob(blob, "print-plan.md");
    toast("Print plan exported", "success");
  }, [packingResult, toast]);

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold">Print Options</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Review the pack, then export STLs.
        </p>
      </div>

      {/* Printer summary (configured on the Printer step) */}
      <div
        className="space-y-1 rounded border border-zinc-700 bg-zinc-900 p-3"
        data-testid="printer-summary"
      >
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Printer
        </h3>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Build plate</span>
          <span className="font-mono text-zinc-100">
            {printerConfig.bedWidth} × {printerConfig.bedLength} mm
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Part spacing</span>
          <span className="font-mono text-zinc-100">
            {printerConfig.partSpacing} mm
          </span>
        </div>
        <p className="pt-1 text-xs text-zinc-600">
          Change on the <em>Printer</em> step.
        </p>
      </div>

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

      {/* Summary + Inventory */}
      {packingResult && (
        <div className="space-y-3 rounded border border-zinc-700 bg-zinc-900 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Plates
            </h3>
            <span
              data-testid="total-sheets"
              className="font-mono text-sm font-bold text-zinc-100"
            >
              {packingResult.totalSheets}
            </span>
          </div>
          {packingResult.unpacked.length > 0 && (
            <p className="text-xs text-red-400">
              {packingResult.unpacked.length} part(s) too large for plate
            </p>
          )}
          <div className="space-y-2" data-testid="print-inventory">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Inventory
            </h3>
            {!hasItems && (
              <p className="text-xs text-zinc-500">No parts to print.</p>
            )}
            {inventory.uniqueBins.length > 0 && (
              <InventoryGroup title="Bins" entries={inventory.uniqueBins} />
            )}
            {inventory.uniqueBaseplates.length > 0 && (
              <InventoryGroup
                title="Baseplates"
                entries={inventory.uniqueBaseplates}
              />
            )}
            {inventory.uniqueSpacers.length > 0 && (
              <InventoryGroup
                title="Spacers"
                entries={inventory.uniqueSpacers}
              />
            )}
            {inventory.snapClipPackable && (
              <InventoryGroup
                title="Snap Clips"
                entries={[
                  {
                    id: inventory.snapClipPackable.id,
                    label: inventory.snapClipPackable.label,
                    quantity: inventory.snapClipPackable.quantity,
                  },
                ]}
              />
            )}
          </div>

          {hasItems && (
            <details className="text-xs">
              <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300">
                Files in ZIP
              </summary>
              <ul
                className="mt-1 space-y-0.5 font-mono text-zinc-500"
                data-testid="zip-file-list"
              >
                {inventory.uniqueBins.map((b) => (
                  <li key={b.id}>parts/{b.filename}.stl</li>
                ))}
                {inventory.uniqueBaseplates.map((b) => (
                  <li key={b.id}>parts/{b.filename}.stl</li>
                ))}
                {inventory.uniqueSpacers.map((s) => (
                  <li key={s.id}>parts/{s.filename}.stl</li>
                ))}
                {packingResult.sheets.map((s) => (
                  <li key={s.index}>plates/plate-{s.index + 1}.stl</li>
                ))}
                <li>print-plan.md</li>
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Export */}
      <div className="space-y-2">
        <button
          type="button"
          disabled={exporting || !hasItems || !packingResult}
          onClick={() => {
            void handleExportZip();
          }}
          className="relative w-full overflow-hidden rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
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
          disabled={!hasItems || !packingResult}
          onClick={handleExportPlan}
          className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="export-print-plan"
        >
          Export Print Plan (.md)
        </button>
      </div>
    </>
  );
}

interface InventoryGroupEntry {
  id: string;
  label: string;
  quantity: number;
}

function InventoryGroup({
  title,
  entries,
}: {
  title: string;
  entries: InventoryGroupEntry[];
}): React.JSX.Element {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
        {title}
      </p>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex justify-between text-sm"
        >
          <span className="text-zinc-300">{entry.label}</span>
          <span className="font-mono text-zinc-100">×{entry.quantity}</span>
        </div>
      ))}
    </div>
  );
}
