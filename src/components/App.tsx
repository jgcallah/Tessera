import { Suspense } from "react";
import { PreviewCanvas } from "./PreviewCanvas";
import { ManifoldDemo } from "./ManifoldDemo";
import { GridConfigProvider } from "./GridConfigContext";
import { GridConfigPanel } from "./GridConfigPanel";
import { BinConfigProvider } from "./BinConfigContext";
import { BinConfigPanel } from "./BinConfigPanel";

export function App(): React.JSX.Element {
  return (
    <GridConfigProvider>
      <BinConfigProvider>
        <div className="flex min-h-screen flex-col bg-zinc-900 text-zinc-100">
          <header className="border-b border-zinc-700 px-6 py-4">
            <h1 className="text-2xl font-bold tracking-tight">Tessera</h1>
            <p className="text-sm text-zinc-400">
              Gridfinity layout planner &amp; 3D part generator
            </p>
          </header>
          <main className="flex flex-1 gap-4 p-6">
            <section className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <h2 className="mb-2 text-lg font-semibold">3D Preview</h2>
              <div className="h-96 w-full">
                <PreviewCanvas />
              </div>
            </section>
            <aside className="w-80 space-y-4 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <GridConfigPanel />
              <div className="border-t border-zinc-700 pt-3">
                <BinConfigPanel />
              </div>
              <div className="border-t border-zinc-700 pt-3">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Engine Status
                </h3>
                <Suspense
                  fallback={<p className="text-zinc-400">Loading WASM...</p>}
                >
                  <ManifoldDemo />
                </Suspense>
              </div>
            </aside>
          </main>
        </div>
      </BinConfigProvider>
    </GridConfigProvider>
  );
}
