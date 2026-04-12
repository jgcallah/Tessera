import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreviewProvider } from "./PreviewContext";
import { PreviewModeToggle } from "./PreviewModeToggle";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function renderToggle() {
  return render(
    <PreviewProvider>
      <PreviewModeToggle />
    </PreviewProvider>
  );
}

describe("PreviewModeToggle", () => {
  it("renders three mode buttons", () => {
    renderToggle();
    expect(screen.getByRole("button", { name: /assembled/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bin/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /baseplate/i })).toBeInTheDocument();
  });

  it("assembled is active by default", () => {
    renderToggle();
    expect(
      screen.getByRole("button", { name: /assembled/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /^bin$/i })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking bin sets it as active", () => {
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: /^bin$/i }));
    expect(
      screen.getByRole("button", { name: /^bin$/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /assembled/i })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking baseplate sets it as active", () => {
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: /baseplate/i }));
    expect(
      screen.getByRole("button", { name: /baseplate/i })
    ).toHaveAttribute("aria-pressed", "true");
  });
});
