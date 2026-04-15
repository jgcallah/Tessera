import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { SpaceConfigProvider } from "../SpaceConfigContext";
import { LayoutProvider, useLayout } from "../LayoutContext";

vi.mock("../ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
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

function PlaceAndEdit() {
  const { placeItem } = useLayout();
  return (
    <div>
      <button
        data-testid="place-bin"
        onClick={() => {
          placeItem(0, 0, 2, 1);
        }}
      />
      <button
        data-testid="place-bin-2"
        onClick={() => {
          placeItem(2, 0, 1, 1);
        }}
      />
      <BinEditorStep />
    </div>
  );
}

function renderWithBins() {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <LayoutProvider>
          <PlaceAndEdit />
        </LayoutProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("BinEditorStep — empty state", () => {
  it("renders the heading", () => {
    renderStep();
    expect(
      screen.getByRole("heading", { name: /bin editor/i })
    ).toBeInTheDocument();
  });

  it("shows empty state when no bins placed", () => {
    renderStep();
    // Both the mini grid and the 3D preview show the empty state copy.
    expect(screen.getAllByText(/no bins placed/i).length).toBeGreaterThan(0);
  });
});

describe("BinEditorStep — with bins", () => {
  it("shows select all button after placing bins", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    expect(
      screen.getByRole("button", { name: /select all/i })
    ).toBeInTheDocument();
  });

  it("shows properties panel when bin is selected via Select All", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    fireEvent.click(screen.getByRole("button", { name: /select all/i }));
    expect(document.getElementById("bin-height")).toBeInTheDocument();
  });

  it("can change height units", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    fireEvent.click(screen.getByRole("button", { name: /select all/i }));
    const input = document.getElementById("bin-height") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    expect(input).toHaveValue(5);
  });

  it("shows mm dimension next to height", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    fireEvent.click(screen.getByRole("button", { name: /select all/i }));
    // Default 3 height units * 7mm = 21mm
    expect(screen.getByText(/= 21mm total/i)).toBeInTheDocument();
  });

  it("can toggle stacking lip", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    fireEvent.click(screen.getByRole("button", { name: /select all/i }));
    const lipCheckbox = screen.getByLabelText(
      /stacking lip/i
    ) as HTMLInputElement;
    expect(lipCheckbox).toBeChecked();
    fireEvent.click(lipCheckbox);
    expect(lipCheckbox).not.toBeChecked();
  });

  it("can set dividers", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    fireEvent.click(screen.getByRole("button", { name: /select all/i }));
    fireEvent.change(screen.getByLabelText(/along width/i), {
      target: { value: "1" },
    });
    expect(screen.getByText(/2 compartments/i)).toBeInTheDocument();
  });

  it("shows placeholder message when no bin selected", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    expect(
      screen.getByText(/select a bin on the grid/i)
    ).toBeInTheDocument();
  });

  it("shows multi-select header when multiple bins selected", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    act(() => {
      screen.getByTestId("place-bin-2").click();
    });
    fireEvent.click(screen.getByRole("button", { name: /select all/i }));
    expect(screen.getByText(/2 bins selected/i)).toBeInTheDocument();
  });

  it("always shows the 3D preview when bins exist, regardless of selection", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    act(() => {
      screen.getByTestId("place-bin-2").click();
    });
    // The empty-state copy must NOT appear once any bin is placed — the
    // 3D preview panel takes over whether or not a bin is selected.
    expect(screen.queryByText(/no bins placed/i)).not.toBeInTheDocument();
  });
});
