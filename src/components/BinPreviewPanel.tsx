import { Suspense, useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewcube, Html } from "@react-three/drei";
import type { BufferGeometry } from "three";
import type { BinConfig } from "../lib/bin-config";
import type { GridConfig } from "../lib/grid-config";
import { getBinDimensions } from "../lib/bin-config";
import { generateBinMesh } from "../lib/bin-generator";
import { manifoldMeshToGeometry } from "../lib/geometry";
import { getManifold } from "../lib/manifold";

// ── Inner mesh component (runs inside R3F Canvas) ───────────────────────────

function BinMesh({
  binConfig,
  gridConfig,
}: {
  binConfig: BinConfig;
  gridConfig: GridConfig;
}): React.JSX.Element {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevGeometryRef = useRef<BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    void (async () => {
      try {
        const manifold = await generateBinMesh(binConfig, gridConfig);
        if (cancelled) {
          manifold.delete();
          return;
        }

        const mesh = manifold.getMesh();
        const geo = manifoldMeshToGeometry(mesh);
        manifold.delete();

        if (cancelled) {
          geo.dispose();
          return;
        }

        if (prevGeometryRef.current) {
          prevGeometryRef.current.dispose();
        }
        prevGeometryRef.current = geo;
        setGeometry(geo);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Bin preview generation failed:", err);
          setError(err instanceof Error ? err.message : "Mesh generation failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [binConfig, gridConfig]);

  useEffect(() => {
    return () => {
      if (prevGeometryRef.current) {
        prevGeometryRef.current.dispose();
        prevGeometryRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <Html center>
        <div className="rounded bg-red-950 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      </Html>
    );
  }

  if (!geometry) {
    return (
      <Html center>
        <span className="text-xs text-zinc-400">Generating mesh...</span>
      </Html>
    );
  }

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#60a5fa" />
    </mesh>
  );
}

// ── Camera setup (runs inside R3F Canvas) ───────────────────────────────────

function CameraSetup({
  binConfig,
  gridConfig,
  resetKey,
}: {
  binConfig: BinConfig;
  gridConfig: GridConfig;
  resetKey: number;
}): React.JSX.Element {
  const { camera } = useThree();
  const dims = useMemo(
    () => getBinDimensions(binConfig, gridConfig),
    [binConfig, gridConfig]
  );
  const initializedRef = useRef(false);

  const positionCamera = useCallback(() => {
    const maxDim = Math.max(
      dims.exteriorWidth,
      dims.exteriorLength,
      dims.totalHeight
    );
    const distance = maxDim * 1.8;
    camera.position.set(distance, distance, distance);
    camera.lookAt(0, 0, 0);
  }, [dims, camera]);

  // Set camera on first mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    positionCamera();
  }, [positionCamera]);

  // Reset on zoom extents
  useEffect(() => {
    if (resetKey > 0) {
      positionCamera();
    }
  }, [resetKey, positionCamera]);

  return (
    <>
      <OrbitControls makeDefault />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewcube
          color="#27272a"
          textColor="#a1a1aa"
          hoverColor="#3f3f46"
          strokeColor="#52525b"
        />
      </GizmoHelper>
    </>
  );
}

// ── Public component ────────────────────────────────────────────────────────

interface BinPreviewPanelProps {
  binConfig: BinConfig;
  gridConfig: GridConfig;
}

export function BinPreviewPanel({
  binConfig,
  gridConfig,
}: BinPreviewPanelProps): React.JSX.Element {
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await getManifold();
        if (!cancelled) setWasmReady(true);
      } catch (err: unknown) {
        if (!cancelled) {
          setWasmError(
            err instanceof Error ? err.message : "WASM load failed"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (wasmError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="px-4 text-center text-xs text-red-400">{wasmError}</p>
      </div>
    );
  }

  if (!wasmReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-xs text-zinc-400">Loading 3D engine...</span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <button
        type="button"
        onClick={() => {
          setResetKey((k) => k + 1);
        }}
        className="absolute left-2 top-2 z-10 rounded bg-zinc-800/80 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
      >
        Fit
      </button>
      <Canvas camera={{ position: [60, 60, 60], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[100, 100, 100]} intensity={0.8} />
        <directionalLight position={[-50, 30, -50]} intensity={0.3} />
        <Suspense fallback={null}>
          <BinMesh binConfig={binConfig} gridConfig={gridConfig} />
        </Suspense>
        <CameraSetup
          binConfig={binConfig}
          gridConfig={gridConfig}
          resetKey={resetKey}
        />
        <gridHelper args={[200, 10, "#444444", "#222222"]} />
      </Canvas>
    </div>
  );
}
