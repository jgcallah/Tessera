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
  const { toast } = useToast();

  const refreshList = useCallback(() => {
    setProjects(listProjects());
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

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

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-zinc-900 text-zinc-100">
      <div className="w-full max-w-lg space-y-8 px-6">
        {/* Logo / Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Tessera</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Gridfinity layout planner &amp; 3D part generator
          </p>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={onNewProject}
          className="w-full rounded-lg bg-violet-700 px-6 py-3.5 text-sm font-medium text-white shadow-lg shadow-violet-900/30 transition-all hover:bg-violet-600 hover:shadow-violet-900/50"
          data-testid="new-project"
        >
          New Project
        </button>

        {/* Saved Projects */}
        {projects.length > 0 ? (
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Recent Projects
            </h2>
            <div className="space-y-2" data-testid="project-list">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="group flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 transition-all hover:border-zinc-600 hover:bg-zinc-800"
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleOpen(proj.id);
                    }}
                    className="flex-1 text-left"
                    data-testid={`open-${proj.id}`}
                  >
                    <span className="block text-sm font-medium text-zinc-100">
                      {proj.name}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      Last saved{" "}
                      {new Date(proj.savedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(proj);
                    }}
                    className="ml-3 rounded px-2 py-1 text-xs text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-700 hover:text-red-400 group-hover:opacity-100"
                    data-testid={`delete-${proj.id}`}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-zinc-600">
            No projects yet. Create your first one above.
          </p>
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
