"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type ParticleBuffers = {
  positions: Float32Array;
  webPositions: Float32Array;
  neuralPositions: Float32Array;
  accents: Float32Array;
  webAccents: Float32Array;
  neuralAccents: Float32Array;
  neuralSignals: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
  luminances: Float32Array;
};

const vertexShader = `
  attribute vec3 aWebPosition;
  attribute vec3 aWebAccent;
  attribute vec3 aNeuralPosition;
  attribute vec3 aNeuralAccent;
  attribute float aNeuralSignal;
  attribute float aSize;
  attribute float aPhase;
  attribute float aLuminance;
  attribute vec3 aAccent;
  varying vec3 vAccent;
  varying float vLuminance;
  varying float vInfluence;
  varying float vTwinkle;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uPointSize;
  uniform float uHover;
  uniform float uMorph;
  uniform float uNeural;
  uniform vec2 uPointer;

  float assembly(float progress) {
    return smoothstep(0.56, 0.98, progress);
  }

  vec3 windMorph(vec3 source, vec3 destination, float progress, float direction) {
    float release = smoothstep(0.02, 0.38, progress);
    float gather = assembly(progress);
    float grainRadius = fract(sin(aPhase * 91.17 + 3.4) * 43758.5453);
    float grainAngle = fract(sin(aPhase * 47.31 + 8.9) * 22578.1459);
    float grainFeather = fract(sin(aPhase * 73.83 + 1.6) * 12879.2741);
    float radius = sqrt(grainRadius) * (0.65 + 0.75 * grainFeather);
    float angle = grainAngle * 6.2831853;
    vec3 cloud = vec3(
      cos(angle) * radius * 2.6,
      sin(angle) * radius * 0.9,
      (grainFeather - 0.5) * 0.3
    );
    cloud.y += 0.09 * sin(angle * 3.0 + uTime * 1.4);
    cloud.xy += vec2(
      direction * sin(uTime * 2.7 + aPhase * 2.1),
      cos(uTime * 2.3 + aPhase * 1.7)
    ) * 0.12;
    return mix(mix(source, cloud, release), destination, gather);
  }

  void main() {
    float webForm = assembly(uMorph);
    float neuralForm = assembly(uNeural);
    float webDust = smoothstep(0.02, 0.38, uMorph) * (1.0 - webForm);
    float neuralDust = smoothstep(0.02, 0.38, uNeural) * (1.0 - neuralForm);
    float dust = max(webDust, neuralDust);
    vec3 base = windMorph(windMorph(position, aWebPosition, uMorph, 1.0), aNeuralPosition, uNeural, -1.0);
    vec2 offset = base.xy - uPointer;
    float distanceToPointer = length(offset);
    float influence = (1.0 - smoothstep(0.05, 0.55, distanceToPointer)) * uHover;
    vec2 direction = offset / max(distanceToPointer, 0.001);
    float flutter = sin(uTime * 8.0 + aPhase) * 0.025;
    vec3 transformed = base;
    float tipFactor = smoothstep(0.8, 2.2, length(base.xy));
    float driftAmount = mix(0.028, 0.017, tipFactor);
    float driftPhase = aPhase + base.x * 2.1 - base.y * 1.4;
    driftAmount *= mix(1.0, 0.35, neuralForm);
    transformed.xy += vec2(
      sin(uTime * 2.9 + driftPhase) + 0.3 * sin(uTime * 5.7 + aPhase * 2.1),
      cos(uTime * 2.4 + driftPhase * 1.27) + 0.3 * cos(uTime * 5.1 + aPhase * 1.8)
    ) * driftAmount;
    transformed.xy += direction * influence * (0.13 + flutter);
    transformed.xy += vec2(cos(aPhase + uTime * 4.0), sin(aPhase + uTime * 4.0)) * influence * 0.025;
    transformed.z += influence * 0.14;

    vec4 viewPosition = viewMatrix * modelMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aSize * uPointSize * uPixelRatio * (8.0 / max(1.0, -viewPosition.z)) * (1.0 + influence * 0.4) * (1.0 - dust * 0.24);
    vAccent = mix(mix(aAccent, aWebAccent, webForm), aNeuralAccent, neuralForm);
    vLuminance = aLuminance;
    vInfluence = influence;
    float edge = step(0.0, aNeuralSignal);
    float signalPosition = fract(uTime * 0.22 - floor(aNeuralSignal) * 0.16);
    float signal = 1.0 - smoothstep(0.0, 0.12, abs(fract(aNeuralSignal) - signalPosition));
    float neuralTwinkle = 0.84 + 0.1 * sin(uTime * 2.2 + aPhase * 1.4) + signal * edge * 0.45;
    vTwinkle = mix(0.88 + 0.12 * sin(uTime * 4.0 + aPhase * 2.3), neuralTwinkle, neuralForm) * (1.0 - dust * 0.28);
  }
`;

