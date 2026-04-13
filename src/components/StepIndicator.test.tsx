import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardProvider } from "./WizardContext";
import { StepIndicator } from "./StepIndicator";

function renderIndicator() {
  return render(
    <WizardProvider>
      <StepIndicator />
    </WizardProvider>
  );
}

describe("StepIndicator", () => {
  it("renders 5 step buttons", () => {
    renderIndicator();
    expect(screen.getByText(/space & grid/i)).toBeInTheDocument();
    expect(screen.getByText(/^layout$/i)).toBeInTheDocument();
    expect(screen.getByText(/bin editor/i)).toBeInTheDocument();
    expect(screen.getByText(/baseplates/i)).toBeInTheDocument();
    expect(screen.getByText(/print & export/i)).toBeInTheDocument();
  });

  it("marks first step as current", () => {
    renderIndicator();
    const btn = screen.getByText(/space & grid/i).closest("button")!;
    expect(btn).toHaveAttribute("aria-current", "step");
  });

  it("clicking a step navigates to it", () => {
    renderIndicator();
    fireEvent.click(screen.getByText(/bin editor/i));
    const btn = screen.getByText(/bin editor/i).closest("button")!;
    expect(btn).toHaveAttribute("aria-current", "step");
  });

  it("shows step numbers", () => {
    renderIndicator();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
