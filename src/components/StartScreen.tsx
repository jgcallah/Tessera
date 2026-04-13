import { useState, useEffect, useCallback } from "react";
import {
  listProjects,
  deleteProject,
  loadProject,
} from "../lib/project-storage";
import type { ProjectSummary } from "../lib/project-storage";
import type { ProjectData } from "../lib/project";
import { ConfirmModal } from "./ui/ConfirmModal";
import { useToast } from "./ui/Toast";

type SortMode = "date" | "name";

interface StartScreenProps {
  onNewProject: () => void;
  onOpenProject: (data: ProjectData, name: string, id: string) => void;
}

export function StartScreen({
  onNewProject,
  onOpenProject,
}: StartScreenProps): React.JSX.Element {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const { toast } = useToast();

  const refreshList = useCallback(() => {
    setProjects(listProjects());
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const sortedProjects = [...projects].sort((a, b) => {
    if (sortMode === "name") return a.name.localeCompare(b.name);
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });

  function handleOpen(id: string) {
    const loaded = loadProject(id);
    if (loaded) {
      onOpenProject(loaded.data, loaded.name, id);
    }
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteProject(deleteTarget.id);
    toast(`Deleted "${deleteTarget.name}"`, "success");
    setDeleteTarget(null);
    refreshList();
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-zinc-900 text-zinc-100">
      <div className="w-full max-w-xl space-y-8 px-6">
        {/* Logo / Title */}
        <div className="text-center">
          <div className="mb-3 flex justify-center">
            <svg viewBox="0 0 32 32" className="h-12 w-12">
              <rect x="2" y="2" width="13" height="13" rx="2" fill="#6d28d9" />
              <rect x="17" y="2" width="13" height="13" rx="2" fill="#7c3aed" />
              <rect x="2" y="17" width="13" height="13" rx="2" fill="#7c3aed" />
              <rect
                x="17"
                y="17"
                width="13"
                height="13"
                rx="2"
                fill="#8b5cf6"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Tessera</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Gridfinity layout planner &amp; 3D part generator
          </p>
        </div>

        {/* New Project */}
        <button
          type="button"
          onClick={onNewProject}
          className="w-full rounded-lg bg-violet-700 px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition-all hover:bg-violet-600 hover:shadow-violet-900/50 active:scale-[0.99]"
          data-testid="new-project"
        >
          New Project
        </button>

        {/* Saved Projects */}
        {sortedProjects.length > 0 ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Recent Projects
              </h2>
              <div className="flex gap-1">
                {(["date", "name"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setSortMode(mode);
                    }}
                    className={`rounded px-2 py-0.5 text-[10px] capitalize transition-colors ${
                      sortMode === mode
                        ? "bg-zinc-700 text-zinc-200"
                        : "text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2" data-testid="project-list">
              {sortedProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="group relative overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/30 transition-all hover:border-zinc-600 hover:bg-zinc-800/70 hover:shadow-md hover:shadow-black/20"
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleOpen(proj.id);
                    }}
                    className="w-full px-4 py-3 text-left"
                    data-testid={`open-${proj.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium text-zinc-100">
                        {proj.name}
                      </span>
                      {proj.binCount != null && proj.binCount > 0 && (
                        <span className="ml-2 rounded-full bg-violet-900/50 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                          {proj.binCount} bin{proj.binCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-zinc-500">
                      <span>Last saved {formatDate(proj.savedAt)}</span>
                      {proj.spaceWidth != null && proj.spaceLength != null && (
                        <span className="text-zinc-600">
                          {proj.spaceWidth}×{proj.spaceLength}mm
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(proj);
                    }}
                    className="absolute right-2 top-2 rounded p-1 text-zinc-600 opacity-0 transition-all hover:bg-zinc-700 hover:text-red-400 group-hover:opacity-100"
                    data-testid={`delete-${proj.id}`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-zinc-600">
              No projects yet. Create your first one above.
            </p>
            <p className="mt-1 text-xs text-zinc-700">
              Projects are saved automatically in your browser.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Project"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
