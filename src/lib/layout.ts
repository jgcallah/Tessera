// ── Types ────────────────────────────────────────────────────────────────────

export interface LayoutItem {
  id: string;
  gridX: number;
  gridY: number;
  gridUnitsX: number;
  gridUnitsY: number;
  heightUnits: number;
}

export interface LayoutState {
  items: LayoutItem[];
  gridUnitsX: number;
  gridUnitsY: number;
}

export interface PartEntry {
  gridUnitsX: number;
  gridUnitsY: number;
  heightUnits: number;
  quantity: number;
}

// ── Item Creation ────────────────────────────────────────────────────────────

let nextId = 1;

export function createLayoutItem(
  gridX: number,
  gridY: number,
  gridUnitsX: number,
  gridUnitsY: number,
  heightUnits: number
): LayoutItem {
  return {
    id: `item-${nextId++}`,
    gridX,
    gridY,
    gridUnitsX,
    gridUnitsY,
    heightUnits,
  };
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
  // Bounds check
  if (item.gridX < 0 || item.gridY < 0) return false;
  if (item.gridX + item.gridUnitsX > state.gridUnitsX) return false;
  if (item.gridY + item.gridUnitsY > state.gridUnitsY) return false;

  // Overlap check
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

// ── Parts List ───────────────────────────────────────────────────────────────

function partKey(item: LayoutItem): string {
  return `${item.gridUnitsX}x${item.gridUnitsY}x${item.heightUnits}`;
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
        heightUnits: item.heightUnits,
        quantity: 1,
      });
    }
  }

  return [...map.values()];
}
