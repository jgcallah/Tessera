import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import type {
  BaseplateLayoutState,
  SpacerSide,
  SpacerSides,
} from "../lib/baseplate-layout";
import {
  createBaseplateItem,
  createSpacerPiece,
  addBaseplate as addBaseplateItem,
  removeBaseplate as removeBaseplateItem,
  moveBaseplate as moveBaseplateItem,
  resizeBaseplate as resizeBaseplateItem,
  addSpacer as addSpacerItem,
  removeSpacer as removeSpacerItem,
  spacerStripLength,
  autoFillLayout,
  clearLayout,
  countSnapConnectors,
  getBaseplateParts,
  getSpacerParts,
} from "../lib/baseplate-layout";
import type {
  BaseplatePartEntry,
  SpacerPartEntry,
} from "../lib/baseplate-layout";
import { useSpaceConfig } from "./SpaceConfigContext";
import { useBaseplateConfig } from "./BaseplateConfigContext";

type Selection =
  | { kind: "baseplate"; id: string }
  | { kind: "spacer"; id: string }
  | null;

interface BaseplateLayoutContextValue {
  layout: BaseplateLayoutState;
  baseplateParts: BaseplatePartEntry[];
  spacerParts: SpacerPartEntry[];
  snapCount: number;
  activeSpacerSides: SpacerSides;
  selected: Selection;
  setSelected: (sel: Selection) => void;
  placeBaseplate: (
    gridX: number,
    gridY: number,
    gridUnitsX: number,
    gridUnitsY: number
  ) => void;
  removeBaseplate: (id: string) => void;
  moveBaseplate: (id: string, newGridX: number, newGridY: number) => void;
  resizeBaseplate: (
    id: string,
    newGridX: number,
    newGridY: number,
    newGridUnitsX: number,
    newGridUnitsY: number
  ) => void;
  placeSpacer: (side: SpacerSide, offset: number, length: number) => void;
  removeSpacer: (id: string) => void;
  autoFill: () => void;
  clearAll: () => void;
  importLayout: (state: BaseplateLayoutState) => void;
}

const BaseplateLayoutContext =
  createContext<BaseplateLayoutContextValue | null>(null);

/**
 * Derive which spacer sides are active from the space config.
 * A `center` alignment on an axis produces spacers on both sides; `start`
 * leaves the remainder at the `end` side (and vice versa).
 */
function computeSpacerSides(
  includeSpacers: boolean,
  alignmentX: "start" | "center" | "end",
  alignmentY: "start" | "center" | "end",
  spacerX: { count: number; width: number },
  spacerY: { count: number; width: number }
): SpacerSides {
  const sides: SpacerSides = {
    left: false,
    right: false,
    top: false,
    bottom: false,
  };
  if (!includeSpacers) return sides;
  if (spacerX.count > 0 && spacerX.width > 0) {
    if (alignmentX === "center") {
      sides.left = true;
      sides.right = true;
    } else if (alignmentX === "start") {
      sides.right = true;
    } else {
      sides.left = true;
    }
  }
  if (spacerY.count > 0 && spacerY.width > 0) {
    if (alignmentY === "center") {
      sides.top = true;
      sides.bottom = true;
    } else if (alignmentY === "start") {
      sides.bottom = true;
    } else {
      sides.top = true;
    }
  }
  return sides;
}

interface BaseplateLayoutProviderProps {
  children: ReactNode;
}

