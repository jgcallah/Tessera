import { useGridConfig } from "./GridConfigContext";
import { validateGridConfig } from "../lib/grid-config";
import type { GridConfig, GridMode } from "../lib/grid-config";

interface FieldDef {
  key: keyof GridConfig;
  label: string;
  lockedInGridfinity: boolean;
  step: number;
}

const FIELDS: FieldDef[] = [
  { key: "baseUnit", label: "Base Unit", lockedInGridfinity: true, step: 1 },
  {
    key: "heightUnit",
    label: "Height Unit",
    lockedInGridfinity: true,
    step: 1,
  },
  { key: "tolerance", label: "Tolerance", lockedInGridfinity: false, step: 0.1 },
  {
    key: "magnetDiameter",
    label: "Magnet Diameter",
    lockedInGridfinity: true,
    step: 0.5,
  },
  {
    key: "magnetThickness",
    label: "Magnet Thickness",
    lockedInGridfinity: true,
    step: 0.5,
  },
  {
    key: "screwDiameter",
    label: "Screw Diameter",
    lockedInGridfinity: true,
    step: 0.5,
  },
];

const MODES: GridMode[] = ["gridfinity", "custom"];

export function GridConfigPanel(): React.JSX.Element {
  const { config, derivedValues, updateConfig } = useGridConfig();
  const validation = validateGridConfig(config);

  function handleFieldChange(key: keyof GridConfig, value: string) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      updateConfig({ [key]: num });
    }
  }

  function handleModeSwitch(mode: GridMode) {
    if (mode === config.mode) return;
    updateConfig({ mode });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Grid Configuration</h2>

      {/* Mode Toggle */}
      <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={config.mode === mode}
            onClick={() => {
              handleModeSwitch(mode);
            }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              config.mode === mode
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Parameter Fields */}
      <div className="space-y-3">
        {FIELDS.map(({ key, label, lockedInGridfinity, step }) => {
          const disabled =
            config.mode === "gridfinity" && lockedInGridfinity;
          const value = config[key] as number;
          const id = `field-${key}`;

          return (
            <div key={key}>
              <label
                htmlFor={id}
                className="mb-1 block text-xs font-medium text-zinc-400"
              >
                {label} <span className="text-zinc-600">(mm)</span>
              </label>
              <input
                id={id}
                type="number"
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => {
                  handleFieldChange(key, e.target.value);
                }}
                className={`w-full rounded border bg-zinc-900 px-3 py-1.5 text-sm ${
                  disabled
                    ? "cursor-not-allowed border-zinc-800 text-zinc-500"
                    : "border-zinc-600 text-zinc-100 focus:border-violet-500 focus:outline-none"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Derived Values */}
      <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Derived Values
        </h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Cell Size</span>
          <span data-testid="cell-size-value" className="font-mono text-zinc-100">
            {derivedValues.cellSize}
          </span>
        </div>
      </div>

      {/* Validation Errors */}
      {!validation.valid && (
        <div role="alert" className="space-y-1 rounded border border-red-800 bg-red-950 p-3">
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
