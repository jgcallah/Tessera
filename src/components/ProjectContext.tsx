import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import {
  serializeProject,
  deserializeProject,
  downloadProjectFile,
} from "../lib/project";
import type { ProjectData } from "../lib/project";
import { saveProject as saveProjectToStorage } from "../lib/project-storage";
import { useGridConfig } from "./GridConfigContext";
import { useSpaceConfig } from "./SpaceConfigContext";
import { useBinConfig } from "./BinConfigContext";
import { useBaseplateConfig } from "./BaseplateConfigContext";
import { useLayout } from "./LayoutContext";

interface ProjectContextValue {
  projectName: string;
  projectId: string | undefined;
  exportProject: () => void;
  importProject: (json: string) => void;
  importError: string | null;
  clearImportError: () => void;
  saveToLocal: () => void;
  renameProject: (newName: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
  projectName: string;
  projectId?: string;
  initialData?: ProjectData;
}

export function ProjectProvider({
  children,
  projectName: initialName,
  projectId: initialId,
  initialData,
}: ProjectProviderProps): React.JSX.Element {
  const { config: gridConfig, updateConfig: updateGridConfig } =
    useGridConfig();
  const { spaceConfig, updateSpaceConfig } = useSpaceConfig();
  const { binConfig, updateBinConfig } = useBinConfig();
  const { baseplateConfig, updateBaseplateConfig } = useBaseplateConfig();
  const { layout, importLayout } = useLayout();

  const [projectName, setProjectName] = useState(initialName);
  const [projectId, setProjectId] = useState<string | undefined>(initialId);
  const [importError, setImportError] = useState<string | null>(null);

  // Import initial data if loading an existing project
  useEffect(() => {
    if (initialData) {
      importLayout(initialData.layout);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gatherProjectData = useCallback((): ProjectData => {
    const json = serializeProject({
      gridConfig,
      spaceConfig,
      binConfig,
      baseplateConfig,
      layout,
    });
    return JSON.parse(json) as ProjectData;
  }, [gridConfig, spaceConfig, binConfig, baseplateConfig, layout]);

  const saveToLocal = useCallback(() => {
    const data = gatherProjectData();
    const id = saveProjectToStorage(projectName, data, projectId);
    setProjectId(id);
  }, [gatherProjectData, projectName, projectId]);

  // Auto-save on changes (debounced by React's batching)
  useEffect(() => {
    const timer = setTimeout(() => {
      const data = gatherProjectData();
      const id = saveProjectToStorage(projectName, data, projectId);
      if (!projectId) {
        setProjectId(id);
      }
    }, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [gridConfig, spaceConfig, binConfig, baseplateConfig, layout, projectName, projectId, gatherProjectData]);

  const exportProject = useCallback(() => {
    const data = gatherProjectData();
    downloadProjectFile(data, `${projectName}.json`);
  }, [gatherProjectData, projectName]);

  const importProject = useCallback(
    (json: string) => {
      try {
        const data = deserializeProject(json);
        updateGridConfig(data.gridConfig);
        updateSpaceConfig(data.spaceConfig);
        updateBinConfig(data.binConfig);
        updateBaseplateConfig(data.baseplateConfig);
        importLayout(data.layout);
        setImportError(null);
      } catch (err: unknown) {
        setImportError(
          err instanceof Error ? err.message : "Unknown import error"
        );
      }
    },
    [
      updateGridConfig,
      updateSpaceConfig,
      updateBinConfig,
      updateBaseplateConfig,
      importLayout,
    ]
  );

  const clearImportError = useCallback(() => {
    setImportError(null);
  }, []);

  const renameProjectFn = useCallback(
    (newName: string) => {
      setProjectName(newName);
      // Update in localStorage immediately
      if (projectId) {
        const data = gatherProjectData();
        saveProjectToStorage(newName, data, projectId);
      }
    },
    [projectId, gatherProjectData]
  );

  const value = useMemo(
    () => ({
      projectName,
      projectId,
      exportProject,
      importProject,
      importError,
      clearImportError,
      saveToLocal,
      renameProject: renameProjectFn,
    }),
    [
      projectName,
      projectId,
      exportProject,
      importProject,
      importError,
      clearImportError,
      saveToLocal,
      renameProjectFn,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
