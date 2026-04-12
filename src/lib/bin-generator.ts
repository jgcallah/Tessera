import type { GridConfig } from "./grid-config";
import type { BinConfig } from "./bin-config";
import {
  getBinDimensions,
  GRIDFINITY_MAGNET_HOLE_INSET,
} from "./bin-config";
import { getGridDerivedValues } from "./grid-config";
import { getManifold } from "./manifold";
import { roundedRectPoints } from "./geometry";
import type Module from "manifold-3d";

type ManifoldWasm = Awaited<ReturnType<typeof Module>>;
type Manifold = InstanceType<ManifoldWasm["Manifold"]>;

/**
 * Generate a Gridfinity-compatible bin mesh.
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
    // 1. Create outer shell
    const outerPts = roundedRectPoints(
      dims.exteriorWidth,
      dims.exteriorLength,
      dims.cornerRadius,
      8
    );
    const outerCS = new wasm.CrossSection([outerPts]);
    intermediates.push(outerCS);

    let bin = outerCS.extrude(dims.totalHeight);
    intermediates.push(bin);

    // 2. Hollow out the interior
    const innerRadius = Math.max(dims.cornerRadius - binConfig.wallThickness, 0);
    const innerPts = roundedRectPoints(
      dims.interiorWidth,
      dims.interiorLength,
      innerRadius,
      8
    );
    const innerCS = new wasm.CrossSection([innerPts]);
    intermediates.push(innerCS);

    // Interior cavity: from base height to top (cutting through for open top)
    const cavityHeight =
      dims.totalHeight - dims.baseHeight - dims.stackingLipHeight + 0.1;
    let innerSolid = innerCS.extrude(cavityHeight);
    intermediates.push(innerSolid);

    innerSolid = innerSolid.translate(0, 0, dims.baseHeight);
    intermediates.push(innerSolid);

    const hollowed = bin.subtract(innerSolid);
    intermediates.push(hollowed);
    bin = hollowed;

    // 3. Stacking lip: carve the stepped profile from the solid lip zone
    if (binConfig.includeStackingLip) {
      bin = carveLipProfile(wasm, bin, dims, binConfig, intermediates);
    }

    // 4. Magnet holes
    if (binConfig.includeMagnetHoles) {
      bin = subtractMagnetHoles(
        wasm,
        bin,
        binConfig,
        gridConfig,
        dims,
        derived,
        intermediates
      );
    }

    // 5. Screw holes
    if (binConfig.includeScrewHoles && binConfig.includeMagnetHoles) {
      bin = subtractScrewHoles(
        wasm,
        bin,
        binConfig,
        gridConfig,
        dims,
        derived,
        intermediates
      );
    }

    // Remove the final result from intermediates so it doesn't get deleted
    const idx = intermediates.indexOf(bin);
    if (idx !== -1) {
      intermediates.splice(idx, 1);
    }

    return bin;
  } finally {
    // Clean up all intermediates
    for (const obj of intermediates) {
      try {
        obj.delete();
      } catch {
        // Already deleted or invalid — ignore
      }
    }
  }
}

function carveLipProfile(
  wasm: ManifoldWasm,
  bin: Manifold,
  dims: ReturnType<typeof getBinDimensions>,
  binConfig: BinConfig,
  intermediates: { delete(): void }[]
): Manifold {
  const lipBottom = dims.totalHeight - dims.stackingLipHeight;

  // The lip zone is currently solid (not hollowed in step 2).
  // Carve a stepped interior profile:
  // Step 1: Main recess (normal wall thickness), bottom portion
  const innerRadius = Math.max(dims.cornerRadius - binConfig.wallThickness, 0);
  const recessPts = roundedRectPoints(
    dims.interiorWidth,
    dims.interiorLength,
    innerRadius,
    8
  );
  const recessCS = new wasm.CrossSection([recessPts]);
  intermediates.push(recessCS);

  // Bottom part of lip: normal wall recess (1.8mm tall)
  const bottomRecessHeight = 1.8;
  let bottomRecess = recessCS.extrude(bottomRecessHeight);
  intermediates.push(bottomRecess);
  bottomRecess = bottomRecess.translate(0, 0, lipBottom);
  intermediates.push(bottomRecess);

  const result = bin.subtract(bottomRecess);
  intermediates.push(result);

  // Step 2: Narrower recess for the protruding ledge (middle zone, ~1.8mm)
  const ledgeWidth = dims.interiorWidth - 2 * 0.7;
  const ledgeLength = dims.interiorLength - 2 * 0.7;
  const ledgeRadius = Math.max(innerRadius - 0.7, 0);
  const ledgePts = roundedRectPoints(ledgeWidth, ledgeLength, ledgeRadius, 8);
  const ledgeCS = new wasm.CrossSection([ledgePts]);
  intermediates.push(ledgeCS);

  const middleRecessHeight = 1.8;
  let middleRecess = ledgeCS.extrude(middleRecessHeight);
  intermediates.push(middleRecess);
  middleRecess = middleRecess.translate(0, 0, lipBottom + bottomRecessHeight);
  intermediates.push(middleRecess);

  const result2 = result.subtract(middleRecess);
  intermediates.push(result2);

  // Step 3: Top opening (0.8mm, back to normal wall thickness)
  const topRecessHeight = dims.stackingLipHeight - bottomRecessHeight - middleRecessHeight;
  if (topRecessHeight > 0) {
    let topRecess = recessCS.extrude(topRecessHeight);
    intermediates.push(topRecess);
    topRecess = topRecess.translate(
      0,
      0,
      lipBottom + bottomRecessHeight + middleRecessHeight
    );
    intermediates.push(topRecess);

    const result3 = result2.subtract(topRecess);
    intermediates.push(result3);
    return result3;
  }

  return result2;
}

function getMagnetHolePositions(
  binConfig: BinConfig,
  gridConfig: GridConfig
): [number, number][] {
  const positions: [number, number][] = [];
  const cellSize = gridConfig.baseUnit;
  const totalWidth = cellSize * binConfig.gridUnitsX;
  const totalLength = cellSize * binConfig.gridUnitsY;

  for (let ix = 0; ix < binConfig.gridUnitsX; ix++) {
    for (let iy = 0; iy < binConfig.gridUnitsY; iy++) {
      // Cell origin (centered at overall bin origin)
      const cellX = ix * cellSize - totalWidth / 2 + cellSize / 2;
      const cellY = iy * cellSize - totalLength / 2 + cellSize / 2;

      // 4 corners of this cell
      const inset = GRIDFINITY_MAGNET_HOLE_INSET;
      const halfCell = cellSize / 2;
      positions.push(
        [cellX - halfCell + inset, cellY - halfCell + inset],
        [cellX - halfCell + inset, cellY + halfCell - inset],
        [cellX + halfCell - inset, cellY - halfCell + inset],
        [cellX + halfCell - inset, cellY + halfCell - inset]
      );
    }
  }

  return positions;
}

function subtractMagnetHoles(
  wasm: ManifoldWasm,
  bin: Manifold,
  binConfig: BinConfig,
  gridConfig: GridConfig,
  _dims: ReturnType<typeof getBinDimensions>,
  derived: ReturnType<typeof getGridDerivedValues>,
  intermediates: { delete(): void }[]
): Manifold {
  const positions = getMagnetHolePositions(binConfig, gridConfig);
  const holeDia = derived.magnetHoleDiameter;
  const holeDepth = derived.magnetHoleDepth;

  // Batch: union all holes first, then subtract once
  const holes: Manifold[] = [];
  for (const [x, y] of positions) {
    let cyl = wasm.Manifold.cylinder(
      holeDepth,
      holeDia / 2,
      holeDia / 2,
      16,
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
  const positions = getMagnetHolePositions(binConfig, gridConfig);
  const holeDia = derived.screwHoleDiameter;
  // Screw holes go through the entire base
  const holeDepth = dims.baseHeight + 0.1;

  const holes: Manifold[] = [];
  for (const [x, y] of positions) {
    let cyl = wasm.Manifold.cylinder(
      holeDepth,
      holeDia / 2,
      holeDia / 2,
      16,
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
