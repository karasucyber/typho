"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type ParticleBuffers = {
  positions: Float32Array;
  webPositions: Float32Array;
  accents: Float32Array;
  webAccents: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
  luminances: Float32Array;
};

const vertexShader = `
  attribute vec3 aWebPosition;
  attribute vec3 aWebAccent;
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
  uniform vec2 uPointer;

  void main() {
    vec3 base = mix(position, aWebPosition, uMorph);
    vec2 offset = base.xy - uPointer;
    float distanceToPointer = length(offset);
    float influence = (1.0 - smoothstep(0.05, 0.55, distanceToPointer)) * uHover;
    vec2 direction = offset / max(distanceToPointer, 0.001);
    float flutter = sin(uTime * 8.0 + aPhase) * 0.025;
    vec3 transformed = base;
    float tipFactor = smoothstep(0.8, 2.2, length(base.xy));
    float driftAmount = mix(0.028, 0.017, tipFactor);
    float driftPhase = aPhase + base.x * 2.1 - base.y * 1.4;
    transformed.xy += vec2(
      sin(uTime * 2.9 + driftPhase) + 0.3 * sin(uTime * 5.7 + aPhase * 2.1),
      cos(uTime * 2.4 + driftPhase * 1.27) + 0.3 * cos(uTime * 5.1 + aPhase * 1.8)
    ) * driftAmount;
    transformed.xy += direction * influence * (0.13 + flutter);
    transformed.xy += vec2(cos(aPhase + uTime * 4.0), sin(aPhase + uTime * 4.0)) * influence * 0.025;
    transformed.z += influence * 0.14;

    vec4 viewPosition = viewMatrix * modelMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = aSize * uPointSize * uPixelRatio * (8.0 / max(1.0, -viewPosition.z)) * (1.0 + influence * 0.4);
    vAccent = mix(aAccent, aWebAccent, uMorph);
    vLuminance = aLuminance;
    vInfluence = influence;
    vTwinkle = 0.88 + 0.12 * sin(uTime * 4.0 + aPhase * 2.3);
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
  const accents: number[] = [];
  const webAccents: number[] = [];
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

  return {
    positions: new Float32Array(positions),
    webPositions: new Float32Array(webPositions),
    accents: new Float32Array(accents),
    webAccents: new Float32Array(webAccents),
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
  const scrollTargets = useRef({ morph: 0, opacity: 1, webX: 0, webY: 0 });
  const morphProgress = useRef(0);
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
      if (!hero || !intro || !webSpace) return;
      const heroHeight = hero.getBoundingClientRect().height;
      const morph = THREE.MathUtils.clamp(
        (window.scrollY - heroHeight * 0.28) / (heroHeight * 0.72),
        0,
        1,
      );
      const introBottom = intro.getBoundingClientRect().bottom;
      const opacity = THREE.MathUtils.clamp(
        (introBottom - window.innerHeight * 0.2) / (window.innerHeight * 0.55),
        0,
        1,
      );
      const webBounds = webSpace.getBoundingClientRect();
      const webCenterX = webBounds.left + webBounds.width / 2;
      const webCenterY = webBounds.top + webBounds.height / 2;
      scrollTargets.current = {
        morph,
        opacity,
        webX: (webCenterX / size.width - 0.5) * viewport.width,
        webY: (0.5 - webCenterY / size.height) * viewport.height,
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
    materialUniforms.uOpacity.value = THREE.MathUtils.damp(
      materialUniforms.uOpacity.value,
      scrollTargets.current.opacity * materialRef.current.opacity,
      8,
      delta,
    );
    materialUniforms.uPointSize.value = THREE.MathUtils.lerp(pointSize, webPointSize, morph);
    materialUniforms.uHover.value = THREE.MathUtils.damp(
      materialUniforms.uHover.value,
      pointerActive.current ? 1 : 0,
      10,
      delta,
    );

    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.damp(
        groupRef.current.position.x,
        THREE.MathUtils.lerp(startX, scrollTargets.current.webX, morph),
        10,
        delta,
      );
      groupRef.current.position.y = THREE.MathUtils.damp(
        groupRef.current.position.y,
        THREE.MathUtils.lerp(startY, scrollTargets.current.webY, morph),
        10,
        delta,
      );
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(startScale, webScale, morph));
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
          <bufferAttribute attach="attributes-aAccent" args={[particles.accents, 3]} />
          <bufferAttribute attach="attributes-aWebAccent" args={[particles.webAccents, 3]} />
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
