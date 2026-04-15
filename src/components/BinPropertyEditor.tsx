import { useMemo } from "react";
import { Tooltip } from "./ui/Tooltip";
import { getBinColor } from "../lib/bin-colors";
import type { BinProperties, LayoutItem } from "../lib/layout";
import type { GridConfig } from "../lib/grid-config";

// ── Toggle field definitions ────────────────────────────────────────────────

interface ToggleField {
  key: keyof BinProperties;
  label: string;
  tip: string;
  disabledWhen?: (merged: MergedProperties) => boolean;
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
    disabledWhen: (m) => m.includeMagnetHoles !== true,
  },
  {
    key: "includeScoop",
    label: "Scoop",
    tip: "Curved front wall making it easier to grab small items from the bin.",
  },
  {
    key: "includeBottomHoles",
    label: "Bottom Holes",
    tip: "Holes in the floor for drainage or weight reduction.",
  },
];

// ── Merged property types ───────────────────────────────────────────────────

type MergedBool = true | false | "indeterminate";

interface MergedProperties {
  heightUnits: number | null;
  dividersX: number | null;
  dividersY: number | null;
  dividerHeightUnits: number | null;
  includeStackingLip: MergedBool;
  includeMagnetHoles: MergedBool;
  includeScrewHoles: MergedBool;
  includeScoop: MergedBool;
  includeBottomHoles: MergedBool;
}

function computeMergedProperties(items: LayoutItem[]): MergedProperties {
  if (items.length === 0) {
    // Should not happen, but return defaults
    return {
      heightUnits: null,
      dividersX: null,
      dividersY: null,
      dividerHeightUnits: null,
      includeStackingLip: "indeterminate",
      includeMagnetHoles: "indeterminate",
      includeScrewHoles: "indeterminate",
      includeScoop: "indeterminate",
      includeBottomHoles: "indeterminate",
    };
  }

  const first = items[0]!.binProperties;

  function mergeNumber(key: keyof BinProperties): number | null {
    const val = first[key] as number | undefined;
    if (typeof val !== "number") return null;
    return items.every((i) => i.binProperties[key] === val) ? val : null;
  }

  function mergeBool(key: keyof BinProperties): MergedBool {
    const val = first[key] as boolean;
    if (items.every((i) => i.binProperties[key] === val)) {
      return val;
    }
    return "indeterminate";
  }

  return {
    heightUnits: mergeNumber("heightUnits"),
    dividersX: mergeNumber("dividersX"),
    dividersY: mergeNumber("dividersY"),
    dividerHeightUnits: mergeNumber("dividerHeightUnits"),
    includeStackingLip: mergeBool("includeStackingLip"),
    includeMagnetHoles: mergeBool("includeMagnetHoles"),
    includeScrewHoles: mergeBool("includeScrewHoles"),
    includeScoop: mergeBool("includeScoop"),
    includeBottomHoles: mergeBool("includeBottomHoles"),
  };
}

// ── Component ───────────────────────────────────────────────────────────────

interface BinPropertyEditorProps {
  selectedItems: LayoutItem[];
  gridConfig: GridConfig;
  onPropertyChange: (ids: string[], props: Partial<BinProperties>) => void;
  onResetDefaults: (ids: string[]) => void;
}

