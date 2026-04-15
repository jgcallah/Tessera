import { useMemo } from "react";
import { useLayout } from "./LayoutContext";
import { useGridConfig } from "./GridConfigContext";
import { useSpaceConfig } from "./SpaceConfigContext";
import { useBaseplateConfig } from "./BaseplateConfigContext";
import { useBaseplateLayout } from "./BaseplateLayoutContext";
import { layoutItemToBinConfig } from "../lib/layout";
import type { BinConfig } from "../lib/bin-config";
import { getBinDimensions } from "../lib/bin-config";
import type { BaseplateConfig } from "../lib/baseplate-config";
import {
  createBaseplateConfig,
  getBaseplateDimensions,
} from "../lib/baseplate-config";
import type { SpacerSide } from "../lib/baseplate-layout";
import type { PackableItem } from "../lib/print-planner";

// ── Snap connector clip dimensions (printed flat from external STL) ──────────
const SNAP_CLIP_WIDTH = 4.3;
const SNAP_CLIP_LENGTH = 19.6;

// ── Unique-part shapes ───────────────────────────────────────────────────────

export interface UniqueBin {
  id: string;
  label: string;
  filename: string;
  binConfig: BinConfig;
  width: number;
  length: number;
  quantity: number;
}

export interface UniqueBaseplate {
  id: string;
  label: string;
  filename: string;
  baseplateConfig: BaseplateConfig;
  width: number;
  length: number;
  quantity: number;
}

export interface UniqueSpacer {
  id: string;
  label: string;
  filename: string;
  side: SpacerSide;
  thickness: number;
  length: number; // mm
  /** Cells along the long axis — used by the asymmetric-baseplate STL. */
  cellsLong: number;
  /** Full baseplate config carried into the STL generator. */
  baseplateConfig: BaseplateConfig;
  quantity: number;
}

