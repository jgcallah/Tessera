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

  it("renders description text", () => {
    renderPanel();
    expect(screen.getByText(/Draw bins on the grid/)).toBeInTheDocument();
  });

  it("renders the grid SVG", () => {
    renderPanel();
    expect(screen.getByTestId("layout-grid")).toBeInTheDocument();
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

describe("LayoutPanel — draw mode", () => {
  it("places a 1x1 bin by clicking a cell", () => {
    renderPanel();
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    fireEvent.mouseUp(screen.getByTestId("layout-grid"));
    expect(screen.getByTestId("layout-items")).toHaveTextContent("1 bins");
  });

  it("marks placed cell as occupied", () => {
    renderPanel();
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    fireEvent.mouseUp(screen.getByTestId("layout-grid"));
    expect(screen.getByTestId("cell-0-0")).toHaveAttribute(
      "data-occupied",
      "true"
    );
  });

  it("selects bin when clicking occupied cell", () => {
    renderPanel();
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    fireEvent.mouseUp(screen.getByTestId("layout-grid"));
    // Click occupied cell to select
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    expect(screen.getByText(/bin selected/i)).toBeInTheDocument();
  });
});

describe("LayoutPanel — parts list", () => {
  it("shows parts list after placing bins", () => {
    renderPanel();
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    fireEvent.mouseUp(screen.getByTestId("layout-grid"));
    fireEvent.mouseDown(screen.getByTestId("cell-1-0"));
    fireEvent.mouseUp(screen.getByTestId("layout-grid"));
    expect(screen.getByTestId("parts-list")).toBeInTheDocument();
  });

  it("shows clear all button when bins are placed", () => {
    renderPanel();
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    fireEvent.mouseUp(screen.getByTestId("layout-grid"));
    expect(screen.getByText("Clear All")).toBeInTheDocument();
  });

  it("clears all bins on clear all click", () => {
    renderPanel();
    fireEvent.mouseDown(screen.getByTestId("cell-0-0"));
    fireEvent.mouseUp(screen.getByTestId("layout-grid"));
    fireEvent.mouseDown(screen.getByTestId("cell-1-0"));
    fireEvent.mouseUp(screen.getByTestId("layout-grid"));
    fireEvent.click(screen.getByText("Clear All"));
    expect(screen.getByTestId("layout-items")).toHaveTextContent("0 bins");
  });
});
