import type { ValidationResult } from "./grid-config";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PrintBedConfig {
  bedWidth: number; // mm
  bedLength: number; // mm
}

export interface PackableItem {
  id: string;
  width: number; // mm
  length: number; // mm
  quantity: number;
  label: string;
}

export interface Placement {
  x: number;
  y: number;
  item: PackableItem;
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

const BED_DEFAULTS: Readonly<PrintBedConfig> = {
  bedWidth: 220,
  bedLength: 220,
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
  return { valid: errors.length === 0, errors };
}

// ── Shelf-Based Bin Packing ──────────────────────────────────────────────────

const PART_SPACING = 2; // mm gap between parts

/**
 * Pack parts onto print bed sheets using a shelf-based algorithm.
 * Sorts items by length (tallest first), packs left-to-right in rows.
 */
export function packParts(
  items: PackableItem[],
  bed: PrintBedConfig
): PackingResult {
  const unpacked: PackableItem[] = [];
  const inventory: InventoryEntry[] = items.map((item) => ({
    label: item.label,
    quantity: item.quantity,
    width: item.width,
    length: item.length,
  }));

  // Expand items by quantity, filter oversized
  const expanded: PackableItem[] = [];
  for (const item of items) {
    if (item.width > bed.bedWidth || item.length > bed.bedLength) {
      unpacked.push(item);
      continue;
    }
    for (let i = 0; i < item.quantity; i++) {
      expanded.push({ ...item, quantity: 1 });
    }
  }

  if (expanded.length === 0) {
    return { sheets: [], totalSheets: 0, unpacked, inventory };
  }

  // Sort by length descending (tallest shelves first)
  expanded.sort((a, b) => b.length - a.length || b.width - a.width);

  const sheets: PrintSheet[] = [];
  let currentSheet: Placement[] = [];
  let shelfX = 0; // current X position in row
  let shelfY = 0; // current Y position (top of current shelf)
  let shelfHeight = 0; // height of current shelf (tallest item in row)

  function startNewSheet() {
    if (currentSheet.length > 0) {
      sheets.push({ index: sheets.length, placements: currentSheet });
    }
    currentSheet = [];
    shelfX = 0;
    shelfY = 0;
    shelfHeight = 0;
  }

  function startNewShelf() {
    shelfY += shelfHeight + PART_SPACING;
    shelfX = 0;
    shelfHeight = 0;
  }

  for (const item of expanded) {
    // Try to fit in current position
    if (shelfX + item.width <= bed.bedWidth + 0.01) {
      // Check if shelf Y + item fits vertically
      if (shelfY + item.length <= bed.bedLength + 0.01) {
        currentSheet.push({ x: shelfX, y: shelfY, item });
        shelfHeight = Math.max(shelfHeight, item.length);
        shelfX += item.width + PART_SPACING;
        continue;
      }
    }

    // Try starting a new shelf
    const newShelfY = shelfY + shelfHeight + PART_SPACING;
    if (newShelfY + item.length <= bed.bedLength + 0.01) {
      startNewShelf();
      currentSheet.push({ x: shelfX, y: shelfY, item });
      shelfHeight = Math.max(shelfHeight, item.length);
      shelfX += item.width + PART_SPACING;
      continue;
    }

    // Need a new sheet
    startNewSheet();
    currentSheet.push({ x: 0, y: 0, item });
    shelfHeight = item.length;
    shelfX = item.width + PART_SPACING;
  }

  // Flush the last sheet
  if (currentSheet.length > 0) {
    sheets.push({ index: sheets.length, placements: currentSheet });
  }

  return {
    sheets,
    totalSheets: sheets.length,
    unpacked,
    inventory,
  };
}
