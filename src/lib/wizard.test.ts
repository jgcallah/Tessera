import { describe, it, expect } from "vitest";
import {
  WIZARD_STEPS,
  STEP_LABELS,
  getStepIndex,
  canGoNext,
  canGoPrev,
  getNextStep,
  getPrevStep,
} from "./wizard";

describe("WIZARD_STEPS", () => {
  it("has 4 steps", () => {
    expect(WIZARD_STEPS).toHaveLength(4);
  });

  it("starts with space-grid", () => {
    expect(WIZARD_STEPS[0]).toBe("space-grid");
  });

  it("ends with print-export", () => {
    expect(WIZARD_STEPS[3]).toBe("print-export");
  });
});

describe("STEP_LABELS", () => {
  it("has a label for every step", () => {
    for (const step of WIZARD_STEPS) {
      expect(STEP_LABELS[step]).toBeTruthy();
    }
  });
});

describe("getStepIndex", () => {
  it("returns 0 for first step", () => {
    expect(getStepIndex("space-grid")).toBe(0);
  });

  it("returns 3 for last step", () => {
    expect(getStepIndex("print-export")).toBe(3);
  });
});

describe("canGoNext / canGoPrev", () => {
  it("can go next from first step", () => {
    expect(canGoNext("space-grid")).toBe(true);
  });

  it("cannot go next from last step", () => {
    expect(canGoNext("print-export")).toBe(false);
  });

  it("cannot go prev from first step", () => {
    expect(canGoPrev("space-grid")).toBe(false);
  });

  it("can go prev from last step", () => {
    expect(canGoPrev("print-export")).toBe(true);
  });
});

describe("getNextStep / getPrevStep", () => {
  it("next from space-grid is part-design", () => {
    expect(getNextStep("space-grid")).toBe("part-design");
  });

  it("next from last step is undefined", () => {
    expect(getNextStep("print-export")).toBeUndefined();
  });

  it("prev from part-design is space-grid", () => {
    expect(getPrevStep("part-design")).toBe("space-grid");
  });

  it("prev from first step is undefined", () => {
    expect(getPrevStep("space-grid")).toBeUndefined();
  });
});
