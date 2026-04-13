import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";
import { SpaceConfigPanel } from "./SpaceConfigPanel";
import type { SpaceConfig } from "../lib/space-config";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function renderPanel(initialConfig?: Partial<SpaceConfig>) {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider {...(initialConfig ? { initialConfig } : {})}>
        <SpaceConfigPanel />
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("SpaceConfigPanel — basic render", () => {
  it("renders the heading", () => {
    renderPanel();
    expect(screen.getByText("Space Definition")).toBeInTheDocument();
  });

  it("shows dimension inputs with defaults", () => {
    renderPanel();
    const w = document.getElementById("space-width") as HTMLInputElement;
    const l = document.getElementById("space-length") as HTMLInputElement;
    const d = document.getElementById("space-depth") as HTMLInputElement;
    expect(w.value).toBe("400");
    expect(l.value).toBe("300");
    expect(d.value).toBe("50");
  });

  it("shows grid fit results", () => {
    renderPanel();
    expect(screen.getByTestId("fit-unitsX")).toHaveTextContent("9");
    expect(screen.getByTestId("fit-unitsY")).toHaveTextContent("7");
  });

  it("shows coverage percentage", () => {
    renderPanel();
    const coverage = screen.getByTestId("fit-coverage").textContent!;
    expect(parseFloat(coverage)).toBeGreaterThan(90);
  });

  it("shows max height units", () => {
    renderPanel();
    expect(screen.getByTestId("fit-maxH")).toHaveTextContent("7");
  });

  it("shows no validation errors for default config", () => {
    renderPanel();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("SpaceConfigPanel — interactions", () => {
  it("updates grid fit when width changes", () => {
    renderPanel();
    fireEvent.change(document.getElementById("space-width")!, {
      target: { value: "210" },
    });
    // floor(210 / 42) = 5
    expect(screen.getByTestId("fit-unitsX")).toHaveTextContent("5");
  });

  it("updates grid fit when length changes", () => {
    renderPanel();
    fireEvent.change(document.getElementById("space-length")!, {
      target: { value: "126" },
    });
    // floor(126 / 42) = 3
    expect(screen.getByTestId("fit-unitsY")).toHaveTextContent("3");
  });

  it("shows validation error for width of 0", () => {
    renderPanel();
    fireEvent.change(document.getElementById("space-width")!, {
      target: { value: "0" },
    });
    expect(
      screen.getByText(/width must be greater than 0/i)
    ).toBeInTheDocument();
  });
});
