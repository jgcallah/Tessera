import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export function PreviewCanvas(): React.JSX.Element {
  return (
    <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6d28d9" />
      </mesh>
      <OrbitControls />
      <gridHelper args={[10, 10, "#444444", "#222222"]} />
    </Canvas>
  );
}
