import { useMemo } from "react";
import { PrintOptionsPanel } from "../PrintOptionsPanel";
import { PrintSheetsView } from "../PrintSheetsView";
import { usePackableItems } from "../usePackableItems";
import { usePrinterConfig } from "../PrinterConfigContext";
import { packParts } from "../../lib/print-planner";

export function PrintExportStep(): React.JSX.Element {
  const { printerConfig, validation } = usePrinterConfig();
  const inventory = usePackableItems();
  const packingResult = useMemo(
    () =>
      validation.valid ? packParts(inventory.packableItems, printerConfig) : null,
    [inventory.packableItems, printerConfig, validation.valid]
  );

  const hasItems = inventory.packableItems.length > 0;

  return (
    <div className="flex h-full gap-4">
      <div className="flex w-[350px] shrink-0 flex-col gap-4 overflow-y-auto">
        <PrintOptionsPanel
          printerConfig={printerConfig}
          validation={validation}
          packingResult={packingResult}
          inventory={inventory}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto rounded-lg border border-zinc-700/50 bg-zinc-950 p-4">
        <PrintSheetsView
          bedConfig={printerConfig}
          packingResult={packingResult}
          hasItems={hasItems}
        />
      </div>
    </div>
  );
}
