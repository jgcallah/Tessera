// Color palette for bin footprints. Color is chosen by cell count (area),
// so rotations of the same footprint share a color — e.g. 3×4 and 4×3 both
// have 12 cells, so they render identically. When there are more distinct
// areas than colors, the palette cycles.
const PALETTE: readonly string[] = [
  "#6d28d9", // violet-700   — area 1
  "#2563eb", // blue-600     — area 2
  "#0891b2", // cyan-600     — area 3
  "#059669", // emerald-600  — area 4
  "#d97706", // amber-600    — area 5
  "#dc2626", // red-600      — area 6
  "#db2777", // pink-600     — area 7
  "#4f46e5", // indigo-600   — area 8
  "#0d9488", // teal-600     — area 9
  "#65a30d", // lime-600     — area 10
];

export const DEFAULT_BIN_COLOR = "#7c3aed";

export function getBinColor(gridUnitsX: number, gridUnitsY: number): string {
  const area = gridUnitsX * gridUnitsY;
  if (area <= 0) return DEFAULT_BIN_COLOR;
  return PALETTE[(area - 1) % PALETTE.length] ?? DEFAULT_BIN_COLOR;
}
