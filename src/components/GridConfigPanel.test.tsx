import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GridConfigProvider } from "./GridConfigContext";
import { GridConfigPanel } from "./GridConfigPanel";
import type { GridConfig } from "../lib/grid-config";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function renderPanel(initialConfig?: Partial<GridConfig>) {
  return render(
    <GridConfigProvider {...(initialConfig ? { initialConfig } : {})}>
      <GridConfigPanel />
    </GridConfigProvider>
  );
}

// ── Cycle 3.1: Basic Render ──────────────────────────────────────────────────

describe("GridConfigPanel — basic render", () => {
  it("renders the heading", () => {
    renderPanel();
    expect(screen.getByText("Grid Configuration")).toBeInTheDocument();
  });

  it("shows mode toggle with gridfinity and custom options", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /gridfinity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /custom/i })).toBeInTheDocument();
  });

  it("shows gridfinity as active mode by default", () => {
    renderPanel();
    const btn = screen.getByRole("button", { name: /gridfinity/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("shows all parameter values", () => {
    renderPanel();
    expect(screen.getByLabelText(/base unit/i)).toHaveValue(42);
    expect(screen.getByLabelText(/height unit/i)).toHaveValue(7);
    expect(screen.getByLabelText(/tolerance/i)).toHaveValue(0.5);
    expect(screen.getByLabelText(/magnet diameter/i)).toHaveValue(6);
    expect(screen.getByLabelText(/magnet thickness/i)).toHaveValue(2);
    expect(screen.getByLabelText(/screw diameter/i)).toHaveValue(3);
  });

  it("disables locked fields in gridfinity mode", () => {
    renderPanel();
    expect(screen.getByLabelText(/base unit/i)).toBeDisabled();
    expect(screen.getByLabelText(/height unit/i)).toBeDisabled();
    expect(screen.getByLabelText(/magnet diameter/i)).toBeDisabled();
    expect(screen.getByLabelText(/magnet thickness/i)).toBeDisabled();
    expect(screen.getByLabelText(/screw diameter/i)).toBeDisabled();
  });

  it("keeps tolerance editable in gridfinity mode", () => {
    renderPanel();
    expect(screen.getByLabelText(/tolerance/i)).not.toBeDisabled();
  });

  it("shows derived cell size", () => {
    renderPanel();
    expect(screen.getByText(/cell size/i)).toBeInTheDocument();
    expect(screen.getByTestId("cell-size-value")).toHaveTextContent("41.5");
  });
});

// ── Cycle 3.2: Custom Mode Interaction ───────────────────────────────────────

describe("GridConfigPanel — custom mode", () => {
  it("enables all inputs when switching to custom", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /custom/i }));
    expect(screen.getByLabelText(/base unit/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/height unit/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/magnet diameter/i)).not.toBeDisabled();
  });

  it("updates baseUnit when input changes in custom mode", () => {
    renderPanel({ mode: "custom" });
    const input = screen.getByLabelText(/base unit/i);
    fireEvent.change(input, { target: { value: "50" } });
    expect(input).toHaveValue(50);
  });

  it("updates heightUnit when input changes in custom mode", () => {
    renderPanel({ mode: "custom" });
    const input = screen.getByLabelText(/height unit/i);
    fireEvent.change(input, { target: { value: "10" } });
    expect(input).toHaveValue(10);
  });

  it("updates derived cell size after baseUnit change", () => {
    renderPanel({ mode: "custom" });
    const input = screen.getByLabelText(/base unit/i);
    fireEvent.change(input, { target: { value: "50" } });
    // cellSize = 50 - 0.5 = 49.5
    expect(screen.getByTestId("cell-size-value")).toHaveTextContent("49.5");
  });
});

// ── Cycle 3.3: Validation Feedback ───────────────────────────────────────────

describe("GridConfigPanel — validation", () => {
  it("shows error for baseUnit of 0", () => {
    renderPanel({ mode: "custom" });
    fireEvent.change(screen.getByLabelText(/base unit/i), {
      target: { value: "0" },
    });
    expect(screen.getByText(/baseUnit must be greater than 0/i)).toBeInTheDocument();
  });

  it("shows error for tolerance >= baseUnit", () => {
    renderPanel({ mode: "custom", baseUnit: 10 });
    fireEvent.change(screen.getByLabelText(/tolerance/i), {
      target: { value: "10" },
    });
    expect(screen.getByText(/tolerance must be less than baseUnit/i)).toBeInTheDocument();
  });

  it("shows no errors for valid config", () => {
    renderPanel();
    const errors = screen.queryByRole("alert");
    expect(errors).not.toBeInTheDocument();
  });
});

// ── Cycle 3.4: Mode Switch UI ────────────────────────────────────────────────

describe("GridConfigPanel — mode switching", () => {
  it("marks custom as active after clicking it", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /custom/i }));
    expect(
      screen.getByRole("button", { name: /custom/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /gridfinity/i })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("resets values when switching back to gridfinity", () => {
    renderPanel({ mode: "custom", baseUnit: 50 });
    expect(screen.getByLabelText(/base unit/i)).toHaveValue(50);
    fireEvent.click(screen.getByRole("button", { name: /gridfinity/i }));
    expect(screen.getByLabelText(/base unit/i)).toHaveValue(42);
  });

  it("clicking gridfinity when already active is a no-op", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /gridfinity/i }));
    expect(screen.getByLabelText(/base unit/i)).toHaveValue(42);
    expect(
      screen.getByRole("button", { name: /gridfinity/i })
    ).toHaveAttribute("aria-pressed", "true");
  });
});
