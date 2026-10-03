import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, MeshReflectorMaterial, useGLTF, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SITE } from "../content";
import { smooth, type SceneProps } from "./kit";

/*
 * Photoreal still life: CC0 photoscanned props (Poly Haven) on a walnut table,
 * lit by a real restaurant HDRI and live candle flames, in front of the
 * restaurant's own dining-room photo. Units are metres.
 */

const M = (n: string) => `/models/${n}.glb`;
const MODELS = ["brass_goblets", "brass_diya_lantern", "brass_candleholders", "food_lime_01", "food_pomegranate_01"];
MODELS.forEach((n) => useGLTF.preload(M(n)));

type Flame = { mat: THREE.MeshStandardMaterial; light: THREE.PointLight | null; at: number; seed: number; base: number };

/** Flicker: three detuned sines read as a living flame without noise textures. */
const flick = (t: number, s: number) => 0.82 + Math.sin(t * 13.1 + s) * 0.08 + Math.sin(t * 7.3 + s * 2.1) * 0.06 + Math.sin(t * 23.7 + s * 3.7) * 0.04;

/** Clone a node, give every flame its own material, and set shadows. */
function prep(src: THREE.Object3D, flames: Flame[], at: number, seed: number) {
  const o = src.clone(true);
  // centre on the table spot but keep the authored height
  o.position.x = o.position.z = 0;
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const next = mats.map((raw) => {
      const mat = raw as THREE.MeshStandardMaterial;
      if (/flame/i.test(mat.name)) {
        const f = mat.clone();
        f.emissive = new THREE.Color("#ffb85c");
        f.emissiveMap = f.map;
        f.emissiveIntensity = 0;
        f.toneMapped = false;
        f.transparent = true;
        flames.push({ mat: f, light: null, at, seed: seed + flames.length, base: 6 });
        return f;
      }
      if (/glass/i.test(mat.name)) {
        const g = mat.clone();
        g.transparent = true;
        g.opacity = 0.28;
        g.roughness = 0.05;
        g.depthWrite = false;
        return g;
      }
      return mat;
    });
    m.material = Array.isArray(m.material) ? next : next[0];
    const isFlame = next.some((x) => /flame|glass/i.test(x.name));
    m.castShadow = !isFlame;
    m.receiveShadow = !isFlame;
  });
  return o;
}

function useNode(model: string, name?: string) {
  const { scene } = useGLTF(M(model));
  return name ? scene.getObjectByName(name)! : scene;
}

/** The restaurant's own photo as the room behind the table, softened like a shallow depth of field. */
function Backdrop({ src, progress }: { src: string; progress: SceneProps["progress"] }) {
  const img = useLoader(THREE.ImageLoader, src);
  const tex = useMemo(() => {
    const w = 900;
    const h = Math.round((w * img.height) / img.width);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.filter = "blur(3px)";
    g.drawImage(img, -8, -8, w + 16, h + 16);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [img]);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const { camera, size } = useThree();
  const aspect = img.width / img.height;
  useFrame(() => {
    if (!mesh.current || !mat.current) return;
    // keep the photo covering the frame wherever the camera drifts
    const cam = camera as THREE.PerspectiveCamera;
    const d = cam.position.distanceTo(mesh.current.position);
    const vh = 2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 1.25;
    const vw = vh * (size.width / size.height);
    const h = Math.max(vh, vw / aspect);
    mesh.current.scale.set(h * aspect, h, 1);
    const p = progress.get();
    mat.current.color.setScalar(0.62 - smooth(0.1, 0.9, p) * 0.3);
  });
  return (
    <mesh ref={mesh} position={[0, 0.55, -3.2]}>
      <planeGeometry />
      <meshBasicMaterial ref={mat} map={tex} toneMapped={false} />
    </mesh>
  );
}

function Table({ lite }: { lite: boolean }) {
  const [map, rough, nor] = useTexture(["/tex/walnut_diff.webp", "/tex/walnut_rough.webp", "/tex/walnut_nor.webp"]);
  useMemo(() => {
    [map, rough, nor].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(2.4, 1.4);
      t.anisotropy = 8;
    });
    map.colorSpace = THREE.SRGBColorSpace;
  }, [map, rough, nor]);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0.3]} receiveShadow>
        <planeGeometry args={[5, 2.6]} />
        {lite ? (
          <meshStandardMaterial map={map} roughnessMap={rough} normalMap={nor} color="#8a7a70" roughness={0.6} envMapIntensity={0.8} />
        ) : (
          <MeshReflectorMaterial
            map={map}
            roughnessMap={rough}
            normalMap={nor}
            normalScale={new THREE.Vector2(0.4, 0.4)}
            color="#8a7a70"
            roughness={0.55}
            metalness={0}
            blur={[400, 120]}
            resolution={1024}
            mixBlur={1}
            mixStrength={1.6}
            mixContrast={1}
            depthScale={0.6}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
            mirror={0}
            envMapIntensity={0.8}
          />
        )}
      </mesh>
      {/* the table's back edge: a thin lip that catches the light instead of a hard cut */}
      <mesh position={[0, -0.02, -1]} castShadow={false}>
        <boxGeometry args={[5, 0.04, 0.02]} />
        <meshStandardMaterial color="#2a1d16" roughness={0.35} />
      </mesh>
    </group>
  );
}

