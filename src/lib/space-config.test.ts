import { describe, it, expect } from "vitest";
import {
  createDefaultSpaceConfig,
  createSpaceConfig,
  validateSpaceConfig,
  getGridFit,
  suggestOptimalBaseUnit,
} from "./space-config";
import type { SpaceConfig } from "./space-config";
import { createDefaultGridConfig, createGridConfig } from "./grid-config";

// ── Defaults ─────────────────────────────────────────────────────────────────

describe("createDefaultSpaceConfig", () => {
  it("returns standard defaults", () => {
    const config = createDefaultSpaceConfig();
    expect(config).toEqual({
      width: 400,
      length: 300,
      depth: 50,
    });
  });

  it("satisfies the SpaceConfig type", () => {
    const config: SpaceConfig = createDefaultSpaceConfig();
    expect(config.width).toBe(400);
  });
});

// ── Factory ──────────────────────────────────────────────────────────────────

describe("createSpaceConfig", () => {
  it("accepts partial overrides", () => {
    const config = createSpaceConfig({ width: 600 });
    expect(config.width).toBe(600);
    expect(config.length).toBe(300);
  });

  it("allows all fields to be overridden", () => {
    const config = createSpaceConfig({ width: 500, length: 400, depth: 80 });
    expect(config.width).toBe(500);
    expect(config.length).toBe(400);
    expect(config.depth).toBe(80);
  });
});

// ── Validation ───────────────────────────────────────────────────────────────

describe("validateSpaceConfig", () => {
  it("returns valid for default config", () => {
    const result = validateSpaceConfig(createDefaultSpaceConfig());
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("returns error for width <= 0", () => {
    const result = validateSpaceConfig(createSpaceConfig({ width: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("width must be greater than 0");
  });

  it("returns error for length <= 0", () => {
    const result = validateSpaceConfig(createSpaceConfig({ length: -10 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("length must be greater than 0");
  });

  it("returns error for depth <= 0", () => {
    const result = validateSpaceConfig(createSpaceConfig({ depth: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("depth must be greater than 0");
  });
});

// ── Grid Fitting ─────────────────────────────────────────────────────────────

describe("getGridFit", () => {
  const defaultGrid = createDefaultGridConfig();

  it("calculates grid units that fit in 400x300mm space", () => {
    const fit = getGridFit(createDefaultSpaceConfig(), defaultGrid);
    expect(fit.unitsX).toBe(9); // floor(400 / 42) = 9
    expect(fit.unitsY).toBe(7); // floor(300 / 42) = 7
  });

  it("calculates usable space", () => {
    const fit = getGridFit(createDefaultSpaceConfig(), defaultGrid);
    expect(fit.usableWidth).toBeCloseTo(378, 0); // 9 * 42
    expect(fit.usableLength).toBeCloseTo(294, 0); // 7 * 42
  });

  it("calculates remainder (waste) space", () => {
    const fit = getGridFit(createDefaultSpaceConfig(), defaultGrid);
    expect(fit.remainderWidth).toBeCloseTo(22, 0); // 400 - 378
    expect(fit.remainderLength).toBeCloseTo(6, 0); // 300 - 294
  });

  it("calculates coverage percentage", () => {
    const fit = getGridFit(createDefaultSpaceConfig(), defaultGrid);
    // (378 * 294) / (400 * 300) = 111132 / 120000 = 0.9261
    expect(fit.coveragePercent).toBeGreaterThan(90);
    expect(fit.coveragePercent).toBeLessThan(100);
  });

  it("calculates max height units from depth", () => {
    const fit = getGridFit(createDefaultSpaceConfig(), defaultGrid);
    // depth=50, heightUnit=7: floor(50 / 7) = 7
    expect(fit.maxHeightUnits).toBe(7);
  });

  it("handles exact fit with zero remainder", () => {
    const space = createSpaceConfig({ width: 420, length: 210 });
    const fit = getGridFit(space, defaultGrid);
    expect(fit.unitsX).toBe(10); // 420 / 42
    expect(fit.unitsY).toBe(5); // 210 / 42
    expect(fit.remainderWidth).toBeCloseTo(0, 1);
    expect(fit.remainderLength).toBeCloseTo(0, 1);
    expect(fit.coveragePercent).toBeCloseTo(100, 0);
  });

  it("handles space smaller than one grid unit", () => {
    const space = createSpaceConfig({ width: 30, length: 30 });
    const fit = getGridFit(space, defaultGrid);
    expect(fit.unitsX).toBe(0);
    expect(fit.unitsY).toBe(0);
    expect(fit.coveragePercent).toBe(0);
  });

  it("works with custom grid config", () => {
    const customGrid = createGridConfig({
      mode: "custom",
      baseUnit: 50,
    });
    const fit = getGridFit(createDefaultSpaceConfig(), customGrid);
    expect(fit.unitsX).toBe(8); // floor(400 / 50) = 8
    expect(fit.unitsY).toBe(6); // floor(300 / 50) = 6
  });
});

// ── Optimal Base Unit Suggestion ─────────────────────────────────────────────

describe("suggestOptimalBaseUnit", () => {
  it("suggests a base unit that minimizes waste", () => {
    const space = createSpaceConfig({ width: 400, length: 300 });
    const suggestion = suggestOptimalBaseUnit(space);
    // The optimal unit should produce less waste than 42mm
    expect(suggestion.baseUnit).toBeGreaterThan(30);
    expect(suggestion.baseUnit).toBeLessThan(60);
    expect(suggestion.wastePercent).toBeLessThan(10);
  });

  it("returns exact fit when dimensions are divisible", () => {
    const space = createSpaceConfig({ width: 200, length: 150 });
    const suggestion = suggestOptimalBaseUnit(space);
    expect(suggestion.wastePercent).toBeCloseTo(0, 0);
  });

  it("suggested unit produces at least 2 units per axis", () => {
    const space = createSpaceConfig({ width: 400, length: 300 });
    const suggestion = suggestOptimalBaseUnit(space);
    expect(Math.floor(400 / suggestion.baseUnit)).toBeGreaterThanOrEqual(2);
    expect(Math.floor(300 / suggestion.baseUnit)).toBeGreaterThanOrEqual(2);
  });

  it("stays within reasonable range (35-55mm)", () => {
    const space = createSpaceConfig({ width: 400, length: 300 });
    const suggestion = suggestOptimalBaseUnit(space);
    expect(suggestion.baseUnit).toBeGreaterThanOrEqual(35);
    expect(suggestion.baseUnit).toBeLessThanOrEqual(55);
  });
});
