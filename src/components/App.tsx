import { useState, useCallback } from "react";
import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";
import { BinConfigProvider } from "./BinConfigContext";
import { BaseplateConfigProvider } from "./BaseplateConfigContext";
import { PrinterConfigProvider } from "./PrinterConfigContext";
import { LayoutProvider } from "./LayoutContext";
import { BaseplateLayoutProvider } from "./BaseplateLayoutContext";
import { PreviewProvider } from "./PreviewContext";
import { WizardProvider } from "./WizardContext";
import { ProjectProvider } from "./ProjectContext";
import { WizardShell } from "./WizardShell";
import { StartScreen } from "./StartScreen";
import { ToastProvider } from "./ui/Toast";
import type { ProjectData } from "../lib/project";

interface ActiveProject {
  data?: ProjectData;
  name: string;
  id?: string;
}

export function App(): React.JSX.Element {
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(
    null
  );

  const handleNewProject = useCallback(() => {
    setActiveProject({ name: "Untitled Project" });
  }, []);

  const handleOpenProject = useCallback(
    (data: ProjectData, name: string, id: string) => {
      setActiveProject({ data, name, id });
    },
    []
  );

  const handleBackToStart = useCallback(() => {
    setActiveProject(null);
  }, []);

  return (
    <ToastProvider>
      {!activeProject ? (
        <StartScreen
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
        />
      ) : (
        <WizardProvider>
          <GridConfigProvider
            {...(activeProject.data
              ? { initialConfig: activeProject.data.gridConfig }
              : {})}
          >
            <SpaceConfigProvider
              {...(activeProject.data
                ? { initialConfig: activeProject.data.spaceConfig }
                : {})}
            >
              <BinConfigProvider
                {...(activeProject.data
                  ? { initialConfig: activeProject.data.binConfig }
                  : {})}
              >
                <BaseplateConfigProvider
                  {...(activeProject.data
                    ? { initialConfig: activeProject.data.baseplateConfig }
                    : {})}
                >
                  <PrinterConfigProvider
                    {...(activeProject.data?.printBed
                      ? { initialConfig: activeProject.data.printBed }
                      : {})}
                  >
                    <LayoutProvider>
                      <BaseplateLayoutProvider>
                      <PreviewProvider>
                        <ProjectProvider
                          projectName={activeProject.name}
                          {...(activeProject.id
                            ? { projectId: activeProject.id }
                            : {})}
                          {...(activeProject.data
                            ? { initialData: activeProject.data }
                            : {})}
                        >
                          <WizardShell onBackToStart={handleBackToStart} />
                        </ProjectProvider>
                      </PreviewProvider>
                      </BaseplateLayoutProvider>
                    </LayoutProvider>
                  </PrinterConfigProvider>
                </BaseplateConfigProvider>
              </BinConfigProvider>
            </SpaceConfigProvider>
          </GridConfigProvider>
        </WizardProvider>
      )}
    </ToastProvider>
  );
}
