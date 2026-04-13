import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useLayout } from "../LayoutContext";
import { useGridConfig } from "../GridConfigContext";
import { MiniLayoutGrid } from "../MiniLayoutGrid";
import { BinPropertyEditor } from "../BinPropertyEditor";
import { BinPreviewPanel } from "../BinPreviewPanel";
import { layoutItemToBinConfig, DEFAULT_BIN_PROPERTIES } from "../../lib/layout";
import type { BinProperties } from "../../lib/layout";

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

  const singleSelected =
    selectedItems.length === 1 ? selectedItems[0]! : null;

  const previewBinConfig = useMemo(
    () => (singleSelected ? layoutItemToBinConfig(singleSelected) : null),
    [singleSelected]
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
                Select a bin on the grid to configure it.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Right column: 3D Preview */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-950">
        {singleSelected && previewBinConfig ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <span className="text-xs text-zinc-500">Loading 3D...</span>
              </div>
            }
          >
            <BinPreviewPanel
              binConfig={previewBinConfig}
              gridConfig={gridConfig}
            />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="px-4 text-center text-sm text-zinc-600">
              {selectedItems.length === 0
                ? "Select a bin to preview"
                : "Select a single bin to preview in 3D"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
