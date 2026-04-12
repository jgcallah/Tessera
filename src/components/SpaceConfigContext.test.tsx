import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { SpaceConfigProvider, useSpaceConfig } from "./SpaceConfigContext";
import { GridConfigProvider } from "./GridConfigContext";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <GridConfigProvider>
      <SpaceConfigProvider>{children}</SpaceConfigProvider>
    </GridConfigProvider>
  );
}

function ConfigReader() {
  const { spaceConfig, gridFit, suggestion } = useSpaceConfig();
  return (
    <div>
      <span data-testid="width">{spaceConfig.width}</span>
      <span data-testid="length">{spaceConfig.length}</span>
      <span data-testid="unitsX">{gridFit.unitsX}</span>
      <span data-testid="unitsY">{gridFit.unitsY}</span>
      <span data-testid="coverage">{Math.round(gridFit.coveragePercent)}</span>
      <span data-testid="suggestedUnit">{suggestion.baseUnit}</span>
    </div>
  );
}

function ConfigUpdater() {
  const { spaceConfig, updateSpaceConfig, resetSpaceConfig } =
    useSpaceConfig();
  return (
    <div>
      <span data-testid="width">{spaceConfig.width}</span>
      <button
        data-testid="set-600"
        onClick={() => {
          updateSpaceConfig({ width: 600 });
        }}
      />
      <button data-testid="reset" onClick={resetSpaceConfig} />
    </div>
  );
}

describe("SpaceConfigProvider", () => {
  it("renders children", () => {
    render(
      <Wrapper>
        <span>child</span>
      </Wrapper>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("provides default config", () => {
    render(
      <Wrapper>
        <ConfigReader />
      </Wrapper>
    );
    expect(screen.getByTestId("width")).toHaveTextContent("400");
    expect(screen.getByTestId("length")).toHaveTextContent("300");
  });

  it("provides grid fit calculations", () => {
    render(
      <Wrapper>
        <ConfigReader />
      </Wrapper>
    );
    expect(screen.getByTestId("unitsX")).toHaveTextContent("9");
    expect(screen.getByTestId("unitsY")).toHaveTextContent("7");
  });

  it("provides optimal base unit suggestion", () => {
    render(
      <Wrapper>
        <ConfigReader />
      </Wrapper>
    );
    const unit = parseFloat(screen.getByTestId("suggestedUnit").textContent!);
    expect(unit).toBeGreaterThanOrEqual(35);
    expect(unit).toBeLessThanOrEqual(55);
  });
});

describe("useSpaceConfig", () => {
  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<ConfigReader />);
    }).toThrow("useSpaceConfig must be used within a SpaceConfigProvider");
    spy.mockRestore();
  });
});

describe("space config state updates", () => {
  it("updates width", () => {
    render(
      <Wrapper>
        <ConfigUpdater />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("set-600").click();
    });
    expect(screen.getByTestId("width")).toHaveTextContent("600");
  });

  it("resets to defaults", () => {
    render(
      <Wrapper>
        <ConfigUpdater />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("set-600").click();
    });
    act(() => {
      screen.getByTestId("reset").click();
    });
    expect(screen.getByTestId("width")).toHaveTextContent("400");
  });
});