export interface PackableInventory {
  packableItems: PackableItem[];
  uniqueBins: UniqueBin[];
  uniqueBaseplates: UniqueBaseplate[];
  uniqueSpacers: UniqueSpacer[];
  /** Snap connectors don't have a generator — mention in plan but don't export. */
  snapClipPackable: PackableItem | null;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Aggregate every printable part in the current project (bins from the bin
 * layout, baseplates and spacers from the baseplate layout, snap clips when
 * enabled) into:
 *   • a flat `PackableItem[]` for the print planner
 *   • per-category unique-part lists carrying the config needed to generate
 *     each part's STL
 *
 * Aggregation is at FULL geometry-config level so two bins of the same
 * footprint but different heights/properties produce distinct STLs.
 */
export function usePackableItems(): PackableInventory {
  const { layout } = useLayout();
  const { config: gridConfig } = useGridConfig();
  const { gridFit } = useSpaceConfig();
  const { baseplateConfig } = useBaseplateConfig();
  const { baseplateParts, spacerParts, snapCount } = useBaseplateLayout();

  return useMemo(() => {
    // ── Bins: aggregate by full config ────────────────────────────────────
    const binMap = new Map<string, UniqueBin>();
    for (const item of layout.items) {
      const binConfig = layoutItemToBinConfig(item);
      const p = item.binProperties;
      const key =
        `bin-${item.gridUnitsX}x${item.gridUnitsY}x${p.heightUnits}u` +
        `_lip${p.includeStackingLip ? 1 : 0}` +
        `_mag${p.includeMagnetHoles ? 1 : 0}` +
        `_scr${p.includeScrewHoles ? 1 : 0}` +
        `_dx${p.dividersX}_dy${p.dividersY}_dh${p.dividerHeightUnits}` +
        `_scoop${p.includeScoop ? 1 : 0}` +
        `_btm${p.includeBottomHoles ? 1 : 0}`;

      const existing = binMap.get(key);
      if (existing) {
        existing.quantity++;
        continue;
      }
      const dims = getBinDimensions(binConfig, gridConfig);
      binMap.set(key, {
        id: key,
        label: `Bin ${item.gridUnitsX}×${item.gridUnitsY}×${p.heightUnits}u`,
        filename: key,
        binConfig,
        width: dims.exteriorWidth,
        length: dims.exteriorLength,
        quantity: 1,
      });
    }
    const uniqueBins = [...binMap.values()];

    // ── Baseplates: aggregate by footprint (global config shared) ─────────
    const uniqueBaseplates: UniqueBaseplate[] = baseplateParts.map((part) => {
      const config = createBaseplateConfig({
        ...baseplateConfig,
        gridUnitsX: part.gridUnitsX,
        gridUnitsY: part.gridUnitsY,
      });
      const dims = getBaseplateDimensions(config, gridConfig);
      const id = `baseplate-${part.gridUnitsX}x${part.gridUnitsY}-${baseplateConfig.style}`;
      return {
        id,
        label: `Baseplate ${part.gridUnitsX}×${part.gridUnitsY}`,
        filename: id,
        baseplateConfig: config,
        width: dims.width,
        length: dims.length,
        quantity: part.quantity,
      };
    });

    // ── Spacers: thickness comes from the global gridFit per-axis ─────────
    const uniqueSpacers: UniqueSpacer[] = [];
    for (const part of spacerParts) {
      const isVertical = part.side === "left" || part.side === "right";
      const thickness = isVertical
        ? gridFit.spacerX.width
        : gridFit.spacerY.width;
      if (thickness <= 0) continue;
      const lengthMm = part.length * gridConfig.baseUnit;
      const id = `spacer-${part.side}-${part.length}u-${thickness.toFixed(2)}mm`;
      const spacerBaseplate = createBaseplateConfig({
        ...baseplateConfig,
        gridUnitsX: 1,
        gridUnitsY: part.length,
        includeSnapConnectors: false,
      });
      uniqueSpacers.push({
        id,
        label: `Spacer 1×${part.length} (${thickness.toFixed(1)}mm)`,
        filename: id,
        side: part.side,
        thickness,
        length: lengthMm,
        cellsLong: part.length,
        baseplateConfig: spacerBaseplate,
        quantity: part.quantity,
      });
    }

    // ── Snap clips: tracked but not exported (sourced from external STL) ──
    const snapClipPackable: PackableItem | null =
      baseplateConfig.includeSnapConnectors && snapCount > 0
        ? {
            id: "snap-clip",
            width: SNAP_CLIP_WIDTH,
            length: SNAP_CLIP_LENGTH,
            quantity: snapCount,
            label: "Snap Clip",
          }
        : null;

    // ── Build the flat list the packer consumes ───────────────────────────
    const packableItems: PackableItem[] = [
      ...uniqueBins.map((b) => ({
        id: b.id,
        width: b.width,
        length: b.length,
        quantity: b.quantity,
        label: b.label,
        kind: "bin" as const,
        gridUnitsX: b.binConfig.gridUnitsX,
        gridUnitsY: b.binConfig.gridUnitsY,
      })),
      ...uniqueBaseplates.map((b) => ({
        id: b.id,
        width: b.width,
        length: b.length,
        quantity: b.quantity,
        label: b.label,
        kind: "baseplate" as const,
        gridUnitsX: b.baseplateConfig.gridUnitsX,
        gridUnitsY: b.baseplateConfig.gridUnitsY,
        showMagnetHoles: b.baseplateConfig.includeMagnetHoles,
        showScrewHoles: b.baseplateConfig.includeScrewHoles,
      })),
      ...uniqueSpacers.map((s) => ({
        id: s.id,
        width: s.thickness,
        length: s.length,
        quantity: s.quantity,
        label: s.label,
        kind: "spacer" as const,
        gridUnitsX: 1,
        gridUnitsY: Math.max(
          1,
          Math.round(s.length / gridConfig.baseUnit)
        ),
        showMagnetHoles: s.baseplateConfig.includeMagnetHoles,
        showScrewHoles: s.baseplateConfig.includeScrewHoles,
      })),
      ...(snapClipPackable
        ? [{ ...snapClipPackable, kind: "snap-clip" as const }]
        : []),
    ];

    return {
      packableItems,
      uniqueBins,
      uniqueBaseplates,
      uniqueSpacers,
      snapClipPackable,
    };
  }, [
    layout.items,
    baseplateParts,
    spacerParts,
    snapCount,
    baseplateConfig,
    gridConfig,
    gridFit.spacerX.width,
    gridFit.spacerY.width,
  ]);
}
