import { useSpaceConfig } from "./SpaceConfigContext";
import { useGridConfig } from "./GridConfigContext";
import { validateSpaceConfig } from "../lib/space-config";

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

  function applySuggestion() {
    updateGridConfig({ mode: "custom", baseUnit: suggestion.baseUnit });
  }

  const fields: { key: "width" | "length" | "depth"; label: string }[] = [
    { key: "width", label: "Width" },
    { key: "length", label: "Length" },
    { key: "depth", label: "Depth" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Space Definition</h2>

      {/* Dimension Inputs */}
      <div className="space-y-3">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <label
              htmlFor={`space-${key}`}
              className="mb-1 block text-xs font-medium text-zinc-400"
            >
              {label} <span className="text-zinc-600">(mm)</span>
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
        <div className="space-y-1 text-sm">
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
              className={`font-mono ${
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
            <span className="text-zinc-400">Waste</span>
            <span className="font-mono text-zinc-100">
              <span data-testid="fit-wasteW">
                {gridFit.remainderWidth.toFixed(1)}
              </span>
              {" × "}
              <span data-testid="fit-wasteL">
                {gridFit.remainderLength.toFixed(1)}
              </span>
              <span className="text-zinc-500"> mm</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Max Height</span>
            <span className="font-mono text-zinc-100">
              <span data-testid="fit-maxH">{gridFit.maxHeightUnits}</span>
              <span className="text-zinc-500">u</span>
            </span>
          </div>
        </div>
      </div>

      {/* Optimal Base Unit Suggestion */}
      {gridConfig.mode === "gridfinity" &&
        suggestion.wastePercent < gridFit.coveragePercent && (
          <div className="rounded border border-violet-800 bg-violet-950 p-3">
            <p className="mb-2 text-xs text-violet-300">
              A base unit of{" "}
              <span className="font-mono font-bold">
                {suggestion.baseUnit}mm
              </span>{" "}
              would reduce waste to{" "}
              <span className="font-mono font-bold">
                {suggestion.wastePercent.toFixed(1)}%
              </span>
            </p>
            <button
              type="button"
              onClick={applySuggestion}
              className="rounded bg-violet-700 px-3 py-1 text-xs font-medium text-white hover:bg-violet-600"
            >
              Apply Custom Unit
            </button>
          </div>
        )}

      {/* Validation Errors */}
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