const fragmentShader = `
  varying vec3 vAccent;
  varying float vLuminance;
  varying float vInfluence;
  varying float vTwinkle;
  uniform float uOpacity;

  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.28, 0.5, distanceToCenter);
    if (alpha < 0.01) discard;
    vec3 color = vAccent * mix(0.92, 1.0, vLuminance);
    color *= 1.0 + vInfluence * 0.12;
    gl_FragColor = vec4(color, alpha * vTwinkle * uOpacity);
  }
`;

function createSpiderParticles(imageData: ImageData): ParticleBuffers {
  const { data, width, height } = imageData;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (data[index] < 128) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  const positions: number[] = [];
  const webPositions: number[] = [];
  const neuralPositions: number[] = [];
  const accents: number[] = [];
  const webAccents: number[] = [];
  const neuralAccents: number[] = [];
  const neuralSignals: number[] = [];
  const sizes: number[] = [];
  const phases: number[] = [];
  const luminances: number[] = [];
  const sapphire = new THREE.Color("#3B82F6");
  const violet = new THREE.Color("#8B5CF6");
  const pink = new THREE.Color("#EC4899");
  const accent = new THREE.Color();
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  let seed = 20260922;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const index = (y * width + x) * 4;
      if (data[index] < 128) continue;

      const luminance = data[index] / 255;
      const band = (x - minX) / Math.max(1, maxX - minX);
      if (band < 0.5) {
        accent.lerpColors(sapphire, violet, band * 2);
      } else {
        accent.lerpColors(violet, pink, (band - 0.5) * 2);
      }

      positions.push(
        (x - centerX + (random() - 0.5) * 0.5) / 100,
        (centerY - y + (random() - 0.5) * 0.5) / 100,
        0,
      );
      accents.push(accent.r, accent.g, accent.b);
      sizes.push(THREE.MathUtils.lerp(0.78, 1.08, luminance));
      phases.push(random() * Math.PI * 2);
      luminances.push(luminance);
    }
  }

  const webRings = 15;
  const webSpokes = 24;
  const webRadius = 2.05;
  const tau = Math.PI * 2;

  for (let index = 0; index < positions.length / 3; index += 1) {
    let x: number;
    let y: number;

    if (random() < 0.74) {
      const turn = Math.floor(random() * webRings);
      const angle = random() * tau;
      const spiral = (turn + angle / tau) / webRings;
      const radius = (0.14 + spiral * (webRadius - 0.14))
        * (1 + 0.035 * Math.sin(angle * 5) + 0.02 * Math.cos(angle * 9))
        + (random() - 0.5) * 0.018;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
    } else {
      const angle = Math.floor(random() * webSpokes) * tau / webSpokes;
      const radius = 0.08 + random() * (webRadius - 0.08);
      const offset = (random() - 0.5) * 0.02;
      x = Math.cos(angle) * radius - Math.sin(angle) * offset;
      y = Math.sin(angle) * radius + Math.cos(angle) * offset;
    }

    webPositions.push(x, y, (random() - 0.5) * 0.025);
    const band = THREE.MathUtils.clamp((x + webRadius) / (webRadius * 2), 0, 1);
    if (band < 0.5) {
      accent.lerpColors(sapphire, violet, band * 2);
    } else {
      accent.lerpColors(violet, pink, (band - 0.5) * 2);
    }
    webAccents.push(accent.r, accent.g, accent.b);
  }

  const neuralLayers = [
    { x: -1.7, ys: [-1.15, -0.38, 0.38, 1.15] },
    { x: -0.57, ys: [-1.38, -0.83, -0.28, 0.28, 0.83, 1.38] },
    { x: 0.57, ys: [-1.12, -0.56, 0, 0.56, 1.12] },
    { x: 1.7, ys: [-0.78, 0, 0.78] },
  ];
  const neuralPalette = [sapphire, violet, violet, pink];
  const neuralNodes = neuralLayers.flatMap((layer, layerIndex) => (
    layer.ys.map((y) => ({ x: layer.x, y, layer: layerIndex }))
  ));
  const neuralEdges = neuralLayers.slice(0, -1).flatMap((_, layerIndex) => {
    const fromNodes = neuralNodes.filter((node) => node.layer === layerIndex);
    const toNodes = neuralNodes.filter((node) => node.layer === layerIndex + 1);
    return fromNodes.flatMap((from) => (
      [...toNodes]
        .sort((a, b) => Math.abs(a.y - from.y) - Math.abs(b.y - from.y))
        .slice(0, 3)
        .map((to) => ({ from, to, layer: layerIndex }))
    ));
  });

  for (let index = 0; index < positions.length / 3; index += 1) {
    let x: number;
    let y: number;

    if (random() < 0.27) {
      const node = neuralNodes[Math.floor(random() * neuralNodes.length)];
      const angle = random() * tau;
      const radius = random() < 0.72
        ? Math.sqrt(random()) * 0.055
        : 0.065 + random() * 0.035;
      x = node.x + Math.cos(angle) * radius;
      y = node.y + Math.sin(angle) * radius;
      accent.copy(neuralPalette[node.layer]).multiplyScalar(0.78 + random() * 0.16);
      neuralSignals.push(-1);
    } else {
      const edge = neuralEdges[Math.floor(random() * neuralEdges.length)];
      const t = random();
      const dx = edge.to.x - edge.from.x;
      const dy = edge.to.y - edge.from.y;
      const length = Math.hypot(dx, dy);
      const offset = (random() - 0.5) * 0.014;
      x = THREE.MathUtils.lerp(edge.from.x, edge.to.x, t) - dy / length * offset;
      y = THREE.MathUtils.lerp(edge.from.y, edge.to.y, t) + dx / length * offset;
      accent.lerpColors(neuralPalette[edge.layer], neuralPalette[edge.layer + 1], t)
        .multiplyScalar(0.62 + random() * 0.16);
      neuralSignals.push(edge.layer + t);
    }

    neuralPositions.push(x, y, (random() - 0.5) * 0.02);
    neuralAccents.push(accent.r, accent.g, accent.b);
  }

  return {
    positions: new Float32Array(positions),
    webPositions: new Float32Array(webPositions),
    neuralPositions: new Float32Array(neuralPositions),
    accents: new Float32Array(accents),
    webAccents: new Float32Array(webAccents),
    neuralAccents: new Float32Array(neuralAccents),
    neuralSignals: new Float32Array(neuralSignals),
    sizes: new Float32Array(sizes),
    phases: new Float32Array(phases),
    luminances: new Float32Array(luminances),
  };
}

