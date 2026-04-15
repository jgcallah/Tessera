import type { GridConfig } from "./grid-config";
import type { BaseplateConfig } from "./baseplate-config";
import {
  getBaseplateDimensions,
  SOCKET_CHAMFER_BOTTOM,
  SOCKET_VERTICAL,
  SOCKET_CHAMFER_TOP,
  SOCKET_TOTAL_DEPTH,
  SOCKET_LEDGE,
} from "./baseplate-config";
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
 * Generate a Gridfinity-compatible baseplate as a frame/waffle structure.
 * The baseplate is an open grid of rim walls with receptacle profiles on top.
 * No solid bottom — just the perimeter rim and internal grid walls.
 * The caller MUST call .delete() on the returned Manifold when done.
 */
export async function generateBaseplateMesh(
  config: BaseplateConfig,
  gridConfig: GridConfig
): Promise<Manifold> {
  const wasm = await getManifold();
  const dims = getBaseplateDimensions(config, gridConfig);
  const derived = getGridDerivedValues(gridConfig);
  const intermediates: { delete(): void }[] = [];

  try {
    const cellSize = gridConfig.baseUnit;
    const halfW = dims.width / 2;
    const halfL = dims.length / 2;
    const wallParts: Manifold[] = [];

    // Build the frame: outer rim + internal grid walls
    // Each wall is a rectangular extrusion at the cell boundaries

    // Horizontal walls (along X axis) at each Y boundary
    for (let iy = 0; iy <= config.gridUnitsY; iy++) {
      const y = iy * cellSize - halfL;
      const wallLength = dims.width;
      let wall = wasm.Manifold.cube(
        [wallLength, dims.rimWidth, dims.totalHeight],
        false
      );
      intermediates.push(wall);
      wall = wall.translate(-halfW, y - dims.rimWidth / 2, 0);
      intermediates.push(wall);
      wallParts.push(wall);
    }

    // Vertical walls (along Y axis) at each X boundary
    for (let ix = 0; ix <= config.gridUnitsX; ix++) {
      const x = ix * cellSize - halfW;
      const wallLength = dims.length;
      let wall = wasm.Manifold.cube(
        [dims.rimWidth, wallLength, dims.totalHeight],
        false
      );
      intermediates.push(wall);
      wall = wall.translate(x - dims.rimWidth / 2, -halfL, 0);
      intermediates.push(wall);
      wallParts.push(wall);
    }

    let plate = wasm.Manifold.union(wallParts);
    intermediates.push(plate);

    // Clip to the rounded outer boundary
    const outerPts = roundedRectPoints(
      dims.width,
      dims.length,
      dims.cornerRadius,
      ROUNDRECT_SEGMENTS
    );
    const outerCS = new wasm.CrossSection([outerPts]);
    intermediates.push(outerCS);
    const outerBound = outerCS.extrude(dims.totalHeight + EXTRUDE_CLEARANCE);
    intermediates.push(outerBound);

    const clipped = plate.intersect(outerBound);
    intermediates.push(clipped);
    plate = clipped;

    // ── Socket profiles (chamfered cavity in top of each cell) ──────────
    plate = carveSocketProfiles(
      wasm,
      plate,
      config,
      gridConfig,
      dims,
      intermediates
    );

    // Magnet holes
    if (config.includeMagnetHoles) {
      plate = subtractHoles(
        wasm,
        plate,
        config,
        gridConfig,
        dims,
        gridConfig.magnetDiameter,
        derived.magnetHoleDepth,
        intermediates
      );
    }

    // Screw holes
    if (config.includeScrewHoles && config.includeMagnetHoles) {
      plate = subtractHoles(
        wasm,
        plate,
        config,
        gridConfig,
        dims,
        gridConfig.screwDiameter,
        dims.totalHeight + EXTRUDE_CLEARANCE,
        intermediates
      );
    }

    // Snap connector channels — one per outer-perimeter cell on each outer wall
    if (config.includeSnapConnectors) {
      plate = carveSnapChannels(wasm, plate, config, gridConfig, dims, intermediates);
    }

    // Remove final result from intermediates
    const idx = intermediates.indexOf(plate);
    if (idx !== -1) {
      intermediates.splice(idx, 1);
    }

    return plate;
  } finally {
    for (const obj of intermediates) {
      try {
        obj.delete();
      } catch {
        // Already deleted — ignore
      }
    }
  }
}

