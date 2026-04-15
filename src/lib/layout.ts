import type { BinConfig } from "./bin-config";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BinProperties {
  heightUnits: number;
  includeStackingLip: boolean;
  includeMagnetHoles: boolean;
  includeScrewHoles: boolean;
  dividersX: number; // number of internal dividers along X (0 = none)
  dividersY: number; // number of internal dividers along Y (0 = none)
  dividerHeightUnits: number; // height of internal dividers in units (0 = full cavity)
  includeScoop: boolean; // curved front wall for easy access
  includeBottomHoles: boolean; // drainage / weight reduction holes in floor
}

export const DEFAULT_BIN_PROPERTIES: Readonly<BinProperties> = {
  heightUnits: 3,
  includeStackingLip: true,
  includeMagnetHoles: true,
  includeScrewHoles: false,
  dividersX: 0,
  dividersY: 0,
  dividerHeightUnits: 0,
  includeScoop: false,
  includeBottomHoles: false,
};

export interface LayoutItem {
  id: string;
  gridX: number;
  gridY: number;
  gridUnitsX: number;
  gridUnitsY: number;
  binProperties: BinProperties;
}

export interface LayoutState {
  items: LayoutItem[];
  gridUnitsX: number;
  gridUnitsY: number;
}

export interface PartEntry {
  gridUnitsX: number;
  gridUnitsY: number;
  quantity: number;
}

// ── Item Creation ────────────────────────────────────────────────────────────

let nextId = 1;

export function createLayoutItem(
  gridX: number,
  gridY: number,
  gridUnitsX: number,
  gridUnitsY: number
): LayoutItem {
  return {
    id: `item-${nextId++}`,
    gridX,
    gridY,
    gridUnitsX,
    gridUnitsY,
    binProperties: { ...DEFAULT_BIN_PROPERTIES },
  };
}

// ── Update Bin Properties ────────────────────────────────────────────────────

export function updateItemProperties(
  id: string,
  properties: Partial<BinProperties>,
  state: LayoutState
): LayoutState {
  const items = state.items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      binProperties: { ...item.binProperties, ...properties },
    };
  });
  return { ...state, items };
}

// ── Overlap Detection ────────────────────────────────────────────────────────

export function itemsOverlap(a: LayoutItem, b: LayoutItem): boolean {
  const aRight = a.gridX + a.gridUnitsX;
  const aBottom = a.gridY + a.gridUnitsY;
  const bRight = b.gridX + b.gridUnitsX;
  const bBottom = b.gridY + b.gridUnitsY;

  return a.gridX < bRight && aRight > b.gridX && a.gridY < bBottom && aBottom > b.gridY;
}

// ── Placement Validation ─────────────────────────────────────────────────────

export function canPlaceItem(item: LayoutItem, state: LayoutState): boolean {
  if (item.gridX < 0 || item.gridY < 0) return false;
  if (item.gridX + item.gridUnitsX > state.gridUnitsX) return false;
  if (item.gridY + item.gridUnitsY > state.gridUnitsY) return false;

  for (const existing of state.items) {
    if (existing.id !== item.id && itemsOverlap(item, existing)) {
      return false;
    }
  }

  return true;
}

// ── Add / Remove ─────────────────────────────────────────────────────────────

export function addItem(item: LayoutItem, state: LayoutState): LayoutState {
  if (!canPlaceItem(item, state)) return state;
  return { ...state, items: [...state.items, item] };
}

export function removeItem(id: string, state: LayoutState): LayoutState {
  const filtered = state.items.filter((item) => item.id !== id);
  if (filtered.length === state.items.length) return state;
  return { ...state, items: filtered };
}

// ── Move Item ───────────────────────────────────────────────────────────────

export function moveItem(
  id: string,
  newGridX: number,
  newGridY: number,
  state: LayoutState
): LayoutState {
  const item = state.items.find((i) => i.id === id);
  if (!item) return state;

  const moved = { ...item, gridX: newGridX, gridY: newGridY };
  if (!canPlaceItem(moved, state)) return state;

  return {
    ...state,
    items: state.items.map((i) => (i.id === id ? moved : i)),
  };
}

// ── Resize Item ─────────────────────────────────────────────────────────────

export function resizeItem(
  id: string,
  newGridX: number,
  newGridY: number,
  newGridUnitsX: number,
  newGridUnitsY: number,
  state: LayoutState
): LayoutState {
  const item = state.items.find((i) => i.id === id);
  if (!item) return state;
  if (newGridUnitsX < 1 || newGridUnitsY < 1) return state;

  const resized = {
    ...item,
    gridX: newGridX,
    gridY: newGridY,
    gridUnitsX: newGridUnitsX,
    gridUnitsY: newGridUnitsY,
  };
  if (!canPlaceItem(resized, state)) return state;

  return {
    ...state,
    items: state.items.map((i) => (i.id === id ? resized : i)),
  };
}

// ── Parts List ───────────────────────────────────────────────────────────────

function partKey(item: LayoutItem): string {
  return `${item.gridUnitsX}x${item.gridUnitsY}`;
}

export function getPartsList(state: LayoutState): PartEntry[] {
  const map = new Map<string, PartEntry>();

  for (const item of state.items) {
    const key = partKey(item);
    const existing = map.get(key);
    if (existing) {
      existing.quantity++;
    } else {
      map.set(key, {
        gridUnitsX: item.gridUnitsX,
        gridUnitsY: item.gridUnitsY,
        quantity: 1,
      });
    }
  }

  return [...map.values()];
}

// ── Undo / Redo History ──────────────────────────────────────────────────────

const MAX_HISTORY = 50;

export interface LayoutHistory {
  past: LayoutState[];
  present: LayoutState;
  future: LayoutState[];
}

export function createHistory(initial: LayoutState): LayoutHistory {
  return { past: [], present: initial, future: [] };
}

export function pushHistory(
  history: LayoutHistory,
  newState: LayoutState
): LayoutHistory {
  const past = [...history.past, history.present].slice(-MAX_HISTORY);
  return { past, present: newState, future: [] };
}

export function undo(history: LayoutHistory): LayoutHistory {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1]!;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redo(history: LayoutHistory): LayoutHistory {
  if (history.future.length === 0) return history;
  const next = history.future[0]!;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

export function canUndo(history: LayoutHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: LayoutHistory): boolean {
  return history.future.length > 0;
}

// ── Conversion Helpers ──────────────────────────────────────────────────────

export function layoutItemToBinConfig(item: LayoutItem): BinConfig {
  return {
    gridUnitsX: item.gridUnitsX,
    gridUnitsY: item.gridUnitsY,
    heightUnits: item.binProperties.heightUnits,
    wallThickness: 1.2,
    includeStackingLip: item.binProperties.includeStackingLip,
    includeMagnetHoles: item.binProperties.includeMagnetHoles,
    includeScrewHoles: item.binProperties.includeScrewHoles,
    dividersX: item.binProperties.dividersX,
    dividersY: item.binProperties.dividersY,
    dividerHeightUnits: item.binProperties.dividerHeightUnits,
    includeScoop: item.binProperties.includeScoop,
    includeBottomHoles: item.binProperties.includeBottomHoles,
  };
}
