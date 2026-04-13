import { BufferGeometry, Float32BufferAttribute } from "three";
import { GRIDFINITY_LIP_HEIGHT, GRIDFINITY_MAGNET_HOLE_INSET } from "./bin-config";
import type Module from "manifold-3d";

type ManifoldWasm = Awaited<ReturnType<typeof Module>>;
type Manifold = InstanceType<ManifoldWasm["Manifold"]>;
type CrossSection = InstanceType<ManifoldWasm["CrossSection"]>;

/**
 * Convert a Manifold Mesh to a Three.js BufferGeometry.
 * Extracts vertex positions from the interleaved vertProperties array
 * using triangle indices from triVerts.
 */
export function manifoldMeshToGeometry(mesh: {
  triVerts: Uint32Array;
  vertProperties: Float32Array;
  numProp: number;
}): BufferGeometry {
  const { triVerts, vertProperties, numProp } = mesh;
  const positions = new Float32Array(triVerts.length * 3);

  for (let i = 0; i < triVerts.length; i++) {
    const vi = triVerts[i]!;
    positions[i * 3] = vertProperties[vi * numProp]!;
    positions[i * 3 + 1] = vertProperties[vi * numProp + 1]!;
    positions[i * 3 + 2] = vertProperties[vi * numProp + 2]!;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Generate CCW polygon vertices for a rounded rectangle centered at origin.
 * Returns points compatible with Manifold3D's SimplePolygon (Vec2[]).
 */
export function roundedRectPoints(
  width: number,
  height: number,
  radius: number,
  segments: number
): [number, number][] {
  if (radius <= 0) {
    // Sharp rectangle — 4 corner points, CCW
    const hw = width / 2;
    const hh = height / 2;
    return [
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
      [-hw, -hh],
    ];
  }

  const r = Math.min(radius, width / 2, height / 2);
  const hw = width / 2 - r;
  const hh = height / 2 - r;
  const points: [number, number][] = [];

  // 4 corners, CCW: bottom-right → top-right → top-left → bottom-left
  const corners: [number, number, number][] = [
    [hw, -hh, -Math.PI / 2], // bottom-right, start angle -90°
    [hw, hh, 0], // top-right, start angle 0°
    [-hw, hh, Math.PI / 2], // top-left, start angle 90°
    [-hw, -hh, Math.PI], // bottom-left, start angle 180°
  ];

  for (const [cx, cy, startAngle] of corners) {
    for (let i = 0; i < segments; i++) {
      const angle = startAngle + (i / segments) * (Math.PI / 2);
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
  }

  return points;
}

/**
 * Simplified stacking lip cross-section profile.
 * Returns [wallOffset, height] pairs from top to bottom of the lip.
 * wallOffset > 0 means protruding outward from the inner wall.
 * wallOffset = 0 means flush with the inner wall.
 *
 * The profile describes how the lip steps inward from the top edge:
 * - Top rim: flush with outer wall
 * - First step: slight inward offset (creates the mating ledge)
 * - Second step: deeper inward offset (the recess)
 * - Bottom: back to inner wall line
 */
export function stackingLipProfile(): [number, number][] {
  // Simplified 2-step approximation of the Gridfinity stacking lip.
  // Heights are measured from bottom of lip zone (0) to top (4.4mm).
  // Offsets are measured outward from the inner wall surface.
  return [
    [0, GRIDFINITY_LIP_HEIGHT], // top, flush with inner wall
    [0.7, GRIDFINITY_LIP_HEIGHT], // top, protruding outward
    [0.7, GRIDFINITY_LIP_HEIGHT - 0.8], // step down, still protruding
    [0, GRIDFINITY_LIP_HEIGHT - 0.8], // step back to inner wall
    [0, GRIDFINITY_LIP_HEIGHT - 2.6], // continue down at inner wall
    [-0.4, GRIDFINITY_LIP_HEIGHT - 2.6], // slight inward recess
    [-0.4, 0], // bottom of lip, recessed
    [0, 0], // bottom, back to inner wall
  ];
}

// ── Chamfered Profile Builder ────────────────────────────────────────────────

/**
 * Describes one segment of a chamfered profile.
 * Inset values are measured inward from the base cross-section outline.
 */
export interface ProfileSegment {
  height: number;
  startInset: number;
  endInset: number;
}

const SLAB_THICKNESS = 0.01;

/**
 * Build a solid with chamfered transitions using hull-between-slices.
 *
 * Takes a base CrossSection (the largest outline) and profile segments
 * describing how the outline shrinks at each Z-level. Uses
 * CrossSection.offset() to compute inset outlines (correctly adjusting
 * corner radii), then hulls thin slabs at transition Z-levels.
 *
 * @param wasm      Manifold WASM instance
 * @param baseCS    The largest (zero-inset) cross-section
 * @param segments  Profile segments ordered bottom to top
 * @param baseZ     Z position of the profile bottom
 * @param intermediates  Cleanup tracker for WASM objects
 */
export function buildChamferedProfile(
  wasm: ManifoldWasm,
  baseCS: CrossSection,
  segments: ProfileSegment[],
  baseZ: number,
  intermediates: { delete(): void }[]
): Manifold {
  // Collect Z-levels and their insets
  interface ZLevel {
    z: number;
    inset: number;
  }
  const levels: ZLevel[] = [];
  let z = baseZ;
  for (const seg of segments) {
    if (levels.length === 0 || levels[levels.length - 1]!.inset !== seg.startInset) {
      levels.push({ z, inset: seg.startInset });
    }
    z += seg.height;
    levels.push({ z, inset: seg.endInset });
  }

  // Deduplicate levels at the same Z (keep last)
  const uniqueLevels: ZLevel[] = [];
  for (const level of levels) {
    if (uniqueLevels.length > 0 && uniqueLevels[uniqueLevels.length - 1]!.z === level.z) {
      uniqueLevels[uniqueLevels.length - 1] = level;
    } else {
      uniqueLevels.push(level);
    }
  }

  // Create a thin slab at each Z-level
  function makeSlab(inset: number, atZ: number): Manifold {
    let cs: CrossSection;
    if (inset > 0) {
      cs = baseCS.offset(-inset, "Round", 2, ROUNDRECT_SEGMENTS);
      intermediates.push(cs);
    } else {
      cs = baseCS;
    }
    let slab = cs.extrude(SLAB_THICKNESS);
    intermediates.push(slab);
    if (atZ !== 0) {
      slab = slab.translate(0, 0, atZ);
      intermediates.push(slab);
    }
    return slab;
  }

  // Hull adjacent pairs and union
  const parts: Manifold[] = [];
  for (let i = 0; i < uniqueLevels.length - 1; i++) {
    const a = uniqueLevels[i]!;
    const b = uniqueLevels[i + 1]!;
    const slabA = makeSlab(a.inset, a.z);
    const slabB = makeSlab(b.inset, b.z);
    const hull = wasm.Manifold.hull([slabA, slabB]);
    intermediates.push(hull);
    parts.push(hull);
  }

  if (parts.length === 1) {
    return parts[0]!;
  }

  const result = wasm.Manifold.union(parts);
  intermediates.push(result);
  return result;
}

// ── Shared Grid Geometry Helpers ─────────────────────────────────────────────

/** Segments for rounded rectangle extrusions */
export const ROUNDRECT_SEGMENTS = 8;

/** Segments for cylinder holes */
export const CYLINDER_SEGMENTS = 16;

/** Small clearance added to extrude heights to prevent manifold coplanar issues */
export const EXTRUDE_CLEARANCE = 0.1;

/**
 * Compute magnet/screw hole center positions for a grid of cells.
 * Each cell has 4 corner holes inset from the cell edge.
 */
export function getGridHolePositions(
  gridUnitsX: number,
  gridUnitsY: number,
  cellSize: number,
  totalWidth: number,
  totalLength: number
): [number, number][] {
  const positions: [number, number][] = [];
  const halfW = totalWidth / 2;
  const halfL = totalLength / 2;

  for (let ix = 0; ix < gridUnitsX; ix++) {
    for (let iy = 0; iy < gridUnitsY; iy++) {
      const cx = ix * cellSize - halfW + cellSize / 2;
      const cy = iy * cellSize - halfL + cellSize / 2;
      const half = cellSize / 2;
      const inset = GRIDFINITY_MAGNET_HOLE_INSET;

      positions.push(
        [cx - half + inset, cy - half + inset],
        [cx - half + inset, cy + half - inset],
        [cx + half - inset, cy - half + inset],
        [cx + half - inset, cy + half - inset]
      );
    }
  }

  return positions;
}
