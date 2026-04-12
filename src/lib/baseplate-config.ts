import type { GridConfig, ValidationResult } from "./grid-config";

// ── Gridfinity Baseplate Constants ───────────────────────────────────────────

export const BASEPLATE_TOTAL_HEIGHT = 4.65;
export const BASEPLATE_PLATE_THICKNESS = 2.0;
export const BASEPLATE_POCKET_DEPTH =
  BASEPLATE_TOTAL_HEIGHT - BASEPLATE_PLATE_THICKNESS;
export const BASEPLATE_CORNER_RADIUS = 4.0;

// ── Types ────────────────────────────────────────────────────────────────────

export interface BaseplateConfig {
  gridUnitsX: number;
  gridUnitsY: number;
  includeMagnetHoles: boolean;
  includeScrewHoles: boolean;
}

export interface BaseplateDimensions {
  width: number;
  length: number;
  totalHeight: number;
  plateThickness: number;
  pocketDepth: number;
  cornerRadius: number;
}

// ── Factory ──────────────────────────────────────────────────────────────────

const BASEPLATE_DEFAULTS: Readonly<BaseplateConfig> = {
  gridUnitsX: 1,
  gridUnitsY: 1,
  includeMagnetHoles: true,
  includeScrewHoles: false,
};

export function createDefaultBaseplateConfig(): BaseplateConfig {
  return { ...BASEPLATE_DEFAULTS };
}

export function createBaseplateConfig(
  overrides: Partial<BaseplateConfig> = {}
): BaseplateConfig {
  return { ...BASEPLATE_DEFAULTS, ...overrides };
}

// ── Validation ───────────────────────────────────────────────────────────────

function isPositiveInteger(n: number): boolean {
  return Number.isInteger(n) && n > 0;
}

export function validateBaseplateConfig(
  config: BaseplateConfig
): ValidationResult {
  const errors: string[] = [];

  if (!isPositiveInteger(config.gridUnitsX)) {
    errors.push("gridUnitsX must be a positive integer");
  }
  if (!isPositiveInteger(config.gridUnitsY)) {
    errors.push("gridUnitsY must be a positive integer");
  }
  if (config.includeScrewHoles && !config.includeMagnetHoles) {
    errors.push("screw holes require magnet holes to be enabled");
  }

  return { valid: errors.length === 0, errors };
}

// ── Dimensions ───────────────────────────────────────────────────────────────

export function getBaseplateDimensions(
  config: BaseplateConfig,
  gridConfig: GridConfig
): BaseplateDimensions {
  return {
    width: gridConfig.baseUnit * config.gridUnitsX,
    length: gridConfig.baseUnit * config.gridUnitsY,
    totalHeight: BASEPLATE_TOTAL_HEIGHT,
    plateThickness: BASEPLATE_PLATE_THICKNESS,
    pocketDepth: BASEPLATE_POCKET_DEPTH,
    cornerRadius: BASEPLATE_CORNER_RADIUS,
  };
}
