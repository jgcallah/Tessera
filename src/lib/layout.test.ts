import { describe, it, expect } from "vitest";
import {
  createLayoutItem,
  canPlaceItem,
  addItem,
  removeItem,
  getPartsList,
  itemsOverlap,
  updateItemProperties,
  DEFAULT_BIN_PROPERTIES,
  createHistory,
  pushHistory,
  undo,
  redo,
  canUndo,
  canRedo,
} from "./layout";
import type { LayoutState } from "./layout";

// ── Item Creation ────────────────────────────────────────────────────────────

describe("createLayoutItem", () => {
  it("creates an item with default bin properties", () => {
    const item = createLayoutItem(0, 0, 2, 1);
    expect(item.binProperties).toEqual(DEFAULT_BIN_PROPERTIES);
    expect(item.binProperties.heightUnits).toBe(3);
  });

  it("creates an item with given position and size", () => {
    const item = createLayoutItem(0, 0, 2, 1);
    expect(item.gridX).toBe(0);
    expect(item.gridY).toBe(0);
    expect(item.gridUnitsX).toBe(2);
    expect(item.gridUnitsY).toBe(1);
    expect(item.id).toBeTruthy();
  });

  it("generates unique IDs", () => {
    const a = createLayoutItem(0, 0, 1, 1);
    const b = createLayoutItem(1, 0, 1, 1);
    expect(a.id).not.toBe(b.id);
  });
});

// ── Overlap Detection ────────────────────────────────────────────────────────

describe("itemsOverlap", () => {
  it("returns true for overlapping items", () => {
    const a = createLayoutItem(0, 0, 2, 2);
    const b = createLayoutItem(1, 1, 2, 2);
    expect(itemsOverlap(a, b)).toBe(true);
  });

  it("returns false for non-overlapping items", () => {
    const a = createLayoutItem(0, 0, 2, 2);
    const b = createLayoutItem(2, 0, 2, 2);
    expect(itemsOverlap(a, b)).toBe(false);
  });

  it("returns false for adjacent items (sharing edge)", () => {
    const a = createLayoutItem(0, 0, 1, 1);
    const b = createLayoutItem(1, 0, 1, 1);
    expect(itemsOverlap(a, b)).toBe(false);
  });

  it("returns true for identical position items", () => {
    const a = createLayoutItem(0, 0, 1, 1);
    const b = createLayoutItem(0, 0, 1, 1);
    expect(itemsOverlap(a, b)).toBe(true);
  });
});

// ── Placement Validation ─────────────────────────────────────────────────────

describe("canPlaceItem", () => {
  const state: LayoutState = {
    items: [],
    gridUnitsX: 9,
    gridUnitsY: 7,
  };

  it("returns true for valid placement in empty grid", () => {
    const item = createLayoutItem(0, 0, 2, 1);
    expect(canPlaceItem(item, state)).toBe(true);
  });

  it("returns false if item extends beyond grid width", () => {
    const item = createLayoutItem(8, 0, 2, 1);
    expect(canPlaceItem(item, state)).toBe(false);
  });

  it("returns false if item extends beyond grid height", () => {
    const item = createLayoutItem(0, 6, 1, 2);
    expect(canPlaceItem(item, state)).toBe(false);
  });

  it("returns false if item overlaps existing item", () => {
    const existing = createLayoutItem(0, 0, 2, 2);
    const stateWithItem: LayoutState = { ...state, items: [existing] };
    const newItem = createLayoutItem(1, 1, 1, 1);
    expect(canPlaceItem(newItem, stateWithItem)).toBe(false);
  });

  it("returns true if item is adjacent to existing (no overlap)", () => {
    const existing = createLayoutItem(0, 0, 2, 2);
    const stateWithItem: LayoutState = { ...state, items: [existing] };
    const newItem = createLayoutItem(2, 0, 1, 1);
    expect(canPlaceItem(newItem, stateWithItem)).toBe(true);
  });

  it("returns false for negative coordinates", () => {
    const item = createLayoutItem(-1, 0, 1, 1);
    expect(canPlaceItem(item, state)).toBe(false);
  });
});

// ── Add / Remove ─────────────────────────────────────────────────────────────

