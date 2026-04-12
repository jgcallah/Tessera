import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

vi.mock("@react-three/fiber", () => import("../__mocks__/@react-three/fiber"));
vi.mock("@react-three/drei", () => import("../__mocks__/@react-three/drei"));

describe("App", () => {
  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByText("Tessera")).toBeInTheDocument();
  });
});
