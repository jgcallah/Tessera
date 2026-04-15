import type { ValidationResult } from "./grid-config";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrintBedConfig {
  bedWidth: number; // mm
  bedLength: number; // mm
  partSpacing: number; // mm gap between parts
}

export type PackableKind = "bin" | "baseplate" | "spacer" | "snap-clip";

export interface PackableItem {
  id: string;
  width: number; // mm
  length: number; // mm
  quantity: number;
  label: string;
  /** Used by the sheet renderer to pick a shape. Optional for tests. */
  kind?: PackableKind;
  /** Native (unrotated) grid footprint in cells — for color + socket rendering. */
  gridUnitsX?: number;
  gridUnitsY?: number;
  /** Render magnet hole indicators in sockets (baseplate/spacer shapes). */
  showMagnetHoles?: boolean;
  /** Render a center screw hole indicator in sockets. */
  showScrewHoles?: boolean;
}

export interface Placement {
  x: number;
  y: number;
  /** Item as placed — width/length reflect any 90° rotation applied. */
  item: PackableItem;
  /** True when the part was rotated 90° to prefer Y-long orientation. */
  rotated: boolean;
}

export interface PrintSheet {
  index: number;
  placements: Placement[];
}

export interface InventoryEntry {
  label: string;
  quantity: number;
  width: number;
  length: number;
}

export interface PackingResult {
  sheets: PrintSheet[];
  totalSheets: number;
  unpacked: PackableItem[];
  inventory: InventoryEntry[];
}

// ── Config ───────────────────────────────────────────────────────────────────

// 5 mm keeps brims apart on a generic FDM printer while leaving margin for
// easy part removal. Tight enough to fit reasonable counts on a 220×220 bed.
export const DEFAULT_PART_SPACING = 5;

const BED_DEFAULTS: Readonly<PrintBedConfig> = {
  bedWidth: 220,
  bedLength: 220,
  partSpacing: DEFAULT_PART_SPACING,
};

export function createDefaultPrintBedConfig(): PrintBedConfig {
  return { ...BED_DEFAULTS };
}

export function createPrintBedConfig(
  overrides: Partial<PrintBedConfig> = {}
): PrintBedConfig {
  return { ...BED_DEFAULTS, ...overrides };
}

export function validatePrintBedConfig(
  config: PrintBedConfig
): ValidationResult {
  const errors: string[] = [];
  if (config.bedWidth <= 0) errors.push("bedWidth must be greater than 0");
  if (config.bedLength <= 0) errors.push("bedLength must be greater than 0");
  if (config.partSpacing < 0)
    errors.push("partSpacing must be 0 or greater");
  return { valid: errors.length === 0, errors };
}

// ── Shelf-Based Bin Packing ──────────────────────────────────────────────────

interface Orientation {
  width: number;
  length: number;
  rotated: boolean;
}

/**
 * Pick the best orientation for a part on the bed, preferring Y-long
 * (length >= width) when it fits. Returns null if neither orientation fits.
 */
function pickOrientation(
  w: number,
  l: number,
  bed: PrintBedConfig
): Orientation | null {
  const yLong: Orientation =
    l >= w ? { width: w, length: l, rotated: false } : { width: l, length: w, rotated: true };
  if (
    yLong.width <= bed.bedWidth + 0.01 &&
    yLong.length <= bed.bedLength + 0.01
  ) {
    return yLong;
  }
  const xLong: Orientation =
    l >= w ? { width: l, length: w, rotated: true } : { width: w, length: l, rotated: false };
  if (
    xLong.width <= bed.bedWidth + 0.01 &&
    xLong.length <= bed.bedLength + 0.01
  ) {
    return xLong;
  }
  return null;
}

/**
 * Center all placements on a sheet within the bed, preserving their relative
 * arrangement. Computes the bounding box of the packed group and offsets
 * every placement so the group sits at the middle of the plate.
 */
function centerPlacements(
  placements: Placement[],
  bed: PrintBedConfig
): Placement[] {
  if (placements.length === 0) return placements;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of placements) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x + p.item.width > maxX) maxX = p.x + p.item.width;
    if (p.y + p.item.length > maxY) maxY = p.y + p.item.length;
  }
  const offsetX = (bed.bedWidth - (maxX - minX)) / 2 - minX;
  const offsetY = (bed.bedLength - (maxY - minY)) / 2 - minY;
  return placements.map((p) => ({ ...p, x: p.x + offsetX, y: p.y + offsetY }));
}