export function BinPropertyEditor({
  selectedItems,
  gridConfig,
  onPropertyChange,
  onResetDefaults,
}: BinPropertyEditorProps): React.JSX.Element {
  const merged = useMemo(
    () => computeMergedProperties(selectedItems),
    [selectedItems]
  );
  const ids = useMemo(() => selectedItems.map((i) => i.id), [selectedItems]);
  const single = selectedItems.length === 1 ? selectedItems[0]! : null;

  const heightMm =
    merged.heightUnits !== null
      ? merged.heightUnits * gridConfig.heightUnit
      : null;

  function handleNumberChange(key: keyof BinProperties, value: string) {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 0) {
      onPropertyChange(ids, { [key]: num });
    }
  }

  function handleToggle(key: keyof BinProperties) {
    const current = merged[key as keyof MergedProperties];
    // indeterminate or false → set all true; true → set all false
    const newValue = current !== true;
    onPropertyChange(ids, { [key]: newValue });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">
          {single ? (
            <>
              <span
                className="mr-2 inline-block h-3 w-3 rounded"
                style={{
                  backgroundColor: getBinColor(
                    single.gridUnitsX,
                    single.gridUnitsY
                  ),
                }}
              />
              {single.gridUnitsX}×{single.gridUnitsY} bin at ({single.gridX},{" "}
              {single.gridY})
            </>
          ) : (
            <>{selectedItems.length} bins selected</>
          )}
        </h3>
        <button
          type="button"
          onClick={() => {
            onResetDefaults(ids);
          }}
          className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
        >
          Reset Defaults
        </button>
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
        <div className="flex items-baseline gap-2">
          <input
            id="bin-height"
            type="number"
            min={1}
            step={1}
            value={merged.heightUnits ?? ""}
            placeholder={merged.heightUnits === null ? "mixed" : undefined}
            onChange={(e) => {
              handleNumberChange("heightUnits", e.target.value);
            }}
            className="w-24 rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600"
          />
          <span className="text-xs text-zinc-500">
            {heightMm !== null ? (
              <>= {heightMm}mm total</>
            ) : (
              "varies"
            )}
          </span>
        </div>
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
              value={merged.dividersX ?? ""}
              placeholder={merged.dividersX === null ? "mixed" : undefined}
              onChange={(e) => {
                handleNumberChange("dividersX", e.target.value);
              }}
              className="w-20 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600"
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
              value={merged.dividersY ?? ""}
              placeholder={merged.dividersY === null ? "mixed" : undefined}
              onChange={(e) => {
                handleNumberChange("dividersY", e.target.value);
              }}
              className="w-20 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
        </div>
        {merged.dividersX !== null &&
          merged.dividersY !== null &&
          (merged.dividersX > 0 || merged.dividersY > 0) && (
            <p className="mt-1.5 text-xs text-zinc-500">
              {(merged.dividersX + 1) * (merged.dividersY + 1)} compartments
            </p>
          )}

        {/* Divider height — only relevant when dividers exist on any selected bin */}
        {selectedItems.some(
          (i) =>
            i.binProperties.dividersX > 0 || i.binProperties.dividersY > 0
        ) && (
          <div className="mt-3">
            <label
              htmlFor="divider-height"
              className="mb-1 flex items-center text-xs text-zinc-400"
            >
              Divider Height
              <Tooltip text="Height of divider walls in units (1 unit = 7mm). 0 = full cavity height." />
            </label>
            <div className="flex items-baseline gap-2">
              <input
                id="divider-height"
                type="number"
                min={0}
                step={1}
                value={merged.dividerHeightUnits ?? ""}
                placeholder={
                  merged.dividerHeightUnits === null ? "mixed" : undefined
                }
                onChange={(e) => {
                  handleNumberChange("dividerHeightUnits", e.target.value);
                }}
                className="w-20 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
              <span className="text-xs text-zinc-500">
                {merged.dividerHeightUnits === null
                  ? "varies"
                  : merged.dividerHeightUnits === 0
                    ? "full height"
                    : `= ${merged.dividerHeightUnits * gridConfig.heightUnit}mm`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Feature Toggles */}
      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Features
        </h4>
        <div className="space-y-2">
          {TOGGLES.map(({ key, label, tip, disabledWhen }) => {
            const mergedVal = merged[
              key as keyof MergedProperties
            ] as MergedBool;
            const disabled = disabledWhen ? disabledWhen(merged) : false;

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
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = mergedVal === "indeterminate";
                    }
                  }}
                  checked={mergedVal === true}
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
  );
}
