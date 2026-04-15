import { useState, useEffect } from "react";
import { useWizard } from "./WizardContext";
import { useProject } from "./ProjectContext";
import { StepIndicator } from "./StepIndicator";
import { ProjectPanel } from "./ProjectPanel";
import { PrinterStep } from "./steps/PrinterStep";
import { SpaceGridStep } from "./steps/SpaceGridStep";
import { LayoutStep } from "./steps/LayoutStep";
import { BinEditorStep } from "./steps/BinEditorStep";
import { BaseplateEditorStep } from "./steps/BaseplateEditorStep";
import { PrintExportStep } from "./steps/PrintExportStep";
import { STEP_LABELS, WIZARD_STEPS } from "../lib/wizard";

interface WizardShellProps {
  onBackToStart?: () => void;
}

export function WizardShell({
  onBackToStart,
}: WizardShellProps): React.JSX.Element {
  const { currentStep, currentIndex, goNext, goPrev, canGoNext, canGoPrev } = useWizard();
  const { projectName, renameProject } = useProject();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(projectName);

  // Keyboard shortcuts for step navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (editingName) return; // don't navigate while editing name
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight" && canGoNext) {
        e.preventDefault();
        goNext();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "ArrowLeft" && canGoPrev) {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingName, canGoNext, canGoPrev, goNext, goPrev]);

  return (
    <div className="flex h-screen flex-col bg-zinc-900 text-zinc-100">
      {/* Header */}
      <header className="shrink-0 border-b border-zinc-700 px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            {onBackToStart ? (
              <button
                type="button"
                onClick={onBackToStart}
                className="text-xl font-bold tracking-tight hover:text-violet-400"
                data-testid="back-to-start"
              >
                Tessera
              </button>
            ) : (
              <h1 className="text-xl font-bold tracking-tight">Tessera</h1>
            )}
            {editingName ? (
              <input
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                }}
                onBlur={() => {
                  if (nameInput.trim()) {
                    renameProject(nameInput.trim());
                  } else {
                    setNameInput(projectName);
                  }
                  setEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    setNameInput(projectName);
                    setEditingName(false);
                  }
                }}
                autoFocus
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
                data-testid="project-name-input"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameInput(projectName);
                  setEditingName(true);
                }}
                className="rounded px-2 py-0.5 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                data-testid="project-name"
                title="Click to rename"
              >
                {projectName}
              </button>
            )}
            <StepIndicator />
          </div>
          <ProjectPanel />
        </div>
      </header>

      {/* Step Content */}
      <main className="min-h-0 w-full flex-1 p-6">
        {currentStep === "printer" && <PrinterStep />}
        {currentStep === "space-grid" && <SpaceGridStep />}
        {currentStep === "layout" && <LayoutStep />}
        {currentStep === "bin-editor" && <BinEditorStep />}
        {currentStep === "baseplate-editor" && <BaseplateEditorStep />}
        {currentStep === "print-export" && <PrintExportStep />}
      </main>

      {/* Footer Navigation */}
      <footer className="shrink-0 border-t border-zinc-700 px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={goPrev}
            className="rounded bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-30"
            data-testid="prev-btn"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-500">
            Step {currentIndex + 1} of {WIZARD_STEPS.length} — {STEP_LABELS[currentStep]}
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
