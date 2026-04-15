// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from "vitest";
import {
  meshToStlBinary,
  generatePrintPlanMarkdown,
} from "./export";
import { getManifold } from "./manifold";
import type { PackingResult, PrintSheet } from "./print-planner";

vi.setConfig({ testTimeout: 30000 });

beforeAll(async () => {
  await getManifold();
}, 30000);

// ── Binary STL Export ────────────────────────────────────────────────────────

describe("meshToStlBinary", () => {
  it("returns an ArrayBuffer", async () => {
    const wasm = await getManifold();
    const cube = wasm.Manifold.cube([10, 10, 10]);
    const mesh = cube.getMesh();
    const stl = meshToStlBinary(mesh);
    expect(stl).toBeInstanceOf(ArrayBuffer);
    cube.delete();
  });

  it("has correct STL header size (80 bytes + 4 byte triangle count)", async () => {
    const wasm = await getManifold();
    const cube = wasm.Manifold.cube([10, 10, 10]);
    const mesh = cube.getMesh();
    const stl = meshToStlBinary(mesh);
    // STL format: 80 byte header + 4 byte tri count + 50 bytes per triangle
    const triCount = mesh.triVerts.length / 3;
    const expectedSize = 80 + 4 + triCount * 50;
    expect(stl.byteLength).toBe(expectedSize);
    cube.delete();
  });

  it("encodes the correct triangle count in the header", async () => {
    const wasm = await getManifold();
    const cube = wasm.Manifold.cube([10, 10, 10]);
    const mesh = cube.getMesh();
    const stl = meshToStlBinary(mesh);
    const view = new DataView(stl);
    const triCount = view.getUint32(80, true); // little-endian at offset 80
    expect(triCount).toBe(mesh.triVerts.length / 3);
    cube.delete();
  });

  it("produces valid triangles with non-zero normals", async () => {
    const wasm = await getManifold();
    const cube = wasm.Manifold.cube([10, 10, 10]);
    const mesh = cube.getMesh();
    const stl = meshToStlBinary(mesh);
    const view = new DataView(stl);
    const triCount = view.getUint32(80, true);

    // Check first triangle has a non-zero normal
    const nx = view.getFloat32(84, true);
    const ny = view.getFloat32(88, true);
    const nz = view.getFloat32(92, true);
    const normalLength = Math.sqrt(nx * nx + ny * ny + nz * nz);
    expect(normalLength).toBeGreaterThan(0);
    expect(triCount).toBeGreaterThan(0);
    cube.delete();
  });
});

// ── Print Plan Markdown ──────────────────────────────────────────────────────

describe("generatePrintPlanMarkdown", () => {
  const mockResult: PackingResult = {
    sheets: [
      {
        index: 0,
        placements: [
          {
            x: 0,
            y: 0,
            rotated: false,
            item: {
              id: "bin-2x1",
              width: 83.5,
              length: 41.5,
              quantity: 2,
              label: "Bin 2×1×3u",
            },
          },
          {
            x: 85.5,
            y: 0,
            rotated: false,
            item: {
              id: "bin-2x1",
              width: 83.5,
              length: 41.5,
              quantity: 2,
              label: "Bin 2×1×3u",
            },
          },
        ],
      } satisfies PrintSheet,
      {
        index: 1,
        placements: [
          {
            x: 0,
            y: 0,
            rotated: false,
            item: {
              id: "bin-1x1",
              width: 41.5,
              length: 41.5,
              quantity: 3,
              label: "Bin 1×1×3u",
            },
          },
        ],
      } satisfies PrintSheet,
    ],
    totalSheets: 2,
    unpacked: [],
    inventory: [
      { label: "Bin 2×1×3u", quantity: 2, width: 83.5, length: 41.5 },
      { label: "Bin 1×1×3u", quantity: 3, width: 41.5, length: 41.5 },
    ],
  };

  it("returns a string", () => {
    const md = generatePrintPlanMarkdown(mockResult);
    expect(typeof md).toBe("string");
  });

  it("includes a title", () => {
    const md = generatePrintPlanMarkdown(mockResult);
    expect(md).toContain("# Print Plan");
  });

  it("includes total sheet count", () => {
    const md = generatePrintPlanMarkdown(mockResult);
    expect(md).toContain("2 sheet");
  });

  it("includes inventory section", () => {
    const md = generatePrintPlanMarkdown(mockResult);
    expect(md).toContain("Bin 2×1×3u");
    expect(md).toContain("×2");
    expect(md).toContain("Bin 1×1×3u");
    expect(md).toContain("×3");
  });

  it("includes per-sheet details", () => {
    const md = generatePrintPlanMarkdown(mockResult);
    expect(md).toContain("Sheet 1");
    expect(md).toContain("Sheet 2");
  });

  it("includes part count per sheet", () => {
    const md = generatePrintPlanMarkdown(mockResult);
    expect(md).toContain("2 part");
    expect(md).toContain("1 part");
  });
});
