import type { GridConfig } from "./grid-config";
import type { BinConfig } from "./bin-config";
import {
  getBinDimensions,
  GRIDFINITY_BASE_HEIGHT,
  GRIDFINITY_CORNER_RADIUS,
  BASE_CHAMFER_1,
  BASE_VERTICAL,
  BASE_CHAMFER_2,
  BASE_TOTAL_INSET,
  LIP_CHAMFER_BOTTOM,
  LIP_VERTICAL,
  LIP_CHAMFER_TOP,
  LIP_LEDGE,
  LIP_TOTAL_DEPTH,
  LIP_SUPPORT_MIN_HEIGHT,
  INTERIOR_FILLET_RADIUS,
  BRIDGE_THICKNESS,
} from "./bin-config";
import { getGridDerivedValues } from "./grid-config";
import { getManifold } from "./manifold";
import {
  roundedRectPoints,
  getGridHolePositions,
  buildChamferedProfile,
  ROUNDRECT_SEGMENTS,
  CYLINDER_SEGMENTS,
  EXTRUDE_CLEARANCE,
} from "./geometry";
import type { ProfileSegment } from "./geometry";
import type Module from "manifold-3d";

type ManifoldWasm = Awaited<ReturnType<typeof Module>>;
type Manifold = InstanceType<ManifoldWasm["Manifold"]>;

/**
 * Generate a Gridfinity-compatible bin mesh with accurate chamfered profiles.
 * Each grid cell gets its own chamfered base pad, connected by a bridge floor.
 * The caller MUST call .delete() on the returned Manifold when done.
 */
