import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { SpaceConfig, GridFit, BaseUnitSuggestion } from "../lib/space-config";
import {
  createDefaultSpaceConfig,
  createSpaceConfig,
  getGridFit,
  suggestOptimalBaseUnit,
  suggestTopBaseUnits,
} from "../lib/space-config";
import { useGridConfig } from "./GridConfigContext";

interface SpaceConfigContextValue {
  spaceConfig: SpaceConfig;
  gridFit: GridFit;
  suggestion: BaseUnitSuggestion;
  suggestions: BaseUnitSuggestion[];
  updateSpaceConfig: (overrides: Partial<SpaceConfig>) => void;
  resetSpaceConfig: () => void;
}

const SpaceConfigContext = createContext<SpaceConfigContextValue | null>(null);

interface SpaceConfigProviderProps {
  children: ReactNode;
  initialConfig?: Partial<SpaceConfig>;
}

export function SpaceConfigProvider({
  children,
  initialConfig,
}: SpaceConfigProviderProps): React.JSX.Element {
  const { config: gridConfig } = useGridConfig();

  const [spaceConfig, setSpaceConfig] = useState<SpaceConfig>(() =>
    initialConfig
      ? createSpaceConfig(initialConfig)
      : createDefaultSpaceConfig()
  );

  const gridFit = useMemo(
    () => getGridFit(spaceConfig, gridConfig),
    [spaceConfig, gridConfig]
  );

  const suggestion = useMemo(
    () => suggestOptimalBaseUnit(spaceConfig),
    [spaceConfig]
  );

  const suggestions = useMemo(
    () => suggestTopBaseUnits(spaceConfig, 3),
    [spaceConfig]
  );

  const updateSpaceConfig = useCallback(
    (overrides: Partial<SpaceConfig>) => {
      setSpaceConfig((prev) => createSpaceConfig({ ...prev, ...overrides }));
    },
    []
  );

  const resetSpaceConfig = useCallback(() => {
    setSpaceConfig(createDefaultSpaceConfig());
  }, []);

  const value = useMemo(
    () => ({
      spaceConfig,
      gridFit,
      suggestion,
      suggestions,
      updateSpaceConfig,
      resetSpaceConfig,
    }),
    [
      spaceConfig,
      gridFit,
      suggestion,
      suggestions,
      updateSpaceConfig,
      resetSpaceConfig,
    ]
  );

  return (
    <SpaceConfigContext.Provider value={value}>
      {children}
    </SpaceConfigContext.Provider>
  );
}

export function useSpaceConfig(): SpaceConfigContextValue {
  const context = useContext(SpaceConfigContext);
  if (!context) {
    throw new Error(
      "useSpaceConfig must be used within a SpaceConfigProvider"
    );
  }
  return context;
}
