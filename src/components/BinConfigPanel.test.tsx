import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GridConfigProvider } from "./GridConfigContext";
import { BinConfigProvider } from "./BinConfigContext";
import { BinConfigPanel } from "./BinConfigPanel";
import type { BinConfig } from "../lib/bin-config";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function renderPanel(initialConfig?: Partial<BinConfig>) {
  return render(
    <GridConfigProvider>
      <BinConfigProvider {...(initialConfig ? { initialConfig } : {})}>
        <BinConfigPanel />
      </BinConfigProvider>
    </GridConfigProvider>
  );
}

// ── Basic Render ─────────────────────────────────────────────────────────────

describe("BinConfigPanel — basic render", () => {
  it("renders the heading", () => {
    renderPanel();
    expect(screen.getByText("Bin Configuration")).toBeInTheDocument();
  });

  it("shows inputs for grid units and height", () => {
    renderPanel();
    expect(screen.getByLabelText(/grid units x/i)).toHaveValue(1);
    expect(screen.getByLabelText(/grid units y/i)).toHaveValue(1);
    expect(screen.getByLabelText(/height units/i)).toHaveValue(3);
    expect(screen.getByLabelText(/wall thickness/i)).toHaveValue(1.2);
  });

  it("shows toggles for features", () => {
    renderPanel();
    expect(screen.getByLabelText(/stacking lip/i)).toBeChecked();
    expect(screen.getByLabelText(/magnet holes/i)).not.toBeChecked();
    expect(screen.getByLabelText(/screw holes/i)).not.toBeChecked();
  });

  it("shows calculated exterior dimensions", () => {
    renderPanel();
    expect(screen.getByTestId("ext-width")).toHaveTextContent("41.5");
    expect(screen.getByTestId("ext-length")).toHaveTextContent("41.5");
  });

  it("shows calculated total height", () => {
    renderPanel();
    expect(screen.getByTestId("total-height")).toHaveTextContent("21");
  });

  it("shows no validation errors for default config", () => {
    renderPanel();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ── Interactions ─────────────────────────────────────────────────────────────

describe("BinConfigPanel — interactions", () => {
  it("updates gridUnitsX when input changes", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/grid units x/i), {
      target: { value: "2" },
    });
    expect(screen.getByLabelText(/grid units x/i)).toHaveValue(2);
  });

  it("updates heightUnits when input changes", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/height units/i), {
      target: { value: "5" },
    });
    expect(screen.getByLabelText(/height units/i)).toHaveValue(5);
  });

  it("toggles stacking lip checkbox", () => {
    renderPanel();
    const checkbox = screen.getByLabelText(/stacking lip/i);
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("disables screw holes when magnet holes is off", () => {
    renderPanel({ includeMagnetHoles: false });
    expect(screen.getByLabelText(/screw holes/i)).toBeDisabled();
  });

  it("shows validation error for gridUnitsX of 0", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/grid units x/i), {
      target: { value: "0" },
    });
    expect(
      screen.getByText(/gridUnitsX must be a positive integer/i)
    ).toBeInTheDocument();
  });

  it("updates displayed dimensions when gridUnitsX changes", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/grid units x/i), {
      target: { value: "2" },
    });
    // exteriorWidth = baseUnit * gridUnitsX − BASE_GAP = 2·42 − 0.5 = 83.5
    expect(screen.getByTestId("ext-width")).toHaveTextContent("83.5");
  });
});
