import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial, useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { smooth, type SceneProps } from "./kit";

/* Shared pieces of the photoreal scenes: scanned CC0 props, the walnut table and the photo backdrop. */

export const M = (n: string) => `/models/${n}.glb`;
export type Flame = { mat: THREE.MeshStandardMaterial; light: THREE.PointLight | null; at: number; seed: number; base: number };

/** Flicker: three detuned sines read as a living flame without noise textures. */
export const flick = (t: number, s: number) => 0.82 + Math.sin(t * 13.1 + s) * 0.08 + Math.sin(t * 7.3 + s * 2.1) * 0.06 + Math.sin(t * 23.7 + s * 3.7) * 0.04;

/** Clone a node, give every flame its own material, and set shadows. */
export function prep(src: THREE.Object3D, flames: Flame[], at: number, seed: number) {
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

export function useNode(model: string, name?: string) {
  const { scene } = useGLTF(M(model));
  return name ? scene.getObjectByName(name)! : scene;
}

/** The restaurant's own photo as the room behind the table, softened like a shallow depth of field. */
export function Backdrop({ src, progress }: { src: string; progress: SceneProps["progress"] }) {
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

export function Table({ lite }: { lite: boolean }) {
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

export function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}
