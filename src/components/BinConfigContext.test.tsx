import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BinConfigProvider, useBinConfig } from "./BinConfigContext";
import { GridConfigProvider } from "./GridConfigContext";
import type { BinConfig } from "../lib/bin-config";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <GridConfigProvider>
      <BinConfigProvider>{children}</BinConfigProvider>
    </GridConfigProvider>
  );
}

function WrapperWithInit({
  children,
  initialConfig,
}: {
  children: React.ReactNode;
  initialConfig: Partial<BinConfig>;
}) {
  return (
    <GridConfigProvider>
      <BinConfigProvider initialConfig={initialConfig}>
        {children}
      </BinConfigProvider>
    </GridConfigProvider>
  );
}

function ConfigReader() {
  const { binConfig, binDimensions } = useBinConfig();
  return (
    <div>
      <span data-testid="gridUnitsX">{binConfig.gridUnitsX}</span>
      <span data-testid="heightUnits">{binConfig.heightUnits}</span>
      <span data-testid="lip">{String(binConfig.includeStackingLip)}</span>
      <span data-testid="extWidth">{binDimensions.exteriorWidth}</span>
    </div>
  );
}

function ConfigUpdater() {
  const { binConfig, updateBinConfig, resetBinConfig } = useBinConfig();
  return (
    <div>
      <span data-testid="gridUnitsX">{binConfig.gridUnitsX}</span>
      <span data-testid="heightUnits">{binConfig.heightUnits}</span>
      <span data-testid="lip">{String(binConfig.includeStackingLip)}</span>
      <span data-testid="magnets">{String(binConfig.includeMagnetHoles)}</span>
      <button
        data-testid="set-2x"
        onClick={() => {
          updateBinConfig({ gridUnitsX: 2 });
        }}
      />
      <button
        data-testid="set-5u"
        onClick={() => {
          updateBinConfig({ heightUnits: 5 });
        }}
      />
      <button
        data-testid="toggle-lip"
        onClick={() => {
          updateBinConfig({
            includeStackingLip: !binConfig.includeStackingLip,
          });
        }}
      />
      <button
        data-testid="toggle-magnets"
        onClick={() => {
          updateBinConfig({
            includeMagnetHoles: !binConfig.includeMagnetHoles,
          });
        }}
      />
      <button data-testid="reset" onClick={resetBinConfig} />
    </div>
  );
}

// ── Provider & Default State ─────────────────────────────────────────────────

describe("BinConfigProvider", () => {
  it("renders children", () => {
    render(
      <Wrapper>
        <span>child</span>
      </Wrapper>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("provides default bin config", () => {
    render(
      <Wrapper>
        <ConfigReader />
      </Wrapper>
    );
    expect(screen.getByTestId("gridUnitsX")).toHaveTextContent("1");
    expect(screen.getByTestId("heightUnits")).toHaveTextContent("3");
    expect(screen.getByTestId("lip")).toHaveTextContent("true");
  });

  it("provides derived dimensions from grid config", () => {
    render(
      <Wrapper>
        <ConfigReader />
      </Wrapper>
    );
    // exteriorWidth = 42*1 - 0.5 = 41.5
    expect(screen.getByTestId("extWidth")).toHaveTextContent("41.5");
  });

  it("accepts an initialConfig prop", () => {
    render(
      <WrapperWithInit initialConfig={{ gridUnitsX: 3 }}>
        <ConfigReader />
      </WrapperWithInit>
    );
    expect(screen.getByTestId("gridUnitsX")).toHaveTextContent("3");
  });
});

describe("useBinConfig", () => {
  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<ConfigReader />);
    }).toThrow("useBinConfig must be used within a BinConfigProvider");
    spy.mockRestore();
  });
});

// ── State Updates ────────────────────────────────────────────────────────────

describe("bin config state updates", () => {
  it("updates gridUnitsX", () => {
    render(
      <Wrapper>
        <ConfigUpdater />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("set-2x").click();
    });
    expect(screen.getByTestId("gridUnitsX")).toHaveTextContent("2");
  });

  it("updates heightUnits", () => {
    render(
      <Wrapper>
        <ConfigUpdater />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("set-5u").click();
    });
    expect(screen.getByTestId("heightUnits")).toHaveTextContent("5");
  });

  it("toggles includeStackingLip", () => {
    render(
      <Wrapper>
        <ConfigUpdater />
      </Wrapper>
    );
    expect(screen.getByTestId("lip")).toHaveTextContent("true");
    act(() => {
      screen.getByTestId("toggle-lip").click();
    });
    expect(screen.getByTestId("lip")).toHaveTextContent("false");
  });

  it("resets to defaults", () => {
    render(
      <Wrapper>
        <ConfigUpdater />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("set-2x").click();
    });
    expect(screen.getByTestId("gridUnitsX")).toHaveTextContent("2");
    act(() => {
      screen.getByTestId("reset").click();
    });
    expect(screen.getByTestId("gridUnitsX")).toHaveTextContent("1");
  });
});
