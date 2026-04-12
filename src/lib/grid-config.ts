export type GridMode = "gridfinity" | "custom";

export interface GridConfig {
  baseUnit: number;
  heightUnit: number;
  tolerance: number;
  magnetDiameter: number;
  magnetThickness: number;
  screwDiameter: number;
  mode: GridMode;
}

export interface GridDerivedValues {
  cellSize: number;
  magnetHoleDiameter: number;
  magnetHoleDepth: number;
  screwHoleDiameter: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Gridfinity Standard Values ───────────────────────────────────────────────

const GRIDFINITY_DEFAULTS: Readonly<GridConfig> = {
  baseUnit: 42,
  heightUnit: 7,
  tolerance: 0.5,
  magnetDiameter: 6,
  magnetThickness: 2,
  screwDiameter: 3,
  mode: "gridfinity",
};

const MAGNET_PRESS_FIT_ALLOWANCE = 0.4;

// ── Factory Functions ────────────────────────────────────────────────────────

export function createDefaultGridConfig(): GridConfig {
  return { ...GRIDFINITY_DEFAULTS };
}

export function createGridConfig(
  overrides: Partial<GridConfig> = {}
): GridConfig {
  const mode = overrides.mode ?? "gridfinity";

  if (mode === "gridfinity") {
    // In gridfinity mode, only tolerance is user-configurable
    return {
      ...GRIDFINITY_DEFAULTS,
      tolerance: overrides.tolerance ?? GRIDFINITY_DEFAULTS.tolerance,
    };
  }

  return {
    ...GRIDFINITY_DEFAULTS,
    ...overrides,
    mode: "custom",
  };
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validateGridConfig(config: GridConfig): ValidationResult {
  const errors: string[] = [];

  if (config.baseUnit <= 0) {
    errors.push("baseUnit must be greater than 0");
  }
  if (config.heightUnit <= 0) {
    errors.push("heightUnit must be greater than 0");
  }
  if (config.tolerance < 0) {
    errors.push("tolerance must be 0 or greater");
  }
  if (config.baseUnit > 0 && config.tolerance >= config.baseUnit) {
    errors.push("tolerance must be less than baseUnit");
  }
  if (config.magnetDiameter <= 0) {
    errors.push("magnetDiameter must be greater than 0");
  }
  if (config.magnetThickness <= 0) {
    errors.push("magnetThickness must be greater than 0");
  }
  if (config.screwDiameter <= 0) {
    errors.push("screwDiameter must be greater than 0");
  }

  return { valid: errors.length === 0, errors };
}

// ── Derived Values ───────────────────────────────────────────────────────────

export function getGridDerivedValues(config: GridConfig): GridDerivedValues {
  return {
    cellSize: config.baseUnit - config.tolerance,
    magnetHoleDiameter: config.magnetDiameter + config.tolerance,
    magnetHoleDepth: config.magnetThickness + MAGNET_PRESS_FIT_ALLOWANCE,
    screwHoleDiameter: config.screwDiameter + config.tolerance,
  };
}
