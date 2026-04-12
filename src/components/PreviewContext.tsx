import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";

export type PreviewMode = "assembled" | "bin" | "baseplate";

interface PreviewContextValue {
  mode: PreviewMode;
  setMode: (mode: PreviewMode) => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

interface PreviewProviderProps {
  children: ReactNode;
  initialMode?: PreviewMode;
}

export function PreviewProvider({
  children,
  initialMode = "assembled",
}: PreviewProviderProps): React.JSX.Element {
  const [mode, setModeState] = useState<PreviewMode>(initialMode);

  const setMode = useCallback((newMode: PreviewMode) => {
    setModeState(newMode);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <PreviewContext.Provider value={value}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview(): PreviewContextValue {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error("usePreview must be used within a PreviewProvider");
  }
  return context;
}
