import { SpaceConfigPanel } from "../SpaceConfigPanel";
import { GridConfigPanel } from "../GridConfigPanel";

export function SpaceGridStep(): React.JSX.Element {
  return (
    <div className="mx-auto flex h-full max-w-4xl gap-8">
      <div className="flex-1">
        <SpaceConfigPanel />
      </div>
      <div className="flex-1">
        <GridConfigPanel />
      </div>
    </div>
  );
}
