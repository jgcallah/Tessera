import { useEffect, useState, useRef } from "react";
import type { BufferGeometry } from "three";
import { useBaseplateConfig } from "./BaseplateConfigContext";
import { useGridConfig } from "./GridConfigContext";
import { generateBaseplateMesh } from "../lib/baseplate-generator";
import { manifoldMeshToGeometry } from "../lib/geometry";

export function BaseplatePreview(): React.JSX.Element | null {
  const { baseplateConfig } = useBaseplateConfig();
  const { config: gridConfig } = useGridConfig();
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const prevGeometryRef = useRef<BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const manifold = await generateBaseplateMesh(
          baseplateConfig,
          gridConfig
        );
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
          console.error("Baseplate generation failed:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseplateConfig, gridConfig]);

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
      <meshStandardMaterial color="#475569" />
    </mesh>
  );
}
