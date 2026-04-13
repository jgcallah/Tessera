// Shared color palette for different bin footprint sizes
const SIZE_COLORS: Record<string, string> = {
  "1x1": "#6d28d9", // violet-700
  "2x1": "#2563eb", // blue-600
  "1x2": "#0891b2", // cyan-600
  "2x2": "#059669", // emerald-600
  "3x1": "#d97706", // amber-600
  "1x3": "#dc2626", // red-600
};

export const DEFAULT_BIN_COLOR = "#7c3aed"; // violet-600

export function getBinColor(gridUnitsX: number, gridUnitsY: number): string {
  return SIZE_COLORS[`${gridUnitsX}x${gridUnitsY}`] ?? DEFAULT_BIN_COLOR;
}
