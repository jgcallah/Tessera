import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { SpaceConfigProvider } from "../SpaceConfigContext";
import { LayoutProvider } from "../LayoutContext";

vi.mock("../ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
import { LayoutStep } from "./LayoutStep";

vi.mock("@react-three/fiber", () => import("../../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../../__mocks__/@react-three/drei"));

function renderStep() {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <LayoutProvider>
          <LayoutStep />
        </LayoutProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("LayoutStep", () => {
  it("renders Layout Planner", () => {
    renderStep();
    expect(screen.getByText("Layout Planner")).toBeInTheDocument();
  });

  it("renders the grid SVG", () => {
    renderStep();
    expect(screen.getByTestId("layout-grid")).toBeInTheDocument();
  });
});