function carveSocketProfiles(
  wasm: ManifoldWasm,
  plate: Manifold,
  config: BaseplateConfig,
  gridConfig: GridConfig,
  dims: ReturnType<typeof getBaseplateDimensions>,
  intermediates: { delete(): void }[]
): Manifold {
  const cellSize = gridConfig.baseUnit;
  const halfW = dims.width / 2;
  const halfL = dims.length / 2;

  // Socket opening size per cell (with ledge around edge)
  const socketWidth = cellSize - 2 * SOCKET_LEDGE;
  const socketPts = roundedRectPoints(
    socketWidth,
    socketWidth,
    dims.cornerRadius,
    ROUNDRECT_SEGMENTS
  );
  const socketCS = new wasm.CrossSection([socketPts]);
  intermediates.push(socketCS);

  const socketSegments: ProfileSegment[] = [
    { height: SOCKET_CHAMFER_BOTTOM, startInset: SOCKET_TOTAL_DEPTH, endInset: SOCKET_TOTAL_DEPTH - SOCKET_CHAMFER_BOTTOM },
    { height: SOCKET_VERTICAL, startInset: SOCKET_TOTAL_DEPTH - SOCKET_CHAMFER_BOTTOM, endInset: SOCKET_TOTAL_DEPTH - SOCKET_CHAMFER_BOTTOM },
    { height: SOCKET_CHAMFER_TOP, startInset: SOCKET_TOTAL_DEPTH - SOCKET_CHAMFER_BOTTOM, endInset: 0 },
  ];

  // Socket Z starts from (totalHeight - socketTotalDepth) up to totalHeight
  const socketTotalHeight = SOCKET_CHAMFER_BOTTOM + SOCKET_VERTICAL + SOCKET_CHAMFER_TOP;
  const socketBaseZ = dims.totalHeight - socketTotalHeight;

  // Build one socket template
  const socketTemplate = buildChamferedProfile(
    wasm,
    socketCS,
    socketSegments,
    socketBaseZ,
    intermediates
  );

  // Create translated copies for each cell and union them
  const sockets: Manifold[] = [];
  for (let ix = 0; ix < config.gridUnitsX; ix++) {
    for (let iy = 0; iy < config.gridUnitsY; iy++) {
      const cx = ix * cellSize - halfW + cellSize / 2;
      const cy = iy * cellSize - halfL + cellSize / 2;
      const translated = socketTemplate.translate(cx, cy, 0);
      intermediates.push(translated);
      sockets.push(translated);
    }
  }

  if (sockets.length === 0) return plate;

  const allSockets = wasm.Manifold.union(sockets);
  intermediates.push(allSockets);

  const result = plate.subtract(allSockets);
  intermediates.push(result);
  return result;
}

function subtractHoles(
  wasm: ManifoldWasm,
  plate: Manifold,
  config: BaseplateConfig,
  gridConfig: GridConfig,
  dims: ReturnType<typeof getBaseplateDimensions>,
  holeDiameter: number,
  holeDepth: number,
  intermediates: { delete(): void }[]
): Manifold {
  const cellSize = gridConfig.baseUnit;
  const positions = getGridHolePositions(
    config.gridUnitsX,
    config.gridUnitsY,
    cellSize,
    dims.width,
    dims.length
  );
  const holes: Manifold[] = [];

  for (const [x, y] of positions) {
    let cyl = wasm.Manifold.cylinder(
      holeDepth,
      holeDiameter / 2,
      holeDiameter / 2,
      CYLINDER_SEGMENTS,
      false
    );
    intermediates.push(cyl);
    cyl = cyl.translate(x, y, 0);
    intermediates.push(cyl);
    holes.push(cyl);
  }

  if (holes.length === 0) return plate;

  const allHoles = wasm.Manifold.union(holes);
  intermediates.push(allHoles);

  const result = plate.subtract(allHoles);
  intermediates.push(result);
  return result;
}

