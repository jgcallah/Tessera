import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { BinConfig, BinDimensions } from "../lib/bin-config";
import {
  createDefaultBinConfig,
  createBinConfig,
  getBinDimensions,
} from "../lib/bin-config";
import { useGridConfig } from "./GridConfigContext";

interface BinConfigContextValue {
  binConfig: BinConfig;
  binDimensions: BinDimensions;
  updateBinConfig: (overrides: Partial<BinConfig>) => void;
  resetBinConfig: () => void;
}

const BinConfigContext = createContext<BinConfigContextValue | null>(null);

interface BinConfigProviderProps {
  children: ReactNode;
  initialConfig?: Partial<BinConfig>;
}

export function BinConfigProvider({
  children,
  initialConfig,
}: BinConfigProviderProps): React.JSX.Element {
  const { config: gridConfig } = useGridConfig();

  const [binConfig, setBinConfig] = useState<BinConfig>(() =>
    initialConfig ? createBinConfig(initialConfig) : createDefaultBinConfig()
  );

  const binDimensions = useMemo(
    () => getBinDimensions(binConfig, gridConfig),
    [binConfig, gridConfig]
  );

  const updateBinConfig = useCallback((overrides: Partial<BinConfig>) => {
    setBinConfig((prev) => createBinConfig({ ...prev, ...overrides }));
  }, []);

  const resetBinConfig = useCallback(() => {
    setBinConfig(createDefaultBinConfig());
  }, []);

  const value = useMemo(
    () => ({ binConfig, binDimensions, updateBinConfig, resetBinConfig }),
    [binConfig, binDimensions, updateBinConfig, resetBinConfig]
  );

  return (
    <BinConfigContext.Provider value={value}>
      {children}
    </BinConfigContext.Provider>
  );
}

export function useBinConfig(): BinConfigContextValue {
  const context = useContext(BinConfigContext);
  if (!context) {
    throw new Error(
      "useBinConfig must be used within a BinConfigProvider"
    );
  }
  return context;
}
