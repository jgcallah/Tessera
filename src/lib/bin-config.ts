import type { GridConfig, ValidationResult } from "./grid-config";

// ── Gridfinity Bin Constants ─────────────────────────────────────────────────

export const GRIDFINITY_BASE_HEIGHT = 4.75;
export const GRIDFINITY_LIP_HEIGHT = 4.4;
export const GRIDFINITY_CORNER_RADIUS = 3.75;
export const GRIDFINITY_MAGNET_HOLE_INSET = 8;

// ── Types ────────────────────────────────────────────────────────────────────

export interface BinConfig {
  gridUnitsX: number;
  gridUnitsY: number;
  heightUnits: number;
  wallThickness: number;
  includeStackingLip: boolean;
  includeMagnetHoles: boolean;
  includeScrewHoles: boolean;
}

export interface BinDimensions {
  exteriorWidth: number;
  exteriorLength: number;
  interiorWidth: number;
  interiorLength: number;
  totalHeight: number;
  baseHeight: number;
  bodyHeight: number;
  stackingLipHeight: number;
  usableInteriorHeight: number;
  cornerRadius: number;
}

// ── Factory Functions ────────────────────────────────────────────────────────

const BIN_DEFAULTS: Readonly<BinConfig> = {
  gridUnitsX: 1,
  gridUnitsY: 1,
  heightUnits: 3,
  wallThickness: 1.2,
  includeStackingLip: true,
  includeMagnetHoles: true,
  includeScrewHoles: false,
};

export function createDefaultBinConfig(): BinConfig {
  return { ...BIN_DEFAULTS };
}

export function createBinConfig(overrides: Partial<BinConfig> = {}): BinConfig {
  return { ...BIN_DEFAULTS, ...overrides };
}

// ── Validation ───────────────────────────────────────────────────────────────

function isPositiveInteger(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

export function validateBinConfig(config: BinConfig): ValidationResult {
  const errors: string[] = [];

  if (!isPositiveInteger(config.gridUnitsX)) {
    errors.push("gridUnitsX must be a positive integer");
  }
  if (!isPositiveInteger(config.gridUnitsY)) {
    errors.push("gridUnitsY must be a positive integer");
  }
  if (!isPositiveInteger(config.heightUnits)) {
    errors.push("heightUnits must be a positive integer");
  }
  if (config.wallThickness <= 0) {
    errors.push("wallThickness must be greater than 0");
  }
  if (config.includeScrewHoles && !config.includeMagnetHoles) {
    errors.push("screw holes require magnet holes to be enabled");
  }

  return { valid: errors.length === 0, errors };
}

// ── Dimension Calculations ───────────────────────────────────────────────────

export function getBinDimensions(
  binConfig: BinConfig,
  gridConfig: GridConfig
): BinDimensions {
  const exteriorWidth =
    gridConfig.baseUnit * binConfig.gridUnitsX - gridConfig.tolerance;
  const exteriorLength =
    gridConfig.baseUnit * binConfig.gridUnitsY - gridConfig.tolerance;
  const interiorWidth = exteriorWidth - 2 * binConfig.wallThickness;
  const interiorLength = exteriorLength - 2 * binConfig.wallThickness;

  const totalHeight = binConfig.heightUnits * gridConfig.heightUnit;
  const baseHeight = GRIDFINITY_BASE_HEIGHT;
  const stackingLipHeight = binConfig.includeStackingLip
    ? GRIDFINITY_LIP_HEIGHT
    : 0;
  const bodyHeight = totalHeight - baseHeight - stackingLipHeight;
  const usableInteriorHeight = totalHeight - baseHeight - stackingLipHeight;

  return {
    exteriorWidth,
    exteriorLength,
    interiorWidth,
    interiorLength,
    totalHeight,
    baseHeight,
    bodyHeight,
    stackingLipHeight,
    usableInteriorHeight,
    cornerRadius: GRIDFINITY_CORNER_RADIUS,
  };
}
