import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { BaseplateConfig, BaseplateDimensions } from "../lib/baseplate-config";
import {
  createDefaultBaseplateConfig,
  createBaseplateConfig,
  getBaseplateDimensions,
} from "../lib/baseplate-config";
import { useGridConfig } from "./GridConfigContext";

interface BaseplateConfigContextValue {
  baseplateConfig: BaseplateConfig;
  baseplateDimensions: BaseplateDimensions;
  updateBaseplateConfig: (overrides: Partial<BaseplateConfig>) => void;
  resetBaseplateConfig: () => void;
}

const BaseplateConfigContext =
  createContext<BaseplateConfigContextValue | null>(null);

interface BaseplateConfigProviderProps {
  children: ReactNode;
  initialConfig?: Partial<BaseplateConfig>;
}

export function BaseplateConfigProvider({
  children,
  initialConfig,
}: BaseplateConfigProviderProps): React.JSX.Element {
  const { config: gridConfig } = useGridConfig();

  const [baseplateConfig, setBaseplateConfig] = useState<BaseplateConfig>(() =>
    initialConfig
      ? createBaseplateConfig(initialConfig)
      : createDefaultBaseplateConfig()
  );

  const baseplateDimensions = useMemo(
    () => getBaseplateDimensions(baseplateConfig, gridConfig),
    [baseplateConfig, gridConfig]
  );

  const updateBaseplateConfig = useCallback(
    (overrides: Partial<BaseplateConfig>) => {
      setBaseplateConfig((prev) =>
        createBaseplateConfig({ ...prev, ...overrides })
      );
    },
    []
  );

  const resetBaseplateConfig = useCallback(() => {
    setBaseplateConfig(createDefaultBaseplateConfig());
  }, []);

  const value = useMemo(
    () => ({
      baseplateConfig,
      baseplateDimensions,
      updateBaseplateConfig,
      resetBaseplateConfig,
    }),
    [
      baseplateConfig,
      baseplateDimensions,
      updateBaseplateConfig,
      resetBaseplateConfig,
    ]
  );

  return (
    <BaseplateConfigContext.Provider value={value}>
      {children}
    </BaseplateConfigContext.Provider>
  );
}

export function useBaseplateConfig(): BaseplateConfigContextValue {
  const context = useContext(BaseplateConfigContext);
  if (!context) {
    throw new Error(
      "useBaseplateConfig must be used within a BaseplateConfigProvider"
    );
  }
  return context;
}
