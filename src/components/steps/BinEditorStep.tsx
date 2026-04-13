import { useState } from "react";
import { useLayout } from "../LayoutContext";
import type { BinProperties, LayoutItem } from "../../lib/layout";

interface ToggleField {
  key: keyof BinProperties;
  label: string;
  disabledWhen?: (props: BinProperties) => boolean;
}

const TOGGLES: ToggleField[] = [
  { key: "includeStackingLip", label: "Stacking Lip" },
  { key: "includeMagnetHoles", label: "Magnet Holes" },
  {
    key: "includeScrewHoles",
    label: "Screw Holes",
    disabledWhen: (p) => !p.includeMagnetHoles,
  },
  { key: "includeScoop", label: "Scoop (curved front)" },
  { key: "includeLabelTab", label: "Label Tab" },
  { key: "includeBottomHoles", label: "Bottom Holes" },
];

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

  return (
    <div className="flex h-full gap-6">
      {/* Left: Bin List */}
      <div className="w-64 overflow-y-auto">
        <h2 className="mb-3 text-lg font-semibold">Bin Editor</h2>
        {layout.items.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No bins placed yet. Go back to the Layout step to place bins.
          </p>
        ) : (
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
        )}
      </div>

      {/* Right: Property Editor */}
      {selectedItem && (
        <div className="flex-1 space-y-4" data-testid="bin-properties">
          <h3 className="text-sm font-medium text-zinc-300">
            Bin at ({selectedItem.gridX}, {selectedItem.gridY}) —{" "}
            {selectedItem.gridUnitsX}×{selectedItem.gridUnitsY}
          </h3>

          {/* Height */}
          <div>
            <label
              htmlFor="bin-height"
              className="mb-1 block text-xs font-medium text-zinc-400"
            >
              Height Units
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
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Internal Dividers
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
              <p className="mt-1 text-xs text-zinc-500">
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
              {TOGGLES.map(({ key, label, disabledWhen }) => {
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
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
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
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`bin-${item.id}`}
      className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
        isSelected
          ? "bg-violet-700 text-white"
          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
      }`}
    >
      <span className="font-mono">
        {item.gridUnitsX}×{item.gridUnitsY}
      </span>
      <span className="ml-2 text-xs opacity-70">
        ({item.gridX},{item.gridY})
      </span>
      <span className="ml-2 text-xs opacity-70">
        {item.binProperties.heightUnits}u
      </span>
    </button>
  );
}
