import { describe, it, expect } from "vitest";
import {
  createDefaultBinConfig,
  createBinConfig,
  validateBinConfig,
  getBinDimensions,
} from "./bin-config";
import type { BinConfig } from "./bin-config";
import { createDefaultGridConfig, createGridConfig } from "./grid-config";

// ── Cycle 1.1: Types & Defaults ──────────────────────────────────────────────

describe("createDefaultBinConfig", () => {
  it("returns standard defaults", () => {
    const config = createDefaultBinConfig();
    expect(config).toEqual({
      gridUnitsX: 1,
      gridUnitsY: 1,
      heightUnits: 3,
      wallThickness: 1.2,
      includeStackingLip: true,
      includeMagnetHoles: true,
      includeScrewHoles: false,
      dividersX: 0,
      dividersY: 0,
      dividerHeightUnits: 0,
      includeScoop: false,
      includeBottomHoles: false,
    });
  });

  it("satisfies the BinConfig type", () => {
    const config: BinConfig = createDefaultBinConfig();
    expect(config.gridUnitsX).toBe(1);
  });
});

// ── Cycle 1.2: Factory with Overrides ────────────────────────────────────────

describe("createBinConfig", () => {
  it("accepts partial overrides", () => {
    const config = createBinConfig({ gridUnitsX: 2 });
    expect(config.gridUnitsX).toBe(2);
    expect(config.gridUnitsY).toBe(1);
  });

  it("allows all fields to be overridden", () => {
    const config = createBinConfig({
      gridUnitsX: 3,
      gridUnitsY: 2,
      heightUnits: 5,
      wallThickness: 1.0,
      includeStackingLip: false,
      includeMagnetHoles: false,
      includeScrewHoles: false,
    });
    expect(config.gridUnitsX).toBe(3);
    expect(config.gridUnitsY).toBe(2);
    expect(config.heightUnits).toBe(5);
    expect(config.wallThickness).toBe(1.0);
    expect(config.includeStackingLip).toBe(false);
    expect(config.includeMagnetHoles).toBe(false);
  });
});

// ── Cycle 1.3: Validation ────────────────────────────────────────────────────

describe("validateBinConfig", () => {
  it("returns valid for default config", () => {
    const result = validateBinConfig(createDefaultBinConfig());
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("returns error for gridUnitsX <= 0", () => {
    const result = validateBinConfig(createBinConfig({ gridUnitsX: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("gridUnitsX must be a positive integer");
  });

  it("returns error for gridUnitsY <= 0", () => {
    const result = validateBinConfig(createBinConfig({ gridUnitsY: -1 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("gridUnitsY must be a positive integer");
  });

  it("returns error for heightUnits <= 0", () => {
    const result = validateBinConfig(createBinConfig({ heightUnits: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("heightUnits must be a positive integer");
  });

  it("returns error for non-integer gridUnitsX", () => {
    const result = validateBinConfig(createBinConfig({ gridUnitsX: 1.5 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("gridUnitsX must be a positive integer");
  });

  it("returns error for non-integer heightUnits", () => {
    const result = validateBinConfig(createBinConfig({ heightUnits: 2.5 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("heightUnits must be a positive integer");
  });

  it("returns error for wallThickness <= 0", () => {
    const result = validateBinConfig(createBinConfig({ wallThickness: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("wallThickness must be greater than 0");
  });

  it("returns error when screwHoles enabled but magnetHoles disabled", () => {
    const result = validateBinConfig(
      createBinConfig({ includeScrewHoles: true, includeMagnetHoles: false })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "screw holes require magnet holes to be enabled"
    );
  });

  it("returns multiple errors for multiple invalid fields", () => {
    const result = validateBinConfig(
      createBinConfig({ gridUnitsX: 0, heightUnits: 0, wallThickness: -1 })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("accepts valid non-default config", () => {
    const result = validateBinConfig(
      createBinConfig({ gridUnitsX: 2, gridUnitsY: 3, heightUnits: 5 })
    );
    expect(result).toEqual({ valid: true, errors: [] });
  });
});

// ── Cycle 1.4: Dimension Calculations ────────────────────────────────────────

describe("getBinDimensions", () => {
  const defaultGrid = createDefaultGridConfig();

  it("computes exteriorWidth for 1x1 bin", () => {
    const dims = getBinDimensions(createDefaultBinConfig(), defaultGrid);
    expect(dims.exteriorWidth).toBeCloseTo(42, 1); // 42*1
  });

  it("computes exteriorLength for 1x1 bin", () => {
    const dims = getBinDimensions(createDefaultBinConfig(), defaultGrid);
    expect(dims.exteriorLength).toBeCloseTo(42, 1);
  });

  it("computes exteriorWidth for 2x1 bin", () => {
    const dims = getBinDimensions(
      createBinConfig({ gridUnitsX: 2 }),
      defaultGrid
    );
    expect(dims.exteriorWidth).toBeCloseTo(84, 1); // 42*2
  });

  it("computes exteriorLength for 1x3 bin", () => {
    const dims = getBinDimensions(
      createBinConfig({ gridUnitsY: 3 }),
      defaultGrid
    );
    expect(dims.exteriorLength).toBeCloseTo(126, 1); // 42*3
  });

  it("computes interiorWidth as exterior minus 2*wallThickness", () => {
    const dims = getBinDimensions(createDefaultBinConfig(), defaultGrid);
    expect(dims.interiorWidth).toBeCloseTo(39.6, 1); // 42 - 2*1.2
  });

  it("computes baseHeight as 4.75mm", () => {
    const dims = getBinDimensions(createDefaultBinConfig(), defaultGrid);
    expect(dims.baseHeight).toBeCloseTo(4.75, 2);
  });

  it("computes totalHeight for 3u bin", () => {
    const dims = getBinDimensions(createDefaultBinConfig(), defaultGrid);
    expect(dims.totalHeight).toBeCloseTo(21, 1); // 3 * 7
  });

  it("computes stackingLipHeight as 4.4 when lip enabled", () => {
    const dims = getBinDimensions(createDefaultBinConfig(), defaultGrid);
    expect(dims.stackingLipHeight).toBeCloseTo(4.4, 1);
  });

  it("computes stackingLipHeight as 0 when lip disabled", () => {
    const dims = getBinDimensions(
      createBinConfig({ includeStackingLip: false }),
      defaultGrid
    );
    expect(dims.stackingLipHeight).toBe(0);
  });

  it("computes bodyHeight with lip", () => {
    const dims = getBinDimensions(createDefaultBinConfig(), defaultGrid);
    // 21 - 4.75 - 4.4 = 11.85
    expect(dims.bodyHeight).toBeCloseTo(11.85, 1);
  });

  it("computes bodyHeight without lip", () => {
    const dims = getBinDimensions(
      createBinConfig({ includeStackingLip: false }),
      defaultGrid
    );
    // 21 - 4.75 = 16.25
    expect(dims.bodyHeight).toBeCloseTo(16.25, 1);
  });

  it("computes cornerRadius as 3.75mm", () => {
    const dims = getBinDimensions(createDefaultBinConfig(), defaultGrid);
    expect(dims.cornerRadius).toBeCloseTo(3.75, 2);
  });

  it("works with custom grid config", () => {
    const customGrid = createGridConfig({
      mode: "custom",
      baseUnit: 50,
    });
    const dims = getBinDimensions(createDefaultBinConfig(), customGrid);
    expect(dims.exteriorWidth).toBeCloseTo(50, 1); // 50 * 1
  });
});
