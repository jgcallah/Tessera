import { describe, it, expect } from "vitest";
import { roundedRectPoints, stackingLipProfile } from "./geometry";
import { GRIDFINITY_LIP_HEIGHT } from "./bin-config";

// ── roundedRectPoints ────────────────────────────────────────────────────────

describe("roundedRectPoints", () => {
  it("returns an array of [x, y] number pairs", () => {
    const pts = roundedRectPoints(10, 10, 2, 4);
    expect(pts.length).toBeGreaterThan(0);
    for (const pt of pts) {
      expect(pt).toHaveLength(2);
      expect(typeof pt[0]).toBe("number");
      expect(typeof pt[1]).toBe("number");
    }
  });

  it("returns 4 * segments points", () => {
    const pts = roundedRectPoints(10, 10, 2, 8);
    expect(pts).toHaveLength(4 * 8);
  });

  it("all points lie within the bounding box", () => {
    const w = 41.5;
    const h = 41.5;
    const pts = roundedRectPoints(w, h, 3.75, 16);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(-w / 2 - 0.001);
      expect(x).toBeLessThanOrEqual(w / 2 + 0.001);
      expect(y).toBeGreaterThanOrEqual(-h / 2 - 0.001);
      expect(y).toBeLessThanOrEqual(h / 2 + 0.001);
    }
  });

  it("with radius=0 returns 4 points (sharp rectangle)", () => {
    const pts = roundedRectPoints(10, 10, 0, 8);
    expect(pts).toHaveLength(4);
  });

  it("polygon is wound counter-clockwise (positive signed area)", () => {
    const pts = roundedRectPoints(10, 10, 2, 8);
    // Shoelace formula for signed area
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i]!;
      const next = pts[(i + 1) % pts.length]!;
      area += curr[0] * next[1] - next[0] * curr[1];
    }
    area /= 2;
    expect(area).toBeGreaterThan(0); // CCW = positive area
  });

  it("spot-check: 41.5 x 41.5, radius 3.75, segments 16", () => {
    const pts = roundedRectPoints(41.5, 41.5, 3.75, 16);
    expect(pts).toHaveLength(64); // 4 * 16
    // First corner arc should start near the bottom-right
    // The rightmost point should be at approximately x = 41.5/2 = 20.75
    const maxX = Math.max(...pts.map((p) => p[0]));
    expect(maxX).toBeCloseTo(20.75, 0);
  });

  it("with segments=1 each corner is a single point (beveled)", () => {
    const pts = roundedRectPoints(10, 10, 2, 1);
    expect(pts).toHaveLength(4);
  });
});

// ── stackingLipProfile ───────────────────────────────────────────────────────

describe("stackingLipProfile", () => {
  it("returns an array of [wallOffset, height] pairs", () => {
    const profile = stackingLipProfile();
    expect(profile.length).toBeGreaterThanOrEqual(4);
    for (const pt of profile) {
      expect(pt).toHaveLength(2);
    }
  });

  it("starts at full lip height", () => {
    const profile = stackingLipProfile();
    const firstPt = profile[0]!;
    expect(firstPt[1]).toBeCloseTo(GRIDFINITY_LIP_HEIGHT, 1);
  });

  it("ends at height 0", () => {
    const profile = stackingLipProfile();
    const lastPt = profile[profile.length - 1]!;
    expect(lastPt[1]).toBeCloseTo(0, 1);
  });

  it("has an outward protrusion (positive offset step)", () => {
    const profile = stackingLipProfile();
    const maxOffset = Math.max(...profile.map((p) => p[0]));
    expect(maxOffset).toBeGreaterThan(0);
  });

  it("all height values are non-negative", () => {
    const profile = stackingLipProfile();
    for (const [, h] of profile) {
      expect(h).toBeGreaterThanOrEqual(-0.001);
    }
  });
});
