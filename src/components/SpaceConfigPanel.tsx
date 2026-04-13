import { useSpaceConfig } from "./SpaceConfigContext";
import { useGridConfig } from "./GridConfigContext";
import { validateSpaceConfig } from "../lib/space-config";
import { Tooltip } from "./ui/Tooltip";

const PRESETS: { label: string; width: number; length: number; depth: number }[] = [
  { label: "Small Drawer", width: 300, length: 200, depth: 50 },
  { label: "Desk Organizer", width: 400, length: 300, depth: 60 },
  { label: "Tool Chest Drawer", width: 500, length: 400, depth: 80 },
  { label: "Shelf Bin", width: 600, length: 400, depth: 100 },
];

export function SpaceConfigPanel(): React.JSX.Element {
  const { spaceConfig, gridFit, suggestion, updateSpaceConfig } =
    useSpaceConfig();
  const { config: gridConfig, updateConfig: updateGridConfig } =
    useGridConfig();
  const validation = validateSpaceConfig(spaceConfig);

  function handleChange(key: "width" | "length" | "depth", value: string) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      updateSpaceConfig({ [key]: num });
    }
  }

  function applyPreset(preset: (typeof PRESETS)[number]) {
    updateSpaceConfig({
      width: preset.width,
      length: preset.length,
      depth: preset.depth,
    });
  }

  function applySuggestion() {
    updateGridConfig({ mode: "custom", baseUnit: suggestion.baseUnit });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Space Definition</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          How much space do you have?
        </p>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              applyPreset(preset);
            }}
            className="rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Dimension Inputs */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { key: "width" as const, label: "Width", tip: "Internal width of the container (X axis)" },
            { key: "length" as const, label: "Length", tip: "Internal length of the container (Y axis)" },
            { key: "depth" as const, label: "Depth", tip: "How tall the bins can be (Z axis)" },
          ] as const
        ).map(({ key, label, tip }) => (
          <div key={key}>
            <label
              htmlFor={`space-${key}`}
              className="mb-1 flex items-center text-xs font-medium text-zinc-400"
            >
              {label} <span className="ml-0.5 text-zinc-600">mm</span>
              <Tooltip text={tip} />
            </label>
            <input
              id={`space-${key}`}
              type="number"
              step={1}
              value={spaceConfig[key]}
              onChange={(e) => {
                handleChange(key, e.target.value);
              }}
              className="w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Grid Fit Results */}
      <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Grid Fit
        </h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Grid Units</span>
            <span className="font-mono text-zinc-100">
              <span data-testid="fit-unitsX">{gridFit.unitsX}</span>
              {" × "}
              <span data-testid="fit-unitsY">{gridFit.unitsY}</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Coverage</span>
            <span
              data-testid="fit-coverage"
              className={`font-mono font-medium ${
                gridFit.coveragePercent >= 95
                  ? "text-green-400"
                  : gridFit.coveragePercent >= 85
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {gridFit.coveragePercent.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Unused</span>
            <span className="font-mono text-zinc-400">
              <span data-testid="fit-wasteW">
                {gridFit.remainderWidth.toFixed(1)}
              </span>
              {" × "}
              <span data-testid="fit-wasteL">
                {gridFit.remainderLength.toFixed(1)}
              </span>
              <span className="text-zinc-600"> mm</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Max Height</span>
            <span className="font-mono text-zinc-100">
              <span data-testid="fit-maxH">{gridFit.maxHeightUnits}</span>
              <span className="text-zinc-500"> units</span>
            </span>
          </div>
        </div>
      </div>

      {/* Optimal Base Unit Suggestion */}
      {gridConfig.mode === "gridfinity" &&
        suggestion.wastePercent < gridFit.coveragePercent && (
          <div className="rounded border border-violet-800/50 bg-violet-950/50 p-3">
            <p className="mb-2 text-xs text-violet-300">
              Using{" "}
              <span className="font-mono font-bold">
                {suggestion.baseUnit}mm
              </span>{" "}
              base unit would improve coverage to{" "}
              <span className="font-mono font-bold">
                {(100 - suggestion.wastePercent).toFixed(1)}%
              </span>
            </p>
            <button
              type="button"
              onClick={applySuggestion}
              className="rounded bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
            >
              Switch to Custom Grid
            </button>
          </div>
        )}

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