describe("addItem", () => {
  const state: LayoutState = {
    items: [],
    gridUnitsX: 9,
    gridUnitsY: 7,
  };

  it("adds an item to empty layout", () => {
    const item = createLayoutItem(0, 0, 1, 1);
    const result = addItem(item, state);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe(item.id);
  });

  it("returns unchanged state if placement is invalid", () => {
    const item = createLayoutItem(9, 0, 1, 1);
    const result = addItem(item, state);
    expect(result.items).toHaveLength(0);
  });

  it("adds multiple non-overlapping items", () => {
    const a = createLayoutItem(0, 0, 1, 1);
    const state1 = addItem(a, state);
    const b = createLayoutItem(1, 0, 1, 1);
    const state2 = addItem(b, state1);
    expect(state2.items).toHaveLength(2);
  });

  it("rejects overlapping item", () => {
    const a = createLayoutItem(0, 0, 2, 2);
    const state1 = addItem(a, state);
    const b = createLayoutItem(1, 1, 1, 1);
    const state2 = addItem(b, state1);
    expect(state2.items).toHaveLength(1);
  });
});

describe("removeItem", () => {
  it("removes an item by id", () => {
    const item = createLayoutItem(0, 0, 1, 1);
    const state: LayoutState = {
      items: [item],
      gridUnitsX: 9,
      gridUnitsY: 7,
    };
    const result = removeItem(item.id, state);
    expect(result.items).toHaveLength(0);
  });

  it("returns unchanged state if id not found", () => {
    const item = createLayoutItem(0, 0, 1, 1);
    const state: LayoutState = {
      items: [item],
      gridUnitsX: 9,
      gridUnitsY: 7,
    };
    const result = removeItem("nonexistent", state);
    expect(result.items).toHaveLength(1);
  });
});

// ── Parts List Derivation ────────────────────────────────────────────────────

describe("getPartsList", () => {
  it("returns empty list for empty layout", () => {
    const state: LayoutState = { items: [], gridUnitsX: 9, gridUnitsY: 7 };
    expect(getPartsList(state)).toEqual([]);
  });

  it("groups identical footprints", () => {
    const state: LayoutState = {
      items: [
        createLayoutItem(0, 0, 2, 1),
        createLayoutItem(2, 0, 2, 1),
        createLayoutItem(4, 0, 2, 1),
      ],
      gridUnitsX: 9,
      gridUnitsY: 7,
    };
    const parts = getPartsList(state);
    expect(parts).toHaveLength(1);
    expect(parts[0]!.quantity).toBe(3);
    expect(parts[0]!.gridUnitsX).toBe(2);
    expect(parts[0]!.gridUnitsY).toBe(1);
  });

  it("separates different footprints", () => {
    const state: LayoutState = {
      items: [
        createLayoutItem(0, 0, 2, 1),
        createLayoutItem(2, 0, 1, 1),
      ],
      gridUnitsX: 9,
      gridUnitsY: 7,
    };
    const parts = getPartsList(state);
    expect(parts).toHaveLength(2);
  });

  it("groups by footprint regardless of bin properties", () => {
    const state: LayoutState = {
      items: [
        createLayoutItem(0, 0, 2, 1),
        createLayoutItem(2, 0, 2, 1),
      ],
      gridUnitsX: 9,
      gridUnitsY: 7,
    };
    // Change height on second item
    const updated = updateItemProperties(state.items[1]!.id, { heightUnits: 5 }, state);
    const parts = getPartsList(updated);
    // Still groups as same footprint
    expect(parts).toHaveLength(1);
    expect(parts[0]!.quantity).toBe(2);
  });

  it("groups by W × L footprint", () => {
    const state: LayoutState = {
      items: [
        createLayoutItem(0, 0, 2, 1),
        createLayoutItem(0, 1, 1, 2), // different shape
      ],
      gridUnitsX: 9,
      gridUnitsY: 7,
    };
    const parts = getPartsList(state);
    expect(parts).toHaveLength(2);
  });
});

// ── Update Bin Properties ────────────────────────────────────────────────────

