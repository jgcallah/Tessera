import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import {
  serializeProject,
  deserializeProject,
  downloadProjectFile,
} from "../lib/project";
import type { ProjectData } from "../lib/project";
import { useGridConfig } from "./GridConfigContext";
import { useSpaceConfig } from "./SpaceConfigContext";
import { useBinConfig } from "./BinConfigContext";
import { useBaseplateConfig } from "./BaseplateConfigContext";
import { useLayout } from "./LayoutContext";

interface ProjectContextValue {
  exportProject: () => void;
  importProject: (json: string) => void;
  importError: string | null;
  clearImportError: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({
  children,
}: ProjectProviderProps): React.JSX.Element {
  const { config: gridConfig, updateConfig: updateGridConfig } =
    useGridConfig();
  const { spaceConfig, updateSpaceConfig } = useSpaceConfig();
  const { binConfig, updateBinConfig } = useBinConfig();
  const { baseplateConfig, updateBaseplateConfig } = useBaseplateConfig();
  const { layout, importLayout } = useLayout();

  const [importError, setImportError] = useState<string | null>(null);

  const exportProject = useCallback(() => {
    const json = serializeProject({
      gridConfig,
      spaceConfig,
      binConfig,
      baseplateConfig,
      layout,
    });
    const data: ProjectData = JSON.parse(json) as ProjectData;
    downloadProjectFile(data);
  }, [gridConfig, spaceConfig, binConfig, baseplateConfig, layout]);

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

  const value = useMemo(
    () => ({ exportProject, importProject, importError, clearImportError }),
    [exportProject, importProject, importError, clearImportError]
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
