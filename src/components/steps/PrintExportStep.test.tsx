import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { SpaceConfigProvider } from "../SpaceConfigContext";
import { LayoutProvider } from "../LayoutContext";
import { PrintExportStep } from "./PrintExportStep";

vi.mock("@react-three/fiber", () => import("../../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../../__mocks__/@react-three/drei"));

function renderStep() {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <LayoutProvider>
          <PrintExportStep />
        </LayoutProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("PrintExportStep", () => {
  it("renders Print Planner", () => {
    renderStep();
    expect(screen.getByText("Print Planner")).toBeInTheDocument();
  });

  it("renders Export panel", () => {
    renderStep();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });
});
