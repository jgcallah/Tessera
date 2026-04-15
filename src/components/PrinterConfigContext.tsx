import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { PrintBedConfig } from "../lib/print-planner";
import {
  createDefaultPrintBedConfig,
  createPrintBedConfig,
  validatePrintBedConfig,
} from "../lib/print-planner";
import type { ValidationResult } from "../lib/grid-config";

interface PrinterConfigContextValue {
  printerConfig: PrintBedConfig;
  validation: ValidationResult;
  updatePrinterConfig: (overrides: Partial<PrintBedConfig>) => void;
  resetPrinterConfig: () => void;
}

const PrinterConfigContext = createContext<PrinterConfigContextValue | null>(
  null
);

interface PrinterConfigProviderProps {
  children: ReactNode;
  initialConfig?: Partial<PrintBedConfig>;
}

export function PrinterConfigProvider({
  children,
  initialConfig,
}: PrinterConfigProviderProps): React.JSX.Element {
  const [printerConfig, setPrinterConfig] = useState<PrintBedConfig>(() =>
    initialConfig
      ? createPrintBedConfig(initialConfig)
      : createDefaultPrintBedConfig()
  );

  const validation = useMemo(
    () => validatePrintBedConfig(printerConfig),
    [printerConfig]
  );

  const updatePrinterConfig = useCallback(
    (overrides: Partial<PrintBedConfig>) => {
      setPrinterConfig((prev) => createPrintBedConfig({ ...prev, ...overrides }));
    },
    []
  );

  const resetPrinterConfig = useCallback(() => {
    setPrinterConfig(createDefaultPrintBedConfig());
  }, []);

  const value = useMemo(
    () => ({ printerConfig, validation, updatePrinterConfig, resetPrinterConfig }),
    [printerConfig, validation, updatePrinterConfig, resetPrinterConfig]
  );

  return (
    <PrinterConfigContext.Provider value={value}>
      {children}
    </PrinterConfigContext.Provider>
  );
}

export function usePrinterConfig(): PrinterConfigContextValue {
  const context = useContext(PrinterConfigContext);
  if (!context) {
    throw new Error(
      "usePrinterConfig must be used within a PrinterConfigProvider"
    );
  }
  return context;
}
