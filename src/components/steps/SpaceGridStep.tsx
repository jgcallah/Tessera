import { SpaceConfigPanel } from "../SpaceConfigPanel";
import { GridConfigPanel } from "../GridConfigPanel";
import { SpacePreviewPanel } from "../SpacePreviewPanel";

export function SpaceGridStep(): React.JSX.Element {
  return (
    <div className="flex h-full gap-4">
      {/* Left sidebar: stacked config panels */}
      <div className="w-[350px] shrink-0 space-y-6 overflow-y-auto">
        <SpaceConfigPanel />
        <GridConfigPanel />
      </div>

      {/* Right: Space & grid visualization */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-950">
        <SpacePreviewPanel />
      </div>
    </div>
  );
}
