import JSZip from "jszip";
import type { PackingResult } from "./print-planner";

// ── Binary STL Writer ────────────────────────────────────────────────────────

interface MeshData {
  triVerts: Uint32Array;
  vertProperties: Float32Array;
  numProp: number;
}

const STL_HEADER_BYTES = 80;
const STL_TRIANGLE_BYTES = 50;

/**
 * Convert a Manifold mesh to binary STL format.
 * Binary STL: 80-byte header, 4-byte triangle count, then 50 bytes per triangle
 * (12 bytes normal + 36 bytes vertices + 2 bytes attribute).
 */
export function meshToStlBinary(mesh: MeshData): ArrayBuffer {
  const triCount = mesh.triVerts.length / 3;
  const buffer = new ArrayBuffer(
    STL_HEADER_BYTES + 4 + triCount * STL_TRIANGLE_BYTES
  );
  const view = new DataView(buffer);
  view.setUint32(STL_HEADER_BYTES, triCount, true);
  writeTriangles(view, STL_HEADER_BYTES + 4, mesh, identityTransform);
  return buffer;
}

/**
 * Vertex transform: applied as `(x, y, z) → (rotated? -y : x, rotated? x : y, z) + (tx, ty, tz)`.
 * 90° CCW Z-rotation when `rotated` is true, then translation.
 */
export interface MeshTransform {
  tx: number;
  ty: number;
  tz: number;
  rotated: boolean;
}

const identityTransform: MeshTransform = { tx: 0, ty: 0, tz: 0, rotated: false };

/**
 * Compose a single binary STL whose triangles are the union of multiple
 * meshes, each with its own translation/rotation. Parts remain separate
 * shells inside the file — slicers handle multi-object STLs natively.
 */
export function combineSheetStl(
  parts: { mesh: MeshData; transform: MeshTransform }[]
): ArrayBuffer {
  let triCount = 0;
  for (const p of parts) triCount += p.mesh.triVerts.length / 3;

  const buffer = new ArrayBuffer(
    STL_HEADER_BYTES + 4 + triCount * STL_TRIANGLE_BYTES
  );
  const view = new DataView(buffer);
  view.setUint32(STL_HEADER_BYTES, triCount, true);

  let offset = STL_HEADER_BYTES + 4;
  for (const p of parts) {
    offset = writeTriangles(view, offset, p.mesh, p.transform);
  }

  return buffer;
}

function writeTriangles(
  view: DataView,
  startOffset: number,
  mesh: MeshData,
  t: MeshTransform
): number {
  const { triVerts, vertProperties, numProp } = mesh;
  const triCount = triVerts.length / 3;
  let offset = startOffset;

  for (let tri = 0; tri < triCount; tri++) {
    const i0 = triVerts[tri * 3]!;
    const i1 = triVerts[tri * 3 + 1]!;
    const i2 = triVerts[tri * 3 + 2]!;

    const ax0 = vertProperties[i0 * numProp]!;
    const ay0 = vertProperties[i0 * numProp + 1]!;
    const az0 = vertProperties[i0 * numProp + 2]!;
    const bx0 = vertProperties[i1 * numProp]!;
    const by0 = vertProperties[i1 * numProp + 1]!;
    const bz0 = vertProperties[i1 * numProp + 2]!;
    const cx0 = vertProperties[i2 * numProp]!;
    const cy0 = vertProperties[i2 * numProp + 1]!;
    const cz0 = vertProperties[i2 * numProp + 2]!;

    // Apply 90° CCW Z-rotation (x, y) → (-y, x) when requested, then translate.
    const ax = (t.rotated ? -ay0 : ax0) + t.tx;
    const ay = (t.rotated ? ax0 : ay0) + t.ty;
    const az = az0 + t.tz;
    const bx = (t.rotated ? -by0 : bx0) + t.tx;
    const by = (t.rotated ? bx0 : by0) + t.ty;
    const bz = bz0 + t.tz;
    const cx = (t.rotated ? -cy0 : cx0) + t.tx;
    const cy = (t.rotated ? cx0 : cy0) + t.ty;
    const cz = cz0 + t.tz;

    // Face normal (cross product of two edges)
    const e1x = bx - ax;
    const e1y = by - ay;
    const e1z = bz - az;
    const e2x = cx - ax;
    const e2y = cy - ay;
    const e2z = cz - az;
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    }

    view.setFloat32(offset, nx, true);
    view.setFloat32(offset + 4, ny, true);
    view.setFloat32(offset + 8, nz, true);

    view.setFloat32(offset + 12, ax, true);
    view.setFloat32(offset + 16, ay, true);
    view.setFloat32(offset + 20, az, true);

    view.setFloat32(offset + 24, bx, true);
    view.setFloat32(offset + 28, by, true);
    view.setFloat32(offset + 32, bz, true);

    view.setFloat32(offset + 36, cx, true);
    view.setFloat32(offset + 40, cy, true);
    view.setFloat32(offset + 44, cz, true);

    view.setUint16(offset + 48, 0, true);
    offset += STL_TRIANGLE_BYTES;
  }

  return offset;
}

// ── ZIP Bundle ───────────────────────────────────────────────────────────────

export interface ExportFile {
  /** Path inside the ZIP — may include forward-slash folders, e.g. `parts/foo.stl`. */
  path: string;
  data: ArrayBuffer;
}

/**
 * Create a ZIP file containing arbitrary files (paths may include folders)
 * plus a top-level `print-plan.md`. Returns a Blob ready for download.
 */
export async function createExportZip(
  files: ExportFile[],
  printPlan: string
): Promise<Blob> {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.data);
  }
  zip.file("print-plan.md", printPlan);
  return zip.generateAsync({ type: "blob" });
}

// ── Print Plan Markdown ──────────────────────────────────────────────────────

export function generatePrintPlanMarkdown(result: PackingResult): string {
  const lines: string[] = [];

  lines.push("# Print Plan");
  lines.push("");
  lines.push(
    `**Total: ${result.totalSheets} sheet${result.totalSheets !== 1 ? "s" : ""}**`
  );
  lines.push("");

  lines.push("## Parts Inventory");
  lines.push("");
  lines.push("| Part | Qty | Size (mm) |");
  lines.push("|------|-----|-----------|");
  for (const entry of result.inventory) {
    lines.push(
      `| ${entry.label} | ×${entry.quantity} | ${entry.width.toFixed(1)} × ${entry.length.toFixed(1)} |`
    );
  }
  lines.push("");

  lines.push("## Print Sheets");
  lines.push("");
  for (const sheet of result.sheets) {
    lines.push(
      `### Sheet ${sheet.index + 1} (${sheet.placements.length} part${sheet.placements.length !== 1 ? "s" : ""})`
    );
    lines.push("");
    for (const p of sheet.placements) {
      const rot = p.rotated ? " (rotated 90°)" : "";
      lines.push(
        `- [ ] ${p.item.label}${rot} at (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`
      );
    }
    lines.push("");
  }

  if (result.unpacked.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const item of result.unpacked) {
      lines.push(
        `- **${item.label}** (${item.width}×${item.length}mm) — too large for print bed`
      );
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("*Generated by Tessera*");

  return lines.join("\n");
}

// ── Browser Download Helper ──────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
