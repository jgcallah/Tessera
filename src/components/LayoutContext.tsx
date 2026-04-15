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
  DEFAULT_BIN_PROPERTIES,
} from "../lib/layout";
import { useSpaceConfig } from "./SpaceConfigContext";
import { useToast } from "./ui/Toast";

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
  const { toast } = useToast();

  const [history, setHistory] = useState<LayoutHistory>(() =>
    createHistory({
      items: [],
      gridUnitsX: gridFit.unitsX,
      gridUnitsY: gridFit.unitsY,
    })
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const layout = history.present;

  // Update grid dimensions when space/grid config changes and remove out-of-bounds bins
  useEffect(() => {
    setHistory((prev) => {
      const newX = gridFit.unitsX;
      const newY = gridFit.unitsY;
      const kept = prev.present.items.filter(
        (item) =>
          item.gridX + item.gridUnitsX <= newX &&
          item.gridY + item.gridUnitsY <= newY
      );
      const removed = prev.present.items.length - kept.length;
      if (
        removed === 0 &&
        prev.present.gridUnitsX === newX &&
        prev.present.gridUnitsY === newY
      ) {
        return prev;
      }
      if (removed > 0) {
        // Toast is called inside a setState callback — schedule it
        queueMicrotask(() => {
          toast(
            `Removed ${removed} bin${removed === 1 ? "" : "s"} outside the new grid`,
            "info"
          );
        });
      }
      return {
        ...prev,
        present: {
          ...prev.present,
          items: kept,
          gridUnitsX: newX,
          gridUnitsY: newY,
        },
      };
    });
  }, [gridFit.unitsX, gridFit.unitsY, toast]);

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
      // Use functional updater so rapid sequential calls (e.g. multi-select
      // edits in a loop) all see each other's updates instead of the stale
      // snapshot from the render when this callback was created.
      setHistory((prev) =>
        pushHistory(prev, updateItemProperties(id, props, prev.present))
      );
    },
    []
  );

  const clearLayout = useCallback(() => {
    pushState({ ...history.present, items: [] });
    setSelectedId(null);
  }, [pushState, history.present]);

  const importLayout = useCallback((state: LayoutState) => {
    // Backfill any missing bin properties so older saved projects work with
    // newly added fields (e.g. dividerHeightUnits).
    const migrated: LayoutState = {
      ...state,
      items: state.items.map((item) => ({
        ...item,
        binProperties: { ...DEFAULT_BIN_PROPERTIES, ...item.binProperties },
      })),
    };
    setHistory(createHistory(migrated));
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
