"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { ParticleSpider } from "./particle-spider";

export function ParticleStage() {
  return (
    <Canvas
      style={{ pointerEvents: "none" }}
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
      <EffectComposer multisampling={0} enableNormalPass={false} depthBuffer={false}>
        <Bloom
          mipmapBlur={true}
          intensity={1.2}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </Canvas>
  );
}
