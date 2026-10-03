import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CamScroll, Embers, Stage, Steam, lathe, rng, smooth, speckle, useCanvasTexture, type SceneProps } from "./kit";

/** Hammered copper: warm base with dents that the bump map turns into light. */
function useCopper() {
  return useCanvasTexture(
    512,
    (g, s) => {
      g.fillStyle = "#b8643a";
      g.fillRect(0, 0, s, s);
      const r = rng(17);
      for (let i = 0; i < 900; i++) {
        const x = r() * s;
        const y = r() * s;
        const rad = 4 + r() * 10;
        const grd = g.createRadialGradient(x, y, 0, x, y, rad);
        grd.addColorStop(0, "rgba(255,190,140,0.35)");
        grd.addColorStop(1, "rgba(80,30,10,0)");
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y, rad, 0, Math.PI * 2);
        g.fill();
      }
      speckle(g, s, 18);
    },
    [4, 2],
  );
}

/** Gravy surface: deep red-orange with a cream spiral and a few slicks of ghee. */
function useGravy() {
  return useCanvasTexture(512, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 20, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "#c8481c");
    grd.addColorStop(1, "#8a2410");
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(255,236,210,0.85)";
    g.lineCap = "round";
    g.lineWidth = 7;
    g.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.05) {
      const rad = 8 + a * 9;
      const x = s / 2 + Math.cos(a) * rad;
      const y = s / 2 + Math.sin(a) * rad;
      if (a === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    const r = rng(4);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,180,60,${0.15 + r() * 0.25})`;
      g.beginPath();
      g.arc(r() * s, r() * s, 3 + r() * 12, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#2f7a2a";
    for (let i = 0; i < 26; i++) {
      g.beginPath();
      g.ellipse(r() * s, r() * s, 4, 2, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function Copper({ map }: { map: THREE.Texture }) {
  return <meshStandardMaterial map={map} bumpMap={map} bumpScale={0.9} color="#e9a27a" metalness={1} roughness={0.32} envMapIntensity={1.6} />;
}

function Handi({ progress }: { progress: SceneProps["progress"] }) {
  const copper = useCopper();
  const gravy = useGravy();
  const pot = useMemo(
    () =>
      lathe([
        [0, -1],
        [0.7, -1],
        [1.15, -0.75],
        [1.38, -0.3],
        [1.35, 0.15],
        [1.1, 0.5],
        [0.92, 0.66],
        [0.95, 0.78],
        [1.02, 0.84],
        [0.97, 0.88],
        [0.88, 0.8],
      ]),
    [],
  );
  const lidGeo = useMemo(
    () =>
      lathe([
        [0, 0.38],
        [0.12, 0.36],
        [0.1, 0.26],
        [0.3, 0.2],
        [0.75, 0.08],
        [1.02, 0],
        [1.0, -0.03],
      ]),
    [],
  );
  const lid = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const p = smooth(0.05, 0.75, progress.get());
    if (!lid.current) return;
    lid.current.position.set(p * 0.9, 0.86 + p * 1.15 + Math.sin(clock.elapsedTime * 9) * 0.006 * (1 - p), p * 0.25);
    lid.current.rotation.z = -p * 0.55;
  });
  const steam = () => 0.25 + smooth(0.05, 0.6, progress.get()) * 0.9;
  return (
    <group position={[0, -0.4, 0]}>
      <mesh geometry={pot}>
        <Copper map={copper} />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 64]} />
        <meshStandardMaterial map={gravy} roughness={0.25} />
      </mesh>
      <group ref={lid} position={[0, 0.86, 0]}>
        <mesh geometry={lidGeo}>
          <Copper map={copper} />
        </mesh>
      </group>
      <Steam count={16} origin={[0, 0.9, 0]} spread={0.9} rise={2.6} size={1.2} opacity={0.24} speed={0.16} strength={steam} />
      {/* coals under the pot */}
      <Coals />
    </group>
  );
}

function Coals() {
  const mats = useRef<THREE.MeshStandardMaterial[]>([]);
  const coals = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 22 }, () => {
      const a = r() * Math.PI * 2;
      const rad = r() * 1.3;
      return { p: [Math.cos(a) * rad, -1.08 - r() * 0.05, Math.sin(a) * rad] as [number, number, number], s: 0.1 + r() * 0.12, ph: r() * 6 };
    });
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    mats.current.forEach((m, i) => (m.emissiveIntensity = 1.2 + Math.sin(t * 2.4 + coals[i].ph) * 0.6));
  });
  return (
    <group>
      {coals.map((c, i) => (
        <mesh key={i} position={c.p} scale={c.s}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial ref={(n) => void (n && (mats.current[i] = n))} color="#1a0a06" emissive="#ff4a12" emissiveIntensity={1.2} roughness={1} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0, -0.9, 0.6]} intensity={10} distance={4} color="#ff5a1a" />
    </group>
  );
}

export default function HandiScene(props: SceneProps) {
  return (
    <Stage {...props} fog="#1c0a0c" env="#2a1214" warm="#ffd8b0" camera={[0, 1.8, 7.2]}>
      <CamScroll progress={props.progress} from={[0, 1.4, 7.4]} to={[0, 3.2, 5.4]} look={[0, 0, 0]} lookTo={[0, 0.3, 0]} />
      <directionalLight position={[-3, 4, 3]} intensity={1.1} color="#ffe2c4" />
      <Handi progress={props.progress} />
      <Embers count={props.lite ? 25 : 60} origin={[0, -1.4, 0]} area={[2.6, 0.3, 2]} rise={2} color="#ff7a2a" size={0.05} speed={0.3} />
    </Stage>
  );
}
