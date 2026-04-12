import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { App } from "./App";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));
vi.mock("./BinPreview", () => ({
  BinPreview: () => <div data-testid="bin-preview" />,
}));
vi.mock("./BaseplatePreview", () => ({
  BaseplatePreview: () => <div data-testid="baseplate-preview" />,
}));
vi.mock("./PreviewCanvas", () => ({
  PreviewCanvas: () => <div data-testid="preview-canvas" />,
}));

describe("App", () => {
  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByText("Tessera")).toBeInTheDocument();
  });

  it("renders all three config panels", () => {
    render(<App />);
    expect(screen.getByText("Grid Configuration")).toBeInTheDocument();
    expect(screen.getByText("Bin Configuration")).toBeInTheDocument();
    expect(screen.getByText("Baseplate Configuration")).toBeInTheDocument();
  });

  it("renders the preview mode toggle", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /assembled/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^bin$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /baseplate/i })
    ).toBeInTheDocument();
  });

  it("assembled mode is active by default", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /assembled/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("can switch preview mode to bin", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^bin$/i }));
    expect(
      screen.getByRole("button", { name: /^bin$/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /assembled/i })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("shows gridfinity mode as default", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /gridfinity/i })
    ).toHaveAttribute("aria-pressed", "true");
  });
});
