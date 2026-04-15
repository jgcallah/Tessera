import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";
import { BinConfigProvider } from "./BinConfigContext";
import { BaseplateConfigProvider } from "./BaseplateConfigContext";
import { PrinterConfigProvider } from "./PrinterConfigContext";
import { LayoutProvider } from "./LayoutContext";
import { BaseplateLayoutProvider } from "./BaseplateLayoutContext";
import { ProjectProvider } from "./ProjectContext";
import { ProjectPanel } from "./ProjectPanel";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));
vi.mock("./ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function renderPanel() {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <BinConfigProvider>
          <BaseplateConfigProvider>
            <PrinterConfigProvider>
              <LayoutProvider>
                <BaseplateLayoutProvider>
                  <ProjectProvider projectName="Test">
                    <ProjectPanel />
                  </ProjectProvider>
                </BaseplateLayoutProvider>
              </LayoutProvider>
            </PrinterConfigProvider>
          </BaseplateConfigProvider>
        </BinConfigProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("ProjectPanel", () => {
  it("renders Export button", () => {
    renderPanel();
    expect(screen.getByTestId("save-project")).toHaveTextContent(
      /export project/i
    );
  });

  it("renders Import button", () => {
    renderPanel();
    expect(screen.getByTestId("load-project")).toHaveTextContent(
      /import project/i
    );
  });

  it("has a hidden file input", () => {
    renderPanel();
    expect(screen.getByTestId("file-input")).toHaveAttribute("type", "file");
    expect(screen.getByTestId("file-input")).toHaveClass("hidden");
  });

  it("does not show import error initially", () => {
    renderPanel();
    expect(screen.queryByTestId("import-error")).not.toBeInTheDocument();
  });
});
