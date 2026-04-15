import { getManifold } from "./manifold";
import {
  BASEPLATE_TOTAL_HEIGHT,
  createBaseplateConfig,
} from "./baseplate-config";
import type { BaseplateConfig } from "./baseplate-config";
import type { GridConfig } from "./grid-config";
import { generateBaseplateMesh } from "./baseplate-generator";
import type Module from "manifold-3d";

type ManifoldWasm = Awaited<ReturnType<typeof Module>>;
type Manifold = InstanceType<ManifoldWasm["Manifold"]>;

/**
 * Generate a spacer as an asymmetric baseplate strip: a 1×N baseplate
 * carrying the user's baseplate style (standard/skeleton, magnets, screws)
 * intersected with a thickness-wide cube centered on the spacer axis. When
 * the spacer thickness is less than one grid cell, the sockets clip to the
 * strip — sockets sit at the center of the thickness and are cut equally
 * on both sides.
 *
 * Caller MUST call .delete() on the returned Manifold when done.
 */
export async function generateSpacerMesh(
  thickness: number,
  length: number,
  baseplateConfig: BaseplateConfig,
  gridConfig: GridConfig
): Promise<Manifold> {
  const wasm = await getManifold();
  const cellsY = Math.max(1, Math.round(length / gridConfig.baseUnit));
  const spacerAsBaseplate = createBaseplateConfig({
    ...baseplateConfig,
    gridUnitsX: 1,
    gridUnitsY: cellsY,
    // Spacers never carry snap connectors themselves.
    includeSnapConnectors: false,
  });

  const baseplate = await generateBaseplateMesh(
    spacerAsBaseplate,
    gridConfig
  );
  const intermediates: { delete(): void }[] = [];

  try {
    // Clip box: thickness × length × (height + margin), centered XY.
    const clipHeight = BASEPLATE_TOTAL_HEIGHT + 2;
    const rawBox = wasm.Manifold.cube(
      [thickness, length, clipHeight],
      false
    );
    intermediates.push(rawBox);
    const clipBox = rawBox.translate(
      -thickness / 2,
      -length / 2,
      -1
    );
    intermediates.push(clipBox);

    const clipped = baseplate.intersect(clipBox);
    return clipped;
  } finally {
    baseplate.delete();
    for (const obj of intermediates) {
      try {
        obj.delete();
      } catch {
        // already deleted
      }
    }
  }
}
