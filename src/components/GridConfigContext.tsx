import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { GridConfig, GridDerivedValues } from "../lib/grid-config";
import {
  createDefaultGridConfig,
  createGridConfig,
  getGridDerivedValues,
} from "../lib/grid-config";

interface GridConfigContextValue {
  config: GridConfig;
  derivedValues: GridDerivedValues;
  updateConfig: (overrides: Partial<GridConfig>) => void;
  resetConfig: () => void;
}

const GridConfigContext = createContext<GridConfigContextValue | null>(null);

interface GridConfigProviderProps {
  children: ReactNode;
  initialConfig?: Partial<GridConfig>;
}

export function GridConfigProvider({
  children,
  initialConfig,
}: GridConfigProviderProps): React.JSX.Element {
  const [config, setConfig] = useState<GridConfig>(() =>
    initialConfig ? createGridConfig(initialConfig) : createDefaultGridConfig()
  );

  const derivedValues = useMemo(() => getGridDerivedValues(config), [config]);

  const updateConfig = useCallback(
    (overrides: Partial<GridConfig>) => {
      setConfig((prev) => {
        const newMode = overrides.mode ?? prev.mode;

        if (newMode === "gridfinity") {
          // Switching to or staying in gridfinity: lock all values except tolerance
          return createGridConfig({
            mode: "gridfinity",
            tolerance: overrides.tolerance ?? prev.tolerance,
          });
        }

        // Custom mode: apply all overrides
        return createGridConfig({
          ...prev,
          ...overrides,
          mode: "custom",
        });
      });
    },
    []
  );

  const resetConfig = useCallback(() => {
    setConfig(createDefaultGridConfig());
  }, []);

  const value = useMemo(
    () => ({ config, derivedValues, updateConfig, resetConfig }),
    [config, derivedValues, updateConfig, resetConfig]
  );

  return (
    <GridConfigContext.Provider value={value}>
      {children}
    </GridConfigContext.Provider>
  );
}

export function useGridConfig(): GridConfigContextValue {
  const context = useContext(GridConfigContext);
  if (!context) {
    throw new Error(
      "useGridConfig must be used within a GridConfigProvider"
    );
  }
  return context;
}
