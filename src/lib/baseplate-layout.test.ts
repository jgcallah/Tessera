import { describe, it, expect } from "vitest";
import { createBaseplateItem, createSpacerPiece } from "./baseplate-layout";

describe("createBaseplateItem", () => {
  it("generates 100 unique, correctly-prefixed IDs", () => {
    const ids = Array.from({ length: 100 }, () =>
      createBaseplateItem(0, 0, 1, 1).id
    );
    expect(new Set(ids).size).toBe(100);
    for (const id of ids) {
      expect(id.startsWith("bp-")).toBe(true);
    }
  });
});

describe("createSpacerPiece", () => {
  it("generates 100 unique, correctly-prefixed IDs", () => {
    const ids = Array.from({ length: 100 }, () =>
      createSpacerPiece("left", 0, 1).id
    );
    expect(new Set(ids).size).toBe(100);
    for (const id of ids) {
      expect(id.startsWith("sp-")).toBe(true);
    }
  });
});
