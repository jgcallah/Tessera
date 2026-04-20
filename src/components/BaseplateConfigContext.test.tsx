import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  BaseplateConfigProvider,
  useBaseplateConfig,
} from "./BaseplateConfigContext";
import { GridConfigProvider } from "./GridConfigContext";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <GridConfigProvider>
      <BaseplateConfigProvider>{children}</BaseplateConfigProvider>
    </GridConfigProvider>
  );
}

function ConfigReader() {
  const { baseplateConfig, baseplateDimensions } = useBaseplateConfig();
  return (
    <div>
      <span data-testid="gridUnitsX">{baseplateConfig.gridUnitsX}</span>
      <span data-testid="magnets">
        {String(baseplateConfig.includeMagnetHoles)}
      </span>
      <span data-testid="width">{baseplateDimensions.width}</span>
    </div>
  );
}

function ConfigUpdater() {
  const { baseplateConfig, updateBaseplateConfig, resetBaseplateConfig } =
    useBaseplateConfig();
  return (
    <div>
      <span data-testid="gridUnitsX">{baseplateConfig.gridUnitsX}</span>
      <button
        data-testid="set-5x"
        onClick={() => {
          updateBaseplateConfig({ gridUnitsX: 5 });
        }}
      />
      <button data-testid="reset" onClick={resetBaseplateConfig} />
    </div>
  );
}

describe("BaseplateConfigProvider", () => {
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
    expect(screen.getByTestId("gridUnitsX")).toHaveTextContent("1");
    expect(screen.getByTestId("magnets")).toHaveTextContent("false");
  });

  it("provides dimensions from grid config", () => {
    render(
      <Wrapper>
        <ConfigReader />
      </Wrapper>
    );
    expect(screen.getByTestId("width")).toHaveTextContent("42");
  });
});

describe("useBaseplateConfig", () => {
  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<ConfigReader />);
    }).toThrow(
      "useBaseplateConfig must be used within a BaseplateConfigProvider"
    );
    spy.mockRestore();
  });
});

describe("baseplate state updates", () => {
  it("updates gridUnitsX", () => {
    render(
      <Wrapper>
        <ConfigUpdater />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("set-5x").click();
    });
    expect(screen.getByTestId("gridUnitsX")).toHaveTextContent("5");
  });

  it("resets to defaults", () => {
    render(
      <Wrapper>
        <ConfigUpdater />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("set-5x").click();
    });
    act(() => {
      screen.getByTestId("reset").click();
    });
    expect(screen.getByTestId("gridUnitsX")).toHaveTextContent("1");
  });
});
