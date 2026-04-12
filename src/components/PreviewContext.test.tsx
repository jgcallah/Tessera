import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { PreviewProvider, usePreview } from "./PreviewContext";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

function ModeReader() {
  const { mode } = usePreview();
  return <span data-testid="mode">{mode}</span>;
}

function ModeUpdater() {
  const { mode, setMode } = usePreview();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button
        data-testid="set-bin"
        onClick={() => {
          setMode("bin");
        }}
      />
      <button
        data-testid="set-baseplate"
        onClick={() => {
          setMode("baseplate");
        }}
      />
      <button
        data-testid="set-assembled"
        onClick={() => {
          setMode("assembled");
        }}
      />
    </div>
  );
}

describe("PreviewProvider", () => {
  it("renders children", () => {
    render(
      <PreviewProvider>
        <span>child</span>
      </PreviewProvider>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("defaults to assembled mode", () => {
    render(
      <PreviewProvider>
        <ModeReader />
      </PreviewProvider>
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("assembled");
  });

  it("accepts an initial mode", () => {
    render(
      <PreviewProvider initialMode="bin">
        <ModeReader />
      </PreviewProvider>
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("bin");
  });
});

describe("usePreview", () => {
  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<ModeReader />);
    }).toThrow("usePreview must be used within a PreviewProvider");
    spy.mockRestore();
  });
});

describe("preview mode updates", () => {
  it("switches to bin mode", () => {
    render(
      <PreviewProvider>
        <ModeUpdater />
      </PreviewProvider>
    );
    act(() => {
      screen.getByTestId("set-bin").click();
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("bin");
  });

  it("switches to baseplate mode", () => {
    render(
      <PreviewProvider>
        <ModeUpdater />
      </PreviewProvider>
    );
    act(() => {
      screen.getByTestId("set-baseplate").click();
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("baseplate");
  });

  it("switches back to assembled mode", () => {
    render(
      <PreviewProvider>
        <ModeUpdater />
      </PreviewProvider>
    );
    act(() => {
      screen.getByTestId("set-bin").click();
    });
    act(() => {
      screen.getByTestId("set-assembled").click();
    });
    expect(screen.getByTestId("mode")).toHaveTextContent("assembled");
  });
});
