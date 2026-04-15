import { describe, it, expect } from "vitest";
import {
  createDefaultGridConfig,
  createGridConfig,
  validateGridConfig,
  getGridDerivedValues,
} from "./grid-config";
import type { GridConfig } from "./grid-config";

// ── Cycle 1.1: Types & Defaults ──────────────────────────────────────────────

describe("createDefaultGridConfig", () => {
  it("returns Gridfinity standard defaults", () => {
    const config = createDefaultGridConfig();
    expect(config).toEqual({
      baseUnit: 42,
      heightUnit: 7,
      magnetDiameter: 6,
      magnetThickness: 2,
      screwDiameter: 3,
      mode: "gridfinity",
    });
  });

  it("satisfies the GridConfig type", () => {
    const config: GridConfig = createDefaultGridConfig();
    expect(config.mode).toBe("gridfinity");
  });
});

// ── Cycle 1.2: Factory with Overrides ────────────────────────────────────────

describe("createGridConfig", () => {
  it("accepts partial overrides in custom mode", () => {
    const config = createGridConfig({ mode: "custom", baseUnit: 50 });
    expect(config.baseUnit).toBe(50);
    expect(config.heightUnit).toBe(7); // default preserved
    expect(config.mode).toBe("custom");
  });

  it("allows all fields to be overridden in custom mode", () => {
    const config = createGridConfig({
      mode: "custom",
      baseUnit: 50,
      heightUnit: 10,
      magnetDiameter: 8,
      magnetThickness: 3,
      screwDiameter: 4,
    });
    expect(config.baseUnit).toBe(50);
    expect(config.heightUnit).toBe(10);
    expect(config.magnetDiameter).toBe(8);
    expect(config.magnetThickness).toBe(3);
    expect(config.screwDiameter).toBe(4);
  });

  it("ignores non-standard overrides in gridfinity mode", () => {
    const config = createGridConfig({ mode: "gridfinity", baseUnit: 50 });
    expect(config.baseUnit).toBe(42);
    expect(config.heightUnit).toBe(7);
    expect(config.magnetDiameter).toBe(6);
  });
});

// ── Cycle 1.3: Validation ────────────────────────────────────────────────────

describe("validateGridConfig", () => {
  it("returns valid for default config", () => {
    const result = validateGridConfig(createDefaultGridConfig());
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("returns error for baseUnit <= 0", () => {
    const config = createGridConfig({ mode: "custom", baseUnit: 0 });
    const result = validateGridConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("baseUnit must be greater than 0");
  });

  it("returns error for negative baseUnit", () => {
    const config = createGridConfig({ mode: "custom", baseUnit: -5 });
    const result = validateGridConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("baseUnit must be greater than 0");
  });

  it("returns error for heightUnit <= 0", () => {
    const config = createGridConfig({ mode: "custom", heightUnit: 0 });
    const result = validateGridConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("heightUnit must be greater than 0");
  });

  it("returns error for magnetDiameter <= 0", () => {
    const config = createGridConfig({ mode: "custom", magnetDiameter: 0 });
    const result = validateGridConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("magnetDiameter must be greater than 0");
  });

  it("returns error for magnetThickness <= 0", () => {
    const config = createGridConfig({ mode: "custom", magnetThickness: 0 });
    const result = validateGridConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("magnetThickness must be greater than 0");
  });

  it("returns error for screwDiameter <= 0", () => {
    const config = createGridConfig({ mode: "custom", screwDiameter: 0 });
    const result = validateGridConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("screwDiameter must be greater than 0");
  });

  it("returns multiple errors when multiple fields are invalid", () => {
    const config = createGridConfig({
      mode: "custom",
      baseUnit: -1,
      heightUnit: 0,
    });
    const result = validateGridConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("validates reasonable custom values", () => {
    const config = createGridConfig({
      mode: "custom",
      baseUnit: 50,
      heightUnit: 10,
    });
    const result = validateGridConfig(config);
    expect(result).toEqual({ valid: true, errors: [] });
  });
});

// ── Cycle 1.4: Derived Values ────────────────────────────────────────────────

describe("getGridDerivedValues", () => {
  it("computes magnetHoleDepth with press-fit allowance", () => {
    const config = createDefaultGridConfig();
    const derived = getGridDerivedValues(config);
    // magnet thickness + small press-fit allowance (0.4mm)
    expect(derived.magnetHoleDepth).toBeCloseTo(2.4, 1);
  });

  it("updates derived values for custom config", () => {
    const config = createGridConfig({
      mode: "custom",
      magnetThickness: 3,
    });
    const derived = getGridDerivedValues(config);
    expect(derived.magnetHoleDepth).toBeCloseTo(3.4, 1); // 3 + 0.4
  });
});
