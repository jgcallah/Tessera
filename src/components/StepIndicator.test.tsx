import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardProvider } from "./WizardContext";
import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";

vi.mock("./ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
import { LayoutProvider } from "./LayoutContext";
import { StepIndicator } from "./StepIndicator";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function renderIndicator() {
  return render(
    <WizardProvider>
      <GridConfigProvider>
        <SpaceConfigProvider>
          <LayoutProvider>
            <StepIndicator />
          </LayoutProvider>
        </SpaceConfigProvider>
      </GridConfigProvider>
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

  it("shows step numbers in circles", () => {
    renderIndicator();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows connector lines between steps", () => {
    renderIndicator();
    // 5 steps = 4 connectors (rendered as divs)
    const nav = screen.getByRole("navigation");
    const connectors = nav.querySelectorAll("div");
    expect(connectors.length).toBeGreaterThanOrEqual(4);
  });
});
