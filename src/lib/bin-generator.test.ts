// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from "vitest";

vi.setConfig({ testTimeout: 30000 });
import { generateBinMesh } from "./bin-generator";
import { createDefaultBinConfig, createBinConfig, getBinDimensions } from "./bin-config";
import { createDefaultGridConfig, createGridConfig } from "./grid-config";
import { getManifold } from "./manifold";
beforeAll(async () => {
  await getManifold();
}, 30000);

// ── Cycle 3.1: Basic Solid Outer Shell ───────────────────────────────────────

describe("generateBinMesh — basic solid", () => {
  it("returns a manifold that is not empty", async () => {
    const bin = await generateBinMesh(createDefaultBinConfig(), createDefaultGridConfig());
    const mesh = bin.getMesh();
    expect(mesh.triVerts.length).toBeGreaterThan(0);
    bin.delete();
  });

  it("bounding box width matches exteriorWidth", async () => {
    const binConfig = createDefaultBinConfig();
    const gridConfig = createDefaultGridConfig();
    const dims = getBinDimensions(binConfig, gridConfig);
    const bin = await generateBinMesh(binConfig, gridConfig);
    const bbox = bin.boundingBox();
    const meshWidth = bbox.max[0] - bbox.min[0];
    expect(meshWidth).toBeCloseTo(dims.exteriorWidth, 0);
    bin.delete();
  });

  it("bounding box length matches exteriorLength", async () => {
    const binConfig = createDefaultBinConfig();
    const gridConfig = createDefaultGridConfig();
    const dims = getBinDimensions(binConfig, gridConfig);
    const bin = await generateBinMesh(binConfig, gridConfig);
    const bbox = bin.boundingBox();
    const meshLength = bbox.max[1] - bbox.min[1];
    expect(meshLength).toBeCloseTo(dims.exteriorLength, 0);
    bin.delete();
  });

  it("bounding box height matches totalHeight", async () => {
    const binConfig = createDefaultBinConfig();
    const gridConfig = createDefaultGridConfig();
    const dims = getBinDimensions(binConfig, gridConfig);
    const bin = await generateBinMesh(binConfig, gridConfig);
    const bbox = bin.boundingBox();
    const meshHeight = bbox.max[2] - bbox.min[2];
    expect(meshHeight).toBeCloseTo(dims.totalHeight, 0);
    bin.delete();
  });
});

// ── Cycle 3.2: Hollow Interior ───────────────────────────────────────────────

describe("generateBinMesh — hollow interior", () => {
  it("volume is less than a solid block of same exterior dimensions", async () => {
    const binConfig = createDefaultBinConfig();
    const gridConfig = createDefaultGridConfig();
    const dims = getBinDimensions(binConfig, gridConfig);
    const bin = await generateBinMesh(binConfig, gridConfig);
    const solidVolume = dims.exteriorWidth * dims.exteriorLength * dims.totalHeight;
    const binVolume = bin.volume();
    expect(binVolume).toBeLessThan(solidVolume);
    expect(binVolume).toBeGreaterThan(0);
    bin.delete();
  });

  it("bounding box is unchanged after hollowing", async () => {
    const binConfig = createDefaultBinConfig();
    const gridConfig = createDefaultGridConfig();
    const dims = getBinDimensions(binConfig, gridConfig);
    const bin = await generateBinMesh(binConfig, gridConfig);
    const bbox = bin.boundingBox();
    expect(bbox.max[0] - bbox.min[0]).toBeCloseTo(dims.exteriorWidth, 0);
    expect(bbox.max[2] - bbox.min[2]).toBeCloseTo(dims.totalHeight, 0);
    bin.delete();
  });
});

// ── Cycle 3.3: Stacking Lip ─────────────────────────────────────────────────

