import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CamScroll, Embers, Stage, Steam, lathe, rng, smooth, speckle, useCanvasTexture, type SceneProps } from "./kit";

/** Gobar-mitti plaster: ochre mud with finger-swept arcs. */
function useMud(tint = "#8a6038") {
  return useCanvasTexture(
    512,
    (g, s) => {
      g.fillStyle = tint;
      g.fillRect(0, 0, s, s);
      const r = rng(31);
      for (let i = 0; i < 260; i++) {
        g.strokeStyle = `rgba(${r() > 0.5 ? "170,130,85" : "70,45,25"},${0.06 + r() * 0.1})`;
        g.lineWidth = 3 + r() * 8;
        g.beginPath();
        g.arc(r() * s, r() * s, 20 + r() * 60, r() * 6, r() * 6 + 1.2);
        g.stroke();
      }
      speckle(g, s, 34);
    },
    [2, 2],
  );
}

function useRoti() {
  return useCanvasTexture(256, (g, s) => {
    g.fillStyle = "#e3c28c";
    g.fillRect(0, 0, s, s);
    const r = rng(14);
    for (let i = 0; i < 50; i++) {
      g.fillStyle = `rgba(110,60,20,${0.3 + r() * 0.5})`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 3 + r() * 10, 2 + r() * 6, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    speckle(g, s, 22);
  });
}

function Chulha({ progress }: { progress: SceneProps["progress"] }) {
  const mud = useMud();
  const ground = useMud("#6e4a2a");
  const roti = useRoti();
  const body = useMemo(
    () =>
      lathe(
        [
          [0, -1],
          [1.25, -1],
          [1.32, -0.6],
          [1.18, 0.1],
          [1.0, 0.42],
          [0.8, 0.5],
          [0.72, 0.42],
        ],
        48,
      ),
    [],
  );
  const tawa = useMemo(
    () =>
      lathe([
        [0, 0.5],
        [0.6, 0.53],
        [1.0, 0.6],
        [1.12, 0.66],
        [1.1, 0.68],
        [0.98, 0.63],
        [0.6, 0.57],
        [0, 0.54],
      ]),
    [],
  );
  const puff = useRef<THREE.Mesh>(null);
  const butter = useRef<THREE.Mesh>(null);
  const fire = useRef<THREE.PointLight>(null);
  const mouth = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = progress.get();
    const rise = smooth(0.08, 0.55, p);
    if (puff.current) {
      puff.current.scale.set(0.82 + rise * 0.04, 0.03 + rise * 0.22 + Math.sin(t * 3) * 0.008 * rise, 0.82 + rise * 0.04);
      puff.current.rotation.y = t * 0.1;
    }
    if (butter.current) {
      const b = smooth(0.55, 0.85, p);
      butter.current.scale.setScalar(0.001 + b * 0.22);
      butter.current.position.y = 0.66 + rise * 0.2 + 0.08 * b;
    }
    const f = 0.8 + Math.sin(t * 8) * 0.1 + Math.sin(t * 17) * 0.08;
    if (fire.current) fire.current.intensity = 18 * f;
    if (mouth.current) mouth.current.color.setRGB(1, 0.42 * f, 0.1);
  });
  return (
    <group position={[0, -0.6, 0]}>
      <mesh geometry={body}>
        <meshStandardMaterial map={mud} bumpMap={mud} bumpScale={1.6} roughness={1} color="#d9a877" />
      </mesh>
      {/* the fire mouth: a glowing arch cut into the front */}
      <mesh position={[0, -0.55, 1.27]} rotation={[-0.06, 0, 0]}>
        <circleGeometry args={[0.42, 32, 0, Math.PI]} />
        <meshBasicMaterial ref={mouth} color="#ff6a1a" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.55, 1.27]} rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[0.84, 0.01]} />
        <meshBasicMaterial color="#1a0a04" />
      </mesh>
      <pointLight ref={fire} position={[0, -0.4, 1.7]} intensity={18} distance={5} color="#ff7a2a" />
      <mesh geometry={tawa}>
        <meshStandardMaterial color="#2b2b2d" metalness={0.85} roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      {/* phulka: a flat disc that puffs into a dome on scroll */}
      <mesh ref={puff} position={[0, 0.66, 0]}>
        <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={roti} roughness={0.8} />
      </mesh>
      <mesh ref={butter} position={[0.1, 0.7, 0.05]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#fbf6e6" roughness={0.35} />
      </mesh>
      <mesh position={[0, -1.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5, 48]} />
        <meshStandardMaterial map={ground} roughness={1} />
      </mesh>
      <Steam count={14} origin={[0.9, 0.7, -0.4]} spread={0.8} rise={3.4} size={1.8} color="#d8d2c8" opacity={0.18} speed={0.09} />
      <Embers count={40} origin={[0, -0.5, 1.4]} area={[0.6, 0.1, 0.3]} rise={1.6} color="#ffab4a" size={0.045} speed={0.35} />
    </group>
  );
}

export default function ChulhaScene(props: SceneProps) {
  return (
    <Stage {...props} fog="#1f160e" env="#2a2016" warm="#ffe6c2" camera={[0, 1.8, 7.6]}>
      <CamScroll progress={props.progress} from={[0, 1.2, 7.6]} to={[0.6, 3.4, 4.6]} look={[0, -0.2, 0]} lookTo={[0, 0.1, 0]} />
      <directionalLight position={[3, 5, 2]} intensity={1.2} color="#fff0d8" />
      <Chulha progress={props.progress} />
    </Stage>
  );
}
