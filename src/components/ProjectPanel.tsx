import { useRef } from "react";
import { useProject } from "./ProjectContext";

export function ProjectPanel(): React.JSX.Element {
  const { exportProject, importProject, importError, clearImportError } =
    useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        importProject(reader.result);
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be loaded again
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={exportProject}
        className="rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600"
        data-testid="save-project"
      >
        Save Project
      </button>
      <button
        type="button"
        onClick={() => {
          fileInputRef.current?.click();
        }}
        className="rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600"
        data-testid="load-project"
      >
        Load Project
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="file-input"
      />
      {importError && (
        <span
          className="text-xs text-red-400"
          data-testid="import-error"
          onClick={clearImportError}
        >
          {importError}
        </span>
      )}
    </div>
  );
}
