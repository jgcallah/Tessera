import { Suspense, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BinPreview } from "./BinPreview";
import { BaseplatePreview } from "./BaseplatePreview";
import { usePreview } from "./PreviewContext";
import { useBinConfig } from "./BinConfigContext";
import { useBaseplateConfig } from "./BaseplateConfigContext";

function CameraSetup() {
  const { mode } = usePreview();
  const { binDimensions } = useBinConfig();
  const { baseplateDimensions } = useBaseplateConfig();
  const { camera } = useThree();

  // Compute camera distance based on visible geometry
  const getDistance = useCallback(() => {
    let maxDim: number;
    if (mode === "bin") {
      maxDim = Math.max(
        binDimensions.exteriorWidth,
        binDimensions.exteriorLength,
        binDimensions.totalHeight
      );
    } else if (mode === "baseplate") {
      maxDim = Math.max(
        baseplateDimensions.width,
        baseplateDimensions.length,
        baseplateDimensions.totalHeight
      );
    } else {
      maxDim = Math.max(
        binDimensions.exteriorWidth,
        binDimensions.exteriorLength,
        binDimensions.totalHeight,
        baseplateDimensions.width,
        baseplateDimensions.length
      );
    }
    return maxDim * 1.8;
  }, [mode, binDimensions, baseplateDimensions]);

  const distance = getDistance();
  camera.position.set(distance, distance, distance);
  camera.lookAt(0, 0, 0);

  return <OrbitControls makeDefault />;
}

function SceneContent() {
  const { mode } = usePreview();

  return (
    <>
      {(mode === "assembled" || mode === "baseplate") && <BaseplatePreview />}
      {(mode === "assembled" || mode === "bin") && <BinPreview />}
    </>
  );
}

export function PreviewCanvas(): React.JSX.Element {
  return (
    <Canvas camera={{ position: [60, 60, 60], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 100, 100]} intensity={0.8} />
      <directionalLight position={[-50, 30, -50]} intensity={0.3} />
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
      <CameraSetup />
      <gridHelper args={[200, 10, "#444444", "#222222"]} />
    </Canvas>
  );
}