/**
 * Pack parts onto print bed sheets using a shelf-based algorithm.
 * Each part is oriented long-axis-along-Y when it fits, sorted by length
 * descending, packed left-to-right in rows, and finally centered on the plate.
 */
export function packParts(
  items: PackableItem[],
  bed: PrintBedConfig
): PackingResult {
  const spacing = bed.partSpacing;
  const unpacked: PackableItem[] = [];
  const inventory: InventoryEntry[] = items.map((item) => ({
    label: item.label,
    quantity: item.quantity,
    width: item.width,
    length: item.length,
  }));

  // Expand items by quantity, choosing each part's orientation.
  interface OrientedItem {
    id: string;
    label: string;
    width: number;
    length: number;
    rotated: boolean;
    kind?: PackableKind;
    gridUnitsX?: number;
    gridUnitsY?: number;
    showMagnetHoles?: boolean;
    showScrewHoles?: boolean;
  }
  const expanded: OrientedItem[] = [];
  for (const item of items) {
    const orient = pickOrientation(item.width, item.length, bed);
    if (!orient) {
      unpacked.push(item);
      continue;
    }
    for (let i = 0; i < item.quantity; i++) {
      expanded.push({
        id: item.id,
        label: item.label,
        width: orient.width,
        length: orient.length,
        rotated: orient.rotated,
        ...(item.kind !== undefined ? { kind: item.kind } : {}),
        ...(item.gridUnitsX !== undefined
          ? { gridUnitsX: item.gridUnitsX }
          : {}),
        ...(item.gridUnitsY !== undefined
          ? { gridUnitsY: item.gridUnitsY }
          : {}),
        ...(item.showMagnetHoles !== undefined
          ? { showMagnetHoles: item.showMagnetHoles }
          : {}),
        ...(item.showScrewHoles !== undefined
          ? { showScrewHoles: item.showScrewHoles }
          : {}),
      });
    }
  }

  if (expanded.length === 0) {
    return { sheets: [], totalSheets: 0, unpacked, inventory };
  }

  // Sort by length descending (tallest shelves first)
  expanded.sort((a, b) => b.length - a.length || b.width - a.width);

  const sheets: PrintSheet[] = [];
  let currentSheet: Placement[] = [];
  let shelfX = 0;
  let shelfY = 0;
  let shelfHeight = 0;

  function placementFrom(
    x: number,
    y: number,
    item: OrientedItem
  ): Placement {
    return {
      x,
      y,
      item: {
        id: item.id,
        label: item.label,
        width: item.width,
        length: item.length,
        quantity: 1,
        ...(item.kind !== undefined ? { kind: item.kind } : {}),
        ...(item.gridUnitsX !== undefined
          ? { gridUnitsX: item.gridUnitsX }
          : {}),
        ...(item.gridUnitsY !== undefined
          ? { gridUnitsY: item.gridUnitsY }
          : {}),
        ...(item.showMagnetHoles !== undefined
          ? { showMagnetHoles: item.showMagnetHoles }
          : {}),
        ...(item.showScrewHoles !== undefined
          ? { showScrewHoles: item.showScrewHoles }
          : {}),
      },
      rotated: item.rotated,
    };
  }

  function flushSheet() {
    if (currentSheet.length > 0) {
      const centered = centerPlacements(currentSheet, bed);
      sheets.push({ index: sheets.length, placements: centered });
    }
    currentSheet = [];
    shelfX = 0;
    shelfY = 0;
    shelfHeight = 0;
  }

  for (const item of expanded) {
    // Try current shelf
    if (shelfX + item.width <= bed.bedWidth + 0.01) {
      if (shelfY + item.length <= bed.bedLength + 0.01) {
        currentSheet.push(placementFrom(shelfX, shelfY, item));
        shelfHeight = Math.max(shelfHeight, item.length);
        shelfX += item.width + spacing;
        continue;
      }
    }

    // Try a new shelf on the current sheet
    const newShelfY = shelfY + shelfHeight + spacing;
    if (newShelfY + item.length <= bed.bedLength + 0.01) {
      shelfY = newShelfY;
      shelfX = 0;
      shelfHeight = 0;
      currentSheet.push(placementFrom(shelfX, shelfY, item));
      shelfHeight = item.length;
      shelfX = item.width + spacing;
      continue;
    }

    // Start a new sheet
    flushSheet();
    currentSheet.push(placementFrom(0, 0, item));
    shelfHeight = item.length;
    shelfX = item.width + spacing;
  }

  flushSheet();

  return {
    sheets,
    totalSheets: sheets.length,
    unpacked,
    inventory,
  };
}
