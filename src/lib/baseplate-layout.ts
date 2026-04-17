// ── Types ────────────────────────────────────────────────────────────────────

export interface BaseplateItem {
  id: string;
  gridX: number;
  gridY: number;
  gridUnitsX: number;
  gridUnitsY: number;
}

/**
 * A spacer strip hugs one edge of the grid. Pieces on a strip run along its
 * "long" axis (Y for left/right strips, X for top/bottom strips) and are
 * sized in grid units on that axis.
 */
export type SpacerSide = "left" | "right" | "top" | "bottom";

export interface SpacerPiece {
  id: string;
  side: SpacerSide;
  /** Offset from the strip's start, in grid units along the long axis. */
  offset: number;
  /** Length of this piece, in grid units along the long axis. */
  length: number;
}

export interface BaseplateLayoutState {
  items: BaseplateItem[];
  spacers: SpacerPiece[];
  gridUnitsX: number;
  gridUnitsY: number;
}

export interface BaseplatePartEntry {
  gridUnitsX: number;
  gridUnitsY: number;
  quantity: number;
}

export interface SpacerPartEntry {
  side: SpacerSide;
  length: number;
  quantity: number;
}

// ── Factories ────────────────────────────────────────────────────────────────

export function createBaseplateItem(
  gridX: number,
  gridY: number,
  gridUnitsX: number,
  gridUnitsY: number
): BaseplateItem {
  return {
    id: `bp-${crypto.randomUUID()}`,
    gridX,
    gridY,
    gridUnitsX,
    gridUnitsY,
  };
}

export function createSpacerPiece(
  side: SpacerSide,
  offset: number,
  length: number
): SpacerPiece {
  return {
    id: `sp-${crypto.randomUUID()}`,
    side,
    offset,
    length,
  };
}

// ── Overlap & Placement ──────────────────────────────────────────────────────

function itemsOverlap(a: BaseplateItem, b: BaseplateItem): boolean {
  const aRight = a.gridX + a.gridUnitsX;
  const aBottom = a.gridY + a.gridUnitsY;
  const bRight = b.gridX + b.gridUnitsX;
  const bBottom = b.gridY + b.gridUnitsY;
  return (
    a.gridX < bRight && aRight > b.gridX && a.gridY < bBottom && aBottom > b.gridY
  );
}

