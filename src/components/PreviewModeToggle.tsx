import { usePreview } from "./PreviewContext";
import type { PreviewMode } from "./PreviewContext";

const MODES: { value: PreviewMode; label: string }[] = [
  { value: "assembled", label: "Assembled" },
  { value: "bin", label: "Bin" },
  { value: "baseplate", label: "Baseplate" },
];

export function PreviewModeToggle(): React.JSX.Element {
  const { mode, setMode } = usePreview();

  return (
    <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
      {MODES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => {
            setMode(value);
          }}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === value
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
