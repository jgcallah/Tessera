import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useLayout } from "../LayoutContext";
import { useGridConfig } from "../GridConfigContext";
import { MiniLayoutGrid } from "../MiniLayoutGrid";
import { BinPropertyEditor } from "../BinPropertyEditor";
import { BinPreviewPanel } from "../BinPreviewPanel";
import type { BinPreviewItem } from "../BinPreviewPanel";
import { layoutItemToBinConfig, DEFAULT_BIN_PROPERTIES } from "../../lib/layout";
import type { BinProperties } from "../../lib/layout";
import { getBinColor } from "../../lib/bin-colors";

export function BinEditorStep(): React.JSX.Element {
  const { layout, updateBinProperties } = useLayout();
  const { config: gridConfig } = useGridConfig();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Prune selection when items change (undo, delete, etc.)
  useEffect(() => {
    const validIds = new Set(layout.items.map((i) => i.id));
    setSelectedIds((prev) => {
      const pruned = new Set([...prev].filter((id) => validIds.has(id)));
      return pruned.size === prev.size ? prev : pruned;
    });
  }, [layout.items]);

  const selectedItems = useMemo(
    () => layout.items.filter((item) => selectedIds.has(item.id)),
    [layout.items, selectedIds]
  );

  // All layout items rendered in the 3D preview (not just selected)
  const previewItems: BinPreviewItem[] = useMemo(
    () =>
      layout.items.map((item) => ({
        id: item.id,
        binConfig: layoutItemToBinConfig(item),
        gridX: item.gridX,
        gridY: item.gridY,
        gridUnitsX: item.gridUnitsX,
        gridUnitsY: item.gridUnitsY,
        color: getBinColor(item.gridUnitsX, item.gridUnitsY),
      })),
    [layout.items]
  );

  const handlePropertyChange = useCallback(
    (ids: string[], props: Partial<BinProperties>) => {
      for (const id of ids) {
        updateBinProperties(id, props);
      }
    },
    [updateBinProperties]
  );

  const handleResetDefaults = useCallback(
    (ids: string[]) => {
      for (const id of ids) {
        updateBinProperties(id, { ...DEFAULT_BIN_PROPERTIES });
      }
    },
    [updateBinProperties]
  );

  const handleItemClick = useCallback((id: string, additive: boolean) => {
    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <div className="flex h-full gap-4">
      {/* Left column: Grid (top) + Properties (bottom) */}
      <div className="flex w-[350px] shrink-0 flex-col gap-4">
        {/* Mini Grid — fills top half */}
        <div className="flex min-h-0 flex-1 flex-col">
          <h2 className="mb-2 shrink-0 text-lg font-semibold">Bin Editor</h2>
          <p className="mb-2 shrink-0 text-xs text-zinc-500">
            Click bins to select. Ctrl+click to multi-select.
          </p>
          <div className="min-h-0 flex-1">
            <MiniLayoutGrid
              layout={layout}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </div>
        </div>

        {/* Property Editor — fills bottom half */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {selectedItems.length > 0 ? (
            <BinPropertyEditor
              selectedItems={selectedItems}
              gridConfig={gridConfig}
              onPropertyChange={handlePropertyChange}
              onResetDefaults={handleResetDefaults}
            />
          ) : layout.items.length > 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-zinc-500">
                Select a bin on the grid or in the 3D view to configure it.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Right column: 3D Preview showing all bins */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-950">
        {previewItems.length > 0 ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <span className="text-xs text-zinc-500">Loading 3D...</span>
              </div>
            }
          >
            <BinPreviewPanel
              items={previewItems}
              selectedIds={selectedIds}
              gridConfig={gridConfig}
              onItemClick={handleItemClick}
              onBackgroundClick={handleBackgroundClick}
            />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="px-4 text-center text-sm text-zinc-600">
              No bins placed yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
