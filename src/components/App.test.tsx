import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));
vi.mock("./BinPreview", () => ({
  BinPreview: () => null,
}));

describe("App", () => {
  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByText("Tessera")).toBeInTheDocument();
  });

  it("renders the grid configuration panel", () => {
    render(<App />);
    expect(screen.getByText("Grid Configuration")).toBeInTheDocument();
  });

  it("renders the bin configuration panel", () => {
    render(<App />);
    expect(screen.getByText("Bin Configuration")).toBeInTheDocument();
  });

  it("shows gridfinity mode as default", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /gridfinity/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows default grid values in sidebar", () => {
    render(<App />);
    expect(screen.getByLabelText(/base unit/i)).toHaveValue(42);
  });

  it("shows default bin values in sidebar", () => {
    render(<App />);
    expect(screen.getByLabelText(/grid units x/i)).toHaveValue(1);
    expect(screen.getByLabelText(/height units/i)).toHaveValue(3);
  });
});
