import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WizardProvider } from "./WizardContext";
import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";
import { BinConfigProvider } from "./BinConfigContext";
import { BaseplateConfigProvider } from "./BaseplateConfigContext";
import { PrinterConfigProvider } from "./PrinterConfigContext";
import { LayoutProvider } from "./LayoutContext";
import { BaseplateLayoutProvider } from "./BaseplateLayoutContext";
import { PreviewProvider } from "./PreviewContext";
import { ProjectProvider } from "./ProjectContext";
import { WizardShell } from "./WizardShell";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));
vi.mock("./BinPreview", () => ({ BinPreview: () => null }));
vi.mock("./BaseplatePreview", () => ({ BaseplatePreview: () => null }));
vi.mock("./ManifoldDemo", () => ({
  ManifoldDemo: () => <span>WASM mock</span>,
}));
vi.mock("./ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function renderShell() {
  return render(
    <WizardProvider>
      <GridConfigProvider>
        <SpaceConfigProvider>
          <BinConfigProvider>
            <BaseplateConfigProvider>
              <PrinterConfigProvider>
                <LayoutProvider>
                  <BaseplateLayoutProvider>
                    <PreviewProvider>
                      <ProjectProvider projectName="Test Project">
                        <WizardShell />
                      </ProjectProvider>
                    </PreviewProvider>
                  </BaseplateLayoutProvider>
                </LayoutProvider>
              </PrinterConfigProvider>
            </BaseplateConfigProvider>
          </BinConfigProvider>
        </SpaceConfigProvider>
      </GridConfigProvider>
    </WizardProvider>
  );
}

describe("WizardShell", () => {
  it("renders the app title", () => {
    renderShell();
    expect(screen.getByText("Tessera")).toBeInTheDocument();
  });

  it("shows step 1 (Printer) content by default", () => {
    renderShell();
    expect(screen.getByRole("heading", { name: /^printer$/i })).toBeInTheDocument();
  });

  it("does not show step 2 content by default", () => {
    renderShell();
    expect(screen.queryByText("Layout Planner")).not.toBeInTheDocument();
    expect(screen.queryByText("Space Definition")).not.toBeInTheDocument();
  });

  it("Previous is disabled on step 1", () => {
    renderShell();
    expect(screen.getByTestId("prev-btn")).toBeDisabled();
  });

  it("Next is enabled on step 1", () => {
    renderShell();
    expect(screen.getByTestId("next-btn")).not.toBeDisabled();
  });

  it("clicking Next goes to step 2 (Space & Grid)", () => {
    renderShell();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText("Space Definition")).toBeInTheDocument();
  });

  it("can navigate all the way through", () => {
    renderShell();
    // Step 1 (Printer) → 2 (Space & Grid)
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText("Space Definition")).toBeInTheDocument();
    // Step 2 → 3 (Layout)
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText("Layout Planner")).toBeInTheDocument();
    // Step 3 → 4 (Bin Editor)
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByRole("heading", { name: /bin editor/i })).toBeInTheDocument();
    // Step 4 → 5 (Baseplate Layout)
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByRole("heading", { name: /baseplate layout/i })).toBeInTheDocument();
    // Step 5 → 6 (Print & Export)
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText("Print Options")).toBeInTheDocument();
    // Next disabled on last step
    expect(screen.getByTestId("next-btn")).toBeDisabled();
  });

  it("Previous goes back", () => {
    renderShell();
    fireEvent.click(screen.getByTestId("next-btn")); // → step 2 (Space)
    fireEvent.click(screen.getByTestId("prev-btn")); // → step 1 (Printer)
    expect(screen.getByRole("heading", { name: /^printer$/i })).toBeInTheDocument();
  });

  it("shows save/load buttons", () => {
    renderShell();
    expect(screen.getByTestId("save-project")).toBeInTheDocument();
    expect(screen.getByTestId("load-project")).toBeInTheDocument();
  });
});
