import type { GridConfig, ValidationResult } from "./grid-config";
import { isPositiveInteger } from "./validation-utils";

// ── Gridfinity Baseplate Constants ───────────────────────────────────────────

export const BASEPLATE_TOTAL_HEIGHT = 4.65;
export const BASEPLATE_RIM_WIDTH = 2.4; // width of the rim/grid walls
export const BASEPLATE_CORNER_RADIUS = 4.0;
export const BASEPLATE_SKELETON_RIM_WIDTH = 1.2; // thinner walls for skeleton

// ── Baseplate Socket Profile (female inverse of bin base, per cell) ─────────
// 3 segments from bottom to top, all chamfers at 45°
export const SOCKET_CHAMFER_BOTTOM = 0.7; // bottom 45° segment
export const SOCKET_VERTICAL = 1.8; // middle vertical segment
export const SOCKET_CHAMFER_TOP = 1.75; // top 45° segment
export const SOCKET_TOTAL_DEPTH = 2.45; // 0.7 + 1.75 — total horizontal depth
export const SOCKET_LEDGE = 0.4; // horizontal ledge at top of socket

export type BaseplateStyle = "standard" | "skeleton";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BaseplateConfig {
  gridUnitsX: number;
  gridUnitsY: number;
  includeMagnetHoles: boolean;
  includeScrewHoles: boolean;
  style: BaseplateStyle;
  includeSnapConnectors: boolean;
  /** Max grid units per side when auto-filling the baseplate layout. */
  maxAutoSizeX: number;
  maxAutoSizeY: number;
  /** Max length (in grid units) for an auto-generated spacer piece. */
  maxSpacerLength: number;
}

export interface BaseplateDimensions {
  width: number;
  length: number;
  totalHeight: number;
  rimWidth: number;
  cornerRadius: number;
}

// ── Factory ──────────────────────────────────────────────────────────────────

const BASEPLATE_DEFAULTS: Readonly<BaseplateConfig> = {
  gridUnitsX: 1,
  gridUnitsY: 1,
  includeMagnetHoles: true,
  includeScrewHoles: false,
  style: "standard",
  includeSnapConnectors: false,
  maxAutoSizeX: 5,
  maxAutoSizeY: 5,
  maxSpacerLength: 5,
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
  if (!isPositiveInteger(config.maxAutoSizeX)) {
    errors.push("maxAutoSizeX must be a positive integer");
  }
  if (!isPositiveInteger(config.maxAutoSizeY)) {
    errors.push("maxAutoSizeY must be a positive integer");
  }
  if (!isPositiveInteger(config.maxSpacerLength)) {
    errors.push("maxSpacerLength must be a positive integer");
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
  const rimWidth =
    config.style === "skeleton"
      ? BASEPLATE_SKELETON_RIM_WIDTH
      : BASEPLATE_RIM_WIDTH;

  return {
    width: gridConfig.baseUnit * config.gridUnitsX,
    length: gridConfig.baseUnit * config.gridUnitsY,
    totalHeight: BASEPLATE_TOTAL_HEIGHT,
    rimWidth,
    cornerRadius: BASEPLATE_CORNER_RADIUS,
  };
}
