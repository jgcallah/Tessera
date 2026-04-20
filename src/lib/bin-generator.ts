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
  DIVIDER_THICKNESS,
  SCOOP_RADIUS_RATIO,
  BOTTOM_HOLE_DIAMETER,
  BOTTOM_HOLE_SPACING,
  GRIDFINITY_BASE_GAP,
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
    // Per spec: each base top is 41.5 mm (cellSize − GRIDFINITY_BASE_GAP),
    // centered in its 42 mm cell. Leaves 0.25 mm tolerance per side for the
    // baseplate socket.
    const padSize = cellSize - GRIDFINITY_BASE_GAP;

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
      bin = subtractScrewHoles(wasm, bin, binConfig, gridConfig, dims, intermediates);
    }

    // ── 8. Internal dividers ────────────────────────────────────────────────
    if (binConfig.dividersX > 0 || binConfig.dividersY > 0) {
      bin = addDividers(wasm, bin, binConfig, gridConfig, dims, cavityFloor, cavityTop, intermediates);
    }

    // ── 9. Scoop ────────────────────────────────────────────────────────────
    if (binConfig.includeScoop) {
      bin = carveScoop(wasm, bin, dims, cavityFloor, cavityTop, intermediates);
    }

    // ── 10. Bottom holes ────────────────────────────────────────────────────
    if (binConfig.includeBottomHoles) {
      bin = subtractBottomHoles(wasm, bin, dims, cavityFloor, intermediates);
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

// ── Internal Dividers ────────────────────────────────────────────────────────

function addDividers(
  wasm: ManifoldWasm,
  bin: Manifold,
  binConfig: BinConfig,
  gridConfig: GridConfig,
  dims: ReturnType<typeof getBinDimensions>,
  cavityFloor: number,
  cavityTop: number,
  intermediates: { delete(): void }[]
): Manifold {
  const maxHeight = cavityTop - cavityFloor;
  if (maxHeight <= 0) return bin;

  // If dividerHeightUnits is 0 (default), use full cavity height.
  // Otherwise clamp to the cavity height so dividers never poke above the rim.
  const requestedHeight =
    binConfig.dividerHeightUnits > 0
      ? binConfig.dividerHeightUnits * gridConfig.heightUnit
      : maxHeight;
  const dividerHeight = Math.min(requestedHeight, maxHeight);
  if (dividerHeight <= 0) return bin;

  const dividers: Manifold[] = [];

  // X dividers (walls parallel to Y axis, splitting width)
  if (binConfig.dividersX > 0) {
    const compartmentW = dims.interiorWidth / (binConfig.dividersX + 1);
    for (let i = 1; i <= binConfig.dividersX; i++) {
      const x = -dims.interiorWidth / 2 + i * compartmentW - DIVIDER_THICKNESS / 2;
      let wall = wasm.Manifold.cube(
        [DIVIDER_THICKNESS, dims.interiorLength, dividerHeight],
        false
      );
      intermediates.push(wall);
      wall = wall.translate(x, -dims.interiorLength / 2, cavityFloor);
      intermediates.push(wall);
      dividers.push(wall);
    }
  }

  // Y dividers (walls parallel to X axis, splitting length)
  if (binConfig.dividersY > 0) {
    const compartmentL = dims.interiorLength / (binConfig.dividersY + 1);
    for (let i = 1; i <= binConfig.dividersY; i++) {
      const y = -dims.interiorLength / 2 + i * compartmentL - DIVIDER_THICKNESS / 2;
      let wall = wasm.Manifold.cube(
        [dims.interiorWidth, DIVIDER_THICKNESS, dividerHeight],
        false
      );
      intermediates.push(wall);
      wall = wall.translate(-dims.interiorWidth / 2, y, cavityFloor);
      intermediates.push(wall);
      dividers.push(wall);
    }
  }

  if (dividers.length === 0) return bin;

  const allDividers = wasm.Manifold.union(dividers);
  intermediates.push(allDividers);

  const result = wasm.Manifold.union([bin, allDividers]);
  intermediates.push(result);
  return result;
}

// ── Scoop ───────────────────────────────────────────────────────────────────

function carveScoop(
  wasm: ManifoldWasm,
  bin: Manifold,
  dims: ReturnType<typeof getBinDimensions>,
  cavityFloor: number,
  cavityTop: number,
  intermediates: { delete(): void }[]
): Manifold {
  // The scoop is a quarter-circle ramp added to the front-bottom interior
  // corner of the cavity. We build it by creating a box at that corner,
  // then subtracting a cylinder whose axis is at the back-top edge of the
  // box, leaving a concave quarter-circle ramp.
  const cavityHeight = cavityTop - cavityFloor;
  if (cavityHeight <= 0) return bin;

  const radius = Math.min(
    cavityHeight * SCOOP_RADIUS_RATIO,
    dims.interiorLength * 0.3
  );
  if (radius <= 0) return bin;

  const cylLength = dims.interiorWidth;

  // Box filling the front-bottom interior corner (centered cube)
  let box = wasm.Manifold.cube([cylLength, radius, radius], true);
  intermediates.push(box);
  box = box.translate(
    0,
    -dims.interiorLength / 2 + radius / 2,
    cavityFloor + radius / 2
  );
  intermediates.push(box);

  // Cylinder at the back-top edge of the box (centered)
  let cyl = wasm.Manifold.cylinder(
    cylLength + EXTRUDE_CLEARANCE * 2,
    radius,
    radius,
    32,
    true
  );
  intermediates.push(cyl);
  cyl = cyl.rotate([0, 90, 0]);
  intermediates.push(cyl);
  cyl = cyl.translate(
    0,
    -dims.interiorLength / 2 + radius,
    cavityFloor + radius
  );
  intermediates.push(cyl);

  // Ramp = box minus cylinder (leaves the concave quarter-wedge)
  const ramp = box.subtract(cyl);
  intermediates.push(ramp);

  // Union the ramp with the bin (adds material at the corner)
  const result = wasm.Manifold.union([bin, ramp]);
  intermediates.push(result);
  return result;
}

// ── Bottom Holes ────────────────────────────────────────────────────────────

function subtractBottomHoles(
  wasm: ManifoldWasm,
  bin: Manifold,
  dims: ReturnType<typeof getBinDimensions>,
  cavityFloor: number,
  intermediates: { delete(): void }[]
): Manifold {
  // Grid of holes in the floor for drainage or weight reduction
  const holeRadius = BOTTOM_HOLE_DIAMETER / 2;
  const floorThickness = cavityFloor; // holes go from Z=0 to cavityFloor

  const holes: Manifold[] = [];
  const startX = -dims.interiorWidth / 2 + BOTTOM_HOLE_SPACING;
  const startY = -dims.interiorLength / 2 + BOTTOM_HOLE_SPACING;
  const endX = dims.interiorWidth / 2 - BOTTOM_HOLE_SPACING / 2;
  const endY = dims.interiorLength / 2 - BOTTOM_HOLE_SPACING / 2;

  for (let x = startX; x <= endX; x += BOTTOM_HOLE_SPACING) {
    for (let y = startY; y <= endY; y += BOTTOM_HOLE_SPACING) {
      let cyl = wasm.Manifold.cylinder(
        floorThickness + EXTRUDE_CLEARANCE,
        holeRadius,
        holeRadius,
        CYLINDER_SEGMENTS,
        false
      );
      intermediates.push(cyl);
      cyl = cyl.translate(x, y, 0);
      intermediates.push(cyl);
      holes.push(cyl);
    }
  }

  if (holes.length === 0) return bin;

  const allHoles = wasm.Manifold.union(holes);
  intermediates.push(allHoles);

  const result = bin.subtract(allHoles);
  intermediates.push(result);
  return result;
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
  const holeDia = gridConfig.magnetDiameter;
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
  intermediates: { delete(): void }[]
): Manifold {
  const positions = getHolePositions(binConfig, gridConfig);
  const holeDia = gridConfig.screwDiameter;
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
