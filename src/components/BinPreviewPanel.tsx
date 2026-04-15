import { Suspense, useEffect, useState, useRef, useMemo, useCallback } from "react";
import type { ComponentRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewcube,
  Html,
  Edges,
} from "@react-three/drei";
import type { BufferGeometry } from "three";
import type { BinConfig } from "../lib/bin-config";
import type { GridConfig } from "../lib/grid-config";
import { generateBinMesh } from "../lib/bin-generator";
import { manifoldMeshToGeometry } from "../lib/geometry";
import { getManifold } from "../lib/manifold";

export interface BinPreviewItem {
  id: string;
  binConfig: BinConfig;
  /** Grid position in cells (not mm) */
  gridX: number;
  gridY: number;
  gridUnitsX: number;
  gridUnitsY: number;
  color: string;
}

// ── Inner mesh component (runs inside R3F Canvas) ───────────────────────────

function BinMesh({
  binConfig,
  gridConfig,
  position,
  color,
  selected,
  onClick,
}: {
  binConfig: BinConfig;
  gridConfig: GridConfig;
  position: [number, number, number];
  color: string;
  selected: boolean;
  onClick: (e: { stopPropagation: () => void; ctrlKey: boolean; metaKey: boolean }) => void;
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
      <Html center position={position}>
        <div className="rounded bg-red-950 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      </Html>
    );
  }

  if (!geometry) {
    return <group position={position} />;
  }

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        onClick(e);
      }}
    >
      <meshStandardMaterial color={color} />
      <Edges
        threshold={30}
        color={selected ? "#ffffff" : "#0a0a0a"}
        lineWidth={selected ? 2 : 1}
      />
    </mesh>
  );
}

// ── Camera setup (runs inside R3F Canvas) ───────────────────────────────────

interface CameraBounds {
  center: [number, number, number];
  maxDim: number;
}

function CameraSetup({
  bounds,
  resetKey,
}: {
  bounds: CameraBounds;
  resetKey: number;
}): React.JSX.Element {
  const { camera, size, gl } = useThree();
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const initializedRef = useRef(false);

  // Wheel zoom: every active wheel event nudges a target distance; useFrame
  // continuously lerps the camera toward that target. Works for single clicks
  // (one nudge → smooth animation) AND continuous scrolls (many nudges → the
  // target keeps moving ahead and the camera keeps chasing).
  //
  // Logitech precision wheels emit a long inertia tail after each physical
  // click. The tail is monotonically non-increasing in |deltaY|, so we
  // detect it by counting consecutive non-increasing events: once we see
  // INERTIA_RUN of them, we stop accepting further events in the current
  // burst. A 300ms gap with no events resets everything.
  const zoomTargetRef = useRef<number | null>(null);

  useEffect(() => {
    const dom = gl.domElement;
    const SCALE_PER_EVENT = 0.97; // ~3% zoom per active event
    // Short enough that two distinct wheel notches feel like separate bursts,
    // long enough to swallow the dense start of an inertia tail.
    const BURST_GAP_MS = 120;
    // Lenient enough that natural variation in continuous wheel rolling
    // doesn't trip the lock — only sustained monotonic decay (true inertia).
    const INERTIA_RUN = 10;
    const MIN_DIST = 1;
    const MAX_DIST = 2000;
    let lastEventTime = 0;
    let lastMag = 0;
    let nonIncreasingRun = 0;
    let inertiaLocked = false;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const now = performance.now();
      const newBurst = now - lastEventTime > BURST_GAP_MS;
      lastEventTime = now;
      if (newBurst) {
        nonIncreasingRun = 0;
        inertiaLocked = false;
        lastMag = 0;
      }

      const mag = Math.abs(e.deltaY);
      // If we're locked but the user has scrolled again, the OS will start
      // interleaving fresh physical events that are noticeably larger than
      // the current inertia magnitudes. Treat that jump as a brand-new burst.
      if (inertiaLocked) {
        if (mag > lastMag * 1.5 + 2) {
          inertiaLocked = false;
          nonIncreasingRun = 0;
          lastMag = 0;
        } else {
          return;
        }
      }

      if (mag <= lastMag && lastMag > 0) {
        nonIncreasingRun++;
      } else {
        nonIncreasingRun = 0;
      }
      lastMag = mag;
      if (nonIncreasingRun >= INERTIA_RUN) {
        inertiaLocked = true;
        return;
      }

      const ctrl = controlsRef.current;
      if (!ctrl) return;
      const target = ctrl.target;
      const baseline =
        zoomTargetRef.current ?? camera.position.distanceTo(target);
      const factor = e.deltaY > 0 ? 1 / SCALE_PER_EVENT : SCALE_PER_EVENT;
      zoomTargetRef.current = Math.max(
        MIN_DIST,
        Math.min(MAX_DIST, baseline * factor)
      );
    };
    dom.addEventListener("wheel", onWheel, {
      capture: true,
      passive: false,
    });
    return () => {
      dom.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [camera, gl]);

  // Per-frame: lerp current camera distance toward the wheel-zoom target.
  // Lerp factor 0.2 means we close ~20% of the remaining gap each frame —
  // ~10 frames (~165ms) to settle when the target stops moving.
  useFrame(() => {
    const target = zoomTargetRef.current;
    if (target == null) return;
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const orbitTarget = ctrl.target;
    const currentDist = camera.position.distanceTo(orbitTarget);
    const diff = target - currentDist;
    if (Math.abs(diff) < 0.05) {
      zoomTargetRef.current = null;
      return;
    }
    const newDist = currentDist + diff * 0.2;
    const dir = camera.position.clone().sub(orbitTarget).normalize();
    camera.position.copy(orbitTarget).addScaledVector(dir, newDist);
  });

  const positionCamera = useCallback(() => {
    // Fit calculation: place camera so the bounding box fills the viewport.
    // Camera is on the (1,1,1) diagonal at distance d from center along that
    // direction. For perspective camera with vertical FOV θ, the minimum
    // distance to frame a bounding sphere of radius R is R / sin(θ/2).
    // Use the sphere radius as half the diagonal of the bounding box.
    const fovV = 50;
    const fovVRad = (fovV * Math.PI) / 180;
    const aspect = size.width / size.height;
    const fovHRad = 2 * Math.atan(Math.tan(fovVRad / 2) * aspect);
    const fovMin = Math.min(fovVRad, fovHRad);

    // Radius of the bounding sphere enclosing the cube of side maxDim
    const sphereRadius = (bounds.maxDim * Math.sqrt(3)) / 2;
    const viewDistance = sphereRadius / Math.sin(fovMin / 2);
    const safeDistance = Math.max(viewDistance, 30);
    const margin = 1.1;
    const distance = safeDistance * margin;

    // Place camera at diagonal direction from center
    const [cx, cy, cz] = bounds.center;
    const dirLen = Math.sqrt(3);
    camera.position.set(
      cx + distance / dirLen,
      cy + distance / dirLen,
      cz + distance / dirLen
    );

    // Update OrbitControls target so orbit rotates around the model
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(cx, cy, cz);
      controls.update();
    } else {
      camera.lookAt(cx, cy, cz);
    }
  }, [bounds, camera, size.width, size.height]);

  // Capture the latest positionCamera in a ref so the reset effect doesn't
  // re-fire every time bounds change.
  const positionCameraRef = useRef(positionCamera);
  positionCameraRef.current = positionCamera;

  // Initialize camera on first mount only
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    positionCameraRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset when Fit button is clicked (resetKey change only)
  useEffect(() => {
    if (resetKey > 0) {
      positionCameraRef.current();
    }
  }, [resetKey]);

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={1}
        maxDistance={2000}
        enableZoom={false}
        enableDamping={false}
      />
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
  items: BinPreviewItem[];
  selectedIds: Set<string>;
  gridConfig: GridConfig;
  onItemClick: (id: string, additive: boolean) => void;
  onBackgroundClick?: () => void;
}

