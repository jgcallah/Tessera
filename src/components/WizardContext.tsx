import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { WizardStep } from "../lib/wizard";
import { canGoNext, canGoPrev, getNextStep, getPrevStep, getStepIndex, WIZARD_STEPS } from "../lib/wizard";

interface WizardContextValue {
  currentStep: WizardStep;
  currentIndex: number;
  totalSteps: number;
  goNext: () => void;
  goPrev: () => void;
  goToStep: (step: WizardStep) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

const WizardContext = createContext<WizardContextValue | null>(null);

interface WizardProviderProps {
  children: ReactNode;
  initialStep?: WizardStep;
}

export function WizardProvider({
  children,
  initialStep = "printer",
}: WizardProviderProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep);

  const goNext = useCallback(() => {
    const next = getNextStep(currentStep);
    if (next) setCurrentStep(next);
  }, [currentStep]);

  const goPrev = useCallback(() => {
    const prev = getPrevStep(currentStep);
    if (prev) setCurrentStep(prev);
  }, [currentStep]);

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const value = useMemo(
    () => ({
      currentStep,
      currentIndex: getStepIndex(currentStep),
      totalSteps: WIZARD_STEPS.length,
      goNext,
      goPrev,
      goToStep,
      canGoNext: canGoNext(currentStep),
      canGoPrev: canGoPrev(currentStep),
    }),
    [currentStep, goNext, goPrev, goToStep]
  );

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
