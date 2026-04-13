import { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type { LayoutState, PartEntry, BinProperties, LayoutHistory } from "../lib/layout";
import {
  createLayoutItem,
  addItem,
  removeItem,
  moveItem,
  resizeItem,
  getPartsList,
  updateItemProperties,
  createHistory,
  pushHistory,
  undo as undoHistory,
  redo as redoHistory,
  canUndo as canUndoHistory,
  canRedo as canRedoHistory,
} from "../lib/layout";
import { useSpaceConfig } from "./SpaceConfigContext";

interface LayoutContextValue {
  layout: LayoutState;
  partsList: PartEntry[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  placeItem: (
    gridX: number,
    gridY: number,
    gridUnitsX: number,
    gridUnitsY: number
  ) => void;
  removeLayoutItem: (id: string) => void;
  moveLayoutItem: (id: string, newGridX: number, newGridY: number) => void;
  resizeLayoutItem: (
    id: string,
    newGridX: number,
    newGridY: number,
    newGridUnitsX: number,
    newGridUnitsY: number
  ) => void;
  updateBinProperties: (id: string, props: Partial<BinProperties>) => void;
  clearLayout: () => void;
  importLayout: (state: LayoutState) => void;
  undoLayout: () => void;
  redoLayout: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({
  children,
}: LayoutProviderProps): React.JSX.Element {
  const { gridFit } = useSpaceConfig();

  const [history, setHistory] = useState<LayoutHistory>(() =>
    createHistory({
      items: [],
      gridUnitsX: gridFit.unitsX,
      gridUnitsY: gridFit.unitsY,
    })
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const layout = history.present;

  // Update grid dimensions when space/grid config changes
  useEffect(() => {
    setHistory((prev) => ({
      ...prev,
      present: {
        ...prev.present,
        gridUnitsX: gridFit.unitsX,
        gridUnitsY: gridFit.unitsY,
      },
    }));
  }, [gridFit.unitsX, gridFit.unitsY]);

  const partsList = useMemo(() => getPartsList(layout), [layout]);

  const pushState = useCallback((newState: LayoutState) => {
    setHistory((prev) => pushHistory(prev, newState));
  }, []);

  const placeItem = useCallback(
    (
      gridX: number,
      gridY: number,
      gridUnitsX: number,
      gridUnitsY: number
    ) => {
      const item = createLayoutItem(gridX, gridY, gridUnitsX, gridUnitsY);
      setHistory((prev) => {
        const newState = addItem(item, prev.present);
        if (newState === prev.present) return prev; // placement failed
        return pushHistory(prev, newState);
      });
    },
    []
  );

  const removeLayoutItem = useCallback((id: string) => {
    setHistory((prev) => {
      const newState = removeItem(id, prev.present);
      if (newState === prev.present) return prev;
      return pushHistory(prev, newState);
    });
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const moveLayoutItem = useCallback(
    (id: string, newGridX: number, newGridY: number) => {
      setHistory((prev) => {
        const newState = moveItem(id, newGridX, newGridY, prev.present);
        if (newState === prev.present) return prev;
        return pushHistory(prev, newState);
      });
    },
    []
  );

  const resizeLayoutItem = useCallback(
    (
      id: string,
      newGridX: number,
      newGridY: number,
      newGridUnitsX: number,
      newGridUnitsY: number
    ) => {
      setHistory((prev) => {
        const newState = resizeItem(
          id,
          newGridX,
          newGridY,
          newGridUnitsX,
          newGridUnitsY,
          prev.present
        );
        if (newState === prev.present) return prev;
        return pushHistory(prev, newState);
      });
    },
    []
  );

  const updateBinProperties = useCallback(
    (id: string, props: Partial<BinProperties>) => {
      pushState(updateItemProperties(id, props, history.present));
    },
    [pushState, history.present]
  );

  const clearLayout = useCallback(() => {
    pushState({ ...history.present, items: [] });
    setSelectedId(null);
  }, [pushState, history.present]);

  const importLayout = useCallback((state: LayoutState) => {
    setHistory(createHistory(state));
    setSelectedId(null);
  }, []);

  const undoLayout = useCallback(() => {
    setHistory((prev) => undoHistory(prev));
  }, []);

  const redoLayout = useCallback(() => {
    setHistory((prev) => redoHistory(prev));
  }, []);

  const value = useMemo(
    () => ({
      layout,
      partsList,
      selectedId,
      setSelectedId,
      placeItem,
      removeLayoutItem,
      moveLayoutItem,
      resizeLayoutItem,
      updateBinProperties,
      clearLayout,
      importLayout,
      undoLayout,
      redoLayout,
      canUndo: canUndoHistory(history),
      canRedo: canRedoHistory(history),
    }),
    [
      layout,
      partsList,
      selectedId,
      placeItem,
      removeLayoutItem,
      moveLayoutItem,
      resizeLayoutItem,
      updateBinProperties,
      clearLayout,
      importLayout,
      undoLayout,
      redoLayout,
      history,
    ]
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
