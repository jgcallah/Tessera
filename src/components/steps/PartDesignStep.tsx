import { Suspense } from "react";
import { BinConfigPanel } from "../BinConfigPanel";
import { BaseplateConfigPanel } from "../BaseplateConfigPanel";
import { PreviewCanvas } from "../PreviewCanvas";
import { PreviewModeToggle } from "../PreviewModeToggle";

export function PartDesignStep(): React.JSX.Element {
  return (
    <div className="flex h-full gap-6">
      <div className="w-80 space-y-4 overflow-y-auto">
        <BinConfigPanel />
        <div className="border-t border-zinc-700 pt-3">
          <BaseplateConfigPanel />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="mb-2 flex justify-end">
          <PreviewModeToggle />
        </div>
        <div className="min-h-0 flex-1">
          <Suspense fallback={null}>
            <PreviewCanvas />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