export function ParticleSpider() {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const pointerNdc = useRef(new THREE.Vector2());
  const pointerActive = useRef(false);
  const scrollTargets = useRef({
    morph: 0,
    neural: 0,
    opacity: 1,
    passageY: 0,
    webX: 0,
    webY: 0,
    neuralX: 0,
    neuralY: 0,
    neuralScale: 1,
  });
  const morphProgress = useRef(0);
  const neuralProgress = useRef(0);
  const pointerWorld = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const pointerPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const [particles, setParticles] = useState<ParticleBuffers | null>(null);
  const { gl, size, viewport } = useThree();
  const mobile = size.width <= 760;
  const startScale = mobile
    ? Math.min(viewport.width * 0.78 / 3.83, viewport.height * 0.45 / 3.04)
    : Math.min(viewport.width * 0.34 / 3.83, viewport.height * 0.47 / 3.04);
  const webScale = mobile
    ? Math.min(viewport.width * 0.78 / 4.1, viewport.height * 0.38 / 4.1)
    : Math.min(viewport.width * 0.4 / 4.1, viewport.height * 0.7 / 4.1);
  const startX = mobile ? 0 : -viewport.width * 0.24;
  const startY = viewport.height * (mobile ? 0.13 : 0.06);
  const pointSize = Math.max(1, (size.height / viewport.height) * startScale * 0.88 / 100);
  const webPointSize = Math.max(1.3, (size.height / viewport.height) * webScale * 0.88 / 100);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
    uPointSize: { value: pointSize },
    uHover: { value: 0 },
    uMorph: { value: 0 },
    uNeural: { value: 0 },
    uOpacity: { value: 0.6 },
    uPointer: { value: new THREE.Vector2(100, 100) },
  }), [gl, pointSize]);

  useEffect(() => {
    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0);
      setParticles(createSpiderParticles(context.getImageData(0, 0, canvas.width, canvas.height)));
    };
    image.src = "/spider-reference.png";
    return () => {
      cancelled = true;
      image.onload = null;
    };
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    const movePointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) {
        pointerActive.current = false;
        return;
      }
      pointerNdc.current.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        1 - ((event.clientY - bounds.top) / bounds.height) * 2,
      );
      pointerActive.current = true;
    };
    const leavePointer = () => { pointerActive.current = false; };
    const releaseTouch = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") pointerActive.current = false;
    };
    window.addEventListener("pointermove", movePointer);
    window.addEventListener("blur", leavePointer);
    window.addEventListener("pointercancel", leavePointer);
    window.addEventListener("pointerup", releaseTouch);
    return () => {
      window.removeEventListener("pointermove", movePointer);
      window.removeEventListener("blur", leavePointer);
      window.removeEventListener("pointercancel", leavePointer);
      window.removeEventListener("pointerup", releaseTouch);
    };
  }, [gl]);

  useEffect(() => {
    const updateScroll = () => {
      const hero = document.getElementById("inicio");
      const intro = document.getElementById("possibilidades");
      const webSpace = document.querySelector(".web-space");
      const neuralSpace = document.querySelector(".neural-space");
      const heroLink = hero?.querySelector(".scroll-link");
      const introLabel = intro?.querySelector(".section-label");
      if (!hero || !intro || !heroLink || !introLabel || !webSpace || !neuralSpace) return;
      const heroHeight = hero.getBoundingClientRect().height;
      const morph = THREE.MathUtils.clamp(
        (window.scrollY - heroHeight * 0.28) / (heroHeight * 0.72),
        0,
        1,
      );
      const introBottom = intro.getBoundingClientRect().bottom;
      const webOpacity = THREE.MathUtils.clamp(
        (introBottom - window.innerHeight * 0.05) / (window.innerHeight * 0.3),
        0,
        1,
      );
      const webBounds = webSpace.getBoundingClientRect();
      const webCenterX = webBounds.left + webBounds.width / 2;
      const webCenterY = webBounds.top + webBounds.height / 2;
      const passageCenterY = (heroLink.getBoundingClientRect().bottom
        + introLabel.getBoundingClientRect().top) / 2 + 4;
      const neuralBounds = neuralSpace.getBoundingClientRect();
      const neural = THREE.MathUtils.clamp(
        (window.innerHeight * 0.95 - neuralBounds.top) / (window.innerHeight * 0.55),
        0,
        1,
      );
      const neuralOpacity = THREE.MathUtils.clamp(
        (window.innerHeight * 0.92 - neuralBounds.top) / (window.innerHeight * 0.32),
        0,
        1,
      ) * THREE.MathUtils.clamp(
        (neuralBounds.bottom - window.innerHeight * 0.12) / (window.innerHeight * 0.4),
        0,
        1,
      );
      const neuralCenterX = neuralBounds.left + neuralBounds.width / 2;
      const neuralCenterY = neuralBounds.top + neuralBounds.height / 2;
      scrollTargets.current = {
        morph,
        neural,
        opacity: Math.max(webOpacity, neuralOpacity),
        passageY: (0.5 - passageCenterY / size.height) * viewport.height,
        webX: (webCenterX / size.width - 0.5) * viewport.width,
        webY: (0.5 - webCenterY / size.height) * viewport.height,
        neuralX: (neuralCenterX / size.width - 0.5) * viewport.width,
        neuralY: (0.5 - neuralCenterY / size.height) * viewport.height,
        neuralScale: Math.min(
          (neuralBounds.width / size.width * viewport.width) * 0.9 / 3.65,
          (neuralBounds.height / size.height * viewport.height) * 0.82 / 2.96,
        ),
      };
      pointerActive.current = false;
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [size.width, size.height, viewport.width, viewport.height]);

  useFrame(({ camera, clock }, delta) => {
    if (!materialRef.current) return;
    const materialUniforms = materialRef.current.uniforms;
    materialUniforms.uTime.value = clock.elapsedTime;
    morphProgress.current = THREE.MathUtils.damp(
      morphProgress.current,
      scrollTargets.current.morph,
      7,
      delta,
    );
    const morph = THREE.MathUtils.smoothstep(morphProgress.current, 0, 1);
    materialUniforms.uMorph.value = morph;
    neuralProgress.current = THREE.MathUtils.damp(
      neuralProgress.current,
      scrollTargets.current.neural,
      7,
      delta,
    );
    const neural = THREE.MathUtils.smoothstep(neuralProgress.current, 0, 1);
    materialUniforms.uNeural.value = neural;
    materialUniforms.uOpacity.value = THREE.MathUtils.damp(
      materialUniforms.uOpacity.value,
      scrollTargets.current.opacity * materialRef.current.opacity,
      8,
      delta,
    );
    const neuralPointSize = Math.max(
      1.1,
      (size.height / viewport.height) * scrollTargets.current.neuralScale * 0.88 / 100,
    );
    materialUniforms.uPointSize.value = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(pointSize, webPointSize, morph),
      neuralPointSize,
      neural,
    );
    materialUniforms.uHover.value = THREE.MathUtils.damp(
      materialUniforms.uHover.value,
      pointerActive.current ? 1 : 0,
      10,
      delta,
    );

    if (groupRef.current) {
      const firstTransitArc = Math.sin(morph * Math.PI);
      const webX = THREE.MathUtils.lerp(startX, scrollTargets.current.webX, morph)
        + viewport.width * (mobile ? 0 : 0.09) * firstTransitArc;
      const directWebY = THREE.MathUtils.lerp(startY, scrollTargets.current.webY, morph);
      const webY = THREE.MathUtils.lerp(directWebY, scrollTargets.current.passageY, firstTransitArc);
      const transitArc = Math.sin(neural * Math.PI);
      groupRef.current.position.x = THREE.MathUtils.damp(
        groupRef.current.position.x,
        THREE.MathUtils.lerp(webX, scrollTargets.current.neuralX, neural),
        10,
        delta,
      );
      groupRef.current.position.y = THREE.MathUtils.damp(
        groupRef.current.position.y,
        THREE.MathUtils.lerp(webY, scrollTargets.current.neuralY, neural)
          + viewport.height * (mobile ? 0.18 : 0.13) * transitArc,
        10,
        delta,
      );
      const webStageScale = THREE.MathUtils.lerp(startScale, webScale, morph);
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(
        webStageScale,
        scrollTargets.current.neuralScale,
        neural,
      ) * (1 - 0.48 * firstTransitArc) * (1 - 0.3 * transitArc));
    }

    if (pointerActive.current && groupRef.current) {
      raycaster.current.setFromCamera(pointerNdc.current, camera);
      if (raycaster.current.ray.intersectPlane(pointerPlane, pointerWorld.current)) {
        groupRef.current.worldToLocal(pointerWorld.current);
        materialUniforms.uPointer.value.set(pointerWorld.current.x, pointerWorld.current.y);
      }
    }
  });

  if (!particles) return null;

  return (
    <group ref={groupRef} position={[startX, startY, 0]} scale={startScale}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
          <bufferAttribute attach="attributes-aWebPosition" args={[particles.webPositions, 3]} />
          <bufferAttribute attach="attributes-aNeuralPosition" args={[particles.neuralPositions, 3]} />
          <bufferAttribute attach="attributes-aAccent" args={[particles.accents, 3]} />
          <bufferAttribute attach="attributes-aWebAccent" args={[particles.webAccents, 3]} />
          <bufferAttribute attach="attributes-aNeuralAccent" args={[particles.neuralAccents, 3]} />
          <bufferAttribute attach="attributes-aNeuralSignal" args={[particles.neuralSignals, 1]} />
          <bufferAttribute attach="attributes-aSize" args={[particles.sizes, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[particles.phases, 1]} />
          <bufferAttribute attach="attributes-aLuminance" args={[particles.luminances, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          toneMapped={false}
          transparent={true}
          opacity={0.6}
          depthWrite={false}
          depthTest={false}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  );
}
