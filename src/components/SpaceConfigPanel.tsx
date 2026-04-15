import { useSpaceConfig } from "./SpaceConfigContext";
import { useGridConfig } from "./GridConfigContext";
import { validateSpaceConfig } from "../lib/space-config";
import type { BaseUnitSuggestion } from "../lib/space-config";
import { Tooltip } from "./ui/Tooltip";

export function SpaceConfigPanel(): React.JSX.Element {
  const { spaceConfig, gridFit, suggestions, updateSpaceConfig } =
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

  function applySuggestion(s: BaseUnitSuggestion) {
    updateGridConfig({ mode: "custom", baseUnit: s.baseUnit });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Space Definition</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          How much space do you have?
        </p>
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

      {/* Suggested Grid Layouts */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center text-xs font-medium uppercase tracking-wider text-zinc-500">
            Suggested Layouts
            <Tooltip text="Different grid arrangements that fit your space well. Pick one based on how you want to split the space." />
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {suggestions.map((s) => {
              const coverage = 100 - s.wastePercent;
              const isActive =
                Math.abs(s.baseUnit - gridConfig.baseUnit) < 0.01;
              return (
                <button
                  key={`${s.unitsX}x${s.unitsY}`}
                  type="button"
                  onClick={() => {
                    applySuggestion(s);
                  }}
                  disabled={isActive}
                  className={`rounded border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? "cursor-default border-violet-500 bg-violet-900/50"
                      : "border-zinc-700 bg-zinc-900 hover:border-violet-600 hover:bg-violet-950/40"
                  }`}
                >
                  <div className="font-mono text-sm font-semibold text-zinc-100">
                    {s.unitsX}×{s.unitsY}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {s.baseUnit}mm
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      coverage >= 95
                        ? "text-green-400"
                        : coverage >= 85
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {coverage.toFixed(1)}%
                  </div>
                  {isActive && (
                    <div className="mt-0.5 text-[10px] text-violet-300">
                      active
                    </div>
                  )}
                </button>
              );
            })}
          </div>
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