export async function generateBinMesh(
  binConfig: BinConfig,
  gridConfig: GridConfig
): Promise<Manifold> {
  const wasm = await getManifold();
  const dims = getBinDimensions(binConfig, gridConfig);
  const derived = getGridDerivedValues(gridConfig);
  const intermediates: { delete(): void }[] = [];

  try {
    const cellSize = gridConfig.baseUnit;
    const padSize = cellSize - gridConfig.tolerance;

    // ── Outer cross-section (full bin exterior) ─────────────────────────────
    const outerPts = roundedRectPoints(
      dims.exteriorWidth,
      dims.exteriorLength,
      dims.cornerRadius,
      ROUNDRECT_SEGMENTS
    );
    const outerCS = new wasm.CrossSection([outerPts]);
    intermediates.push(outerCS);

    // ── 1. Per-cell chamfered base pads (Z=0 to Z=baseHeight) ───────────────
    // Each cell gets its own pad with the chamfered base profile
    const padPts = roundedRectPoints(
      padSize,
      padSize,
      GRIDFINITY_CORNER_RADIUS,
      ROUNDRECT_SEGMENTS
    );
    const padCS = new wasm.CrossSection([padPts]);
    intermediates.push(padCS);

    const baseSegments: ProfileSegment[] = [
      { height: BASE_CHAMFER_1, startInset: BASE_TOTAL_INSET, endInset: BASE_TOTAL_INSET - BASE_CHAMFER_1 },
      { height: BASE_VERTICAL, startInset: BASE_TOTAL_INSET - BASE_CHAMFER_1, endInset: BASE_TOTAL_INSET - BASE_CHAMFER_1 },
      { height: BASE_CHAMFER_2, startInset: BASE_TOTAL_INSET - BASE_CHAMFER_1, endInset: 0 },
    ];

    // Build one pad template, then translate copies to each cell center
    const padTemplate = buildChamferedProfile(wasm, padCS, baseSegments, 0, intermediates);

    const halfW = (binConfig.gridUnitsX * cellSize) / 2;
    const halfL = (binConfig.gridUnitsY * cellSize) / 2;

    const pads: Manifold[] = [];
    for (let ix = 0; ix < binConfig.gridUnitsX; ix++) {
      for (let iy = 0; iy < binConfig.gridUnitsY; iy++) {
        const cx = ix * cellSize - halfW + cellSize / 2;
        const cy = iy * cellSize - halfL + cellSize / 2;
        const translated = padTemplate.translate(cx, cy, 0);
        intermediates.push(translated);
        pads.push(translated);
      }
    }

    let bin = wasm.Manifold.union(pads);
    intermediates.push(bin);

    // ── 2. Bridge floor (connects pads to body) ─────────────────────────────
    // Flat slab at full exterior footprint from top of base to cavity floor
    const bridgeZ = GRIDFINITY_BASE_HEIGHT;
    let bridge = outerCS.extrude(BRIDGE_THICKNESS);
    intermediates.push(bridge);
    bridge = bridge.translate(0, 0, bridgeZ);
    intermediates.push(bridge);

    bin = wasm.Manifold.union([bin, bridge]);
    intermediates.push(bin);

    // ── 3. Body walls (Z=bridge top to Z=totalHeight) ───────────────────────
    const bodyBottom = bridgeZ + BRIDGE_THICKNESS;
    let bodyWall = outerCS.extrude(dims.totalHeight - bodyBottom);
    intermediates.push(bodyWall);
    bodyWall = bodyWall.translate(0, 0, bodyBottom);
    intermediates.push(bodyWall);

    bin = wasm.Manifold.union([bin, bodyWall]);
    intermediates.push(bin);

    // ── 4. Hollow interior with filleted floor ──────────────────────────────
    const innerRadius = Math.max(dims.cornerRadius - binConfig.wallThickness, 0);
    const innerPts = roundedRectPoints(
      dims.interiorWidth,
      dims.interiorLength,
      innerRadius,
      ROUNDRECT_SEGMENTS
    );
    const innerCS = new wasm.CrossSection([innerPts]);
    intermediates.push(innerCS);

    // Cavity floor is at top of bridge
    const cavityFloor = bodyBottom;
    // Cavity extends up to where the lip support begins (if lip enabled)
    const lipSupportHeight = binConfig.includeStackingLip
      ? LIP_SUPPORT_MIN_HEIGHT + LIP_TOTAL_DEPTH
      : 0;
    const cavityTop = dims.totalHeight - dims.stackingLipHeight - lipSupportHeight;
    const cavityHeight = Math.max(0, cavityTop - cavityFloor);

    if (cavityHeight > INTERIOR_FILLET_RADIUS) {
      const filletSegments: ProfileSegment[] = [
        { height: INTERIOR_FILLET_RADIUS, startInset: INTERIOR_FILLET_RADIUS, endInset: 0 },
        { height: cavityHeight - INTERIOR_FILLET_RADIUS + EXTRUDE_CLEARANCE, startInset: 0, endInset: 0 },
      ];
      const cavity = buildChamferedProfile(wasm, innerCS, filletSegments, cavityFloor, intermediates);
      bin = bin.subtract(cavity);
      intermediates.push(bin);
    } else if (cavityHeight > 0) {
      let cavity = innerCS.extrude(cavityHeight + EXTRUDE_CLEARANCE);
      intermediates.push(cavity);
      cavity = cavity.translate(0, 0, cavityFloor);
      intermediates.push(cavity);
      bin = bin.subtract(cavity);
      intermediates.push(bin);
    }

    // ── 5. Lip support + lip profile (chamfered cavity at top) ──────────────
    if (binConfig.includeStackingLip) {
      bin = carveLipWithSupport(wasm, bin, outerCS, dims, binConfig, intermediates);
    }

    // ── 6. Magnet holes ─────────────────────────────────────────────────────
    if (binConfig.includeMagnetHoles) {
      bin = subtractMagnetHoles(wasm, bin, binConfig, gridConfig, derived, intermediates);
    }

    // ── 7. Screw holes ──────────────────────────────────────────────────────
    if (binConfig.includeScrewHoles && binConfig.includeMagnetHoles) {
      bin = subtractScrewHoles(wasm, bin, binConfig, gridConfig, dims, derived, intermediates);
    }

    // Remove final result from intermediates
    const idx = intermediates.indexOf(bin);
    if (idx !== -1) {
      intermediates.splice(idx, 1);
    }

    return bin;
  } finally {
    for (const obj of intermediates) {
      try {
        obj.delete();
      } catch {
        // Already deleted or invalid — ignore
      }
    }
  }
}

// ── Stacking Lip with Support ───────────────────────────────────────────────

