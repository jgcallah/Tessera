export type WizardStep = "space-grid" | "part-design" | "layout" | "print-export";

export const WIZARD_STEPS: readonly WizardStep[] = [
  "space-grid",
  "part-design",
  "layout",
  "print-export",
];

export const STEP_LABELS: Record<WizardStep, string> = {
  "space-grid": "Space & Grid",
  "part-design": "Part Design",
  "layout": "Layout",
  "print-export": "Print & Export",
};

export function getStepIndex(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step);
}

export function canGoNext(step: WizardStep): boolean {
  return getStepIndex(step) < WIZARD_STEPS.length - 1;
}

export function canGoPrev(step: WizardStep): boolean {
  return getStepIndex(step) > 0;
}

export function getNextStep(step: WizardStep): WizardStep | undefined {
  const idx = getStepIndex(step);
  return WIZARD_STEPS[idx + 1];
}

export function getPrevStep(step: WizardStep): WizardStep | undefined {
  const idx = getStepIndex(step);
  return idx > 0 ? WIZARD_STEPS[idx - 1] : undefined;
}
