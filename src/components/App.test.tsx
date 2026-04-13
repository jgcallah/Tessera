import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { App } from "./App";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));
vi.mock("./BinPreview", () => ({ BinPreview: () => null }));
vi.mock("./BaseplatePreview", () => ({ BaseplatePreview: () => null }));
vi.mock("./ManifoldDemo", () => ({
  ManifoldDemo: () => <span>WASM mock</span>,
}));

describe("App", () => {
  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByText("Tessera")).toBeInTheDocument();
  });

  it("shows step 1 (Space & Grid) by default", () => {
    render(<App />);
    expect(screen.getByText("Space Definition")).toBeInTheDocument();
    expect(screen.getByText("Grid Configuration")).toBeInTheDocument();
  });

  it("does not show later step content on load", () => {
    render(<App />);
    expect(screen.queryByText("Bin Configuration")).not.toBeInTheDocument();
    expect(screen.queryByText("Layout Planner")).not.toBeInTheDocument();
  });

  it("navigates through all 4 steps", () => {
    render(<App />);
    // Step 1
    expect(screen.getByText("Space Definition")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("next-btn"));
    // Step 2
    expect(screen.getByText("Bin Configuration")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("next-btn"));
    // Step 3
    expect(screen.getByText("Layout Planner")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("next-btn"));
    // Step 4
    expect(screen.getByText("Print Planner")).toBeInTheDocument();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("shows step indicator with all 4 steps", () => {
    render(<App />);
    // Step labels appear in both indicator and footer, so use getAllByText
    expect(screen.getAllByText(/space & grid/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/part design/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/layout/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/print & export/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows save/load project buttons", () => {
    render(<App />);
    expect(screen.getByTestId("save-project")).toBeInTheDocument();
    expect(screen.getByTestId("load-project")).toBeInTheDocument();
  });

  it("shows gridfinity mode as default on step 1", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /gridfinity/i })
    ).toHaveAttribute("aria-pressed", "true");
  });
});
