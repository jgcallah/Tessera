import { PrintPlanPanel } from "../PrintPlanPanel";
import { ExportPanel } from "../ExportPanel";

export function PrintExportStep(): React.JSX.Element {
  return (
    <div className="mx-auto flex h-full max-w-5xl gap-8">
      <div className="flex-1">
        <PrintPlanPanel />
      </div>
      <div className="w-80">
        <ExportPanel />
      </div>
    </div>
  );
}
