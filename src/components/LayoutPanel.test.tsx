import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";
import { LayoutProvider } from "./LayoutContext";
import { LayoutPanel } from "./LayoutPanel";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function renderPanel() {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <LayoutProvider>
          <LayoutPanel />
        </LayoutProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("LayoutPanel — basic render", () => {
  it("renders the heading", () => {
    renderPanel();
    expect(screen.getByText("Layout Planner")).toBeInTheDocument();
  });

  it("renders the grid SVG", () => {
    renderPanel();
    expect(screen.getByTestId("layout-grid")).toBeInTheDocument();
  });

  it("renders preset buttons", () => {
    renderPanel();
    expect(screen.getByTestId("preset-1x1")).toBeInTheDocument();
    expect(screen.getByTestId("preset-2x1")).toBeInTheDocument();
    expect(screen.getByTestId("preset-2x2")).toBeInTheDocument();
  });

  it("renders draw mode button", () => {
    renderPanel();
    expect(screen.getByTestId("draw-mode")).toBeInTheDocument();
  });

  it("renders undo/redo buttons", () => {
    renderPanel();
    expect(screen.getByTestId("undo-btn")).toBeInTheDocument();
    expect(screen.getByTestId("redo-btn")).toBeInTheDocument();
  });

  it("shows 0 bins initially", () => {
    renderPanel();
    expect(screen.getByTestId("layout-items")).toHaveTextContent("0 bins");
  });

  it("undo is disabled initially", () => {
    renderPanel();
    expect(screen.getByTestId("undo-btn")).toBeDisabled();
  });
});

describe("LayoutPanel — stamp mode", () => {
  it("places a 1x1 bin with preset stamp", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("preset-1x1"));
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    expect(screen.getByTestId("layout-items")).toHaveTextContent("1 bins");
  });

  it("marks placed cell as occupied", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("preset-1x1"));
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    expect(screen.getByTestId("cell-0-0")).toHaveAttribute(
      "data-occupied",
      "true"
    );
  });

  it("selects bin when clicking occupied cell", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("preset-1x1"));
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    // Click again to select (not remove)
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    expect(screen.getByText(/bin selected/i)).toBeInTheDocument();
  });
});

describe("LayoutPanel — parts list", () => {
  it("shows parts list after placing bins", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("preset-1x1"));
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    fireEvent.mouseDown(screen.getByTestId("cell-1-0"));
    expect(screen.getByTestId("parts-list")).toBeInTheDocument();
  });

  it("shows clear all button when bins are placed", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("preset-1x1"));
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    expect(screen.getByText("Clear All")).toBeInTheDocument();
  });

  it("clears all bins on clear all click", () => {
    renderPanel();
    fireEvent.click(screen.getByTestId("preset-1x1"));
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    fireEvent.mouseDown(screen.getByTestId("cell-1-0"));
    fireEvent.click(screen.getByText("Clear All"));
    expect(screen.getByTestId("layout-items")).toHaveTextContent("0 bins");
  });
});
