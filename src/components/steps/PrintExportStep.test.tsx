import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { SpaceConfigProvider } from "../SpaceConfigContext";
import { BaseplateConfigProvider } from "../BaseplateConfigContext";
import { PrinterConfigProvider } from "../PrinterConfigContext";
import { LayoutProvider, useLayout } from "../LayoutContext";
import {
  BaseplateLayoutProvider,
  useBaseplateLayout,
} from "../BaseplateLayoutContext";
import { PrintExportStep } from "./PrintExportStep";

vi.mock("@react-three/fiber", () => import("../../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../../__mocks__/@react-three/drei"));
vi.mock("../ui/Toast", () => {
  const stable = { toast: () => {} };
  return { useToast: () => stable };
});

function PlaceAndStep({ count }: { count: number }) {
  const { placeItem } = useLayout();
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          data-testid={`place-${i}`}
          onClick={() => {
            placeItem(i, 0, 1, 1);
          }}
        />
      ))}
      <PrintExportStep />
    </div>
  );
}

function renderStep(count = 0) {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <BaseplateConfigProvider>
          <PrinterConfigProvider>
            <LayoutProvider>
              <BaseplateLayoutProvider>
                <PlaceAndStep count={count} />
              </BaseplateLayoutProvider>
            </LayoutProvider>
          </PrinterConfigProvider>
        </BaseplateConfigProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("PrintExportStep — layout", () => {
  it("renders Print Options sidebar heading", () => {
    renderStep();
    expect(screen.getByText("Print Options")).toBeInTheDocument();
  });

  it("shows the printer summary (read-only)", () => {
    renderStep();
    const summary = screen.getByTestId("printer-summary");
    expect(summary).toHaveTextContent(/220 × 220 mm/);
    expect(summary).toHaveTextContent(/5 mm/);
    expect(summary).toHaveTextContent(/Printer/i);
  });

  it("shows empty state in the sheets pane when no parts", () => {
    renderStep();
    expect(
      screen.getByText(/place bins or baseplates/i)
    ).toBeInTheDocument();
  });
});

describe("PrintExportStep — with parts", () => {
  it("shows total sheets and a sheet visualization after placing bins", () => {
    renderStep(3);
    for (let i = 0; i < 3; i++) {
      act(() => {
        screen.getByTestId(`place-${i}`).click();
      });
    }
    expect(screen.getByTestId("total-sheets")).toHaveTextContent("1");
    expect(screen.getByTestId("sheet-0")).toBeInTheDocument();
  });

  it("shows the print inventory", () => {
    renderStep(2);
    act(() => {
      screen.getByTestId("place-0").click();
    });
    act(() => {
      screen.getByTestId("place-1").click();
    });
    expect(screen.getByTestId("print-inventory")).toBeInTheDocument();
  });

  it("renders both export buttons", () => {
    renderStep(1);
    act(() => {
      screen.getByTestId("place-0").click();
    });
    expect(screen.getByTestId("export-zip")).toHaveTextContent(
      /download all stls/i
    );
    expect(screen.getByTestId("export-print-plan")).toHaveTextContent(
      /export print plan/i
    );
  });

  it("disables export buttons when no parts are present", () => {
    renderStep();
    expect(screen.getByTestId("export-zip")).toBeDisabled();
    expect(screen.getByTestId("export-print-plan")).toBeDisabled();
  });

  it("includes baseplates in the print inventory and zip file list", () => {
    function PlaceBaseplate() {
      const { placeBaseplate } = useBaseplateLayout();
      return (
        <button
          data-testid="place-bp"
          onClick={() => {
            placeBaseplate(0, 0, 2, 2);
          }}
        />
      );
    }
    render(
      <GridConfigProvider>
        <SpaceConfigProvider>
          <BaseplateConfigProvider>
            <PrinterConfigProvider>
              <LayoutProvider>
                <BaseplateLayoutProvider>
                  <PlaceBaseplate />
                  <PrintExportStep />
                </BaseplateLayoutProvider>
              </LayoutProvider>
            </PrinterConfigProvider>
          </BaseplateConfigProvider>
        </SpaceConfigProvider>
      </GridConfigProvider>
    );
    act(() => {
      screen.getByTestId("place-bp").click();
    });
    expect(screen.getByTestId("print-inventory")).toHaveTextContent(
      /baseplate 2×2/i
    );
    expect(screen.getByTestId("zip-file-list")).toHaveTextContent(
      /parts\/baseplate-2x2/i
    );
  });

  it("includes spacers in the print inventory and zip file list", () => {
    function PlaceSpacer() {
      const { placeSpacer } = useBaseplateLayout();
      return (
        <button
          data-testid="place-sp"
          onClick={() => {
            placeSpacer("right", 0, 1);
          }}
        />
      );
    }
    render(
      <GridConfigProvider>
        <SpaceConfigProvider
          initialConfig={{
            width: 250,
            length: 250,
            includeSpacers: true,
            gridAlignmentX: "start",
            gridAlignmentY: "start",
          }}
        >
          <BaseplateConfigProvider>
            <PrinterConfigProvider>
              <LayoutProvider>
                <BaseplateLayoutProvider>
                  <PlaceSpacer />
                  <PrintExportStep />
                </BaseplateLayoutProvider>
              </LayoutProvider>
            </PrinterConfigProvider>
          </BaseplateConfigProvider>
        </SpaceConfigProvider>
      </GridConfigProvider>
    );
    act(() => {
      screen.getByTestId("place-sp").click();
    });
    expect(screen.getByTestId("print-inventory")).toHaveTextContent(
      /spacer 1×1/i
    );
    expect(screen.getByTestId("zip-file-list")).toHaveTextContent(
      /parts\/spacer-right-1u/i
    );
  });

  it("lists per-plate STLs in the zip file list", () => {
    renderStep(2);
    act(() => {
      screen.getByTestId("place-0").click();
    });
    act(() => {
      screen.getByTestId("place-1").click();
    });
    expect(screen.getByTestId("zip-file-list")).toHaveTextContent(
      /plates\/plate-1\.stl/
    );
  });

  it("renders a baseplate as a socket grid (one cell per grid unit)", () => {
    function PlaceBaseplate() {
      const { placeBaseplate } = useBaseplateLayout();
      return (
        <button
          data-testid="place-bp"
          onClick={() => {
            placeBaseplate(0, 0, 2, 3);
          }}
        />
      );
    }
    render(
      <GridConfigProvider>
        <SpaceConfigProvider>
          <BaseplateConfigProvider>
            <PrinterConfigProvider>
              <LayoutProvider>
                <BaseplateLayoutProvider>
                  <PlaceBaseplate />
                  <PrintExportStep />
                </BaseplateLayoutProvider>
              </LayoutProvider>
            </PrinterConfigProvider>
          </BaseplateConfigProvider>
        </SpaceConfigProvider>
      </GridConfigProvider>
    );
    act(() => {
      screen.getByTestId("place-bp").click();
    });
    const sheet = screen.getByTestId("sheet-0");
    // Baseplate body + 2×3 sockets = 7 rects minimum (body + 6 sockets).
    const rects = sheet.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThanOrEqual(7);
  });
});
