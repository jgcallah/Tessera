import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { SpaceConfigProvider } from "../SpaceConfigContext";
import { SpaceGridStep } from "./SpaceGridStep";

vi.mock("@react-three/fiber", () => import("../../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../../__mocks__/@react-three/drei"));

function renderStep() {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <SpaceGridStep />
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("SpaceGridStep", () => {
  it("renders Space Definition panel", () => {
    renderStep();
    expect(screen.getByText("Space Definition")).toBeInTheDocument();
  });

  it("renders Grid Configuration panel", () => {
    renderStep();
    expect(screen.getByText("Grid Configuration")).toBeInTheDocument();
  });
});
