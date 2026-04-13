import type { GridConfig } from "./grid-config";
import type { BinConfig } from "./bin-config";
import { getBinDimensions } from "./bin-config";
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
      ROUNDRECT_SEGMENTS
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
      dims.totalHeight - dims.baseHeight - dims.stackingLipHeight + EXTRUDE_CLEARANCE;
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

// Lip profile dimensions (mm)
const LIP_BOTTOM_RECESS_HEIGHT = 1.8;
const LIP_MIDDLE_RECESS_HEIGHT = 1.8;
const LIP_LEDGE_OFFSET = 0.7;

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
    ROUNDRECT_SEGMENTS
  );
  const recessCS = new wasm.CrossSection([recessPts]);
  intermediates.push(recessCS);

  // Bottom part of lip: normal wall recess
  let bottomRecess = recessCS.extrude(LIP_BOTTOM_RECESS_HEIGHT);
  intermediates.push(bottomRecess);
  bottomRecess = bottomRecess.translate(0, 0, lipBottom);
  intermediates.push(bottomRecess);

  const result = bin.subtract(bottomRecess);
  intermediates.push(result);

  // Step 2: Narrower recess for the protruding ledge
  const ledgeWidth = dims.interiorWidth - 2 * LIP_LEDGE_OFFSET;
  const ledgeLength = dims.interiorLength - 2 * LIP_LEDGE_OFFSET;
  const ledgeRadius = Math.max(innerRadius - LIP_LEDGE_OFFSET, 0);
  const ledgePts = roundedRectPoints(ledgeWidth, ledgeLength, ledgeRadius, ROUNDRECT_SEGMENTS);
  const ledgeCS = new wasm.CrossSection([ledgePts]);
  intermediates.push(ledgeCS);

  let middleRecess = ledgeCS.extrude(LIP_MIDDLE_RECESS_HEIGHT);
  intermediates.push(middleRecess);
  middleRecess = middleRecess.translate(0, 0, lipBottom + LIP_BOTTOM_RECESS_HEIGHT);
  intermediates.push(middleRecess);

  const result2 = result.subtract(middleRecess);
  intermediates.push(result2);

  // Step 3: Top opening (remaining height, back to normal wall thickness)
  const topRecessHeight = dims.stackingLipHeight - LIP_BOTTOM_RECESS_HEIGHT - LIP_MIDDLE_RECESS_HEIGHT;
  if (topRecessHeight > 0) {
    let topRecess = recessCS.extrude(topRecessHeight);
    intermediates.push(topRecess);
    topRecess = topRecess.translate(
      0,
      0,
      lipBottom + LIP_BOTTOM_RECESS_HEIGHT + LIP_MIDDLE_RECESS_HEIGHT
    );
    intermediates.push(topRecess);

    const result3 = result2.subtract(topRecess);
    intermediates.push(result3);
    return result3;
  }

  return result2;
}

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
  _dims: ReturnType<typeof getBinDimensions>,
  derived: ReturnType<typeof getGridDerivedValues>,
  intermediates: { delete(): void }[]
): Manifold {
  const positions = getHolePositions(binConfig, gridConfig);
  const holeDia = derived.magnetHoleDiameter;
  const holeDepth = derived.magnetHoleDepth;

  // Batch: union all holes first, then subtract once
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
  // Screw holes go through the entire base
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