function carveLipWithSupport(
  wasm: ManifoldWasm,
  bin: Manifold,
  outerCS: InstanceType<ManifoldWasm["CrossSection"]>,
  dims: ReturnType<typeof getBinDimensions>,
  binConfig: BinConfig,
  intermediates: { delete(): void }[]
): Manifold {
  // The lip zone has two parts:
  // 1. Support: wall tapers from body wall thickness to full lip depth (45°)
  // 2. Profile: the actual chamfered stacking lip cavity
  //
  // The support transitions the thin body wall into the thick lip zone.
  // Support height = LIP_SUPPORT_MIN_HEIGHT + LIP_TOTAL_DEPTH (45° taper)

  const lipProfileBottom = dims.totalHeight - dims.stackingLipHeight;
  const supportHeight = LIP_SUPPORT_MIN_HEIGHT + LIP_TOTAL_DEPTH;
  const supportBottom = lipProfileBottom - supportHeight;

  // ── Support cavity: tapers from inner wall to lip bottom width ──────────
  // At the top of the support (= bottom of lip), the cavity width matches
  // the narrowest part of the lip profile.
  // The lip profile's narrowest inset from exterior is:
  const lipNarrowestInset = LIP_LEDGE + LIP_CHAMFER_TOP + LIP_CHAMFER_BOTTOM;
  // At the bottom of the support, the cavity is at body interior width (inset = wallThickness from exterior)
  const bodyInset = binConfig.wallThickness;

  // The support tapers the cavity from bodyInset width to lipNarrowestInset width
  // over supportHeight. First part is straight at bodyInset, then 45° taper.
  const supportSegments: ProfileSegment[] = [
    { height: LIP_SUPPORT_MIN_HEIGHT, startInset: bodyInset, endInset: bodyInset },
    { height: LIP_TOTAL_DEPTH, startInset: bodyInset, endInset: lipNarrowestInset },
  ];

  const supportCavity = buildChamferedProfile(
    wasm, outerCS, supportSegments, supportBottom, intermediates
  );
  bin = bin.subtract(supportCavity);
  intermediates.push(bin);

  // ── Lip profile cavity ──────────────────────────────────────────────────
  const topInset = LIP_LEDGE;
  const midInset = LIP_LEDGE + LIP_CHAMFER_TOP;
  const botInset = lipNarrowestInset;

  const lipSegments: ProfileSegment[] = [
    { height: LIP_CHAMFER_BOTTOM, startInset: botInset, endInset: midInset },
    { height: LIP_VERTICAL, startInset: midInset, endInset: midInset },
    { height: LIP_CHAMFER_TOP, startInset: midInset, endInset: topInset },
  ];

  const lipCavity = buildChamferedProfile(
    wasm, outerCS, lipSegments, lipProfileBottom, intermediates
  );
  bin = bin.subtract(lipCavity);
  intermediates.push(bin);

  return bin;
}

// ── Hole Helpers ────────────────────────────────────────────────────────────

function getHolePositions(
  binConfig: BinConfig,
  gridConfig: GridConfig
): [number, number][] {
  const cellSize = gridConfig.baseUnit;
  return getGridHolePositions(
    binConfig.gridUnitsX,
    binConfig.gridUnitsY,
    cellSize,
    cellSize * binConfig.gridUnitsX,
    cellSize * binConfig.gridUnitsY
  );
}

function subtractMagnetHoles(
  wasm: ManifoldWasm,
  bin: Manifold,
  binConfig: BinConfig,
  gridConfig: GridConfig,
  derived: ReturnType<typeof getGridDerivedValues>,
  intermediates: { delete(): void }[]
): Manifold {
  const positions = getHolePositions(binConfig, gridConfig);
  const holeDia = derived.magnetHoleDiameter;
  const holeDepth = derived.magnetHoleDepth;

  const holes: Manifold[] = [];
  for (const [x, y] of positions) {
    let cyl = wasm.Manifold.cylinder(
      holeDepth,
      holeDia / 2,
      holeDia / 2,
      CYLINDER_SEGMENTS,
      false
    );
    intermediates.push(cyl);
    cyl = cyl.translate(x, y, 0);
    intermediates.push(cyl);
    holes.push(cyl);
  }

  if (holes.length === 0) return bin;

  const allHoles = wasm.Manifold.union(holes);
  intermediates.push(allHoles);

  const result = bin.subtract(allHoles);
  intermediates.push(result);
  return result;
}

function subtractScrewHoles(
  wasm: ManifoldWasm,
  bin: Manifold,
  binConfig: BinConfig,
  gridConfig: GridConfig,
  dims: ReturnType<typeof getBinDimensions>,
  derived: ReturnType<typeof getGridDerivedValues>,
  intermediates: { delete(): void }[]
): Manifold {
  const positions = getHolePositions(binConfig, gridConfig);
  const holeDia = derived.screwHoleDiameter;
  const holeDepth = dims.baseHeight + EXTRUDE_CLEARANCE;

  const holes: Manifold[] = [];
  for (const [x, y] of positions) {
    let cyl = wasm.Manifold.cylinder(
      holeDepth,
      holeDia / 2,
      holeDia / 2,
      CYLINDER_SEGMENTS,
      false
    );
    intermediates.push(cyl);
    cyl = cyl.translate(x, y, 0);
    intermediates.push(cyl);
    holes.push(cyl);
  }

  if (holes.length === 0) return bin;

  const allHoles = wasm.Manifold.union(holes);
  intermediates.push(allHoles);

  const result = bin.subtract(allHoles);
  intermediates.push(result);
  return result;
}
