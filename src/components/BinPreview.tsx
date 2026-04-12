import { useEffect, useState, useRef } from "react";
import type { BufferGeometry } from "three";
import { useBinConfig } from "./BinConfigContext";
import { useGridConfig } from "./GridConfigContext";
import { generateBinMesh } from "../lib/bin-generator";
import { manifoldMeshToGeometry } from "../lib/geometry";

export function BinPreview(): React.JSX.Element | null {
  const { binConfig } = useBinConfig();
  const { config: gridConfig } = useGridConfig();
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const prevGeometryRef = useRef<BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;

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

        // Dispose previous geometry
        if (prevGeometryRef.current) {
          prevGeometryRef.current.dispose();
        }
        prevGeometryRef.current = geo;
        setGeometry(geo);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Bin generation failed:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [binConfig, gridConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevGeometryRef.current) {
        prevGeometryRef.current.dispose();
        prevGeometryRef.current = null;
      }
    };
  }, []);

  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#6d28d9" />
    </mesh>
  );
}