// ── Snap connector geometry ──────────────────────────────────────────────────
// Measurements from the supplied clip-47.stl:
//   - 19.6 mm along the shared rim edge
//   - 4.3 mm across the joint (through-rim direction)
//   - 3.674 mm tall
// One snap pocket is carved at the CENTER of each outer-perimeter cell on
// each outer wall. The pocket is sized to the full clip bounding box so the
// removed piece clearly matches the snap clip itself. The cutter is built
// from axis-aligned box primitives to avoid rotation-convention ambiguity.

const CLIP_LEN = 19.6; // along the wall
const CLIP_THROUGH = 4.3; // perpendicular (through rim; may exceed rim thickness)
const CLIP_TALL = 3.674; // vertical from rim bottom

function carveSnapChannels(
  wasm: ManifoldWasm,
  plate: Manifold,
  config: BaseplateConfig,
  gridConfig: GridConfig,
  dims: ReturnType<typeof getBaseplateDimensions>,
  intermediates: { delete(): void }[]
): Manifold {
  const halfW = dims.width / 2;
  const halfL = dims.length / 2;
  const cell = gridConfig.baseUnit;
  const slots: Manifold[] = [];

  // Sink the pocket just below the rim top so it doesn't cut into the outer
  // rounded-rect boundary in a way the chamfer removes anyway. Z range is
  // roughly [0, 3.674].
  const zMin = 0;

  // Cutter for walls running along world X (top + bottom rims): long axis
  // along X, through-rim along Y, tall along Z.
  const xCutterBase = wasm.Manifold.cube(
    [CLIP_LEN, CLIP_THROUGH, CLIP_TALL],
    false
  );
  intermediates.push(xCutterBase);
  const xCutter = xCutterBase.translate(
    -CLIP_LEN / 2,
    -CLIP_THROUGH / 2,
    zMin
  );
  intermediates.push(xCutter);

  // Cutter for walls running along world Y (left + right rims): swap X/Y.
  const yCutterBase = wasm.Manifold.cube(
    [CLIP_THROUGH, CLIP_LEN, CLIP_TALL],
    false
  );
  intermediates.push(yCutterBase);
  const yCutter = yCutterBase.translate(
    -CLIP_THROUGH / 2,
    -CLIP_LEN / 2,
    zMin
  );
  intermediates.push(yCutter);

  // One pocket per cell on bottom and top rims. Cell centers along X:
  // -halfW + (i + 0.5) * cellSize for i in [0, gridUnitsX).
  for (let ix = 0; ix < config.gridUnitsX; ix++) {
    const cx = -halfW + (ix + 0.5) * cell;

    const bottom = xCutter.translate(cx, -halfL, 0);
    intermediates.push(bottom);
    slots.push(bottom);

    const top = xCutter.translate(cx, halfL, 0);
    intermediates.push(top);
    slots.push(top);
  }

  // One pocket per cell on left and right rims.
  for (let iy = 0; iy < config.gridUnitsY; iy++) {
    const cy = -halfL + (iy + 0.5) * cell;

    const left = yCutter.translate(-halfW, cy, 0);
    intermediates.push(left);
    slots.push(left);

    const right = yCutter.translate(halfW, cy, 0);
    intermediates.push(right);
    slots.push(right);
  }

  if (slots.length === 0) return plate;

  const allSlots = wasm.Manifold.union(slots);
  intermediates.push(allSlots);

  const result = plate.subtract(allSlots);
  intermediates.push(result);
  return result;
}
