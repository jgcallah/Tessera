import { Suspense } from "react";
import { useWizard } from "./WizardContext";
import { StepIndicator } from "./StepIndicator";
import { ProjectPanel } from "./ProjectPanel";
import { ManifoldDemo } from "./ManifoldDemo";
import { SpaceGridStep } from "./steps/SpaceGridStep";
import { PartDesignStep } from "./steps/PartDesignStep";
import { LayoutStep } from "./steps/LayoutStep";
import { PrintExportStep } from "./steps/PrintExportStep";
import { STEP_LABELS } from "../lib/wizard";

export function WizardShell(): React.JSX.Element {
  const { currentStep, goNext, goPrev, canGoNext, canGoPrev } = useWizard();

  return (
    <div className="flex h-screen flex-col bg-zinc-900 text-zinc-100">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold tracking-tight">Tessera</h1>
            <StepIndicator />
          </div>
          <div className="flex items-center gap-4">
            <ProjectPanel />
            <Suspense
              fallback={
                <span className="text-xs text-zinc-500">WASM...</span>
              }
            >
              <ManifoldDemo />
            </Suspense>
          </div>
        </div>
      </header>

      {/* Step Content */}
      <main className="min-h-0 flex-1 p-6">
        {currentStep === "space-grid" && <SpaceGridStep />}
        {currentStep === "part-design" && <PartDesignStep />}
        {currentStep === "layout" && <LayoutStep />}
        {currentStep === "print-export" && <PrintExportStep />}
      </main>

      {/* Footer Navigation */}
      <footer className="shrink-0 border-t border-zinc-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={goPrev}
            className="rounded bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-30"
            data-testid="prev-btn"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-500">
            {STEP_LABELS[currentStep]}
          </span>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={goNext}
            className="rounded bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-30"
            data-testid="next-btn"
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}
