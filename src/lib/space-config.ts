import type { GridConfig, ValidationResult } from "./grid-config";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SpaceConfig {
  width: number; // mm, X dimension of the physical container
  length: number; // mm, Y dimension
  depth: number; // mm, Z dimension (how tall bins can be)
}

export interface GridFit {
  unitsX: number;
  unitsY: number;
  usableWidth: number;
  usableLength: number;
  remainderWidth: number;
  remainderLength: number;
  coveragePercent: number;
  maxHeightUnits: number;
}

export interface BaseUnitSuggestion {
  baseUnit: number;
  wastePercent: number;
  unitsX: number;
  unitsY: number;
}

// ── Factory ──────────────────────────────────────────────────────────────────

const SPACE_DEFAULTS: Readonly<SpaceConfig> = {
  width: 400,
  length: 300,
  depth: 50,
};

export function createDefaultSpaceConfig(): SpaceConfig {
  return { ...SPACE_DEFAULTS };
}

export function createSpaceConfig(
  overrides: Partial<SpaceConfig> = {}
): SpaceConfig {
  return { ...SPACE_DEFAULTS, ...overrides };
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validateSpaceConfig(config: SpaceConfig): ValidationResult {
  const errors: string[] = [];

  if (config.width <= 0) {
    errors.push("width must be greater than 0");
  }
  if (config.length <= 0) {
    errors.push("length must be greater than 0");
  }
  if (config.depth <= 0) {
    errors.push("depth must be greater than 0");
  }

  return { valid: errors.length === 0, errors };
}

// ── Grid Fitting ─────────────────────────────────────────────────────────────

export function getGridFit(space: SpaceConfig, gridConfig: GridConfig): GridFit {
  const baseUnit = gridConfig.baseUnit;
  const unitsX = Math.floor(space.width / baseUnit);
  const unitsY = Math.floor(space.length / baseUnit);

  const usableWidth = unitsX * baseUnit;
  const usableLength = unitsY * baseUnit;
  const remainderWidth = space.width - usableWidth;
  const remainderLength = space.length - usableLength;

  const totalArea = space.width * space.length;
  const usableArea = usableWidth * usableLength;
  const coveragePercent = totalArea > 0 ? (usableArea / totalArea) * 100 : 0;

  const maxHeightUnits = Math.floor(space.depth / gridConfig.heightUnit);

  return {
    unitsX,
    unitsY,
    usableWidth,
    usableLength,
    remainderWidth,
    remainderLength,
    coveragePercent,
    maxHeightUnits,
  };
}

// ── Optimal Base Unit Suggestion ─────────────────────────────────────────────

const MIN_BASE_UNIT = 35;
const MAX_BASE_UNIT = 55;
const SEARCH_STEP = 0.5;

export function suggestOptimalBaseUnit(space: SpaceConfig): BaseUnitSuggestion {
  let bestUnit = 42;
  let bestWaste = 100;
  let bestUnitsX = 0;
  let bestUnitsY = 0;

  for (
    let unit = MIN_BASE_UNIT;
    unit <= MAX_BASE_UNIT;
    unit += SEARCH_STEP
  ) {
    const ux = Math.floor(space.width / unit);
    const uy = Math.floor(space.length / unit);

    // Must fit at least 2 units per axis to be useful
    if (ux < 2 || uy < 2) continue;

    const usable = ux * unit * uy * unit;
    const total = space.width * space.length;
    const waste = ((total - usable) / total) * 100;

    if (waste < bestWaste) {
      bestWaste = waste;
      bestUnit = unit;
      bestUnitsX = ux;
      bestUnitsY = uy;
    }
  }

  return {
    baseUnit: bestUnit,
    wastePercent: bestWaste,
    unitsX: bestUnitsX,
    unitsY: bestUnitsY,
  };
}
