import { useState } from "react";
import { useLayout } from "../LayoutContext";
import { Tooltip } from "../ui/Tooltip";
import { DEFAULT_BIN_PROPERTIES } from "../../lib/layout";
import type { BinProperties, LayoutItem } from "../../lib/layout";

interface ToggleField {
  key: keyof BinProperties;
  label: string;
  tip: string;
  disabledWhen?: (props: BinProperties) => boolean;
}

const TOGGLES: ToggleField[] = [
  {
    key: "includeStackingLip",
    label: "Stacking Lip",
    tip: "Stepped rim at the top allowing bins to stack on each other.",
  },
  {
    key: "includeMagnetHoles",
    label: "Magnet Holes",
    tip: "6mm holes in corners for magnets to secure bins to baseplates.",
  },
  {
    key: "includeScrewHoles",
    label: "Screw Holes",
    tip: "M3 through-holes inside magnet holes for permanent mounting.",
    disabledWhen: (p) => !p.includeMagnetHoles,
  },
  {
    key: "includeScoop",
    label: "Scoop",
    tip: "Curved front wall making it easier to grab small items from the bin.",
  },
  {
    key: "includeLabelTab",
    label: "Label Tab",
    tip: "Angled surface at the front for attaching printed labels.",
  },
  {
    key: "includeBottomHoles",
    label: "Bottom Holes",
    tip: "Holes in the floor for drainage or weight reduction.",
  },
];

// Colors matching the layout grid palette
const SIZE_COLORS: Record<string, string> = {
  "1x1": "#6d28d9",
  "2x1": "#2563eb",
  "1x2": "#0891b2",
  "2x2": "#059669",
  "3x1": "#d97706",
  "1x3": "#dc2626",
};
const DEFAULT_COLOR = "#7c3aed";

function getBinColor(item: LayoutItem): string {
  return SIZE_COLORS[`${item.gridUnitsX}x${item.gridUnitsY}`] ?? DEFAULT_COLOR;
}

