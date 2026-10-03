import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CamScroll, Stage, Steam, lathe, rng, speckle, useCanvasTexture, type SceneProps } from "./kit";

/** Fried pastry: golden with darker blisters. */
function usePastry() {
  return useCanvasTexture(512, (g, s) => {
    g.fillStyle = "#d8973f";
    g.fillRect(0, 0, s, s);
    const r = rng(12);
    for (let i = 0; i < 1400; i++) {
      const light = r() > 0.55;
      g.fillStyle = light ? `rgba(250,205,120,${0.25 + r() * 0.3})` : `rgba(140,72,20,${0.15 + r() * 0.3})`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 1 + r() * 7, 1 + r() * 5, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    speckle(g, s, 28);
  });
}

/** Samosa body: a three-sided cone, puffed outward between the seams and pinched at the tip. */
function samosaGeo() {
  const g = new THREE.ConeGeometry(0.85, 1.35, 3, 14, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const h = (v.y + 0.675) / 1.35;
    const a = Math.atan2(v.z, v.x);
    const r = Math.hypot(v.x, v.z);
    const bulge = 1 + 0.32 * Math.sin(h * Math.PI) * (0.6 + 0.4 * Math.cos(a * 3));
    const flat = v.y < -0.6 ? 0.95 : 1;
    v.x = Math.cos(a) * r * bulge * flat;
    v.z = Math.sin(a) * r * bulge * flat;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function Samosas() {
  const tex = usePastry();
  const geo = useMemo(samosaGeo, []);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * 0.15;
  });
  const items: { p: [number, number, number]; r: [number, number, number]; s: number }[] = [
    { p: [0, 0.05, 0], r: [0.05, 0.3, 0], s: 1 },
    { p: [-1.05, -0.2, 0.55], r: [Math.PI / 2 - 0.25, 0, 0.9], s: 0.78 },
    { p: [0.95, -0.25, 0.7], r: [Math.PI / 2 - 0.15, 0, -2.1], s: 0.72 },
  ];
  return (
    <group ref={g} position={[0, -0.9, 0]}>
      {items.map((it, i) => (
        <mesh key={i} geometry={geo} position={it.p} rotation={it.r} scale={it.s}>
          <meshStandardMaterial map={tex} bumpMap={tex} bumpScale={3} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, -0.72, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.1, 64]} />
        <meshStandardMaterial color="#c9ccd0" metalness={1} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Kulhad({ progress }: { progress: SceneProps["progress"] }) {
  const clay = useCanvasTexture(256, (g, s) => {
    g.fillStyle = "#a4532f";
    g.fillRect(0, 0, s, s);
    speckle(g, s, 40);
  });
  const cup = useMemo(
    () =>
      lathe([
        [0, -0.55],
        [0.34, -0.55],
        [0.38, -0.45],
        [0.5, 0.45],
        [0.53, 0.5],
        [0.47, 0.5],
        [0.44, 0.42],
        [0.32, -0.45],
        [0, -0.45],
      ]),
    [],
  );
  const steam = () => 0.6 + progress.get() * 0.8;
  return (
    <group position={[1.9, -0.95, -0.9]}>
      <mesh geometry={cup}>
        <meshStandardMaterial map={clay} bumpMap={clay} bumpScale={1.2} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.43, 48]} />
        <meshStandardMaterial color="#b98552" roughness={0.3} />
      </mesh>
      <Steam count={12} origin={[0, 0.5, 0]} spread={0.3} rise={2} size={0.9} opacity={0.26} speed={0.2} strength={steam} />
    </group>
  );
}

export default function SamosaScene(props: SceneProps) {
  return (
    <Stage {...props} fog="#2a1d06" env="#3a2a10" warm="#fff0d0" camera={[0, 1.6, 7.4]}>
      <CamScroll progress={props.progress} from={[0, 1.4, 7.6]} to={[-1.2, 2.6, 5.6]} look={[0.2, -0.6, 0]} lookTo={[0.4, -0.8, 0]} />
      <directionalLight position={[3, 5, 3]} intensity={1.4} color="#fff1d6" />
      <pointLight position={[-3, 0.5, 2]} intensity={6} distance={8} color="#ff9a3c" />
      <Samosas />
      <Kulhad progress={props.progress} />
    </Stage>
  );
}
