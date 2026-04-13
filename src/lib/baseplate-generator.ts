import type { GridConfig } from "./grid-config";
import type { BaseplateConfig } from "./baseplate-config";
import { getBaseplateDimensions } from "./baseplate-config";
import { getGridDerivedValues } from "./grid-config";
import { getManifold } from "./manifold";
import {
  roundedRectPoints,
  getGridHolePositions,
  ROUNDRECT_SEGMENTS,
  CYLINDER_SEGMENTS,
  EXTRUDE_CLEARANCE,
} from "./geometry";
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

    // Magnet holes
    if (config.includeMagnetHoles) {
      plate = subtractHoles(
        wasm,
        plate,
        config,
        gridConfig,
        dims,
        derived.magnetHoleDiameter,
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
        derived.screwHoleDiameter,
        dims.totalHeight + EXTRUDE_CLEARANCE,
        intermediates
      );
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
