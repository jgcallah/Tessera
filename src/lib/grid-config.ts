export type GridMode = "gridfinity" | "custom";

export interface GridConfig {
  baseUnit: number;
  heightUnit: number;
  magnetDiameter: number;
  magnetThickness: number;
  screwDiameter: number;
  mode: GridMode;
}

export interface GridDerivedValues {
  magnetHoleDepth: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Gridfinity Standard Values ───────────────────────────────────────────────

const GRIDFINITY_DEFAULTS: Readonly<GridConfig> = {
  baseUnit: 42,
  heightUnit: 7,
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
    // In gridfinity mode, all values are locked to standard
    return { ...GRIDFINITY_DEFAULTS };
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
    magnetHoleDepth: config.magnetThickness + MAGNET_PRESS_FIT_ALLOWANCE,
  };
}
