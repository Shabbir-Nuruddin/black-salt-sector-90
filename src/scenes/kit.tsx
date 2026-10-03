import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PresentationControls } from "@react-three/drei";
import type { MotionValue } from "motion/react";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";

export type SceneProps = {
  progress: MotionValue<number>;
  lite: boolean;
  interactive: boolean;
  still: boolean;
  /** Which side of the viewport the hero copy sits on; the subject moves to the other side on wide screens. */
  side: "left" | "right";
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Seeded random so procedural layouts are identical on every load. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

let glowCache: THREE.Texture | null = null;
/** Soft round sprite used by steam, smoke, embers and lamp halos. */
export function glowTexture() {
  if (glowCache) return glowCache;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.45)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowCache = new THREE.CanvasTexture(c);
  return glowCache;
}

/** Canvas texture drawn once with a 2D painter function. */
export function useCanvasTexture(size: number, paint: (g: CanvasRenderingContext2D, s: number) => void, repeat?: [number, number]) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    paint(c.getContext("2d")!, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
    }
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);
}

/** Per-pixel speckle on whatever is already painted; gives clay, steel and dough a surface. */
export function speckle(g: CanvasRenderingContext2D, s: number, amount: number) {
  const img = g.getImageData(0, 0, s, s);
  const r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

/** Rising, widening, fading puffs. Each puff owns its material so opacity can vary. */
export function Steam({
  count = 14,
  origin = [0, 0, 0],
  spread = 0.5,
  rise = 2.4,
  size = 1.1,
  color = "#ffffff",
  opacity = 0.22,
  speed = 0.18,
  strength,
}: {
  count?: number;
  origin?: [number, number, number];
  spread?: number;
  rise?: number;
  size?: number;
  color?: string;
  opacity?: number;
  speed?: number;
  /** Optional live multiplier (0..1), e.g. scroll driven. */
  strength?: () => number;
}) {
  const tex = glowTexture();
  const puffs = useMemo(() => {
    const r = rng(count * 31 + Math.round(spread * 100));
    return Array.from({ length: count }, () => ({ phase: r(), x: (r() - 0.5) * spread, z: (r() - 0.5) * spread, sway: 0.5 + r(), spin: r() * 6 }));
  }, [count, spread]);
  const refs = useRef<(THREE.Sprite | null)[]>([]);
  useFrame(({ clock }) => {
    const k = strength ? strength() : 1;
    const t = clock.elapsedTime * speed;
    puffs.forEach((p, i) => {
      const s = refs.current[i];
      if (!s) return;
      const life = (t + p.phase) % 1;
      s.position.set(
        origin[0] + p.x + Math.sin(life * 4 + p.spin) * 0.18 * p.sway * life,
        origin[1] + life * rise,
        origin[2] + p.z,
      );
      const sc = size * (0.35 + life * 1.3);
      s.scale.set(sc, sc, 1);
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * opacity * k;
      (s.material as THREE.SpriteMaterial).rotation = p.spin + life;
    });
  });
  return (
    <group>
      {puffs.map((_, i) => (
        <sprite key={i} ref={(n) => void (refs.current[i] = n)}>
          <spriteMaterial map={tex} color={color} transparent depthWrite={false} opacity={0} />
        </sprite>
      ))}
    </group>
  );
}

/** Additive sparks drifting upward with flicker. */
export function Embers({
  count = 60,
  origin = [0, 0, 0],
  area = [1.4, 0.6, 1.4],
  rise = 2.5,
  color = "#ff9a3c",
  size = 0.07,
  speed = 0.25,
}: {
  count?: number;
  origin?: [number, number, number];
  area?: [number, number, number];
  rise?: number;
  color?: string;
  size?: number;
  speed?: number;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  const seeds = useMemo(() => {
    const r = rng(count + 99);
    return Array.from({ length: count }, () => [r(), (r() - 0.5) * area[0], (r() - 0.5) * area[2], r() * 6, 0.6 + r() * 0.8]);
  }, [count, area]);
  useFrame(({ clock }) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime * speed;
    seeds.forEach(([ph, x, z, w, sp], i) => {
      const life = (t * sp + ph) % 1;
      pos.setXYZ(i, origin[0] + x * (1 - life * 0.5) + Math.sin(t * 6 + w) * 0.08, origin[1] + life * rise + (Math.random() - 0.5) * area[1] * 0.02, origin[2] + z * (1 - life * 0.5));
    });
    pos.needsUpdate = true;
  });
  return (
    <points geometry={geo}>
      <pointsMaterial map={glowTexture()} color={color} size={size} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/** Scroll-aware rig: places the subject opposite the copy, adds idle drift and pointer parallax. */
function Rig({ children, side, base = 1 }: { children: ReactNode; side: "left" | "right"; base?: number }) {
  const g = useRef<THREE.Group>(null);
  const { size, pointer } = useThree();
  const narrow = size.width < 768;
  const x = narrow ? 0 : side === "left" ? 1.9 : -1.9;
  useFrame(({ clock }, dt) => {
    if (!g.current) return;
    const t = clock.elapsedTime;
    const k = 1 - Math.pow(0.002, dt);
    g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, pointer.x * 0.18 + Math.sin(t * 0.3) * 0.04, k);
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, -pointer.y * 0.08, k);
  });
  return (
    <group ref={g} position={[x, narrow ? 0.75 : 0, 0]} scale={(narrow ? 0.78 : 1) * base}>
      {children}
    </group>
  );
}

/** Shared canvas: camera, soft studio env (Lightformers, no HDR fetch), fog into the page colour, drag to turn. */
export function Stage({
  children,
  lite,
  interactive,
  still,
  side,
  fog,
  camera = [0, 1.6, 8],
  fov = 32,
  env = "#202020",
  envIntensity = 1,
  warm = "#ffe6c7",
  scale = 1,
  controls = true,
}: Omit<SceneProps, "progress"> & {
  children: ReactNode;
  fog: string;
  camera?: [number, number, number];
  fov?: number;
  env?: string;
  envIntensity?: number;
  warm?: string;
  scale?: number;
  controls?: boolean;
}) {
  const body = (
    <Rig side={side} base={scale}>
      {children}
    </Rig>
  );
  return (
    <Canvas
      frameloop={still ? "demand" : "always"}
      dpr={lite ? 1 : [1, 1.75]}
      camera={{ position: camera, fov }}
      gl={{ antialias: !lite, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      <fog attach="fog" args={[fog, 9, 22]} />
      <ambientLight intensity={0.25} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={[env]} />
        <Lightformer form="rect" intensity={4 * envIntensity} color={warm} position={[0, 6, 2]} scale={[12, 3, 1]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={2.4 * envIntensity} position={[-6, 1, 2]} scale={[3, 10, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={1.8 * envIntensity} position={[6, 0, 1]} scale={[3, 10, 1]} rotation={[0, -Math.PI / 2, 0]} />
        <Lightformer form="ring" intensity={2.5 * envIntensity} color={warm} position={[2, 2, 7]} scale={2.5} />
      </Environment>
      {controls ? (
        <PresentationControls enabled={interactive} global={false} cursor snap polar={[-0.12, 0.2]} azimuth={[-0.6, 0.6]}>
          {body}
        </PresentationControls>
      ) : (
        body
      )}
    </Canvas>
  );
}

/** Lathe from [radius, height] pairs. */
export function lathe(pts: [number, number][], segments = 64) {
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

type V3 = [number, number, number];
/** Scroll-driven camera move between two framings. */
export function CamScroll({ progress, from, to, look = [0, 0, 0], lookTo, ease = [0, 1] }: { progress: MotionValue<number>; from: V3; to: V3; look?: V3; lookTo?: V3; ease?: [number, number] }) {
  const a = useMemo(() => new THREE.Vector3(), []);
  const l = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    const p = smooth(ease[0], ease[1], progress.get());
    a.set(from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p, from[2] + (to[2] - from[2]) * p);
    camera.position.lerp(a, 0.12);
    const lt = lookTo ?? look;
    l.set(look[0] + (lt[0] - look[0]) * p, look[1] + (lt[1] - look[1]) * p, look[2] + (lt[2] - look[2]) * p);
    camera.lookAt(l);
  });
  return null;
}
