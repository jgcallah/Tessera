import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GridConfigProvider } from "./GridConfigContext";
import { BaseplateConfigProvider } from "./BaseplateConfigContext";
import { BaseplateConfigPanel } from "./BaseplateConfigPanel";
import type { BaseplateConfig } from "../lib/baseplate-config";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function renderPanel(initialConfig?: Partial<BaseplateConfig>) {
  return render(
    <GridConfigProvider>
      <BaseplateConfigProvider {...(initialConfig ? { initialConfig } : {})}>
        <BaseplateConfigPanel />
      </BaseplateConfigProvider>
    </GridConfigProvider>
  );
}

describe("BaseplateConfigPanel — basic render", () => {
  it("renders the heading", () => {
    renderPanel();
    expect(screen.getByText("Baseplate Configuration")).toBeInTheDocument();
  });

  it("shows grid unit inputs", () => {
    renderPanel();
    expect(screen.getByLabelText(/grid units x/i)).toHaveValue(1);
    expect(screen.getByLabelText(/grid units y/i)).toHaveValue(1);
  });

  it("shows feature toggles", () => {
    renderPanel();
    expect(screen.getByLabelText(/magnet holes/i)).not.toBeChecked();
    expect(screen.getByLabelText(/screw holes/i)).not.toBeChecked();
  });

  it("shows computed dimensions", () => {
    renderPanel();
    expect(screen.getByTestId("bp-width")).toHaveTextContent("42");
    expect(screen.getByTestId("bp-height")).toHaveTextContent("4.25");
  });

  it("shows no validation errors for default config", () => {
    renderPanel();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("BaseplateConfigPanel — interactions", () => {
  it("updates gridUnitsX when input changes", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText(/grid units x/i), {
      target: { value: "5" },
    });
    expect(screen.getByLabelText(/grid units x/i)).toHaveValue(5);
    expect(screen.getByTestId("bp-width")).toHaveTextContent("210");
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
});
