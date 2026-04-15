import type { GridConfig, ValidationResult } from "./grid-config";
import { isPositiveInteger } from "./validation-utils";

// ── Gridfinity Bin Constants ─────────────────────────────────────────────────

export const GRIDFINITY_BASE_HEIGHT = 4.75;
export const GRIDFINITY_LIP_HEIGHT = 4.4;
export const GRIDFINITY_CORNER_RADIUS = 3.75;
export const GRIDFINITY_MAGNET_HOLE_INSET = 8;

// ── Bin Base Profile (chamfered bottom that mates with baseplate socket) ─────
// 3 segments from bottom to top, all chamfers at 45°
export const BASE_CHAMFER_1 = 0.8; // bottom 45° segment (height & horizontal)
export const BASE_VERTICAL = 1.8; // middle vertical segment
export const BASE_CHAMFER_2 = 2.15; // top 45° segment (height & horizontal)
export const BASE_TOTAL_INSET = 2.95; // 0.8 + 2.15 — total horizontal depth

// ── Stacking Lip Profile (inverse of base, carved from top of bin) ──────────
// 3 segments from lip bottom to top, all chamfers at 45°
export const LIP_CHAMFER_BOTTOM = 0.7; // bottom 45° segment
export const LIP_VERTICAL = 1.8; // middle vertical segment
export const LIP_CHAMFER_TOP = 1.9; // top 45° segment
export const LIP_TOTAL_DEPTH = 2.6; // 0.7 + 1.9 — total horizontal depth
export const LIP_LEDGE = 0.4; // horizontal ledge at very top of lip

// ── Lip Support ─────────────────────────────────────────────────────────────
// Below the lip profile, the wall tapers from body wall thickness out to the
// full lip depth. Support height ≈ lip depth at 45°, plus a min vertical.
export const LIP_SUPPORT_MIN_HEIGHT = 1.2; // minimum vertical support below taper

// ── Interior ────────────────────────────────────────────────────────────────
export const INTERIOR_FILLET_RADIUS = 0.4; // small floor-to-wall chamfer for print strength
export const BRIDGE_THICKNESS = 1.21; // floor connecting base pads to body cavity
export const DIVIDER_THICKNESS = 1.2; // internal divider wall thickness

// ── Scoop ───────────────────────────────────────────────────────────────────
// The scoop is a curved cutout on the front (-Y) wall making it easier to
// grab items. Modeled as a cylinder subtraction from the interior.
export const SCOOP_RADIUS_RATIO = 0.8; // fraction of interior width used as scoop radius

// ── Bottom Holes ────────────────────────────────────────────────────────────
// Array of holes in the floor for drainage or weight reduction.
export const BOTTOM_HOLE_DIAMETER = 5; // mm
export const BOTTOM_HOLE_SPACING = 10; // mm center-to-center

// ── Types ────────────────────────────────────────────────────────────────────

export interface BinConfig {
  gridUnitsX: number;
  gridUnitsY: number;
  heightUnits: number;
  wallThickness: number;
  includeStackingLip: boolean;
  includeMagnetHoles: boolean;
  includeScrewHoles: boolean;
  dividersX: number;
  dividersY: number;
  dividerHeightUnits: number; // 0 = full cavity height
  includeScoop: boolean;
  includeBottomHoles: boolean;
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
  dividersX: 0,
  dividersY: 0,
  dividerHeightUnits: 0,
  includeScoop: false,
  includeBottomHoles: false,
};

export function createDefaultBinConfig(): BinConfig {
  return { ...BIN_DEFAULTS };
}

export function createBinConfig(overrides: Partial<BinConfig> = {}): BinConfig {
  return { ...BIN_DEFAULTS, ...overrides };
}

// ── Validation ───────────────────────────────────────────────────────────────

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
  const exteriorWidth = gridConfig.baseUnit * binConfig.gridUnitsX;
  const exteriorLength = gridConfig.baseUnit * binConfig.gridUnitsY;
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