export function BaseplateLayoutProvider({
  children,
}: BaseplateLayoutProviderProps): React.JSX.Element {
  const { spaceConfig, gridFit } = useSpaceConfig();
  const { baseplateConfig } = useBaseplateConfig();

  const activeSpacerSides = useMemo(
    () =>
      computeSpacerSides(
        spaceConfig.includeSpacers,
        spaceConfig.gridAlignmentX,
        spaceConfig.gridAlignmentY,
        gridFit.spacerX,
        gridFit.spacerY
      ),
    [spaceConfig, gridFit.spacerX, gridFit.spacerY]
  );

  const [layout, setLayout] = useState<BaseplateLayoutState>(() => ({
    items: [],
    spacers: [],
    gridUnitsX: gridFit.unitsX,
    gridUnitsY: gridFit.unitsY,
  }));

  const [selected, setSelected] = useState<Selection>(null);

  // Sync grid dimensions when space/grid config changes; prune out-of-bounds.
  useEffect(() => {
    setLayout((prev) => {
      const newX = gridFit.unitsX;
      const newY = gridFit.unitsY;
      const keptItems = prev.items.filter(
        (item) =>
          item.gridX + item.gridUnitsX <= newX &&
          item.gridY + item.gridUnitsY <= newY
      );
      const keptSpacers = prev.spacers.filter((s) => {
        const stripLen =
          s.side === "left" || s.side === "right" ? newY : newX;
        if (!activeSpacerSides[s.side]) return false;
        return s.offset + s.length <= stripLen;
      });
      if (
        keptItems.length === prev.items.length &&
        keptSpacers.length === prev.spacers.length &&
        prev.gridUnitsX === newX &&
        prev.gridUnitsY === newY
      ) {
        return prev;
      }
      return {
        items: keptItems,
        spacers: keptSpacers,
        gridUnitsX: newX,
        gridUnitsY: newY,
      };
    });
  }, [gridFit.unitsX, gridFit.unitsY, activeSpacerSides]);

  const baseplateParts = useMemo(() => getBaseplateParts(layout), [layout]);
  const spacerParts = useMemo(() => getSpacerParts(layout), [layout]);
  const snapCount = useMemo(() => countSnapConnectors(layout), [layout]);

  const placeBaseplate = useCallback(
    (gridX: number, gridY: number, gridUnitsX: number, gridUnitsY: number) => {
      const item = createBaseplateItem(gridX, gridY, gridUnitsX, gridUnitsY);
      setLayout((prev) => addBaseplateItem(item, prev));
    },
    []
  );

  const removeBaseplate = useCallback((id: string) => {
    setLayout((prev) => removeBaseplateItem(id, prev));
    setSelected((prev) =>
      prev?.kind === "baseplate" && prev.id === id ? null : prev
    );
  }, []);

  const moveBaseplate = useCallback(
    (id: string, newGridX: number, newGridY: number) => {
      setLayout((prev) => moveBaseplateItem(id, newGridX, newGridY, prev));
    },
    []
  );

  const resizeBaseplate = useCallback(
    (
      id: string,
      newGridX: number,
      newGridY: number,
      newGridUnitsX: number,
      newGridUnitsY: number
    ) => {
      setLayout((prev) =>
        resizeBaseplateItem(
          id,
          newGridX,
          newGridY,
          newGridUnitsX,
          newGridUnitsY,
          prev
        )
      );
    },
    []
  );

  const placeSpacer = useCallback(
    (side: SpacerSide, offset: number, length: number) => {
      const piece = createSpacerPiece(side, offset, length);
      setLayout((prev) => addSpacerItem(piece, prev));
    },
    []
  );

  const removeSpacer = useCallback((id: string) => {
    setLayout((prev) => removeSpacerItem(id, prev));
    setSelected((prev) =>
      prev?.kind === "spacer" && prev.id === id ? null : prev
    );
  }, []);

  const autoFill = useCallback(() => {
    setLayout((prev) =>
      autoFillLayout(
        prev,
        baseplateConfig.maxAutoSizeX,
        baseplateConfig.maxAutoSizeY,
        baseplateConfig.maxSpacerLength,
        activeSpacerSides
      )
    );
    setSelected(null);
  }, [
    baseplateConfig.maxAutoSizeX,
    baseplateConfig.maxAutoSizeY,
    baseplateConfig.maxSpacerLength,
    activeSpacerSides,
  ]);

  const clearAll = useCallback(() => {
    setLayout((prev) => clearLayout(prev));
    setSelected(null);
  }, []);

  const importLayout = useCallback((state: BaseplateLayoutState) => {
    setLayout(state);
    setSelected(null);
  }, []);

  const value = useMemo(
    () => ({
      layout,
      baseplateParts,
      spacerParts,
      snapCount,
      activeSpacerSides,
      selected,
      setSelected,
      placeBaseplate,
      removeBaseplate,
      moveBaseplate,
      resizeBaseplate,
      placeSpacer,
      removeSpacer,
      autoFill,
      clearAll,
      importLayout,
    }),
    [
      layout,
      baseplateParts,
      spacerParts,
      snapCount,
      activeSpacerSides,
      selected,
      placeBaseplate,
      removeBaseplate,
      moveBaseplate,
      resizeBaseplate,
      placeSpacer,
      removeSpacer,
      autoFill,
      clearAll,
      importLayout,
    ]
  );

  return (
    <BaseplateLayoutContext.Provider value={value}>
      {children}
    </BaseplateLayoutContext.Provider>
  );
}

export function useBaseplateLayout(): BaseplateLayoutContextValue {
  const ctx = useContext(BaseplateLayoutContext);
  if (!ctx) {
    throw new Error(
      "useBaseplateLayout must be used within a BaseplateLayoutProvider"
    );
  }
  return ctx;
}

export { spacerStripLength };
