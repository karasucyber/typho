"use client";

import { Canvas } from "@react-three/fiber";
import { ParticleSpider } from "./particle-spider";

export function ParticleStage() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 8], fov: 40, near: 0.1, far: 30 }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
    >
      <ParticleSpider />
    </Canvas>
  );
}
