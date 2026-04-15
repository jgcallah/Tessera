import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { SpaceConfigProvider } from "../SpaceConfigContext";
import { BaseplateConfigProvider } from "../BaseplateConfigContext";
import { PrinterConfigProvider } from "../PrinterConfigContext";
import { BaseplateLayoutProvider } from "../BaseplateLayoutContext";
import { BaseplateEditorStep } from "./BaseplateEditorStep";

vi.mock("@react-three/fiber", () => import("../../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../../__mocks__/@react-three/drei"));

function renderStep() {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <BaseplateConfigProvider>
          <PrinterConfigProvider>
            <BaseplateLayoutProvider>
              <BaseplateEditorStep />
            </BaseplateLayoutProvider>
          </PrinterConfigProvider>
        </BaseplateConfigProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("BaseplateEditorStep", () => {
  it("renders the heading", () => {
    renderStep();
    expect(
      screen.getByRole("heading", { name: /baseplate layout/i })
    ).toBeInTheDocument();
  });

  it("shows style toggle (standard/skeleton)", () => {
    renderStep();
    expect(
      screen.getByRole("button", { name: /standard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /skeleton/i })
    ).toBeInTheDocument();
  });

  it("shows feature checkboxes", () => {
    renderStep();
    expect(screen.getByLabelText(/magnet holes/i)).toBeChecked();
    expect(screen.getByLabelText(/snap-in connectors/i)).not.toBeChecked();
  });

  it("can switch to skeleton style", () => {
    renderStep();
    fireEvent.click(screen.getByRole("button", { name: /skeleton/i }));
    expect(
      screen.getByRole("button", { name: /skeleton/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("auto-fills the grid with baseplates", () => {
    renderStep();
    fireEvent.click(screen.getByTestId("auto-fill-btn"));
    // Default grid is 400/42 × 300/42 ≈ 9×7 units; auto-fill should place ≥ 1 plate
    const count = screen.getByTestId("bp-count").textContent ?? "";
    expect(parseInt(count, 10)).toBeGreaterThan(0);
  });

  it("clears the layout", () => {
    renderStep();
    fireEvent.click(screen.getByTestId("auto-fill-btn"));
    fireEvent.click(screen.getByTestId("clear-btn"));
    expect(screen.getByTestId("bp-count")).toHaveTextContent("0 baseplates");
  });

  it("Match Printer sets max auto sizes and spacer length from bed ÷ baseUnit", () => {
    renderStep();
    // Default bed is 220×220, baseUnit is 42 → floor(220/42) = 5 for both,
    // and spacer length = max(5, 5) = 5
    const btn = screen.getByTestId("match-printer-btn");
    expect(btn).toHaveTextContent(/5×5/);
    expect(btn).toHaveTextContent(/spacer 5/i);
    fireEvent.click(btn);
    expect(screen.getByLabelText(/max size x/i)).toHaveValue(5);
    expect(screen.getByLabelText(/max size y/i)).toHaveValue(5);
  });

  it("Match Printer is disabled once max sizes match the printer", () => {
    renderStep();
    const btn = screen.getByTestId("match-printer-btn");
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
  });
});
