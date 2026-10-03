import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CamScroll, Stage, Steam, lathe, rng, smooth, speckle, useCanvasTexture, type SceneProps } from "./kit";

function Steel({ rough = 0.22 }: { rough?: number }) {
  return <meshStandardMaterial color="#d5d9de" metalness={1} roughness={rough} envMapIntensity={1.5} />;
}

/** A curry surface: base colour, oil sheen spots, optional flecks. */
function useCurry(base: string, fleck: string, seed: number) {
  return useCanvasTexture(256, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const r = rng(seed);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(255,220,140,${0.1 + r() * 0.2})`;
      g.beginPath();
      g.arc(r() * s, r() * s, 2 + r() * 10, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = fleck;
    for (let i = 0; i < 40; i++) {
      g.beginPath();
      g.ellipse(r() * s, r() * s, 2 + r() * 3, 1 + r() * 2, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    speckle(g, s, 14);
  });
}

const KATORI = lathe([
  [0, -0.18],
  [0.3, -0.18],
  [0.4, -0.1],
  [0.46, 0.12],
  [0.48, 0.14],
  [0.44, 0.13],
  [0.42, 0.1],
  [0.36, -0.12],
  [0, -0.13],
]);

function Katori({ pos, fill, children }: { pos: [number, number, number]; fill: THREE.Texture; children?: React.ReactNode }) {
  return (
    <group position={pos}>
      <mesh geometry={KATORI}>
        <Steel rough={0.18} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.43, 40]} />
        <meshStandardMaterial map={fill} roughness={0.35} />
      </mesh>
      {children}
    </group>
  );
}

function Thali({ progress }: { progress: SceneProps["progress"] }) {
  const paneer = useCurry("#d4541f", "#f3e3c4", 1);
  const chana = useCurry("#7a3f17", "#2f6b1f", 2);
  const dal = useCurry("#e0a526", "#2f6b1f", 3);
  const raita = useCurry("#f1ede2", "#4c8a2e", 4);
  const roti = useCanvasTexture(256, (g, s) => {
    g.fillStyle = "#e0bd86";
    g.fillRect(0, 0, s, s);
    const r = rng(19);
    for (let i = 0; i < 45; i++) {
      g.fillStyle = `rgba(120,64,20,${0.3 + r() * 0.4})`;
      g.beginPath();
      g.ellipse(r() * s, r() * s, 3 + r() * 8, 2 + r() * 5, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    speckle(g, s, 20);
  });
  const rice = useCanvasTexture(256, (g, s) => {
    g.fillStyle = "#f4f1e8";
    g.fillRect(0, 0, s, s);
    const r = rng(23);
    for (let i = 0; i < 800; i++) {
      g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.9)" : "rgba(200,192,170,0.6)";
      g.beginPath();
      g.ellipse(r() * s, r() * s, 4, 1.4, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
  const plate = useMemo(
    () =>
      lathe([
        [0, -0.04],
        [1.6, -0.04],
        [1.85, 0.08],
        [1.92, 0.1],
        [1.9, 0.12],
        [1.82, 0.1],
        [1.58, 0],
        [0, 0],
      ]),
    [],
  );
  const cubes = useMemo(() => {
    const r = rng(6);
    return Array.from({ length: 7 }, () => [(r() - 0.5) * 0.5, 0.1, (r() - 0.5) * 0.5, r() * 3] as const);
  }, []);
  const chanaBalls = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 16 }, () => [(r() - 0.5) * 0.6, 0.09, (r() - 0.5) * 0.6] as const);
  }, []);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const p = smooth(0, 0.9, progress.get());
    g.current.rotation.x = 0.15 + p * 0.55;
    g.current.rotation.y = clock.elapsedTime * 0.05 + p * 0.6;
  });
  return (
    <group ref={g}>
      <mesh geometry={plate}>
        <Steel />
      </mesh>
      <Katori pos={[-0.75, 0.16, -0.7]} fill={paneer}>
        {cubes.map(([x, y, z, rot], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0, rot, 0]}>
            <boxGeometry args={[0.11, 0.08, 0.11]} />
            <meshStandardMaterial color="#f6ead2" roughness={0.6} />
          </mesh>
        ))}
      </Katori>
      <Katori pos={[0.3, 0.16, -1.0]} fill={chana}>
        {chanaBalls.map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.045, 12, 8]} />
            <meshStandardMaterial color="#9a6a32" roughness={0.6} />
          </mesh>
        ))}
      </Katori>
      <Katori pos={[1.15, 0.16, -0.35]} fill={dal} />
      <Katori pos={[1.1, 0.16, 0.65]} fill={raita} />
      {/* chapati stack, slightly fanned */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.75 + i * 0.03, 0.03 + i * 0.022, 0.55 - i * 0.02]} rotation={[-Math.PI / 2, 0, i * 0.4]}>
          <cylinderGeometry args={[0.62, 0.62, 0.02, 48]} />
          <meshStandardMaterial map={roti} roughness={0.85} />
        </mesh>
      ))}
      {/* rice mound */}
      <mesh position={[0.2, 0.02, 0.35]} scale={[0.5, 0.28, 0.5]}>
        <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial map={rice} bumpMap={rice} bumpScale={1.5} roughness={0.7} />
      </mesh>
      <Steam count={10} origin={[0.2, 0.4, 0.2]} spread={1.6} rise={2} size={1.1} opacity={0.16} speed={0.14} />
    </group>
  );
}

export default function ThaliScene(props: SceneProps) {
  return (
    <Stage {...props} fog="#11182a" env="#1b2236" warm="#fff2d6" camera={[0, 3.6, 5.6]}>
      <CamScroll progress={props.progress} from={[0, 3.8, 5.4]} to={[0, 2.2, 5.6]} look={[0, -0.2, 0]} lookTo={[0, 0.1, 0]} />
      <directionalLight position={[2, 6, 3]} intensity={1.5} color="#fff2dc" />
      <pointLight position={[-3, 1, 2]} intensity={6} distance={9} color="#ffc35a" />
      <Thali progress={props.progress} />
    </Stage>
  );
}