describe("updateItemProperties", () => {
  it("updates height units on a specific item", () => {
    const item = createLayoutItem(0, 0, 1, 1);
    const state: LayoutState = { items: [item], gridUnitsX: 9, gridUnitsY: 7 };
    const result = updateItemProperties(item.id, { heightUnits: 5 }, state);
    expect(result.items[0]!.binProperties.heightUnits).toBe(5);
  });

  it("preserves other properties when updating one", () => {
    const item = createLayoutItem(0, 0, 1, 1);
    const state: LayoutState = { items: [item], gridUnitsX: 9, gridUnitsY: 7 };
    const result = updateItemProperties(item.id, { heightUnits: 5 }, state);
    expect(result.items[0]!.binProperties.includeStackingLip).toBe(true);
  });

  it("does not modify other items", () => {
    const a = createLayoutItem(0, 0, 1, 1);
    const b = createLayoutItem(1, 0, 1, 1);
    const state: LayoutState = { items: [a, b], gridUnitsX: 9, gridUnitsY: 7 };
    const result = updateItemProperties(a.id, { heightUnits: 7 }, state);
    expect(result.items[0]!.binProperties.heightUnits).toBe(7);
    expect(result.items[1]!.binProperties.heightUnits).toBe(3);
  });

  it("updates boolean properties", () => {
    const item = createLayoutItem(0, 0, 1, 1);
    const state: LayoutState = { items: [item], gridUnitsX: 9, gridUnitsY: 7 };
    const result = updateItemProperties(item.id, { includeScoop: true }, state);
    expect(result.items[0]!.binProperties.includeScoop).toBe(true);
  });

  it("updates divider counts", () => {
    const item = createLayoutItem(0, 0, 2, 2);
    const state: LayoutState = { items: [item], gridUnitsX: 9, gridUnitsY: 7 };
    const result = updateItemProperties(item.id, { dividersX: 1, dividersY: 1 }, state);
    expect(result.items[0]!.binProperties.dividersX).toBe(1);
    expect(result.items[0]!.binProperties.dividersY).toBe(1);
  });
});

// ── Undo / Redo History ──────────────────────────────────────────────────────

describe("undo/redo history", () => {
  it("createHistory starts with empty past and future", () => {
    const state: LayoutState = { items: [], gridUnitsX: 9, gridUnitsY: 7 };
    const history = createHistory(state);
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(0);
    expect(history.present).toBe(state);
  });

  it("pushHistory adds current to past and clears future", () => {
    const s1: LayoutState = { items: [], gridUnitsX: 9, gridUnitsY: 7 };
    const s2: LayoutState = { items: [createLayoutItem(0, 0, 1, 1)], gridUnitsX: 9, gridUnitsY: 7 };
    let h = createHistory(s1);
    h = pushHistory(h, s2);
    expect(h.past).toHaveLength(1);
    expect(h.present).toBe(s2);
    expect(h.future).toHaveLength(0);
  });

  it("undo restores previous state", () => {
    const s1: LayoutState = { items: [], gridUnitsX: 9, gridUnitsY: 7 };
    const s2: LayoutState = { items: [createLayoutItem(0, 0, 1, 1)], gridUnitsX: 9, gridUnitsY: 7 };
    let h = createHistory(s1);
    h = pushHistory(h, s2);
    h = undo(h);
    expect(h.present.items).toHaveLength(0);
    expect(h.future).toHaveLength(1);
  });

  it("redo restores next state", () => {
    const s1: LayoutState = { items: [], gridUnitsX: 9, gridUnitsY: 7 };
    const s2: LayoutState = { items: [createLayoutItem(0, 0, 1, 1)], gridUnitsX: 9, gridUnitsY: 7 };
    let h = createHistory(s1);
    h = pushHistory(h, s2);
    h = undo(h);
    h = redo(h);
    expect(h.present.items).toHaveLength(1);
    expect(h.future).toHaveLength(0);
  });

  it("undo on empty past is a no-op", () => {
    const state: LayoutState = { items: [], gridUnitsX: 9, gridUnitsY: 7 };
    const h = createHistory(state);
    const result = undo(h);
    expect(result).toBe(h);
  });

  it("redo on empty future is a no-op", () => {
    const state: LayoutState = { items: [], gridUnitsX: 9, gridUnitsY: 7 };
    const h = createHistory(state);
    const result = redo(h);
    expect(result).toBe(h);
  });

  it("canUndo/canRedo reflect state", () => {
    const s1: LayoutState = { items: [], gridUnitsX: 9, gridUnitsY: 7 };
    const s2: LayoutState = { items: [createLayoutItem(0, 0, 1, 1)], gridUnitsX: 9, gridUnitsY: 7 };
    let h = createHistory(s1);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    h = pushHistory(h, s2);
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
    h = undo(h);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(true);
  });

  it("pushHistory clears future (new action after undo)", () => {
    const s1: LayoutState = { items: [], gridUnitsX: 9, gridUnitsY: 7 };
    const s2: LayoutState = { items: [createLayoutItem(0, 0, 1, 1)], gridUnitsX: 9, gridUnitsY: 7 };
    const s3: LayoutState = { items: [createLayoutItem(1, 0, 1, 1)], gridUnitsX: 9, gridUnitsY: 7 };
    let h = createHistory(s1);
    h = pushHistory(h, s2);
    h = undo(h);
    h = pushHistory(h, s3);
    expect(h.future).toHaveLength(0);
    expect(canRedo(h)).toBe(false);
  });
});
