import { useWizard } from "./WizardContext";
import { useLayout } from "./LayoutContext";
import { useSpaceConfig } from "./SpaceConfigContext";
import { WIZARD_STEPS, STEP_LABELS, getStepIndex } from "../lib/wizard";
import type { WizardStep } from "../lib/wizard";

export function StepIndicator(): React.JSX.Element {
  const { currentStep, goToStep, currentIndex } = useWizard();
  const { layout } = useLayout();
  const { spaceConfig } = useSpaceConfig();

  function getStepStatus(step: WizardStep): "complete" | "current" | "upcoming" {
    const stepIdx = getStepIndex(step);
    if (step === currentStep) return "current";
    if (stepIdx < currentIndex) return "complete";
    return "upcoming";
  }

  function isStepValid(step: WizardStep): boolean {
    switch (step) {
      case "space-grid":
        return spaceConfig.width > 0 && spaceConfig.length > 0;
      case "layout":
        return layout.items.length > 0;
      default:
        return true;
    }
  }

  return (
    <nav aria-label="Wizard steps">
      <ol className="flex items-center gap-0.5">
        {WIZARD_STEPS.map((step, idx) => {
          const status = getStepStatus(step);
          const valid = isStepValid(step);
          const isLast = idx === WIZARD_STEPS.length - 1;

          return (
            <li key={step} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  goToStep(step);
                }}
                aria-current={status === "current" ? "step" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  status === "current"
                    ? "bg-violet-700 text-white shadow-sm shadow-violet-900/50"
                    : status === "complete"
                      ? "text-zinc-300 hover:bg-zinc-800"
                      : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400"
                }`}
              >
                {/* Step number or checkmark */}
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    status === "complete" && valid
                      ? "bg-green-700 text-green-100"
                      : status === "complete" && !valid
                        ? "bg-amber-700 text-amber-100"
                        : status === "current"
                          ? "bg-white/20 text-white"
                          : "bg-zinc-700 text-zinc-400"
                  }`}
                >
                  {status === "complete" && valid ? "✓" : idx + 1}
                </span>
                <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
              </button>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`mx-0.5 h-px w-4 ${
                    status === "complete"
                      ? "bg-zinc-500"
                      : "bg-zinc-700"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
