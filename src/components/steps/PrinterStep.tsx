import { usePrinterConfig } from "../PrinterConfigContext";
import type { PrintBedConfig } from "../../lib/print-planner";

// Common FDM build-plate sizes in mm (square). Non-square beds use the
// manual width/length inputs below the grid.
const PLATE_PRESETS = [180, 200, 220, 235, 250, 256, 300, 350, 400] as const;

export function PrinterStep(): React.JSX.Element {
  const { printerConfig, validation, updatePrinterConfig } = usePrinterConfig();

  function handleField(key: keyof PrintBedConfig, value: string) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      updatePrinterConfig({ [key]: num });
    }
  }

  function applyPreset(size: number) {
    updatePrinterConfig({ bedWidth: size, bedLength: size });
  }

  return (
    <div className="flex h-full gap-4">
      <div className="flex w-[350px] shrink-0 flex-col gap-4 overflow-y-auto">
        <div>
          <h2 className="text-lg font-semibold">Printer</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Set your build plate size and the spacing you want between parts
            when they're packed onto a sheet. Downstream steps use these to
            size baseplates and pack the print plan.
          </p>
        </div>

        {/* Build plate */}
        <div className="space-y-3 rounded border border-zinc-700 bg-zinc-900 p-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Build Plate
          </h3>
          <div className="grid grid-cols-3 gap-1.5" data-testid="plate-presets">
            {PLATE_PRESETS.map((size) => {
              const active =
                printerConfig.bedWidth === size &&
                printerConfig.bedLength === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    applyPreset(size);
                  }}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    active
                      ? "bg-violet-700 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {size}×{size}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label
                htmlFor="printer-width"
                className="mb-1 block text-xs text-zinc-400"
              >
                Width <span className="text-zinc-600">(mm)</span>
              </label>
              <input
                id="printer-width"
                type="number"
                step={10}
                value={printerConfig.bedWidth}
                onChange={(e) => {
                  handleField("bedWidth", e.target.value);
                }}
                className="w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="printer-length"
                className="mb-1 block text-xs text-zinc-400"
              >
                Length <span className="text-zinc-600">(mm)</span>
              </label>
              <input
                id="printer-length"
                type="number"
                step={10}
                value={printerConfig.bedLength}
                onChange={(e) => {
                  handleField("bedLength", e.target.value);
                }}
                className="w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* Spacing */}
        <div className="space-y-3 rounded border border-zinc-700 bg-zinc-900 p-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Part Spacing
          </h3>
          <div>
            <label
              htmlFor="printer-spacing"
              className="mb-1 block text-xs text-zinc-400"
            >
              Gap between parts <span className="text-zinc-600">(mm)</span>
            </label>
            <input
              id="printer-spacing"
              type="number"
              step={1}
              min={0}
              value={printerConfig.partSpacing}
              onChange={(e) => {
                handleField("partSpacing", e.target.value);
              }}
              className="w-24 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
            />
            <p className="mt-1 text-xs text-zinc-600">
              5 mm is a safe default — enough for brim clearance and easy
              part removal.
            </p>
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

      {/* Right: printer summary */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-auto rounded-lg border border-zinc-700/50 bg-zinc-950 p-6">
        <div className="max-w-md space-y-4 text-center">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Build Plate
            </p>
            <p
              className="mt-1 font-mono text-2xl text-zinc-100"
              data-testid="printer-summary-size"
            >
              {printerConfig.bedWidth} × {printerConfig.bedLength} mm
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Part Spacing
            </p>
            <p
              className="mt-1 font-mono text-xl text-zinc-300"
              data-testid="printer-summary-spacing"
            >
              {printerConfig.partSpacing} mm
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
