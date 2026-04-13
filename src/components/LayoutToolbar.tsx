import { useLayout } from "./LayoutContext";
import type { LayoutMode } from "./LayoutGrid";

const PRESETS: { w: number; h: number; label: string }[] = [
  { w: 1, h: 1, label: "1×1" },
  { w: 2, h: 1, label: "2×1" },
  { w: 1, h: 2, label: "1×2" },
  { w: 2, h: 2, label: "2×2" },
];

interface LayoutToolbarProps {
  mode: LayoutMode;
  stampWidth: number;
  stampHeight: number;
  onModeChange: (mode: LayoutMode) => void;
  onStampChange: (w: number, h: number) => void;
}

export function LayoutToolbar({
  mode,
  stampWidth,
  stampHeight,
  onModeChange,
  onStampChange,
}: LayoutToolbarProps): React.JSX.Element {
  const { undoLayout, redoLayout, canUndo, canRedo, clearLayout, layout } =
    useLayout();

  function handlePreset(w: number, h: number) {
    onStampChange(w, h);
    onModeChange("stamp");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Presets */}
      {PRESETS.map(({ w, h, label }) => {
        const isActive = mode === "stamp" && stampWidth === w && stampHeight === h;
        return (
          <button
            key={label}
            type="button"
            onClick={() => {
              handlePreset(w, h);
            }}
            className={`rounded px-2.5 py-1 text-xs font-mono font-medium transition-colors ${
              isActive
                ? "bg-violet-700 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            }`}
            data-testid={`preset-${label.replace("×", "x")}`}
          >
            {label}
          </button>
        );
      })}

      {/* Draw mode */}
      <button
        type="button"
        onClick={() => {
          onModeChange("draw");
        }}
        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
          mode === "draw"
            ? "bg-violet-700 text-white"
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
        }`}
        data-testid="draw-mode"
      >
        Draw
      </button>

      <div className="mx-1 h-5 w-px bg-zinc-700" />

      {/* Undo/Redo */}
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

      <div className="mx-1 h-5 w-px bg-zinc-700" />

      {/* Clear */}
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
