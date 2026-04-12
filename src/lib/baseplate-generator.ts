import type { GridConfig } from "./grid-config";
import type { BaseplateConfig } from "./baseplate-config";
import {
  getBaseplateDimensions,
  BASEPLATE_CORNER_RADIUS,
} from "./baseplate-config";
import { GRIDFINITY_MAGNET_HOLE_INSET } from "./bin-config";
import { getGridDerivedValues } from "./grid-config";
import { getManifold } from "./manifold";
import { roundedRectPoints } from "./geometry";
import type Module from "manifold-3d";

type ManifoldWasm = Awaited<ReturnType<typeof Module>>;
type Manifold = InstanceType<ManifoldWasm["Manifold"]>;

/**
 * Generate a Gridfinity-compatible baseplate mesh.
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
    // 1. Create the base slab (full footprint, full height)
    const outerPts = roundedRectPoints(
      dims.width,
      dims.length,
      BASEPLATE_CORNER_RADIUS,
      8
    );
    const outerCS = new wasm.CrossSection([outerPts]);
    intermediates.push(outerCS);

    let plate = outerCS.extrude(dims.totalHeight);
    intermediates.push(plate);

    // 2. Carve receptacle pockets for each grid cell
    // Each pocket is a rounded rect slightly smaller than the cell,
    // matching where the bin sits
    const cellSize = gridConfig.baseUnit;
    const pocketInset = gridConfig.tolerance / 2; // 0.25mm per side
    const pocketWidth = cellSize - pocketInset * 2;
    const pocketLength = cellSize - pocketInset * 2;
    const pocketRadius = BASEPLATE_CORNER_RADIUS - pocketInset;

    const pocketPts = roundedRectPoints(
      pocketWidth,
      pocketLength,
      Math.max(pocketRadius, 0),
      8
    );
    const pocketCS = new wasm.CrossSection([pocketPts]);
    intermediates.push(pocketCS);

    const pockets: Manifold[] = [];
    for (let ix = 0; ix < config.gridUnitsX; ix++) {
      for (let iy = 0; iy < config.gridUnitsY; iy++) {
        const cellCenterX =
          ix * cellSize - (dims.width / 2) + cellSize / 2;
        const cellCenterY =
          iy * cellSize - (dims.length / 2) + cellSize / 2;

        let pocket = pocketCS.extrude(dims.pocketDepth + 0.01);
        intermediates.push(pocket);
        pocket = pocket.translate(
          cellCenterX,
          cellCenterY,
          dims.plateThickness
        );
        intermediates.push(pocket);
        pockets.push(pocket);
      }
    }

    if (pockets.length > 0) {
      const allPockets = wasm.Manifold.union(pockets);
      intermediates.push(allPockets);
      const pocketed = plate.subtract(allPockets);
      intermediates.push(pocketed);
      plate = pocketed;
    }

    // 3. Magnet holes
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

    // 4. Screw holes
    if (config.includeScrewHoles && config.includeMagnetHoles) {
      plate = subtractHoles(
        wasm,
        plate,
        config,
        gridConfig,
        dims,
        derived.screwHoleDiameter,
        dims.plateThickness + 0.1, // through the plate
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
  const holes: Manifold[] = [];

  for (let ix = 0; ix < config.gridUnitsX; ix++) {
    for (let iy = 0; iy < config.gridUnitsY; iy++) {
      const cellCenterX =
        ix * cellSize - dims.width / 2 + cellSize / 2;
      const cellCenterY =
        iy * cellSize - dims.length / 2 + cellSize / 2;
      const halfCell = cellSize / 2;
      const inset = GRIDFINITY_MAGNET_HOLE_INSET;

      const cornerPositions: [number, number][] = [
        [cellCenterX - halfCell + inset, cellCenterY - halfCell + inset],
        [cellCenterX - halfCell + inset, cellCenterY + halfCell - inset],
        [cellCenterX + halfCell - inset, cellCenterY - halfCell + inset],
        [cellCenterX + halfCell - inset, cellCenterY + halfCell - inset],
      ];

      for (const [x, y] of cornerPositions) {
        let cyl = wasm.Manifold.cylinder(
          holeDepth,
          holeDiameter / 2,
          holeDiameter / 2,
          16,
          false
        );
        intermediates.push(cyl);
        cyl = cyl.translate(x, y, 0);
        intermediates.push(cyl);
        holes.push(cyl);
      }
    }
  }

  if (holes.length === 0) return plate;

  const allHoles = wasm.Manifold.union(holes);
  intermediates.push(allHoles);

  const result = plate.subtract(allHoles);
  intermediates.push(result);
  return result;
}
