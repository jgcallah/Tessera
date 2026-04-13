import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { SpaceConfigProvider } from "../SpaceConfigContext";
import { LayoutProvider } from "../LayoutContext";
import { BinEditorStep } from "./BinEditorStep";

vi.mock("@react-three/fiber", () => import("../../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../../__mocks__/@react-three/drei"));

function renderStep() {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <LayoutProvider>
          <BinEditorStep />
        </LayoutProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("BinEditorStep", () => {
  it("renders the heading", () => {
    renderStep();
    expect(screen.getByText("Bin Editor")).toBeInTheDocument();
  });

  it("shows empty state when no bins placed", () => {
    renderStep();
    expect(screen.getByText(/no bins placed/i)).toBeInTheDocument();
  });
});