export function BinPreviewPanel({
  items,
  selectedIds,
  gridConfig,
  onItemClick,
  onBackgroundClick,
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

  // Camera bounds — keyed on position/size only so editing bin properties
  // doesn't shift the view.
  const boundsFingerprint = useMemo(
    () =>
      items
        .map(
          (i) =>
            `${i.id}:${i.gridX},${i.gridY},${i.gridUnitsX},${i.gridUnitsY},${i.binConfig.heightUnits}`
        )
        .sort()
        .join("|") +
      `|${gridConfig.baseUnit},${gridConfig.heightUnit}`,
    [items, gridConfig]
  );

  const bounds = useMemo(() => {
    const baseUnit = gridConfig.baseUnit;
    if (items.length === 0) {
      return { center: [0, 0, 0] as [number, number, number], maxDim: 50 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxHeight = 0;
    for (const item of items) {
      const x0 = item.gridX * baseUnit;
      const y0 = item.gridY * baseUnit;
      const x1 = x0 + item.gridUnitsX * baseUnit;
      const y1 = y0 + item.gridUnitsY * baseUnit;
      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x1);
      maxY = Math.max(maxY, y1);
      maxHeight = Math.max(
        maxHeight,
        item.binConfig.heightUnits * gridConfig.heightUnit
      );
    }
    const maxDim = Math.max(maxX - minX, maxY - minY, maxHeight);
    return {
      center: [0, maxHeight / 2, 0] as [number, number, number],
      maxDim,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsFingerprint]);

  // Placements — depend on full items array so EVERY property change (dividers,
  // lip, magnets, etc.) flows through to BinMesh and triggers regeneration.
  const placements = useMemo(() => {
    const baseUnit = gridConfig.baseUnit;
    if (items.length === 0) return [];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const item of items) {
      const x0 = item.gridX * baseUnit;
      const y0 = item.gridY * baseUnit;
      minX = Math.min(minX, x0);
      minY = Math.min(minY, y0);
      maxX = Math.max(maxX, x0 + item.gridUnitsX * baseUnit);
      maxY = Math.max(maxY, y0 + item.gridUnitsY * baseUnit);
    }
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    return items.map((item) => {
      const cellCenterX =
        item.gridX * baseUnit + (item.gridUnitsX * baseUnit) / 2;
      const cellCenterY =
        item.gridY * baseUnit + (item.gridUnitsY * baseUnit) / 2;
      const position: [number, number, number] = [
        cellCenterX - centerX,
        0,
        cellCenterY - centerY,
      ];
      return { item, position };
    });
  }, [items, gridConfig]);

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
      <Canvas
        camera={{ position: [60, 60, 60], fov: 50, near: 0.01, far: 10000 }}
        onPointerMissed={() => {
          if (onBackgroundClick) onBackgroundClick();
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 100]} intensity={0.8} />
        <directionalLight position={[-50, 30, -50]} intensity={0.3} />
        <Suspense fallback={null}>
          {placements.map(({ item, position }) => (
            <BinMesh
              key={item.id}
              binConfig={item.binConfig}
              gridConfig={gridConfig}
              position={position}
              color={item.color}
              selected={selectedIds.has(item.id)}
              onClick={(e) => {
                e.stopPropagation();
                onItemClick(item.id, e.ctrlKey || e.metaKey);
              }}
            />
          ))}
        </Suspense>
        <CameraSetup bounds={bounds} resetKey={resetKey} />
        <gridHelper args={[500, 25, "#444444", "#222222"]} />
      </Canvas>
    </div>
  );
}
