import { useBaseplateConfig } from "./BaseplateConfigContext";
import { validateBaseplateConfig } from "../lib/baseplate-config";
import type { BaseplateConfig } from "../lib/baseplate-config";

interface ToggleFieldDef {
  key: keyof BaseplateConfig;
  label: string;
  disabledWhen?: (config: BaseplateConfig) => boolean;
}

const TOGGLE_FIELDS: ToggleFieldDef[] = [
  { key: "includeMagnetHoles", label: "Magnet Holes" },
  {
    key: "includeScrewHoles",
    label: "Screw Holes",
    disabledWhen: (config) => !config.includeMagnetHoles,
  },
];

export function BaseplateConfigPanel(): React.JSX.Element {
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
    updateBaseplateConfig({ [key]: !baseplateConfig[key] });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Baseplate Configuration</h2>

      {/* Grid Size Inputs */}
      <div className="space-y-3">
        <div>
          <label
            htmlFor="bp-gridUnitsX"
            className="mb-1 block text-xs font-medium text-zinc-400"
          >
            Grid Units X
          </label>
          <input
            id="bp-gridUnitsX"
            type="number"
            step={1}
            value={baseplateConfig.gridUnitsX}
            onChange={(e) => {
              handleNumberChange("gridUnitsX", e.target.value);
            }}
            className="w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="bp-gridUnitsY"
            className="mb-1 block text-xs font-medium text-zinc-400"
          >
            Grid Units Y
          </label>
          <input
            id="bp-gridUnitsY"
            type="number"
            step={1}
            value={baseplateConfig.gridUnitsY}
            onChange={(e) => {
              handleNumberChange("gridUnitsY", e.target.value);
            }}
            className="w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        {TOGGLE_FIELDS.map(({ key, label, disabledWhen }) => {
          const id = `bp-${key}`;
          const disabled = disabledWhen ? disabledWhen(baseplateConfig) : false;
          return (
            <label
              key={key}
              htmlFor={id}
              className={`flex items-center gap-2 text-sm ${
                disabled ? "text-zinc-600" : "text-zinc-300"
              }`}
            >
              <input
                id={id}
                type="checkbox"
                checked={baseplateConfig[key] as boolean}
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

      {/* Computed Dimensions */}
      <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Dimensions
        </h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Size</span>
            <span className="font-mono text-zinc-100">
              <span data-testid="bp-width">{baseplateDimensions.width}</span>
              {" × "}
              <span data-testid="bp-length">{baseplateDimensions.length}</span>
              <span className="text-zinc-500"> mm</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Height</span>
            <span className="font-mono text-zinc-100">
              <span data-testid="bp-height">
                {baseplateDimensions.totalHeight}
              </span>
              <span className="text-zinc-500"> mm</span>
            </span>
          </div>
        </div>
      </div>

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
