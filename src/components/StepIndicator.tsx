import { useWizard } from "./WizardContext";
import { WIZARD_STEPS, STEP_LABELS } from "../lib/wizard";

export function StepIndicator(): React.JSX.Element {
  const { currentStep, goToStep } = useWizard();

  return (
    <nav aria-label="Wizard steps">
      <ol className="flex gap-1">
        {WIZARD_STEPS.map((step, idx) => {
          const isCurrent = step === currentStep;
          return (
            <li key={step}>
              <button
                type="button"
                onClick={() => {
                  goToStep(step);
                }}
                aria-current={isCurrent ? "step" : undefined}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-violet-700 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                <span className="mr-1.5 font-mono">{idx + 1}</span>
                {STEP_LABELS[step]}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
