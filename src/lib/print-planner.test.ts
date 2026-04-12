import { describe, it, expect } from "vitest";
import {
  createDefaultPrintBedConfig,
  createPrintBedConfig,
  validatePrintBedConfig,
  packParts,
} from "./print-planner";
import type { PackableItem } from "./print-planner";

// ── Config ───────────────────────────────────────────────────────────────────

describe("createDefaultPrintBedConfig", () => {
  it("returns standard FDM bed defaults", () => {
    const config = createDefaultPrintBedConfig();
    expect(config).toEqual({
      bedWidth: 220,
      bedLength: 220,
    });
  });
});

describe("createPrintBedConfig", () => {
  it("accepts overrides", () => {
    const config = createPrintBedConfig({ bedWidth: 300, bedLength: 300 });
    expect(config.bedWidth).toBe(300);
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
});

// ── Bin Packing ──────────────────────────────────────────────────────────────

describe("packParts", () => {
  const bed = createDefaultPrintBedConfig(); // 220 × 220

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
    // 220 / 41.5 = 5.3 → 5 per row, 220 / 41.5 = 5 rows → 25 per sheet
    // 5 parts fits on 1 sheet
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

  it("each placement has x, y position and item reference", () => {
    const parts: PackableItem[] = [
      { id: "bin-1x1", width: 41.5, length: 41.5, quantity: 1, label: "Bin 1×1×3u" },
    ];
    const result = packParts(parts, bed);
    const placement = result.sheets[0]!.placements[0]!;
    expect(placement.x).toBeGreaterThanOrEqual(0);
    expect(placement.y).toBeGreaterThanOrEqual(0);
    expect(placement.item.id).toBe("bin-1x1");
    expect(placement.item.width).toBe(41.5);
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
});
