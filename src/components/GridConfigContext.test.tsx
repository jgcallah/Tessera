import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { GridConfigProvider, useGridConfig } from "./GridConfigContext";

// Helper component to read context values in tests
function ConfigReader() {
  const { config, derivedValues } = useGridConfig();
  return (
    <div>
      <span data-testid="mode">{config.mode}</span>
      <span data-testid="baseUnit">{config.baseUnit}</span>
      <span data-testid="magnetHoleDepth">{derivedValues.magnetHoleDepth}</span>
    </div>
  );
}

// Helper component to test state updates
function ConfigUpdater() {
  const { config, updateConfig, resetConfig } = useGridConfig();
  return (
    <div>
      <span data-testid="mode">{config.mode}</span>
      <span data-testid="baseUnit">{config.baseUnit}</span>
      <span data-testid="heightUnit">{config.heightUnit}</span>
      <button
        data-testid="set-custom-50"
        onClick={() => {
          updateConfig({ mode: "custom", baseUnit: 50 });
        }}
      />
      <button
        data-testid="set-gridfinity"
        onClick={() => {
          updateConfig({ mode: "gridfinity" });
        }}
      />
      <button
        data-testid="reset"
        onClick={() => {
          resetConfig();
        }}
      />
    </div>
  );
}

// ── Cycle 2.1: Provider & Default State ──────────────────────────────────────

describe("GridConfigProvider", () => {
  it("renders children", () => {
    render(
      <GridConfigProvider>
        <span>child</span>
      </GridConfigProvider>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("provides default gridfinity config", () => {
    render(
      <GridConfigProvider>
        <ConfigReader />
      </GridConfigProvider>
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("gridfinity");
    expect(screen.getByTestId("baseUnit")).toHaveTextContent("42");
  });

  it("provides derived values", () => {
    render(
      <GridConfigProvider>
        <ConfigReader />
      </GridConfigProvider>
    );
    expect(screen.getByTestId("magnetHoleDepth")).toHaveTextContent("2.4");
  });

  it("accepts an initialConfig prop", () => {
    render(
      <GridConfigProvider initialConfig={{ mode: "custom", baseUnit: 50 }}>
        <ConfigReader />
      </GridConfigProvider>
    );
    expect(screen.getByTestId("baseUnit")).toHaveTextContent("50");
  });
});

describe("useGridConfig", () => {
  it("throws when used outside provider", () => {
    // Suppress React error boundary console output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<ConfigReader />);
    }).toThrow("useGridConfig must be used within a GridConfigProvider");
    spy.mockRestore();
  });
});

// ── Cycle 2.2: State Updates ─────────────────────────────────────────────────

describe("state updates", () => {
  it("updates config in custom mode", () => {
    render(
      <GridConfigProvider>
        <ConfigUpdater />
      </GridConfigProvider>
    );
    act(() => {
      screen.getByTestId("set-custom-50").click();
    });
    expect(screen.getByTestId("baseUnit")).toHaveTextContent("50");
    expect(screen.getByTestId("mode")).toHaveTextContent("custom");
  });

  it("resets config to defaults", () => {
    render(
      <GridConfigProvider>
        <ConfigUpdater />
      </GridConfigProvider>
    );
    act(() => {
      screen.getByTestId("set-custom-50").click();
    });
    expect(screen.getByTestId("baseUnit")).toHaveTextContent("50");
    act(() => {
      screen.getByTestId("reset").click();
    });
    expect(screen.getByTestId("baseUnit")).toHaveTextContent("42");
    expect(screen.getByTestId("mode")).toHaveTextContent("gridfinity");
  });

  it("preserves other fields on partial update", () => {
    render(
      <GridConfigProvider>
        <ConfigUpdater />
      </GridConfigProvider>
    );
    act(() => {
      screen.getByTestId("set-custom-50").click();
    });
    expect(screen.getByTestId("heightUnit")).toHaveTextContent("7");
  });
});

// ── Cycle 2.3: Mode Switching ────────────────────────────────────────────────

describe("mode switching", () => {
  it("resets values to standard when switching to gridfinity", () => {
    render(
      <GridConfigProvider>
        <ConfigUpdater />
      </GridConfigProvider>
    );
    // Go custom with baseUnit 50
    act(() => {
      screen.getByTestId("set-custom-50").click();
    });
    expect(screen.getByTestId("baseUnit")).toHaveTextContent("50");
    // Switch back to gridfinity
    act(() => {
      screen.getByTestId("set-gridfinity").click();
    });
    expect(screen.getByTestId("baseUnit")).toHaveTextContent("42");
    expect(screen.getByTestId("mode")).toHaveTextContent("gridfinity");
  });
});
