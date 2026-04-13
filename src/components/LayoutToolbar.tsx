import { useLayout } from "./LayoutContext";

export function LayoutToolbar(): React.JSX.Element {
  const { undoLayout, redoLayout, canUndo, canRedo, clearLayout, layout } =
    useLayout();

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <button
          type="button"
          disabled={!canUndo}
          onClick={undoLayout}
          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 disabled:opacity-30"
          data-testid="undo-btn"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={redoLayout}
          className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 disabled:opacity-30"
          data-testid="redo-btn"
          title="Redo (Ctrl+Y)"
        >
          Redo
        </button>
      </div>
      {layout.items.length > 0 && (
        <button
          type="button"
          onClick={clearLayout}
          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
        >
          Clear All
        </button>
      )}
    </div>
  );
}
