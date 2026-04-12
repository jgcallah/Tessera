import { useEffect, useState } from "react";
import { getManifold } from "../lib/manifold";

export function ManifoldDemo(): React.JSX.Element {
  const [status, setStatus] = useState<string>("Initializing...");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const wasm = await getManifold();
        if (cancelled) return;
        const cube = wasm.Manifold.cube([42, 42, 42]);
        const mesh = cube.getMesh();
        const triCount = mesh.triVerts.length / 3;
        setStatus(`WASM loaded. Test cube: ${triCount} triangles`);
        cube.delete();
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus(
          `Error: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded border border-zinc-600 bg-zinc-900 px-3 py-2 font-mono text-sm">
      {status}
    </div>
  );
}
