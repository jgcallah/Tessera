import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LayoutProvider, useLayout } from "./LayoutContext";
import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <GridConfigProvider>
      <SpaceConfigProvider>
        <LayoutProvider>{children}</LayoutProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

function LayoutReader() {
  const { layout, partsList } = useLayout();
  return (
    <div>
      <span data-testid="gridX">{layout.gridUnitsX}</span>
      <span data-testid="gridY">{layout.gridUnitsY}</span>
      <span data-testid="items">{layout.items.length}</span>
      <span data-testid="parts">{partsList.length}</span>
    </div>
  );
}

function LayoutActions() {
  const { layout, placeItem, removeLayoutItem, clearLayout, partsList } =
    useLayout();
  return (
    <div>
      <span data-testid="items">{layout.items.length}</span>
      <span data-testid="parts">{partsList.length}</span>
      <button
        data-testid="place-1x1"
        onClick={() => {
          placeItem(0, 0, 1, 1, 3);
        }}
      />
      <button
        data-testid="place-2x1"
        onClick={() => {
          placeItem(1, 0, 2, 1, 3);
        }}
      />
      <button
        data-testid="place-overlap"
        onClick={() => {
          placeItem(0, 0, 1, 1, 5);
        }}
      />
      <button
        data-testid="remove-first"
        onClick={() => {
          const first = layout.items[0];
          if (first) removeLayoutItem(first.id);
        }}
      />
      <button data-testid="clear" onClick={clearLayout} />
    </div>
  );
}

describe("LayoutProvider", () => {
  it("renders children", () => {
    render(
      <Wrapper>
        <span>child</span>
      </Wrapper>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("provides grid dimensions from space config", () => {
    render(
      <Wrapper>
        <LayoutReader />
      </Wrapper>
    );
    // Default space: 400x300, baseUnit 42 → 9×7
    expect(screen.getByTestId("gridX")).toHaveTextContent("9");
    expect(screen.getByTestId("gridY")).toHaveTextContent("7");
  });

  it("starts with empty layout", () => {
    render(
      <Wrapper>
        <LayoutReader />
      </Wrapper>
    );
    expect(screen.getByTestId("items")).toHaveTextContent("0");
    expect(screen.getByTestId("parts")).toHaveTextContent("0");
  });
});

describe("useLayout", () => {
  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<LayoutReader />);
    }).toThrow("useLayout must be used within a LayoutProvider");
    spy.mockRestore();
  });
});

describe("layout actions", () => {
  it("places an item", () => {
    render(
      <Wrapper>
        <LayoutActions />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("place-1x1").click();
    });
    expect(screen.getByTestId("items")).toHaveTextContent("1");
  });

  it("rejects overlapping placement", () => {
    render(
      <Wrapper>
        <LayoutActions />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("place-1x1").click();
    });
    act(() => {
      screen.getByTestId("place-overlap").click();
    });
    expect(screen.getByTestId("items")).toHaveTextContent("1");
  });

  it("removes an item", () => {
    render(
      <Wrapper>
        <LayoutActions />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("place-1x1").click();
    });
    act(() => {
      screen.getByTestId("remove-first").click();
    });
    expect(screen.getByTestId("items")).toHaveTextContent("0");
  });

  it("clears all items", () => {
    render(
      <Wrapper>
        <LayoutActions />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("place-1x1").click();
    });
    act(() => {
      screen.getByTestId("place-2x1").click();
    });
    expect(screen.getByTestId("items")).toHaveTextContent("2");
    act(() => {
      screen.getByTestId("clear").click();
    });
    expect(screen.getByTestId("items")).toHaveTextContent("0");
  });

  it("updates parts list after placement", () => {
    render(
      <Wrapper>
        <LayoutActions />
      </Wrapper>
    );
    act(() => {
      screen.getByTestId("place-1x1").click();
    });
    act(() => {
      screen.getByTestId("place-2x1").click();
    });
    expect(screen.getByTestId("parts")).toHaveTextContent("2");
  });
});
