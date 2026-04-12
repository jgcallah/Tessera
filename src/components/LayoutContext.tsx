import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { LayoutState, PartEntry } from "../lib/layout";
import {
  createLayoutItem,
  addItem,
  removeItem,
  getPartsList,
} from "../lib/layout";
import { useSpaceConfig } from "./SpaceConfigContext";

interface LayoutContextValue {
  layout: LayoutState;
  partsList: PartEntry[];
  placeItem: (
    gridX: number,
    gridY: number,
    gridUnitsX: number,
    gridUnitsY: number,
    heightUnits: number
  ) => void;
  removeLayoutItem: (id: string) => void;
  clearLayout: () => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({
  children,
}: LayoutProviderProps): React.JSX.Element {
  const { gridFit } = useSpaceConfig();

  const [layout, setLayout] = useState<LayoutState>(() => ({
    items: [],
    gridUnitsX: gridFit.unitsX,
    gridUnitsY: gridFit.unitsY,
  }));

  // Update grid dimensions when space/grid config changes
  useMemo(() => {
    setLayout((prev) => ({
      ...prev,
      gridUnitsX: gridFit.unitsX,
      gridUnitsY: gridFit.unitsY,
    }));
  }, [gridFit.unitsX, gridFit.unitsY]);

  const partsList = useMemo(() => getPartsList(layout), [layout]);

  const placeItem = useCallback(
    (
      gridX: number,
      gridY: number,
      gridUnitsX: number,
      gridUnitsY: number,
      heightUnits: number
    ) => {
      const item = createLayoutItem(
        gridX,
        gridY,
        gridUnitsX,
        gridUnitsY,
        heightUnits
      );
      setLayout((prev) => addItem(item, prev));
    },
    []
  );

  const removeLayoutItem = useCallback((id: string) => {
    setLayout((prev) => removeItem(id, prev));
  }, []);

  const clearLayout = useCallback(() => {
    setLayout((prev) => ({ ...prev, items: [] }));
  }, []);

  const value = useMemo(
    () => ({ layout, partsList, placeItem, removeLayoutItem, clearLayout }),
    [layout, partsList, placeItem, removeLayoutItem, clearLayout]
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
