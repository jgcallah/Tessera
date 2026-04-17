import { describe, it, expect, vi } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";
import { BinConfigProvider } from "./BinConfigContext";
import { BaseplateConfigProvider } from "./BaseplateConfigContext";
import { PrinterConfigProvider } from "./PrinterConfigContext";
import { LayoutProvider, useLayout } from "./LayoutContext";
import {
  BaseplateLayoutProvider,
  useBaseplateLayout,
} from "./BaseplateLayoutContext";
import { ProjectProvider, useProject } from "./ProjectContext";
import { serializeProject } from "../lib/project";
import { createDefaultGridConfig } from "../lib/grid-config";
import { createDefaultSpaceConfig } from "../lib/space-config";
import { createDefaultBinConfig } from "../lib/bin-config";
import { createDefaultBaseplateConfig } from "../lib/baseplate-config";
import { DEFAULT_BIN_PROPERTIES } from "../lib/layout";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));
vi.mock("./ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Capture context handles during render for assertion in tests.
function Harness({
  onMount,
}: {
  onMount: (handles: {
    importProject: (json: string) => void;
    getBinLayout: () => ReturnType<typeof useLayout>["layout"];
    getBaseplateLayout: () => ReturnType<
      typeof useBaseplateLayout
    >["layout"];
  }) => void;
}): React.JSX.Element {
  const { importProject } = useProject();
  const { layout: binLayout } = useLayout();
  const { layout: bpLayout } = useBaseplateLayout();
  // Use refs so callers always read the latest layouts.
  const binRef = { current: binLayout };
  const bpRef = { current: bpLayout };
  binRef.current = binLayout;
  bpRef.current = bpLayout;
  onMount({
    importProject,
    getBinLayout: () => binRef.current,
    getBaseplateLayout: () => bpRef.current,
  });
  return <div />;
}

function renderWithProviders(
  onMount: Parameters<typeof Harness>[0]["onMount"]
): void {
  render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <BinConfigProvider>
          <BaseplateConfigProvider>
            <PrinterConfigProvider>
              <LayoutProvider>
                <BaseplateLayoutProvider>
                  <ProjectProvider projectName="Test">
                    <Harness onMount={onMount} />
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

describe("ProjectContext import regression — grid-sync prune", () => {
  it("does not prune imported bin-layout items on a fresh session", async () => {
    // Build a saved project whose space yields a larger grid than the default
    // session starts with, with bins placed near the upper edge.
    const spaceConfig = createDefaultSpaceConfig();
    spaceConfig.width = 10 * 42; // 10 gridfinity cells wide
    spaceConfig.length = 10 * 42;

    const json = serializeProject({
      gridConfig: createDefaultGridConfig(),
      spaceConfig,
      binConfig: createDefaultBinConfig(),
      baseplateConfig: createDefaultBaseplateConfig(),
      layout: {
        items: [
          {
            id: "item-edge-a",
            gridX: 7,
            gridY: 7,
            gridUnitsX: 2,
            gridUnitsY: 2,
            binProperties: { ...DEFAULT_BIN_PROPERTIES },
          },
          {
            id: "item-edge-b",
            gridX: 0,
            gridY: 0,
            gridUnitsX: 3,
            gridUnitsY: 3,
            binProperties: { ...DEFAULT_BIN_PROPERTIES },
          },
        ],
        gridUnitsX: 10,
        gridUnitsY: 10,
      },
      baseplateLayout: {
        items: [
          { id: "bp-edge", gridX: 6, gridY: 0, gridUnitsX: 4, gridUnitsY: 4 },
        ],
        spacers: [],
        gridUnitsX: 10,
        gridUnitsY: 10,
      },
    });

    let handles!: {
      importProject: (json: string) => void;
      getBinLayout: () => ReturnType<typeof useLayout>["layout"];
      getBaseplateLayout: () => ReturnType<
        typeof useBaseplateLayout
      >["layout"];
    };
    renderWithProviders((h) => {
      handles = h;
    });

    act(() => {
      handles.importProject(json);
    });

    await waitFor(() => {
      expect(handles.getBinLayout().items).toHaveLength(2);
      expect(handles.getBaseplateLayout().items).toHaveLength(1);
    });

    const binIds = handles.getBinLayout().items.map((i) => i.id);
    expect(binIds).toContain("item-edge-a");
    expect(binIds).toContain("item-edge-b");
    expect(handles.getBaseplateLayout().items[0]!.id).toBe("bp-edge");
  });
});
