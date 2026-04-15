import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { WizardProvider, useWizard } from "./WizardContext";

function StepReader() {
  const { currentStep, currentIndex, totalSteps, canGoNext, canGoPrev } =
    useWizard();
  return (
    <div>
      <span data-testid="step">{currentStep}</span>
      <span data-testid="index">{currentIndex}</span>
      <span data-testid="total">{totalSteps}</span>
      <span data-testid="canNext">{String(canGoNext)}</span>
      <span data-testid="canPrev">{String(canGoPrev)}</span>
    </div>
  );
}

function StepNav() {
  const { currentStep, goNext, goPrev, goToStep } = useWizard();
  return (
    <div>
      <span data-testid="step">{currentStep}</span>
      <button data-testid="next" onClick={goNext} />
      <button data-testid="prev" onClick={goPrev} />
      <button
        data-testid="goto-layout"
        onClick={() => {
          goToStep("layout");
        }}
      />
    </div>
  );
}

describe("WizardProvider", () => {
  it("renders children", () => {
    render(
      <WizardProvider>
        <span>child</span>
      </WizardProvider>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("defaults to printer step", () => {
    render(
      <WizardProvider>
        <StepReader />
      </WizardProvider>
    );
    expect(screen.getByTestId("step")).toHaveTextContent("printer");
    expect(screen.getByTestId("index")).toHaveTextContent("0");
    expect(screen.getByTestId("total")).toHaveTextContent("6");
  });

  it("accepts initial step", () => {
    render(
      <WizardProvider initialStep="layout">
        <StepReader />
      </WizardProvider>
    );
    expect(screen.getByTestId("step")).toHaveTextContent("layout");
  });

  it("canGoNext is true on first step", () => {
    render(
      <WizardProvider>
        <StepReader />
      </WizardProvider>
    );
    expect(screen.getByTestId("canNext")).toHaveTextContent("true");
    expect(screen.getByTestId("canPrev")).toHaveTextContent("false");
  });
});

describe("useWizard", () => {
  it("throws outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<StepReader />);
    }).toThrow("useWizard must be used within a WizardProvider");
    spy.mockRestore();
  });
});

describe("wizard navigation", () => {
  it("goNext advances to next step", () => {
    render(
      <WizardProvider>
        <StepNav />
      </WizardProvider>
    );
    act(() => {
      screen.getByTestId("next").click();
    });
    expect(screen.getByTestId("step")).toHaveTextContent("space-grid");
  });

  it("goPrev goes to previous step", () => {
    render(
      <WizardProvider initialStep="layout">
        <StepNav />
      </WizardProvider>
    );
    act(() => {
      screen.getByTestId("prev").click();
    });
    expect(screen.getByTestId("step")).toHaveTextContent("space-grid");
  });

  it("goNext on last step is a no-op", () => {
    render(
      <WizardProvider initialStep="print-export">
        <StepNav />
      </WizardProvider>
    );
    act(() => {
      screen.getByTestId("next").click();
    });
    expect(screen.getByTestId("step")).toHaveTextContent("print-export");
  });

  it("goPrev on first step is a no-op", () => {
    render(
      <WizardProvider>
        <StepNav />
      </WizardProvider>
    );
    act(() => {
      screen.getByTestId("prev").click();
    });
    expect(screen.getByTestId("step")).toHaveTextContent("printer");
  });

  it("goToStep jumps to specific step", () => {
    render(
      <WizardProvider>
        <StepNav />
      </WizardProvider>
    );
    act(() => {
      screen.getByTestId("goto-layout").click();
    });
    expect(screen.getByTestId("step")).toHaveTextContent("layout");
  });
});
