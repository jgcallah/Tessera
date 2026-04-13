import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { App } from "./App";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));
vi.mock("./BinPreview", () => ({ BinPreview: () => null }));
vi.mock("./BaseplatePreview", () => ({ BaseplatePreview: () => null }));
vi.mock("./ManifoldDemo", () => ({
  ManifoldDemo: () => <span>WASM mock</span>,
}));

beforeEach(() => {
  localStorage.clear();
});

describe("App — start screen", () => {
  it("shows the start screen by default", () => {
    render(<App />);
    expect(screen.getByTestId("new-project")).toBeInTheDocument();
  });

  it("shows Tessera title on start screen", () => {
    render(<App />);
    expect(screen.getByText("Tessera")).toBeInTheDocument();
  });
});

describe("App — new project flow", () => {
  it("clicking New Project enters the wizard", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("new-project"));
    expect(screen.getByText("Space Definition")).toBeInTheDocument();
    expect(screen.getByText("Grid Configuration")).toBeInTheDocument();
  });

  it("can navigate back to start screen", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("new-project"));
    fireEvent.click(screen.getByTestId("back-to-start"));
    expect(screen.getByTestId("new-project")).toBeInTheDocument();
  });
});

describe("App — wizard navigation", () => {
  it("navigates through all 5 steps", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("new-project"));
    expect(screen.getByText("Space Definition")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText("Layout Planner")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByRole("heading", { name: /bin editor/i })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByRole("heading", { name: /baseplate editor/i })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("next-btn"));
    expect(screen.getByText("Print Planner")).toBeInTheDocument();
  });
});
