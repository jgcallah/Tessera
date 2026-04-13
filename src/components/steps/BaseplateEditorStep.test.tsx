import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GridConfigProvider } from "../GridConfigContext";
import { BaseplateConfigProvider } from "../BaseplateConfigContext";
import { BaseplateEditorStep } from "./BaseplateEditorStep";

vi.mock("@react-three/fiber", () => import("../../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../../__mocks__/@react-three/drei"));

function renderStep() {
  return render(
    <GridConfigProvider>
      <BaseplateConfigProvider>
        <BaseplateEditorStep />
      </BaseplateConfigProvider>
    </GridConfigProvider>
  );
}

describe("BaseplateEditorStep", () => {
  it("renders the heading", () => {
    renderStep();
    expect(
      screen.getByRole("heading", { name: /baseplate editor/i })
    ).toBeInTheDocument();
  });

  it("shows style toggle (standard/skeleton)", () => {
    renderStep();
    expect(
      screen.getByRole("button", { name: /standard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /skeleton/i })
    ).toBeInTheDocument();
  });

  it("shows feature checkboxes", () => {
    renderStep();
    expect(screen.getByLabelText(/magnet holes/i)).toBeChecked();
    expect(screen.getByLabelText(/snap-in connectors/i)).not.toBeChecked();
  });

  it("can switch to skeleton style", () => {
    renderStep();
    fireEvent.click(screen.getByRole("button", { name: /skeleton/i }));
    expect(
      screen.getByRole("button", { name: /skeleton/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows dimensions", () => {
    renderStep();
    expect(screen.getByText(/4\.65 mm/)).toBeInTheDocument();
  });
});
