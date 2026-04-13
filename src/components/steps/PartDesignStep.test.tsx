import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { BinConfigProvider } from "../BinConfigContext";
import { BaseplateConfigProvider } from "../BaseplateConfigContext";
import { PreviewProvider } from "../PreviewContext";
import { PartDesignStep } from "./PartDesignStep";

vi.mock("@react-three/fiber", () => import("../../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../../__mocks__/@react-three/drei"));
vi.mock("../BinPreview", () => ({ BinPreview: () => null }));
vi.mock("../BaseplatePreview", () => ({ BaseplatePreview: () => null }));

function renderStep() {
  return render(
    <GridConfigProvider>
      <BinConfigProvider>
        <BaseplateConfigProvider>
          <PreviewProvider>
            <PartDesignStep />
          </PreviewProvider>
        </BaseplateConfigProvider>
      </BinConfigProvider>
    </GridConfigProvider>
  );
}

describe("PartDesignStep", () => {
  it("renders Bin Configuration panel", () => {
    renderStep();
    expect(screen.getByText("Bin Configuration")).toBeInTheDocument();
  });

  it("renders Baseplate Configuration panel", () => {
    renderStep();
    expect(screen.getByText("Baseplate Configuration")).toBeInTheDocument();
  });

  it("renders preview mode toggle", () => {
    renderStep();
    expect(screen.getByRole("button", { name: /assembled/i })).toBeInTheDocument();
  });
});
