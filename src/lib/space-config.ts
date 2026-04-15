import type { GridConfig, ValidationResult } from "./grid-config";

// ── Types ────────────────────────────────────────────────────────────────────

export type GridAlignment = "start" | "center" | "end";

export interface SpaceConfig {
  width: number; // mm, X dimension of the physical container
  length: number; // mm, Y dimension
  depth: number; // mm, Z dimension (how tall bins can be)
  includeSpacers: boolean; // whether to generate margin spacers
  spacerClearance: number; // mm, gap between spacer and wall (per side)
  gridAlignmentX: GridAlignment; // grid positioning along X (width)
  gridAlignmentY: GridAlignment; // grid positioning along Y (length)
}

export interface SpacerInfo {
  /** Thickness of each spacer on this axis (0 if not needed). */
  width: number;
  /** Number of spacers on this axis (0, 1, or 2). */
  count: number;
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
  /** Offset from the X-start edge of space to the grid's X-start edge. */
  gridOffsetX: number;
  /** Offset from the Y-start edge of space to the grid's Y-start edge. */
  gridOffsetY: number;
  spacerX: SpacerInfo;
  spacerY: SpacerInfo;
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
  includeSpacers: false,
  spacerClearance: 1.0, // 1mm clearance per side (2mm total less than margin)
  gridAlignmentX: "center",
  gridAlignmentY: "center",
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

  // Compute grid offset based on alignment. Offset is distance from the
  // space's start edge to the grid's start edge.
  const gridOffsetX = computeGridOffset(
    space.gridAlignmentX,
    remainderWidth
  );
  const gridOffsetY = computeGridOffset(
    space.gridAlignmentY,
    remainderLength
  );

  // Compute spacer info per axis based on alignment and clearance.
  const spacerX = computeSpacerInfo(
    space.gridAlignmentX,
    remainderWidth,
    space.spacerClearance,
    space.includeSpacers
  );
  const spacerY = computeSpacerInfo(
    space.gridAlignmentY,
    remainderLength,
    space.spacerClearance,
    space.includeSpacers
  );

  return {
    unitsX,
    unitsY,
    usableWidth,
    usableLength,
    remainderWidth,
    remainderLength,
    coveragePercent,
    maxHeightUnits,
    gridOffsetX,
    gridOffsetY,
    spacerX,
    spacerY,
  };
}

function computeGridOffset(
  alignment: GridAlignment,
  remainder: number
): number {
  if (remainder <= 0) return 0;
  if (alignment === "start") return 0;
  if (alignment === "end") return remainder;
  return remainder / 2;
}

function computeSpacerInfo(
  alignment: GridAlignment,
  remainder: number,
  clearance: number,
  enabled: boolean
): SpacerInfo {
  if (!enabled || remainder <= 0) return { width: 0, count: 0 };
  if (alignment === "center") {
    // Two gaps of remainder/2 each. Each spacer thickness = gap - clearance.
    const per = remainder / 2;
    if (per <= clearance) return { width: 0, count: 0 };
    return { width: per - clearance, count: 2 };
  }
  // Single gap of full remainder on the opposite side.
  if (remainder <= clearance) return { width: 0, count: 0 };
  return { width: remainder - clearance, count: 1 };
}

// ── Optimal Base Unit Suggestion ─────────────────────────────────────────────

const MIN_BASE_UNIT = 35;
const MAX_BASE_UNIT = 55;
const SEARCH_STEP = 0.5;

/**
 * Returns up to N diverse base unit suggestions, each with a different
 * (unitsX, unitsY) combination. For each unique grid dimension combo, the
 * best-fitting base unit is kept. Results are sorted by coverage (highest first).
 */
export function suggestTopBaseUnits(
  space: SpaceConfig,
  count = 3
): BaseUnitSuggestion[] {
  // Map from "ux,uy" key to the best (lowest waste) BaseUnitSuggestion for that combo
  const byCombo = new Map<string, BaseUnitSuggestion>();

  for (
    let unit = MIN_BASE_UNIT;
    unit <= MAX_BASE_UNIT;
    unit += SEARCH_STEP
  ) {
    const ux = Math.floor(space.width / unit);
    const uy = Math.floor(space.length / unit);
    if (ux < 2 || uy < 2) continue;

    const usable = ux * unit * uy * unit;
    const total = space.width * space.length;
    const waste = ((total - usable) / total) * 100;

    const key = `${ux},${uy}`;
    const existing = byCombo.get(key);
    if (!existing || waste < existing.wastePercent) {
      byCombo.set(key, {
        baseUnit: unit,
        wastePercent: waste,
        unitsX: ux,
        unitsY: uy,
      });
    }
  }

  // Sort by waste (ascending) and take the top N
  return [...byCombo.values()]
    .sort((a, b) => a.wastePercent - b.wastePercent)
    .slice(0, count);
}

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