function StillLife({ flames }: { flames: Flame[] }) {
  const goblets = useNode("brass_goblets");
  const lantern = useNode("brass_diya_lantern");
  const tall = useNode("brass_candleholders", "brass_candleholder_01");
  const pair = useNode("brass_candleholders", "brass_candleholder_02");
  const lime = useNode("food_lime_01");
  const pom = useNode("food_pomegranate_01");

  const parts = useMemo(() => {
    flames.length = 0;
    const g = goblets.clone(true);
    g.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh) m.castShadow = m.receiveShadow = true;
    });
    const l = prep(lantern, flames, 0.35, 1);
    // standing on the table, so drop the hanging chain and seat the ring on the lid
    const chain = l.getObjectByName("brass_diya_lantern_chain");
    if (chain) chain.visible = false;
    const ring = l.getObjectByName("brass_diya_lantern_connection");
    if (ring) ring.position.y = 0.128;
    const t = prep(tall, flames, 0.75, 4);
    const p = prep(pair, flames, 1.15, 9);
    const limes = [0, 1, 2].map(() => prep(lime, [], 0, 0));
    const poms = [0, 1].map(() => prep(pom, [], 0, 0));
    return { g, l, t, p, limes, poms };
  }, [goblets, lantern, tall, pair, lime, pom, flames]);

  return (
    <group>
      <primitive object={parts.g} position={[0.02, 0, 0.02]} rotation-y={0.25} />
      <group position={[-0.34, 0, -0.18]} rotation-y={0.6} scale={1.45}>
        <primitive object={parts.l} />
        <pointLight
          ref={(n) => void (flames[0] && (flames[0].light = n))}
          position={[0.004, 0.055, -0.006]}
          color="#ff9f45"
          intensity={0}
          distance={1.6}
          decay={2}
        />
      </group>
      <group position={[-0.6, 0, -0.5]} rotation-y={0.3}>
        <primitive object={parts.t} />
        <pointLight ref={(n) => void (flames[1] && (flames[1].light = n))} position={[0, 0.36, 0]} color="#ffa64d" intensity={0} distance={2} decay={2} />
      </group>
      <group position={[0.48, 0, -0.4]} rotation-y={-0.4}>
        <primitive object={parts.p} />
        <pointLight ref={(n) => void (flames[2] && (flames[2].light = n))} position={[0, 0.29, 0]} color="#ffa64d" intensity={0} distance={2} decay={2} />
      </group>
      <primitive object={parts.limes[0]} position={[0.3, 0, 0.26]} rotation={[0, 1.1, 0]} />
      <primitive object={parts.limes[1]} position={[0.38, 0, 0.18]} rotation={[0, -0.4, 0]} />
      <primitive object={parts.limes[2]} position={[0.34, 0.03, 0.34]} rotation={[1.45, 0.2, 0.3]} />
      <primitive object={parts.poms[0]} position={[-0.2, 0, 0.3]} rotation={[0, 0.8, 0]} />
      <primitive object={parts.poms[1]} position={[-0.31, 0, 0.2]} rotation={[0.1, 2.3, -0.2]} scale={0.9} />
    </group>
  );
}

