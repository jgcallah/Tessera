import { GridConfigProvider } from "./GridConfigContext";
import { SpaceConfigProvider } from "./SpaceConfigContext";
import { BinConfigProvider } from "./BinConfigContext";
import { BaseplateConfigProvider } from "./BaseplateConfigContext";
import { LayoutProvider } from "./LayoutContext";
import { PreviewProvider } from "./PreviewContext";
import { WizardProvider } from "./WizardContext";
import { ProjectProvider } from "./ProjectContext";
import { WizardShell } from "./WizardShell";

export function App(): React.JSX.Element {
  return (
    <WizardProvider>
      <GridConfigProvider>
        <SpaceConfigProvider>
          <BinConfigProvider>
            <BaseplateConfigProvider>
              <LayoutProvider>
                <PreviewProvider>
                  <ProjectProvider>
                    <WizardShell />
                  </ProjectProvider>
                </PreviewProvider>
              </LayoutProvider>
            </BaseplateConfigProvider>
          </BinConfigProvider>
        </SpaceConfigProvider>
      </GridConfigProvider>
    </WizardProvider>
  );
}
