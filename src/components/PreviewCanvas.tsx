import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BinPreview } from "./BinPreview";

export function PreviewCanvas(): React.JSX.Element {
  return (
    <Canvas camera={{ position: [60, 60, 60], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[100, 100, 100]} intensity={0.8} />
      <Suspense fallback={null}>
        <BinPreview />
      </Suspense>
      <OrbitControls />
      <gridHelper args={[200, 10, "#444444", "#222222"]} />
    </Canvas>
  );
}