/** Load intro (camera glides in while the candles are lit one by one), then the scroll push-in. */
function Director({ progress, side, still, flames }: Pick<SceneProps, "progress" | "side" | "still"> & { flames: Flame[] }) {
  const { size, pointer } = useThree();
  const start = useRef<number | null>(null);
  const look = useMemo(() => new THREE.Vector3(), []);
  const want = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }, dt) => {
    const now = clock.elapsedTime;
    if (start.current === null) start.current = now;
    const t = still ? 99 : now - start.current;
    const intro = smooth(0, 3.2, t);
    const p = smooth(0, 1, progress.get());
    const narrow = size.width < 768;
    const off = narrow ? 0 : side === "left" ? -0.55 : 0.55;
    const cam = camera as THREE.PerspectiveCamera;
    const fov = narrow ? 40 : 30;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    const dist = (narrow ? 3.2 : 2.3) + (1 - intro) * 1.6 - p * 0.75;
    const ang = (1 - intro) * -0.35 + p * 0.32 + (still ? 0 : pointer.x * 0.05);
    const y = (narrow ? 0.62 : 0.5) + (1 - intro) * 0.35 - p * 0.2 + (still ? 0 : pointer.y * 0.03);
    want.set(off * (1 - p * 0.6) + Math.sin(ang) * dist, y, Math.cos(ang) * dist);
    const k = still ? 1 : 1 - Math.pow(0.02, dt);
    camera.position.lerp(want, k);
    look.set(off * (1 - p * 0.6), narrow ? -0.08 : 0.13, 0);
    camera.lookAt(look);

    for (const f of flames) {
      const on = still ? 1 : smooth(f.at, f.at + 0.5, t);
      const k2 = flick(now, f.seed) * on;
      f.mat.emissiveIntensity = f.base * k2;
      f.mat.opacity = on;
      if (f.light) f.light.intensity = 0.9 * k2;
    }
  });
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export default function Celebration({ progress, lite, still, side }: SceneProps) {
  const [ready, setReady] = useState(false);
  const flames = useMemo<Flame[]>(() => [], []);
  const backdrop = SITE.hero.backdrop ?? SITE.hero.fallback;
  return (
    <Canvas
      shadows={!lite}
      frameloop={still ? "demand" : "always"}
      dpr={lite ? [1, 1.25] : [1, 1.75]}
      camera={{ position: [0, 0.8, 4], fov: 30, near: 0.05, far: 30 }}
      gl={{ antialias: !lite, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y", opacity: ready ? 1 : 0, transition: "opacity 1.4s cubic-bezier(.2,.7,.2,1)" }}
    >
      <Suspense fallback={null}>
        <Environment files="/hdr/warm_restaurant_night_1k.hdr" environmentIntensity={0.55} environmentRotation={[0, 2.2, 0]} />
        <Backdrop src={backdrop} progress={progress} />
        <Table lite={lite} />
        <StillLife flames={flames} />
        <ContactShadows position={[0, 0.001, 0]} scale={2.4} blur={2.4} far={0.5} opacity={0.75} frames={1} resolution={lite ? 256 : 512} />
        <spotLight
          position={[1.6, 2.2, 1.8]}
          angle={0.42}
          penumbra={0.9}
          intensity={14}
          color="#ffe0bd"
          castShadow={!lite}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[-2, 1.4, -2.5]} intensity={0.9} color={SITE.theme.accent} />
        <Director progress={progress} side={side} still={still} flames={flames} />
        {!lite && (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur luminanceThreshold={1} intensity={0.9} radius={0.6} />
            <Vignette offset={0.25} darkness={0.6} />
          </EffectComposer>
        )}
        <Ready onReady={() => setReady(true)} />
      </Suspense>
    </Canvas>
  );
}
