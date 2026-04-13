import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { SpaceConfigProvider } from "../SpaceConfigContext";
import { LayoutProvider, useLayout } from "../LayoutContext";
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
    expect(screen.getByText(/no bins placed/i)).toBeInTheDocument();
  });
});

describe("BinEditorStep — with bins", () => {
  it("shows bin list after placing", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    expect(screen.getByTestId("bin-list")).toBeInTheDocument();
  });

  it("shows properties panel when bin is selected", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    // Click the bin in the list
    const binButton = screen.getByTestId("bin-list").querySelector("button")!;
    fireEvent.click(binButton);
    expect(screen.getByTestId("bin-properties")).toBeInTheDocument();
  });

  it("can change height units", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    const binButton = screen.getByTestId("bin-list").querySelector("button")!;
    fireEvent.click(binButton);
    const input = document.getElementById("bin-height") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5" } });
    expect(input).toHaveValue(5);
  });

  it("can toggle stacking lip", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    const binButton = screen.getByTestId("bin-list").querySelector("button")!;
    fireEvent.click(binButton);
    const lipCheckbox = screen.getByLabelText(/stacking lip/i);
    expect(lipCheckbox).toBeChecked();
    fireEvent.click(lipCheckbox);
    expect(lipCheckbox).not.toBeChecked();
  });

  it("can set dividers", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    const binButton = screen.getByTestId("bin-list").querySelector("button")!;
    fireEvent.click(binButton);
    fireEvent.change(screen.getByLabelText(/along width/i), {
      target: { value: "1" },
    });
    expect(screen.getByText(/2 compartments/i)).toBeInTheDocument();
  });

  it("shows multiple bins in list", () => {
    renderWithBins();
    act(() => {
      screen.getByTestId("place-bin").click();
    });
    act(() => {
      screen.getByTestId("place-bin-2").click();
    });
    const buttons = screen.getByTestId("bin-list").querySelectorAll("button");
    expect(buttons).toHaveLength(2);
  });
});
