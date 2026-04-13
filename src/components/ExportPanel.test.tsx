import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";
import { LayoutProvider, useLayout } from "./LayoutContext";
import { ExportPanel } from "./ExportPanel";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));
vi.mock("./ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function PlaceAndExport({ count }: { count: number }) {
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
      <ExportPanel />
    </div>
  );
}

function renderExport(count = 0) {
  return render(
    <GridConfigProvider>
      <SpaceConfigProvider>
        <LayoutProvider>
          <PlaceAndExport count={count} />
        </LayoutProvider>
      </SpaceConfigProvider>
    </GridConfigProvider>
  );
}

describe("ExportPanel — basic render", () => {
  it("renders the heading", () => {
    renderExport();
    expect(screen.getByText("Export")).toBeInTheDocument();
  });

  it("shows empty state when no parts", () => {
    renderExport();
    expect(
      screen.getByText(/place bins in the layout/i)
    ).toBeInTheDocument();
  });

  it("does not show download buttons when no parts", () => {
    renderExport();
    expect(screen.queryByTestId("export-zip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("export-print-plan")).not.toBeInTheDocument();
  });
});

describe("ExportPanel — with parts", () => {
  it("shows download buttons after placing bins", () => {
    renderExport(3);
    act(() => {
      screen.getByTestId("place-0").click();
    });
    act(() => {
      screen.getByTestId("place-1").click();
    });
    expect(screen.getByTestId("export-zip")).toBeInTheDocument();
    expect(screen.getByTestId("export-print-plan")).toBeInTheDocument();
  });

  it("shows part count summary", () => {
    renderExport(2);
    act(() => {
      screen.getByTestId("place-0").click();
    });
    act(() => {
      screen.getByTestId("place-1").click();
    });
    expect(screen.getByText(/1 unique part/i)).toBeInTheDocument();
    expect(screen.getByText(/2 total/i)).toBeInTheDocument();
  });

  it("zip button has correct label", () => {
    renderExport(1);
    act(() => {
      screen.getByTestId("place-0").click();
    });
    expect(screen.getByTestId("export-zip")).toHaveTextContent(
      /download all stls/i
    );
  });

  it("print plan button has correct label", () => {
    renderExport(1);
    act(() => {
      screen.getByTestId("place-0").click();
    });
    expect(screen.getByTestId("export-print-plan")).toHaveTextContent(
      /export print plan/i
    );
  });
});
