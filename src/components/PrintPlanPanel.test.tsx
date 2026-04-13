import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";
import { LayoutProvider, useLayout } from "./LayoutContext";

vi.mock("./ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
import { PrintPlanPanel } from "./PrintPlanPanel";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

// Helper to place items before rendering PrintPlanPanel
function PlaceAndPlan({ placements }: { placements: [number, number][] }) {
  const { placeItem } = useLayout();
  return (
    <div>
      {placements.map(([x, y], i) => (
        <button
          key={i}
          data-testid={`place-${i}`}
          onClick={() => {
            placeItem(x, y, 1, 1);
          }}
        />
      ))}
      <PrintPlanPanel />
    </div>
  );
}

function renderWithLayout(placements: [number, number][] = []) {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <LayoutProvider>
          <PlaceAndPlan placements={placements} />
        </LayoutProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("PrintPlanPanel — basic render", () => {
  it("renders the heading", () => {
    renderWithLayout();
    expect(screen.getByText("Print Planner")).toBeInTheDocument();
  });

  it("shows bed dimension inputs", () => {
    renderWithLayout();
    expect(screen.getByLabelText(/bed width/i)).toHaveValue(220);
    expect(screen.getByLabelText(/bed length/i)).toHaveValue(220);
  });

  it("shows empty state message when no parts", () => {
    renderWithLayout();
    expect(
      screen.getByText(/place bins in the layout planner/i)
    ).toBeInTheDocument();
  });
});

describe("PrintPlanPanel — with parts", () => {
  it("shows total sheets after placing bins", () => {
    renderWithLayout([[0, 0], [1, 0], [2, 0]]);
    // Place 3 bins
    act(() => {
      screen.getByTestId("place-0").click();
    });
    act(() => {
      screen.getByTestId("place-1").click();
    });
    act(() => {
      screen.getByTestId("place-2").click();
    });
    expect(screen.getByTestId("total-sheets")).toHaveTextContent("1");
  });

  it("shows sheet visualization", () => {
    renderWithLayout([[0, 0]]);
    act(() => {
      screen.getByTestId("place-0").click();
    });
    expect(screen.getByTestId("sheet-0")).toBeInTheDocument();
  });

  it("shows print inventory", () => {
    renderWithLayout([[0, 0], [1, 0]]);
    act(() => {
      screen.getByTestId("place-0").click();
    });
    act(() => {
      screen.getByTestId("place-1").click();
    });
    expect(screen.getByTestId("print-inventory")).toBeInTheDocument();
  });

  it("updates when bed size changes", () => {
    // Place many bins to force multiple sheets on a small bed
    const placements: [number, number][] = Array.from(
      { length: 8 },
      (_, i) => [i, 0] as [number, number]
    );
    renderWithLayout(placements);
    for (let i = 0; i < 8; i++) {
      act(() => {
        screen.getByTestId(`place-${i}`).click();
      });
    }
    const sheetsLarge = parseInt(
      screen.getByTestId("total-sheets").textContent!
    );

    // Shrink bed
    fireEvent.change(screen.getByLabelText(/bed width/i), {
      target: { value: "80" },
    });
    fireEvent.change(screen.getByLabelText(/bed length/i), {
      target: { value: "80" },
    });

    const sheetsSmall = parseInt(
      screen.getByTestId("total-sheets").textContent!
    );
    expect(sheetsSmall).toBeGreaterThan(sheetsLarge);
  });
});