export function canPlaceBaseplate(
  item: BaseplateItem,
  state: BaseplateLayoutState
): boolean {
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

export function addBaseplate(
  item: BaseplateItem,
  state: BaseplateLayoutState
): BaseplateLayoutState {
  if (!canPlaceBaseplate(item, state)) return state;
  return { ...state, items: [...state.items, item] };
}

export function removeBaseplate(
  id: string,
  state: BaseplateLayoutState
): BaseplateLayoutState {
  const filtered = state.items.filter((i) => i.id !== id);
  if (filtered.length === state.items.length) return state;
  return { ...state, items: filtered };
}

export function moveBaseplate(
  id: string,
  newGridX: number,
  newGridY: number,
  state: BaseplateLayoutState
): BaseplateLayoutState {
  const item = state.items.find((i) => i.id === id);
  if (!item) return state;
  const moved = { ...item, gridX: newGridX, gridY: newGridY };
  if (!canPlaceBaseplate(moved, state)) return state;
  return {
    ...state,
    items: state.items.map((i) => (i.id === id ? moved : i)),
  };
}

export function resizeBaseplate(
  id: string,
  newGridX: number,
  newGridY: number,
  newGridUnitsX: number,
  newGridUnitsY: number,
  state: BaseplateLayoutState
): BaseplateLayoutState {
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
  if (!canPlaceBaseplate(resized, state)) return state;
  return {
    ...state,
    items: state.items.map((i) => (i.id === id ? resized : i)),
  };
}

// ── Spacer Helpers ───────────────────────────────────────────────────────────

/**
 * Long-axis length of a spacer strip, in grid units.
 * Left/right strips run along Y (length = gridUnitsY).
 * Top/bottom strips run along X (length = gridUnitsX).
 */
export function spacerStripLength(
  side: SpacerSide,
  state: Pick<BaseplateLayoutState, "gridUnitsX" | "gridUnitsY">
): number {
  return side === "left" || side === "right"
    ? state.gridUnitsY
    : state.gridUnitsX;
}

function spacersOnSameStripOverlap(a: SpacerPiece, b: SpacerPiece): boolean {
  if (a.side !== b.side) return false;
  return a.offset < b.offset + b.length && a.offset + a.length > b.offset;
}

export function canPlaceSpacer(
  piece: SpacerPiece,
  state: BaseplateLayoutState
): boolean {
  if (piece.length < 1) return false;
  if (piece.offset < 0) return false;
  const stripLen = spacerStripLength(piece.side, state);
  if (piece.offset + piece.length > stripLen) return false;
  for (const existing of state.spacers) {
    if (existing.id !== piece.id && spacersOnSameStripOverlap(piece, existing)) {
      return false;
    }
  }
  return true;
}

export function addSpacer(
  piece: SpacerPiece,
  state: BaseplateLayoutState
): BaseplateLayoutState {
  if (!canPlaceSpacer(piece, state)) return state;
  return { ...state, spacers: [...state.spacers, piece] };
}

export function removeSpacer(
  id: string,
  state: BaseplateLayoutState
): BaseplateLayoutState {
  const filtered = state.spacers.filter((s) => s.id !== id);
  if (filtered.length === state.spacers.length) return state;
  return { ...state, spacers: filtered };
}

// ── Parts Lists ──────────────────────────────────────────────────────────────

export function getBaseplateParts(
  state: BaseplateLayoutState
): BaseplatePartEntry[] {
  const map = new Map<string, BaseplatePartEntry>();
  for (const item of state.items) {
    const key = `${item.gridUnitsX}x${item.gridUnitsY}`;
    const existing = map.get(key);
    if (existing) existing.quantity++;
    else
      map.set(key, {
        gridUnitsX: item.gridUnitsX,
        gridUnitsY: item.gridUnitsY,
        quantity: 1,
      });
  }
  return [...map.values()];
}

export function getSpacerParts(state: BaseplateLayoutState): SpacerPartEntry[] {
  const map = new Map<string, SpacerPartEntry>();
  for (const piece of state.spacers) {
    const key = `${piece.side}:${piece.length}`;
    const existing = map.get(key);
    if (existing) existing.quantity++;
    else map.set(key, { side: piece.side, length: piece.length, quantity: 1 });
  }
  return [...map.values()];
}

// ── Auto-Fill ────────────────────────────────────────────────────────────────

/**
 * Which spacer sides exist given the grid alignment. Mirrors SpaceConfig
 * semantics: `start` alignment leaves remainder at the end, `end` at the start,
 * `center` at both.
 */
export interface SpacerSides {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
}

/**
 * Clear the current layout and tile the grid with baseplates (max maxSizeX ×
 * maxSizeY grid units each) plus spacer pieces of up to max spacer length.
 * Uses a simple greedy fill scanning row-major; sufficient for rectangular
 * grids where the max sizes evenly divide the grid.
 */
export function autoFillLayout(
  state: BaseplateLayoutState,
  maxSizeX: number,
  maxSizeY: number,
  maxSpacerLength: number,
  sides: SpacerSides
): BaseplateLayoutState {
  const items: BaseplateItem[] = [];

  // Greedy row-major fill: at each uncovered cell, place the largest plate
  // that fits without overlap and stays within max size.
  const covered = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  for (let y = 0; y < state.gridUnitsY; y++) {
    for (let x = 0; x < state.gridUnitsX; x++) {
      if (covered.has(key(x, y))) continue;

      const maxW = Math.min(maxSizeX, state.gridUnitsX - x);
      const maxH = Math.min(maxSizeY, state.gridUnitsY - y);

      // Widen until blocked by already-covered or grid edge
      let w = 1;
      while (w < maxW && !covered.has(key(x + w, y))) w++;
      // Then grow down as much as possible keeping width
      let h = 1;
      outer: while (h < maxH) {
        for (let dx = 0; dx < w; dx++) {
          if (covered.has(key(x + dx, y + h))) break outer;
        }
        h++;
      }

      items.push(createBaseplateItem(x, y, w, h));
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          covered.add(key(x + dx, y + dy));
        }
      }
    }
  }

  const spacers: SpacerPiece[] = [];
  const addStrip = (side: SpacerSide) => {
    const len = spacerStripLength(side, state);
    let offset = 0;
    while (offset < len) {
      const pieceLen = Math.min(maxSpacerLength, len - offset);
      spacers.push(createSpacerPiece(side, offset, pieceLen));
      offset += pieceLen;
    }
  };
  if (sides.left) addStrip("left");
  if (sides.right) addStrip("right");
  if (sides.top) addStrip("top");
  if (sides.bottom) addStrip("bottom");

  return { ...state, items, spacers };
}

// ── Clear / Import ───────────────────────────────────────────────────────────

export function clearLayout(
  state: BaseplateLayoutState
): BaseplateLayoutState {
  return { ...state, items: [], spacers: [] };
}

// ── Snap Connector Count ─────────────────────────────────────────────────────

/**
 * Shared edge length (in grid units) between two baseplates. Returns 0 if the
 * plates do not share an axis-adjacent boundary.
 */
function sharedEdgeLength(a: BaseplateItem, b: BaseplateItem): number {
  const aRight = a.gridX + a.gridUnitsX;
  const aBottom = a.gridY + a.gridUnitsY;
  const bRight = b.gridX + b.gridUnitsX;
  const bBottom = b.gridY + b.gridUnitsY;

  // Vertical shared edge (one plate directly left/right of the other)
  if (aRight === b.gridX || bRight === a.gridX) {
    return Math.max(
      0,
      Math.min(aBottom, bBottom) - Math.max(a.gridY, b.gridY)
    );
  }
  // Horizontal shared edge (one plate directly above/below)
  if (aBottom === b.gridY || bBottom === a.gridY) {
    return Math.max(
      0,
      Math.min(aRight, bRight) - Math.max(a.gridX, b.gridX)
    );
  }
  return 0;
}

/**
 * Total number of snap connector clips needed to join all adjacent baseplates
 * in the layout. Uses 1 clip per grid-unit of shared edge length.
 */
export function countSnapConnectors(state: BaseplateLayoutState): number {
  let total = 0;
  const items = state.items;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (!a || !b) continue;
      total += sharedEdgeLength(a, b);
    }
  }
  return total;
}