describe("generateBinMesh — stacking lip", () => {
  it("bin with lip has different volume than without", async () => {
    const gridConfig = createDefaultGridConfig();
    const withLip = await generateBinMesh(
      createBinConfig({ includeStackingLip: true }),
      gridConfig
    );
    const withoutLip = await generateBinMesh(
      createBinConfig({ includeStackingLip: false }),
      gridConfig
    );
    const volWith = withLip.volume();
    const volWithout = withoutLip.volume();
    expect(volWith).not.toBeCloseTo(volWithout, 0);
    withLip.delete();
    withoutLip.delete();
  });

  it("both lip variants produce valid manifolds", async () => {
    const gridConfig = createDefaultGridConfig();
    const withLip = await generateBinMesh(
      createBinConfig({ includeStackingLip: true }),
      gridConfig
    );
    const withoutLip = await generateBinMesh(
      createBinConfig({ includeStackingLip: false }),
      gridConfig
    );
    expect(withLip.getMesh().triVerts.length).toBeGreaterThan(0);
    expect(withoutLip.getMesh().triVerts.length).toBeGreaterThan(0);
    withLip.delete();
    withoutLip.delete();
  });
});

// ── Cycle 3.4: Magnet and Screw Holes ────────────────────────────────────────

describe("generateBinMesh — magnet holes", () => {
  it("bin with magnet holes has less volume than without", async () => {
    const gridConfig = createDefaultGridConfig();
    const withMagnets = await generateBinMesh(
      createBinConfig({ includeMagnetHoles: true }),
      gridConfig
    );
    const withoutMagnets = await generateBinMesh(
      createBinConfig({ includeMagnetHoles: false }),
      gridConfig
    );
    expect(withMagnets.volume()).toBeLessThan(
      withoutMagnets.volume()
    );
    withMagnets.delete();
    withoutMagnets.delete();
  });

  it("bin with magnet holes is a valid manifold", async () => {
    const bin = await generateBinMesh(
      createBinConfig({ includeMagnetHoles: true }),
      createDefaultGridConfig()
    );
    expect(bin.getMesh().triVerts.length).toBeGreaterThan(0);
    bin.delete();
  });
});

// ── Cycle 3.5: Config Variations ─────────────────────────────────────────────

describe("generateBinMesh — config variations", () => {
  it("1x1 and 2x1 produce different bounding box widths", async () => {
    const gridConfig = createDefaultGridConfig();
    const bin1x1 = await generateBinMesh(createBinConfig({ gridUnitsX: 1 }), gridConfig);
    const bin2x1 = await generateBinMesh(createBinConfig({ gridUnitsX: 2 }), gridConfig);
    const w1 = bin1x1.boundingBox().max[0] - bin1x1.boundingBox().min[0];
    const w2 = bin2x1.boundingBox().max[0] - bin2x1.boundingBox().min[0];
    expect(w2).toBeGreaterThan(w1);
    bin1x1.delete();
    bin2x1.delete();
  });

  it("1x1x3 and 1x1x5 produce different heights", async () => {
    const gridConfig = createDefaultGridConfig();
    const bin3u = await generateBinMesh(createBinConfig({ heightUnits: 3 }), gridConfig);
    const bin5u = await generateBinMesh(createBinConfig({ heightUnits: 5 }), gridConfig);
    const h3 = bin3u.boundingBox().max[2] - bin3u.boundingBox().min[2];
    const h5 = bin5u.boundingBox().max[2] - bin5u.boundingBox().min[2];
    expect(h5).toBeGreaterThan(h3);
    bin3u.delete();
    bin5u.delete();
  });

  it("works with custom grid config", async () => {
    const customGrid = createGridConfig({ mode: "custom", baseUnit: 50, tolerance: 0.3 });
    const bin = await generateBinMesh(createDefaultBinConfig(), customGrid);
    const bbox = bin.boundingBox();
    const meshWidth = bbox.max[0] - bbox.min[0];
    expect(meshWidth).toBeCloseTo(49.7, 0); // 50 - 0.3
    bin.delete();
  });
});
