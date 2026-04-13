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
  it("has 5 steps", () => {
    expect(WIZARD_STEPS).toHaveLength(5);
  });

  it("starts with space-grid", () => {
    expect(WIZARD_STEPS[0]).toBe("space-grid");
  });

  it("has layout as step 2", () => {
    expect(WIZARD_STEPS[1]).toBe("layout");
  });

  it("has bin-editor as step 3", () => {
    expect(WIZARD_STEPS[2]).toBe("bin-editor");
  });

  it("has baseplate-editor as step 4", () => {
    expect(WIZARD_STEPS[3]).toBe("baseplate-editor");
  });

  it("ends with print-export", () => {
    expect(WIZARD_STEPS[4]).toBe("print-export");
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

  it("returns 4 for last step", () => {
    expect(getStepIndex("print-export")).toBe(4);
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
  it("next from space-grid is layout", () => {
    expect(getNextStep("space-grid")).toBe("layout");
  });

  it("next from layout is bin-editor", () => {
    expect(getNextStep("layout")).toBe("bin-editor");
  });

  it("next from last step is undefined", () => {
    expect(getNextStep("print-export")).toBeUndefined();
  });

  it("prev from layout is space-grid", () => {
    expect(getPrevStep("layout")).toBe("space-grid");
  });

  it("prev from first step is undefined", () => {
    expect(getPrevStep("space-grid")).toBeUndefined();
  });
});
