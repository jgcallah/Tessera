import Module from "manifold-3d";

let manifoldInstance: Awaited<ReturnType<typeof Module>> | null = null;
let resolvedWasmUrl: string | undefined;

// Resolve the WASM URL at import time (browser only — Vite handles ?url imports)
if (typeof window !== "undefined") {
  try {
    // Static import so Vite can resolve the asset URL at build time
    const mod = await import("manifold-3d/manifold.wasm?url");
    resolvedWasmUrl = mod.default;
  } catch {
    // Falls back to Emscripten's native resolution
  }
}

export async function getManifold(): Promise<
  Awaited<ReturnType<typeof Module>>
> {
  if (manifoldInstance) return manifoldInstance;

  const opts: Parameters<typeof Module>[0] = resolvedWasmUrl
    ? { locateFile: () => resolvedWasmUrl }
    : undefined;

  manifoldInstance = await Module(opts);
  manifoldInstance.setup();
  return manifoldInstance;
}
