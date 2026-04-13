import { useRef } from "react";
import { useProject } from "./ProjectContext";
import { useToast } from "./ui/Toast";

export function ProjectPanel(): React.JSX.Element {
  const { exportProject, importProject, importError, clearImportError } =
    useProject();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        importProject(reader.result);
        toast("Project loaded", "success");
      }
    };
    reader.onerror = () => {
      toast("Failed to read file", "error");
    };
    reader.readAsText(file);

    // Reset input so the same file can be loaded again
    e.target.value = "";
  }

  function handleSave() {
    exportProject();
    toast("Project saved", "success");
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSave}
        className="rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600"
        data-testid="save-project"
      >
        Export Project
      </button>
      <button
        type="button"
        onClick={() => {
          fileInputRef.current?.click();
        }}
        className="rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600"
        data-testid="load-project"
      >
        Import Project
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
        <button
          type="button"
          className="text-xs text-red-400 hover:text-red-300"
          data-testid="import-error"
          onClick={clearImportError}
          aria-label="Dismiss error"
        >
          {importError}
        </button>
      )}
    </div>
  );
}
