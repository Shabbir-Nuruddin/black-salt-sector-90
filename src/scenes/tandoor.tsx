import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CamScroll, Embers, Stage, lathe, rng, speckle, useCanvasTexture, type SceneProps } from "./kit";

/** Clay wall: terracotta with hand-smoothed streaks. */
function useClay() {
  return useCanvasTexture(
    512,
    (g, s) => {
      g.fillStyle = "#9b5a36";
      g.fillRect(0, 0, s, s);
      const r = rng(5);
      for (let i = 0; i < 500; i++) {
        g.strokeStyle = `rgba(${r() > 0.5 ? "190,120,80" : "90,48,28"},${0.05 + r() * 0.08})`;
        g.lineWidth = 1 + r() * 6;
        const y = r() * s;
        g.beginPath();
        g.moveTo(0, y);
        g.bezierCurveTo(s * 0.3, y + (r() - 0.5) * 20, s * 0.6, y + (r() - 0.5) * 20, s, y);
        g.stroke();
      }
      speckle(g, s, 30);
    },
    [3, 1],
  );
}

/** Roti face: wheat with charred blisters. */
function useRoti() {
  return useCanvasTexture(256, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "#e8c48a");
    grd.addColorStop(0.85, "#d9a865");
    grd.addColorStop(1, "#a86a32");
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    const r = rng(9);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(${60 + r() * 40},${30 + r() * 20},10,${0.35 + r() * 0.5})`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 2 + r() * 9, 2 + r() * 6, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    speckle(g, s, 25);
  });
}

const PROFILE: [number, number][] = [
  [0.0, -1.3],
  [1.15, -1.3],
  [1.42, -0.8],
  [1.5, -0.1],
  [1.38, 0.55],
  [1.05, 1.05],
  [0.82, 1.2],
  [0.8, 1.26],
];

function Tandoor({ progress }: { progress: SceneProps["progress"] }) {
  const clay = useClay();
  const roti = useRoti();
  const outer = useMemo(() => lathe(PROFILE, 72), []);
  const inner = useMemo(() => lathe(PROFILE.map(([r, y]) => [Math.max(0, r - 0.09), y + 0.02] as [number, number]), 72), []);
  const glow = useRef<THREE.PointLight>(null);
  const coal = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const f = 0.85 + Math.sin(t * 7) * 0.06 + Math.sin(t * 13.3) * 0.05;
    const p = progress.get();
    if (glow.current) glow.current.intensity = (22 + p * 30) * f;
    if (coal.current) coal.current.emissiveIntensity = 2.2 * f;
  });
  const rotis = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + 0.3;
        const y = 0.15 + (i % 2) * 0.35;
        const rad = 1.3 - (i % 2) * 0.12;
        return { a, y, rad };
      }),
    [],
  );
  return (
    <group position={[0, -0.6, 0]}>
      <mesh geometry={outer}>
        <meshStandardMaterial map={clay} bumpMap={clay} bumpScale={1.5} roughness={0.95} color="#c98a62" />
      </mesh>
      <mesh geometry={inner}>
        <meshStandardMaterial side={THREE.BackSide} color="#3a1a0c" emissive="#ff6a1a" emissiveIntensity={0.22} roughness={1} />
      </mesh>
      {/* mouth rim */}
      <mesh position={[0, 1.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.76, 0.07, 16, 72]} />
        <meshStandardMaterial map={clay} color="#b87650" roughness={0.9} />
      </mesh>
      {/* coals */}
      <mesh position={[0, -1.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.05, 48]} />
        <meshStandardMaterial ref={coal} color="#2a0f05" emissive="#ff4d0d" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <pointLight ref={glow} position={[0, -0.5, 0]} intensity={30} distance={5} color="#ff7a2a" />
      {/* rotis slapped on the inner wall */}
      {rotis.map((r, i) => (
        <mesh key={i} position={[Math.cos(r.a) * r.rad, r.y, Math.sin(r.a) * r.rad]} rotation={[0, -r.a - Math.PI / 2, 0]}>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial map={roti} roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export default function TandoorScene(props: SceneProps) {
  return (
    <Stage {...props} fog="#0d1a14" env="#18231d" camera={[0, 1.8, 7.4]} warm="#ffe0b8">
      <CamScroll progress={props.progress} from={[0, 1.6, 7.6]} to={[0, 5.4, 2.2]} look={[0, 0, 0]} lookTo={[0, -0.4, 0]} />
      <Tandoor progress={props.progress} />
      <Embers count={props.lite ? 50 : 110} origin={[0, 0.5, 0]} area={[1.2, 0.4, 1.2]} rise={3.4} color="#ffb04a" size={0.06} speed={0.22} />
      <directionalLight position={[3, 4, 3]} intensity={0.8} color="#ffe6c7" />
    </Stage>
  );
}
