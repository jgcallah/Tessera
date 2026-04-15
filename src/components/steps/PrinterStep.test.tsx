import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { PrinterConfigProvider } from "../PrinterConfigContext";
import { PrinterStep } from "./PrinterStep";

vi.mock("@react-three/fiber", () => import("../../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../../__mocks__/@react-three/drei"));

function renderStep() {
  return render(
    <GridConfigProvider>
      <PrinterConfigProvider>
        <PrinterStep />
      </PrinterConfigProvider>
    </GridConfigProvider>
  );
}

describe("PrinterStep", () => {
  it("renders the Printer heading", () => {
    renderStep();
    expect(screen.getByRole("heading", { name: /^printer$/i })).toBeInTheDocument();
  });

  it("shows dimension-only plate presets (no printer brand names)", () => {
    renderStep();
    const presets = screen.getByTestId("plate-presets");
    expect(presets).toHaveTextContent("220×220");
    expect(presets).toHaveTextContent("256×256");
    expect(presets).toHaveTextContent("350×350");
    expect(presets).not.toHaveTextContent(/ender|bambu|prusa|voron/i);
  });

  it("shows width, length, and part-spacing inputs with defaults", () => {
    renderStep();
    expect(screen.getByLabelText(/^width/i)).toHaveValue(220);
    expect(screen.getByLabelText(/^length/i)).toHaveValue(220);
    expect(screen.getByLabelText(/gap between parts/i)).toHaveValue(5);
  });

  it("updates the summary when a preset is clicked", () => {
    renderStep();
    fireEvent.click(screen.getByRole("button", { name: "256×256" }));
    expect(screen.getByTestId("printer-summary-size")).toHaveTextContent(
      /256 × 256 mm/
    );
  });

  it("changing spacing updates the summary", () => {
    renderStep();
    fireEvent.change(screen.getByLabelText(/gap between parts/i), {
      target: { value: "10" },
    });
    expect(screen.getByTestId("printer-summary-spacing")).toHaveTextContent(
      /10 mm/
    );
  });
});
