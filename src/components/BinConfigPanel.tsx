import { useBinConfig } from "./BinConfigContext";
import { validateBinConfig } from "../lib/bin-config";
import type { BinConfig } from "../lib/bin-config";

interface NumberFieldDef {
  key: keyof BinConfig;
  label: string;
  step: number;
}

interface ToggleFieldDef {
  key: keyof BinConfig;
  label: string;
  disabledWhen?: (config: BinConfig) => boolean;
}

const NUMBER_FIELDS: NumberFieldDef[] = [
  { key: "gridUnitsX", label: "Grid Units X", step: 1 },
  { key: "gridUnitsY", label: "Grid Units Y", step: 1 },
  { key: "heightUnits", label: "Height Units", step: 1 },
  { key: "wallThickness", label: "Wall Thickness", step: 0.1 },
];

const TOGGLE_FIELDS: ToggleFieldDef[] = [
  { key: "includeStackingLip", label: "Stacking Lip" },
  { key: "includeMagnetHoles", label: "Magnet Holes" },
  {
    key: "includeScrewHoles",
    label: "Screw Holes",
    disabledWhen: (config) => !config.includeMagnetHoles,
  },
];

export function BinConfigPanel(): React.JSX.Element {
  const { binConfig, binDimensions, updateBinConfig } = useBinConfig();
  const validation = validateBinConfig(binConfig);

  function handleNumberChange(key: keyof BinConfig, value: string) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      updateBinConfig({ [key]: num });
    }
  }

  function handleToggle(key: keyof BinConfig) {
    updateBinConfig({ [key]: !binConfig[key] });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Bin Configuration</h2>

      {/* Number Inputs */}
      <div className="space-y-3">
        {NUMBER_FIELDS.map(({ key, label, step }) => {
          const id = `bin-${key}`;
          return (
            <div key={key}>
              <label
                htmlFor={id}
                className="mb-1 block text-xs font-medium text-zinc-400"
              >
                {label}
                {key === "wallThickness" && (
                  <span className="text-zinc-600"> (mm)</span>
                )}
              </label>
              <input
                id={id}
                type="number"
                step={step}
                value={binConfig[key] as number}
                onChange={(e) => {
                  handleNumberChange(key, e.target.value);
                }}
                className="w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      {/* Toggle Inputs */}
      <div className="space-y-2">
        {TOGGLE_FIELDS.map(({ key, label, disabledWhen }) => {
          const id = `bin-${key}`;
          const disabled = disabledWhen ? disabledWhen(binConfig) : false;
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
                checked={binConfig[key] as boolean}
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
            <span className="text-zinc-400">Exterior W × L</span>
            <span className="font-mono text-zinc-100">
              <span data-testid="ext-width">{binDimensions.exteriorWidth}</span>
              {" × "}
              <span data-testid="ext-length">
                {binDimensions.exteriorLength}
              </span>
              <span className="text-zinc-500"> mm</span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Total Height</span>
            <span className="font-mono text-zinc-100">
              <span data-testid="total-height">
                {binDimensions.totalHeight}
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