export function BinEditorStep(): React.JSX.Element {
  const { layout, updateBinProperties } = useLayout();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedItem = selectedId
    ? layout.items.find((item) => item.id === selectedId) ?? null
    : null;

  function handleNumberChange(key: keyof BinProperties, value: string) {
    if (!selectedItem) return;
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0) {
      updateBinProperties(selectedItem.id, { [key]: num });
    }
  }

  function handleToggle(key: keyof BinProperties) {
    if (!selectedItem) return;
    updateBinProperties(selectedItem.id, {
      [key]: !selectedItem.binProperties[key],
    });
  }

  function handleResetDefaults() {
    if (!selectedItem) return;
    updateBinProperties(selectedItem.id, { ...DEFAULT_BIN_PROPERTIES });
  }

  function handleApplyToMatching() {
    if (!selectedItem) return;
    for (const item of layout.items) {
      if (
        item.id !== selectedItem.id &&
        item.gridUnitsX === selectedItem.gridUnitsX &&
        item.gridUnitsY === selectedItem.gridUnitsY
      ) {
        updateBinProperties(item.id, { ...selectedItem.binProperties });
      }
    }
  }

  const matchingCount = selectedItem
    ? layout.items.filter(
        (item) =>
          item.id !== selectedItem.id &&
          item.gridUnitsX === selectedItem.gridUnitsX &&
          item.gridUnitsY === selectedItem.gridUnitsY
      ).length
    : 0;

  return (
    <div className="flex h-full gap-6">
      {/* Left: Bin List */}
      <div className="w-64 overflow-y-auto">
        <h2 className="mb-3 text-lg font-semibold">Bin Editor</h2>
        {layout.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-700 p-6 text-center">
            <p className="text-sm text-zinc-500">No bins placed yet.</p>
            <p className="mt-1 text-xs text-zinc-600">
              Go back to the Layout step to place bins on the grid.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-xs text-zinc-500">
              Select a bin to configure its properties.
            </p>
            <div className="space-y-1" data-testid="bin-list">
              {layout.items.map((item) => (
                <BinListItem
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedId}
                  onSelect={() => {
                    setSelectedId(item.id);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right: Property Editor */}
      {selectedItem ? (
        <div className="flex-1 space-y-5" data-testid="bin-properties">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">
              <span
                className="mr-2 inline-block h-3 w-3 rounded"
                style={{ backgroundColor: getBinColor(selectedItem) }}
              />
              {selectedItem.gridUnitsX}×{selectedItem.gridUnitsY} bin at ({selectedItem.gridX},{" "}
              {selectedItem.gridY})
            </h3>
            <div className="flex gap-2">
              {matchingCount > 0 && (
                <button
                  type="button"
                  onClick={handleApplyToMatching}
                  className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                >
                  Apply to {matchingCount} matching
                </button>
              )}
              <button
                type="button"
                onClick={handleResetDefaults}
                className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              >
                Reset Defaults
              </button>
            </div>
          </div>

          {/* Height */}
          <div>
            <label
              htmlFor="bin-height"
              className="mb-1 flex items-center text-xs font-medium text-zinc-400"
            >
              Height Units
              <Tooltip text="Number of 7mm height units. 3u = 21mm is common for small parts." />
            </label>
            <input
              id="bin-height"
              type="number"
              min={1}
              step={1}
              value={selectedItem.binProperties.heightUnits}
              onChange={(e) => {
                handleNumberChange("heightUnits", e.target.value);
              }}
              className="w-32 rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100"
            />
          </div>

          {/* Dividers */}
          <div>
            <h4 className="mb-2 flex items-center text-xs font-medium uppercase tracking-wider text-zinc-500">
              Internal Dividers
              <Tooltip text="Split the bin into compartments with internal walls." />
            </h4>
            <div className="flex gap-3">
              <div>
                <label
                  htmlFor="dividers-x"
                  className="mb-1 block text-xs text-zinc-400"
                >
                  Along Width
                </label>
                <input
                  id="dividers-x"
                  type="number"
                  min={0}
                  step={1}
                  value={selectedItem.binProperties.dividersX}
                  onChange={(e) => {
                    handleNumberChange("dividersX", e.target.value);
                  }}
                  className="w-20 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                />
              </div>
              <div>
                <label
                  htmlFor="dividers-y"
                  className="mb-1 block text-xs text-zinc-400"
                >
                  Along Length
                </label>
                <input
                  id="dividers-y"
                  type="number"
                  min={0}
                  step={1}
                  value={selectedItem.binProperties.dividersY}
                  onChange={(e) => {
                    handleNumberChange("dividersY", e.target.value);
                  }}
                  className="w-20 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                />
              </div>
            </div>
            {(selectedItem.binProperties.dividersX > 0 ||
              selectedItem.binProperties.dividersY > 0) && (
              <p className="mt-1.5 text-xs text-zinc-500">
                {(selectedItem.binProperties.dividersX + 1) *
                  (selectedItem.binProperties.dividersY + 1)}{" "}
                compartments
              </p>
            )}
          </div>

          {/* Feature Toggles */}
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Features
            </h4>
            <div className="space-y-2">
              {TOGGLES.map(({ key, label, tip, disabledWhen }) => {
                const disabled = disabledWhen
                  ? disabledWhen(selectedItem.binProperties)
                  : false;
                return (
                  <label
                    key={key}
                    htmlFor={`toggle-${key}`}
                    className={`flex items-center gap-2 text-sm ${
                      disabled ? "text-zinc-600" : "text-zinc-300"
                    }`}
                  >
                    <input
                      id={`toggle-${key}`}
                      type="checkbox"
                      checked={selectedItem.binProperties[key] as boolean}
                      disabled={disabled}
                      onChange={() => {
                        handleToggle(key);
                      }}
                      className="rounded border-zinc-600 bg-zinc-900"
                    />
                    {label}
                    <Tooltip text={tip} />
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ) : layout.items.length > 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-zinc-500">
            Select a bin from the list to configure it.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function BinListItem({
  item,
  isSelected,
  onSelect,
}: {
  item: LayoutItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const color = getBinColor(item);

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`bin-${item.id}`}
      className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
        isSelected
          ? "bg-violet-700 text-white"
          : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      <span
        className="h-4 w-4 shrink-0 rounded"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono">
        {item.gridUnitsX}×{item.gridUnitsY}
      </span>
      <span className="text-xs opacity-60">
        {item.binProperties.heightUnits}u
      </span>
      <span className="ml-auto text-xs opacity-40">
        ({item.gridX},{item.gridY})
      </span>
    </button>
  );
}
