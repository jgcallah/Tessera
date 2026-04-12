import { Suspense } from "react";
import { PreviewCanvas } from "./PreviewCanvas";
import { ManifoldDemo } from "./ManifoldDemo";
import { GridConfigProvider } from "./GridConfigContext";
import { GridConfigPanel } from "./GridConfigPanel";
import { BinConfigProvider } from "./BinConfigContext";
import { BinConfigPanel } from "./BinConfigPanel";
import { BaseplateConfigProvider } from "./BaseplateConfigContext";
import { BaseplateConfigPanel } from "./BaseplateConfigPanel";
import { PreviewProvider } from "./PreviewContext";
import { PreviewModeToggle } from "./PreviewModeToggle";

export function App(): React.JSX.Element {
  return (
    <GridConfigProvider>
      <BinConfigProvider>
        <BaseplateConfigProvider>
          <PreviewProvider>
            <div className="flex min-h-screen flex-col bg-zinc-900 text-zinc-100">
              <header className="border-b border-zinc-700 px-6 py-4">
                <h1 className="text-2xl font-bold tracking-tight">
                  Tessera
                </h1>
                <p className="text-sm text-zinc-400">
                  Gridfinity layout planner &amp; 3D part generator
                </p>
              </header>
              <main className="flex flex-1 gap-4 p-6">
                <section className="flex flex-1 flex-col rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">3D Preview</h2>
                    <PreviewModeToggle />
                  </div>
                  <div className="flex-1">
                    <PreviewCanvas />
                  </div>
                </section>
                <aside className="w-80 space-y-4 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <GridConfigPanel />
                  <div className="border-t border-zinc-700 pt-3">
                    <BinConfigPanel />
                  </div>
                  <div className="border-t border-zinc-700 pt-3">
                    <BaseplateConfigPanel />
                  </div>
                  <div className="border-t border-zinc-700 pt-3">
                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Engine Status
                    </h3>
                    <Suspense
                      fallback={
                        <p className="text-zinc-400">Loading WASM...</p>
                      }
                    >
                      <ManifoldDemo />
                    </Suspense>
                  </div>
                </aside>
              </main>
            </div>
          </PreviewProvider>
        </BaseplateConfigProvider>
      </BinConfigProvider>
    </GridConfigProvider>
  );
}
