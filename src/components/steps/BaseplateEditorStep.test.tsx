import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BaseplateEditorStep } from "./BaseplateEditorStep";

describe("BaseplateEditorStep", () => {
  it("renders the heading", () => {
    render(<BaseplateEditorStep />);
    expect(screen.getByText("Baseplate Editor")).toBeInTheDocument();
  });
});
