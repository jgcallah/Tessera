import { useGridConfig } from "./GridConfigContext";
import { validateGridConfig } from "../lib/grid-config";
import type { GridConfig, GridMode } from "../lib/grid-config";
import { Tooltip } from "./ui/Tooltip";
import { CollapsibleSection } from "./ui/CollapsibleSection";

const BASIC_FIELDS: {
  key: keyof GridConfig;
  label: string;
  tip: string;
  lockedInGridfinity: boolean;
  step: number;
}[] = [
  {
    key: "baseUnit",
    label: "Base Unit",
    tip: "Width/length of one grid square. Standard Gridfinity is 42mm.",
    lockedInGridfinity: true,
    step: 1,
  },
  {
    key: "heightUnit",
    label: "Height Unit",
    tip: "Height of one vertical unit. Standard is 7mm (bins are measured in multiples of this).",
    lockedInGridfinity: true,
    step: 1,
  },
  {
    key: "tolerance",
    label: "Tolerance",
    tip: "Clearance between parts for fit. 0.5mm is typical for FDM printing.",
    lockedInGridfinity: false,
    step: 0.1,
  },
];

const HARDWARE_FIELDS: typeof BASIC_FIELDS = [
  {
    key: "magnetDiameter",
    label: "Magnet Diameter",
    tip: "Diameter of magnets for bin retention. Standard: 6mm.",
    lockedInGridfinity: true,
    step: 0.5,
  },
  {
    key: "magnetThickness",
    label: "Magnet Thickness",
    tip: "Thickness of magnets. Standard: 2mm.",
    lockedInGridfinity: true,
    step: 0.5,
  },
  {
    key: "screwDiameter",
    label: "Screw Diameter",
    tip: "M3 screw diameter for securing baseplates. Standard: 3mm.",
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

  function renderField(field: (typeof BASIC_FIELDS)[number]) {
    const disabled = config.mode === "gridfinity" && field.lockedInGridfinity;
    const value = config[field.key] as number;
    const id = `field-${field.key}`;

    return (
      <div key={field.key}>
        <label
          htmlFor={id}
          className="mb-1 flex items-center text-xs font-medium text-zinc-400"
        >
          {field.label} <span className="ml-0.5 text-zinc-600">mm</span>
          <Tooltip text={field.tip} />
        </label>
        <input
          id={id}
          type="number"
          step={field.step}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            handleFieldChange(field.key, e.target.value);
          }}
          className={`w-full rounded border bg-zinc-900 px-3 py-1.5 text-sm ${
            disabled
              ? "cursor-not-allowed border-zinc-800 text-zinc-500"
              : "border-zinc-600 text-zinc-100 focus:border-violet-500 focus:outline-none"
          }`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Grid Configuration</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {config.mode === "gridfinity"
            ? "Standard Gridfinity dimensions (locked)"
            : "Custom grid — all parameters editable"}
        </p>
      </div>

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

      {/* Basic Parameters */}
      <div className="space-y-3">
        {BASIC_FIELDS.map(renderField)}
      </div>

      {/* Hardware (Collapsible) */}
      <CollapsibleSection title="Hardware">
        <div className="space-y-3">
          {HARDWARE_FIELDS.map(renderField)}
        </div>
      </CollapsibleSection>

      {/* Derived Values */}
      <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            Cell Size
            <Tooltip text="Actual usable space per grid cell after tolerance is subtracted." />
          </span>
          <span data-testid="cell-size-value" className="font-mono text-zinc-100">
            {derivedValues.cellSize} mm
          </span>
        </div>
      </div>

      {/* Validation */}
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
