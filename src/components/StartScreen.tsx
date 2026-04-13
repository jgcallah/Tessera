import { useState, useEffect, useCallback } from "react";
import {
  listProjects,
  deleteProject,
  loadProject,
} from "../lib/project-storage";
import type { ProjectSummary } from "../lib/project-storage";
import type { ProjectData } from "../lib/project";

interface StartScreenProps {
  onNewProject: () => void;
  onOpenProject: (data: ProjectData, name: string, id: string) => void;
}

export function StartScreen({
  onNewProject,
  onOpenProject,
}: StartScreenProps): React.JSX.Element {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

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

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete "${name}"?`)) {
      deleteProject(id);
      refreshList();
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-zinc-900 text-zinc-100">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo / Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Tessera</h1>
          <p className="mt-2 text-zinc-400">
            Gridfinity layout planner &amp; 3D part generator
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={onNewProject}
            className="w-full rounded-lg bg-violet-700 px-6 py-3 text-sm font-medium text-white hover:bg-violet-600"
            data-testid="new-project"
          >
            New Project
          </button>
        </div>

        {/* Saved Projects */}
        {projects.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
              Recent Projects
            </h2>
            <div
              className="space-y-2"
              data-testid="project-list"
            >
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3"
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
                      {new Date(proj.savedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(proj.id, proj.name);
                    }}
                    className="ml-3 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
                    data-testid={`delete-${proj.id}`}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
