import { useGridConfig } from "./GridConfigContext";
import { useSpaceConfig } from "./SpaceConfigContext";
import { validateGridConfig } from "../lib/grid-config";
import type { GridConfig, GridMode } from "../lib/grid-config";
import type { GridAlignment } from "../lib/space-config";
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
    tip: "Width/length of one grid square. Standard Gridfinity is 42mm. Reduce to bake in a print tolerance.",
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
  const { config, updateConfig } = useGridConfig();
  const { spaceConfig, gridFit, updateSpaceConfig } = useSpaceConfig();
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

      {/* Grid Alignment + Spacers */}
      {(gridFit.remainderWidth > 0 || gridFit.remainderLength > 0) && (
        <div className="space-y-3">
          {/* Spacers */}
          <div className="space-y-2">
            <label
              htmlFor="include-spacers"
              className="flex items-center gap-2 text-sm text-zinc-300"
            >
              <input
                id="include-spacers"
                type="checkbox"
                checked={spaceConfig.includeSpacers}
                onChange={() => {
                  updateSpaceConfig({
                    includeSpacers: !spaceConfig.includeSpacers,
                  });
                }}
                className="rounded border-zinc-600 bg-zinc-900"
              />
              Include spacers
              <Tooltip text="Print spacer strips to fill the margin gaps, keeping the grid from sliding around." />
            </label>
            {spaceConfig.includeSpacers && (
              <div className="ml-6 space-y-3">
                <div>
                  <label
                    htmlFor="spacer-clearance"
                    className="mb-1 flex items-center text-xs text-zinc-400"
                  >
                    Clearance per side
                    <span className="ml-0.5 text-zinc-600">mm</span>
                    <Tooltip text="Gap between the spacer and the container wall. Lower = tighter fit." />
                  </label>
                  <input
                    id="spacer-clearance"
                    type="number"
                    min={0}
                    step={0.25}
                    value={spaceConfig.spacerClearance}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value);
                      if (!isNaN(num) && num >= 0) {
                        updateSpaceConfig({ spacerClearance: num });
                      }
                    }}
                    className="w-24 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                  />
                </div>

                {/* Grid Alignment — only relevant when spacers are enabled */}
                <div>
                  <div className="mb-1.5 flex items-center text-xs text-zinc-400">
                    Grid Alignment
                    <Tooltip text="Where the grid sits within the available space. Affects spacer placement." />
                  </div>
                  <AlignmentGrid
                    valueX={spaceConfig.gridAlignmentX}
                    valueY={spaceConfig.gridAlignmentY}
                    onChange={(x, y) => {
                      updateSpaceConfig({
                        gridAlignmentX: x,
                        gridAlignmentY: y,
                      });
                    }}
                  />
                </div>

                <div className="text-xs text-zinc-500">
                  {gridFit.spacerX.count > 0 && (
                    <p>
                      X spacers:{" "}
                      <span className="font-mono text-amber-400">
                        {gridFit.spacerX.width.toFixed(1)}mm
                      </span>{" "}
                      thick (×{gridFit.spacerX.count})
                    </p>
                  )}
                  {gridFit.spacerY.count > 0 && (
                    <p>
                      Y spacers:{" "}
                      <span className="font-mono text-amber-400">
                        {gridFit.spacerY.width.toFixed(1)}mm
                      </span>{" "}
                      thick (×{gridFit.spacerY.count})
                    </p>
                  )}
                  {gridFit.spacerX.count === 0 &&
                    gridFit.spacerY.count === 0 && (
                      <p className="text-zinc-600">
                        No spacers needed at this clearance.
                      </p>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

// ── Alignment Grid (3x3 selector) ────────────────────────────────────────────

const ALIGNMENT_X: GridAlignment[] = ["start", "center", "end"];
const ALIGNMENT_Y: GridAlignment[] = ["start", "center", "end"];

function AlignmentGrid({
  valueX,
  valueY,
  onChange,
}: {
  valueX: GridAlignment;
  valueY: GridAlignment;
  onChange: (x: GridAlignment, y: GridAlignment) => void;
}): React.JSX.Element {
  function justifyClass(a: GridAlignment): string {
    if (a === "start") return "justify-start";
    if (a === "end") return "justify-end";
    return "justify-center";
  }
  function alignClass(a: GridAlignment): string {
    if (a === "start") return "items-start";
    if (a === "end") return "items-end";
    return "items-center";
  }

  return (
    <div className="inline-grid grid-cols-3 gap-1 rounded border border-zinc-700 bg-zinc-900 p-1">
      {ALIGNMENT_Y.map((y) =>
        ALIGNMENT_X.map((x) => {
          const isActive = x === valueX && y === valueY;
          return (
            <button
              key={`${x}-${y}`}
              type="button"
              onClick={() => {
                onChange(x, y);
              }}
              aria-pressed={isActive}
              aria-label={`Align ${x} ${y}`}
              className={`flex h-7 w-7 rounded p-1 transition-colors ${justifyClass(x)} ${alignClass(y)} ${
                isActive
                  ? "bg-violet-600"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              <span
                className={`block h-1.5 w-1.5 rounded-full ${
                  isActive ? "bg-white" : "bg-zinc-500"
                }`}
              />
            </button>
          );
        })
      )}
    </div>
  );
}
