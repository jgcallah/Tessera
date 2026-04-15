import { describe, it, expect } from "vitest";
import {
  DEFAULT_PART_SPACING,
  createDefaultPrintBedConfig,
  createPrintBedConfig,
  validatePrintBedConfig,
  packParts,
} from "./print-planner";
import type { PackableItem } from "./print-planner";

// ── Config ───────────────────────────────────────────────────────────────────

describe("createDefaultPrintBedConfig", () => {
  it("returns standard FDM bed defaults with 5mm spacing", () => {
    const config = createDefaultPrintBedConfig();
    expect(config).toEqual({
      bedWidth: 220,
      bedLength: 220,
      partSpacing: DEFAULT_PART_SPACING,
    });
  });
});

describe("createPrintBedConfig", () => {
  it("accepts overrides", () => {
    const config = createPrintBedConfig({ bedWidth: 300, bedLength: 300 });
    expect(config.bedWidth).toBe(300);
    expect(config.partSpacing).toBe(DEFAULT_PART_SPACING);
  });

  it("accepts a custom partSpacing", () => {
    const config = createPrintBedConfig({ partSpacing: 10 });
    expect(config.partSpacing).toBe(10);
  });
});

describe("validatePrintBedConfig", () => {
  it("returns valid for default", () => {
    const result = validatePrintBedConfig(createDefaultPrintBedConfig());
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("returns error for bedWidth <= 0", () => {
    const result = validatePrintBedConfig(createPrintBedConfig({ bedWidth: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("bedWidth must be greater than 0");
  });

  it("returns error for bedLength <= 0", () => {
    const result = validatePrintBedConfig(
      createPrintBedConfig({ bedLength: -1 })
    );
    expect(result.valid).toBe(false);
  });

  it("returns error for negative partSpacing", () => {
    const result = validatePrintBedConfig(
      createPrintBedConfig({ partSpacing: -1 })
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("partSpacing must be 0 or greater");
  });
});

// ── Bin Packing ──────────────────────────────────────────────────────────────

describe("packParts", () => {
  const bed = createDefaultPrintBedConfig(); // 220 × 220, 5mm spacing

  it("returns empty sheets for empty parts list", () => {
    const result = packParts([], bed);
    expect(result.sheets).toHaveLength(0);
    expect(result.totalSheets).toBe(0);
  });

  it("packs a single small part on one sheet", () => {
    const parts: PackableItem[] = [
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 1, label: "Bin 1×1×3u" },
    ];
    const result = packParts(parts, bed);
    expect(result.totalSheets).toBe(1);
    expect(result.sheets[0]!.placements).toHaveLength(1);
  });

  it("packs multiple copies of same part", () => {
    const parts: PackableItem[] = [
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 5, label: "Bin 1×1×3u" },
    ];
    const result = packParts(parts, bed);
    expect(result.totalSheets).toBe(1);
    const totalPlaced = result.sheets.reduce(
      (sum, s) => sum + s.placements.length,
      0
    );
    expect(totalPlaced).toBe(5);
  });

  it("overflows to multiple sheets when bed is full", () => {
    const parts: PackableItem[] = [
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 30, label: "Bin 1×1×3u" },
    ];
    const result = packParts(parts, bed);
    expect(result.totalSheets).toBeGreaterThan(1);
    const totalPlaced = result.sheets.reduce(
      (sum, s) => sum + s.placements.length,
      0
    );
    expect(totalPlaced).toBe(30);
  });

  it("packs different sized parts", () => {
    const parts: PackableItem[] = [
      { id: "bin-2x1", width: 83.5, length: 41.5, quantity: 2, label: "Bin 2×1×3u" },
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 3, label: "Bin 1×1×3u" },
    ];
    const result = packParts(parts, bed);
    expect(result.totalSheets).toBeGreaterThanOrEqual(1);
    const totalPlaced = result.sheets.reduce(
      (sum, s) => sum + s.placements.length,
      0
    );
    expect(totalPlaced).toBe(5);
  });

  it("handles parts larger than bed (skips them)", () => {
    const parts: PackableItem[] = [
      { id: "huge", width: 300, length: 300, quantity: 1, label: "Too big" },
    ];
    const result = packParts(parts, bed);
    expect(result.totalSheets).toBe(0);
    expect(result.unpacked).toHaveLength(1);
  });

  it("each placement carries x, y, oriented item, and rotated flag", () => {
    const parts: PackableItem[] = [
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 1, label: "Bin 1×1×3u" },
    ];
    const result = packParts(parts, bed);
    const placement = result.sheets[0]!.placements[0]!;
    expect(placement.x).toBeGreaterThanOrEqual(0);
    expect(placement.y).toBeGreaterThanOrEqual(0);
    expect(placement.item.id).toBe("bin-1x1");
    expect(placement.rotated).toBe(false);
  });

  it("no placements overlap within a sheet", () => {
    const parts: PackableItem[] = [
      { id: "bin-2x1", width: 83.5, length: 41.5, quantity: 4, label: "Bin 2×1" },
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 6, label: "Bin 1×1" },
    ];
    const result = packParts(parts, bed);
    for (const sheet of result.sheets) {
      for (let i = 0; i < sheet.placements.length; i++) {
        for (let j = i + 1; j < sheet.placements.length; j++) {
          const a = sheet.placements[i]!;
          const b = sheet.placements[j]!;
          const overlapX =
            a.x < b.x + b.item.width && a.x + a.item.width > b.x;
          const overlapY =
            a.y < b.y + b.item.length && a.y + a.item.length > b.y;
          expect(overlapX && overlapY).toBe(false);
        }
      }
    }
  });

  it("no placement extends beyond bed boundaries", () => {
    const parts: PackableItem[] = [
      { id: "bin-2x1", width: 83.5, length: 41.5, quantity: 8, label: "Bin 2×1" },
    ];
    const result = packParts(parts, bed);
    for (const sheet of result.sheets) {
      for (const p of sheet.placements) {
        expect(p.x).toBeGreaterThanOrEqual(-0.01);
        expect(p.y).toBeGreaterThanOrEqual(-0.01);
        expect(p.x + p.item.width).toBeLessThanOrEqual(bed.bedWidth + 0.01);
        expect(p.y + p.item.length).toBeLessThanOrEqual(bed.bedLength + 0.01);
      }
    }
  });

  it("packing with small bed produces more sheets", () => {
    const smallBed = createPrintBedConfig({ bedWidth: 100, bedLength: 100 });
    const parts: PackableItem[] = [
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 10, label: "Bin 1×1" },
    ];
    const resultSmall = packParts(parts, smallBed);
    const resultLarge = packParts(parts, bed);
    expect(resultSmall.totalSheets).toBeGreaterThan(resultLarge.totalSheets);
  });

  it("returns a printable inventory", () => {
    const parts: PackableItem[] = [
      { id: "bin-2x1", width: 83.5, length: 41.5, quantity: 2, label: "Bin 2×1×3u" },
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 3, label: "Bin 1×1×3u" },
    ];
    const result = packParts(parts, bed);
    expect(result.inventory).toHaveLength(2);
    expect(result.inventory[0]!.label).toBe("Bin 2×1×3u");
    expect(result.inventory[0]!.quantity).toBe(2);
  });

  // ── Orientation: prefer Y-long ────────────────────────────────────────────

  it("rotates an X-long part so its long axis runs along Y", () => {
    // Input width > length — a 2×1 bin defined as 83.5 wide × 41.5 long.
    // Packer should rotate so length (Y) becomes 83.5.
    const parts: PackableItem[] = [
      { id: "bin-2x1", width: 83.5, length: 41.5, quantity: 1, label: "Bin 2×1" },
    ];
    const result = packParts(parts, bed);
    const placement = result.sheets[0]!.placements[0]!;
    expect(placement.rotated).toBe(true);
    expect(placement.item.length).toBe(83.5);
    expect(placement.item.width).toBe(41.5);
  });

  it("does not rotate a part that is already Y-long", () => {
    const parts: PackableItem[] = [
      { id: "bin-1x2", width: 41.5, length: 83.5, quantity: 1, label: "Bin 1×2" },
    ];
    const result = packParts(parts, bed);
    const placement = result.sheets[0]!.placements[0]!;
    expect(placement.rotated).toBe(false);
    expect(placement.item.length).toBe(83.5);
  });

  it("falls back to the other orientation if Y-long does not fit", () => {
    // Bed 200×100, part 90×150 — Y-long needs 150 > 100, must flip.
    const rectBed = createPrintBedConfig({ bedWidth: 200, bedLength: 100 });
    const parts: PackableItem[] = [
      { id: "long-strip", width: 90, length: 150, quantity: 1, label: "Strip" },
    ];
    const result = packParts(parts, rectBed);
    expect(result.unpacked).toHaveLength(0);
    const placement = result.sheets[0]!.placements[0]!;
    expect(placement.rotated).toBe(true);
    expect(placement.item.width).toBe(150);
    expect(placement.item.length).toBe(90);
  });

  // ── Centering ─────────────────────────────────────────────────────────────

  it("centers a single part on the bed", () => {
    const parts: PackableItem[] = [
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 1, label: "Bin" },
    ];
    const result = packParts(parts, bed);
    const p = result.sheets[0]!.placements[0]!;
    const cx = p.x + p.item.width / 2;
    const cy = p.y + p.item.length / 2;
    expect(cx).toBeCloseTo(bed.bedWidth / 2, 3);
    expect(cy).toBeCloseTo(bed.bedLength / 2, 3);
  });

  it("centers a group of parts while preserving their relative layout", () => {
    const parts: PackableItem[] = [
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 4, label: "Bin" },
    ];
    const result = packParts(parts, bed);
    const sheet = result.sheets[0]!;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of sheet.placements) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + p.item.width > maxX) maxX = p.x + p.item.width;
      if (p.y + p.item.length > maxY) maxY = p.y + p.item.length;
    }
    const groupCx = (minX + maxX) / 2;
    const groupCy = (minY + maxY) / 2;
    expect(groupCx).toBeCloseTo(bed.bedWidth / 2, 3);
    expect(groupCy).toBeCloseTo(bed.bedLength / 2, 3);
  });

  // ── Spacing ───────────────────────────────────────────────────────────────

  it("honors custom partSpacing between adjacent parts in a row", () => {
    const tightBed = createPrintBedConfig({
      bedWidth: 500,
      bedLength: 500,
      partSpacing: 10,
    });
    const parts: PackableItem[] = [
      { id: "bin-1x1", width: 40, length: 40, quantity: 2, label: "Bin" },
    ];
    const result = packParts(parts, tightBed);
    const placements = result.sheets[0]!.placements;
    expect(placements).toHaveLength(2);
    // Sorted by x — smallest x first
    const sorted = [...placements].sort((a, b) => a.x - b.x);
    const gap = sorted[1]!.x - (sorted[0]!.x + sorted[0]!.item.width);
    expect(gap).toBeCloseTo(10, 3);
  });
});
