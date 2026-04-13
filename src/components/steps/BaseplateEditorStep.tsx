import { useBaseplateConfig } from "../BaseplateConfigContext";
import { validateBaseplateConfig } from "../../lib/baseplate-config";
import type { BaseplateConfig, BaseplateStyle } from "../../lib/baseplate-config";

const STYLES: { value: BaseplateStyle; label: string; description: string }[] =
  [
    {
      value: "standard",
      label: "Standard",
      description: "Normal wall thickness (2.4mm)",
    },
    {
      value: "skeleton",
      label: "Skeleton",
      description: "Thin walls (1.2mm) — minimal material",
    },
  ];

export function BaseplateEditorStep(): React.JSX.Element {
  const { baseplateConfig, baseplateDimensions, updateBaseplateConfig } =
    useBaseplateConfig();
  const validation = validateBaseplateConfig(baseplateConfig);

  function handleNumberChange(key: keyof BaseplateConfig, value: string) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      updateBaseplateConfig({ [key]: num });
    }
  }

  function handleToggle(key: keyof BaseplateConfig) {
    updateBaseplateConfig({
      [key]: !baseplateConfig[key],
    });
  }

  return (
    <div className="mx-auto h-full max-w-3xl space-y-6">
      <h2 className="text-lg font-semibold">Baseplate Editor</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Config */}
        <div className="space-y-4">
          {/* Grid Size */}
          <div className="flex gap-3">
            <div>
              <label
                htmlFor="bp-unitsX"
                className="mb-1 block text-xs font-medium text-zinc-400"
              >
                Grid Units X
              </label>
              <input
                id="bp-unitsX"
                type="number"
                min={1}
                step={1}
                value={baseplateConfig.gridUnitsX}
                onChange={(e) => {
                  handleNumberChange("gridUnitsX", e.target.value);
                }}
                className="w-24 rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100"
              />
            </div>
            <div>
              <label
                htmlFor="bp-unitsY"
                className="mb-1 block text-xs font-medium text-zinc-400"
              >
                Grid Units Y
              </label>
              <input
                id="bp-unitsY"
                type="number"
                min={1}
                step={1}
                value={baseplateConfig.gridUnitsY}
                onChange={(e) => {
                  handleNumberChange("gridUnitsY", e.target.value);
                }}
                className="w-24 rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100"
              />
            </div>
          </div>

          {/* Style Toggle */}
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Style
            </h3>
            <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
              {STYLES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={baseplateConfig.style === value}
                  onClick={() => {
                    updateBaseplateConfig({ style: value });
                  }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    baseplateConfig.style === value
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {STYLES.find((s) => s.value === baseplateConfig.style)
                ?.description}
            </p>
          </div>

          {/* Feature Toggles */}
          <div className="space-y-2">
            <label
              htmlFor="bp-magnets"
              className="flex items-center gap-2 text-sm text-zinc-300"
            >
              <input
                id="bp-magnets"
                type="checkbox"
                checked={baseplateConfig.includeMagnetHoles}
                onChange={() => {
                  handleToggle("includeMagnetHoles");
                }}
                className="rounded border-zinc-600 bg-zinc-900"
              />
              Magnet Holes
            </label>
            <label
              htmlFor="bp-screws"
              className={`flex items-center gap-2 text-sm ${
                baseplateConfig.includeMagnetHoles
                  ? "text-zinc-300"
                  : "text-zinc-600"
              }`}
            >
              <input
                id="bp-screws"
                type="checkbox"
                checked={baseplateConfig.includeScrewHoles}
                disabled={!baseplateConfig.includeMagnetHoles}
                onChange={() => {
                  handleToggle("includeScrewHoles");
                }}
                className="rounded border-zinc-600 bg-zinc-900"
              />
              Screw Holes
            </label>
            <label
              htmlFor="bp-snap"
              className="flex items-center gap-2 text-sm text-zinc-300"
            >
              <input
                id="bp-snap"
                type="checkbox"
                checked={baseplateConfig.includeSnapConnectors}
                onChange={() => {
                  handleToggle("includeSnapConnectors");
                }}
                className="rounded border-zinc-600 bg-zinc-900"
              />
              Snap-in Connectors
            </label>
          </div>
        </div>

        {/* Right: Dimensions + Info */}
        <div className="space-y-4">
          <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Dimensions
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Size</span>
                <span className="font-mono text-zinc-100">
                  {baseplateDimensions.width} × {baseplateDimensions.length} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Height</span>
                <span className="font-mono text-zinc-100">
                  {baseplateDimensions.totalHeight} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Wall Width</span>
                <span className="font-mono text-zinc-100">
                  {baseplateDimensions.rimWidth} mm
                </span>
              </div>
            </div>
          </div>

          <div className="rounded border border-zinc-700 bg-zinc-800 p-3 text-xs text-zinc-500">
            <p>
              Baseplate is a frame/waffle structure — open cells with rim walls
              at grid boundaries. Bins sit on the receptacle profile at the top
              of each wall.
            </p>
            {baseplateConfig.includeSnapConnectors && (
              <p className="mt-2">
                Snap connectors add a recessed channel in the walls. A separate
                clip piece prints flat and snaps in to join adjacent baseplates.
              </p>
            )}
          </div>
        </div>
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
    </div>
  );
}
