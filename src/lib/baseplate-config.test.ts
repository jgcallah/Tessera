import { describe, it, expect } from "vitest";
import {
  createDefaultBaseplateConfig,
  createBaseplateConfig,
  validateBaseplateConfig,
  getBaseplateDimensions,
} from "./baseplate-config";
import type { BaseplateConfig } from "./baseplate-config";
import { createDefaultGridConfig, createGridConfig } from "./grid-config";

// ── Defaults ─────────────────────────────────────────────────────────────────

describe("createDefaultBaseplateConfig", () => {
  it("returns standard defaults", () => {
    const config = createDefaultBaseplateConfig();
    expect(config).toEqual({
      gridUnitsX: 1,
      gridUnitsY: 1,
      includeMagnetHoles: true,
      includeScrewHoles: false,
    });
  });

  it("satisfies the BaseplateConfig type", () => {
    const config: BaseplateConfig = createDefaultBaseplateConfig();
    expect(config.gridUnitsX).toBe(1);
  });
});

// ── Factory ──────────────────────────────────────────────────────────────────

describe("createBaseplateConfig", () => {
  it("accepts partial overrides", () => {
    const config = createBaseplateConfig({ gridUnitsX: 5 });
    expect(config.gridUnitsX).toBe(5);
    expect(config.gridUnitsY).toBe(1);
  });

  it("allows all fields to be overridden", () => {
    const config = createBaseplateConfig({
      gridUnitsX: 4,
      gridUnitsY: 3,
      includeMagnetHoles: false,
      includeScrewHoles: false,
    });
    expect(config.gridUnitsX).toBe(4);
    expect(config.gridUnitsY).toBe(3);
    expect(config.includeMagnetHoles).toBe(false);
  });
});

// ── Validation ───────────────────────────────────────────────────────────────

describe("validateBaseplateConfig", () => {
  it("returns valid for default config", () => {
    const result = validateBaseplateConfig(createDefaultBaseplateConfig());
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("returns error for gridUnitsX <= 0", () => {
    const result = validateBaseplateConfig(
      createBaseplateConfig({ gridUnitsX: 0 })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("gridUnitsX must be a positive integer");
  });

  it("returns error for non-integer gridUnitsY", () => {
    const result = validateBaseplateConfig(
      createBaseplateConfig({ gridUnitsY: 1.5 })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("gridUnitsY must be a positive integer");
  });

  it("returns error when screwHoles enabled but magnetHoles disabled", () => {
    const result = validateBaseplateConfig(
      createBaseplateConfig({ includeScrewHoles: true, includeMagnetHoles: false })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "screw holes require magnet holes to be enabled"
    );
  });

  it("accepts valid non-default config", () => {
    const result = validateBaseplateConfig(
      createBaseplateConfig({ gridUnitsX: 5, gridUnitsY: 4 })
    );
    expect(result).toEqual({ valid: true, errors: [] });
  });
});

// ── Dimensions ───────────────────────────────────────────────────────────────

describe("getBaseplateDimensions", () => {
  const defaultGrid = createDefaultGridConfig();

  it("computes width for 1x1 baseplate", () => {
    const dims = getBaseplateDimensions(
      createDefaultBaseplateConfig(),
      defaultGrid
    );
    expect(dims.width).toBeCloseTo(42, 1);
  });

  it("computes width for 5x1 baseplate", () => {
    const dims = getBaseplateDimensions(
      createBaseplateConfig({ gridUnitsX: 5 }),
      defaultGrid
    );
    expect(dims.width).toBeCloseTo(210, 1); // 42 * 5
  });

  it("computes length for 1x4 baseplate", () => {
    const dims = getBaseplateDimensions(
      createBaseplateConfig({ gridUnitsY: 4 }),
      defaultGrid
    );
    expect(dims.length).toBeCloseTo(168, 1); // 42 * 4
  });

  it("computes total height as 4.65mm", () => {
    const dims = getBaseplateDimensions(
      createDefaultBaseplateConfig(),
      defaultGrid
    );
    expect(dims.totalHeight).toBeCloseTo(4.65, 2);
  });

  it("computes plateThickness as 2.0mm", () => {
    const dims = getBaseplateDimensions(
      createDefaultBaseplateConfig(),
      defaultGrid
    );
    expect(dims.plateThickness).toBeCloseTo(2.0, 1);
  });

  it("computes pocketDepth", () => {
    const dims = getBaseplateDimensions(
      createDefaultBaseplateConfig(),
      defaultGrid
    );
    expect(dims.pocketDepth).toBeCloseTo(2.65, 1); // 4.65 - 2.0
  });

  it("computes cornerRadius as 4.0mm", () => {
    const dims = getBaseplateDimensions(
      createDefaultBaseplateConfig(),
      defaultGrid
    );
    expect(dims.cornerRadius).toBeCloseTo(4.0, 1);
  });

  it("works with custom grid config", () => {
    const customGrid = createGridConfig({
      mode: "custom",
      baseUnit: 50,
    });
    const dims = getBaseplateDimensions(
      createBaseplateConfig({ gridUnitsX: 3 }),
      customGrid
    );
    expect(dims.width).toBeCloseTo(150, 1); // 50 * 3
  });
});
