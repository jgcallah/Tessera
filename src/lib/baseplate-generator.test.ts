// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from "vitest";
import { generateBaseplateMesh } from "./baseplate-generator";
import {
  createDefaultBaseplateConfig,
  createBaseplateConfig,
  getBaseplateDimensions,
} from "./baseplate-config";
import { createDefaultGridConfig, createGridConfig } from "./grid-config";
import { getManifold } from "./manifold";

vi.setConfig({ testTimeout: 30000 });

beforeAll(async () => {
  await getManifold();
}, 30000);

// ── Basic Shape ──────────────────────────────────────────────────────────────

describe("generateBaseplateMesh — basic shape", () => {
  it("returns a non-empty manifold", async () => {
    const bp = await generateBaseplateMesh(
      createDefaultBaseplateConfig(),
      createDefaultGridConfig()
    );
    const mesh = bp.getMesh();
    expect(mesh.triVerts.length).toBeGreaterThan(0);
    bp.delete();
  });

  it("bounding box width matches grid dimensions", async () => {
    const config = createBaseplateConfig({ gridUnitsX: 3 });
    const gridConfig = createDefaultGridConfig();
    const dims = getBaseplateDimensions(config, gridConfig);
    const bp = await generateBaseplateMesh(config, gridConfig);
    const bbox = bp.boundingBox();
    expect(bbox.max[0] - bbox.min[0]).toBeCloseTo(dims.width, 0);
    bp.delete();
  });

  it("bounding box height matches totalHeight", async () => {
    const config = createDefaultBaseplateConfig();
    const gridConfig = createDefaultGridConfig();
    const dims = getBaseplateDimensions(config, gridConfig);
    const bp = await generateBaseplateMesh(config, gridConfig);
    const bbox = bp.boundingBox();
    expect(bbox.max[2] - bbox.min[2]).toBeCloseTo(dims.totalHeight, 0);
    bp.delete();
  });

  it("volume is less than a solid block (has pockets)", async () => {
    const config = createDefaultBaseplateConfig();
    const gridConfig = createDefaultGridConfig();
    const dims = getBaseplateDimensions(config, gridConfig);
    const bp = await generateBaseplateMesh(config, gridConfig);
    const solidVolume = dims.width * dims.length * dims.totalHeight;
    expect(bp.volume()).toBeLessThan(solidVolume);
    expect(bp.volume()).toBeGreaterThan(0);
    bp.delete();
  });
});

// ── Magnet Holes ─────────────────────────────────────────────────────────────

describe("generateBaseplateMesh — magnet holes", () => {
  it("baseplate with magnet holes has less volume than without", async () => {
    const gridConfig = createDefaultGridConfig();
    const withMagnets = await generateBaseplateMesh(
      createBaseplateConfig({ includeMagnetHoles: true }),
      gridConfig
    );
    const withoutMagnets = await generateBaseplateMesh(
      createBaseplateConfig({ includeMagnetHoles: false }),
      gridConfig
    );
    expect(withMagnets.volume()).toBeLessThan(withoutMagnets.volume());
    withMagnets.delete();
    withoutMagnets.delete();
  });

  it("produces a valid manifold with magnet holes", async () => {
    const bp = await generateBaseplateMesh(
      createBaseplateConfig({ includeMagnetHoles: true }),
      createDefaultGridConfig()
    );
    expect(bp.getMesh().triVerts.length).toBeGreaterThan(0);
    bp.delete();
  });
});

// ── Config Variations ────────────────────────────────────────────────────────

describe("generateBaseplateMesh — config variations", () => {
  it("1x1 and 3x1 produce different widths", async () => {
    const gridConfig = createDefaultGridConfig();
    const bp1 = await generateBaseplateMesh(
      createBaseplateConfig({ gridUnitsX: 1 }),
      gridConfig
    );
    const bp3 = await generateBaseplateMesh(
      createBaseplateConfig({ gridUnitsX: 3 }),
      gridConfig
    );
    const w1 = bp1.boundingBox().max[0] - bp1.boundingBox().min[0];
    const w3 = bp3.boundingBox().max[0] - bp3.boundingBox().min[0];
    expect(w3).toBeGreaterThan(w1);
    bp1.delete();
    bp3.delete();
  });

  it("works with custom grid config", async () => {
    const customGrid = createGridConfig({
      mode: "custom",
      baseUnit: 50,
    });
    const bp = await generateBaseplateMesh(
      createBaseplateConfig({ gridUnitsX: 2 }),
      customGrid
    );
    const bbox = bp.boundingBox();
    expect(bbox.max[0] - bbox.min[0]).toBeCloseTo(100, 0); // 50 * 2
    bp.delete();
  });

  it("multi-unit baseplate has proportionally more volume", async () => {
    const gridConfig = createDefaultGridConfig();
    const bp1 = await generateBaseplateMesh(
      createBaseplateConfig({ gridUnitsX: 1, gridUnitsY: 1 }),
      gridConfig
    );
    const bp2 = await generateBaseplateMesh(
      createBaseplateConfig({ gridUnitsX: 2, gridUnitsY: 2 }),
      gridConfig
    );
    // 2x2 should have roughly 4x the volume of 1x1
    const ratio = bp2.volume() / bp1.volume();
    expect(ratio).toBeGreaterThan(3.5);
    expect(ratio).toBeLessThan(4.5);
    bp1.delete();
    bp2.delete();
  });
});
