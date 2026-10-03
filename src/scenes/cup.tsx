import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CamScroll, Stage, Steam, lathe, smooth, useCanvasTexture, type SceneProps } from "./kit";

const CORAL = "#ff7a5c";
const GREEN = "#43d17a";

/** Coffee surface with a poured heart. */
function useLatte() {
  return useCanvasTexture(512, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 30, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "#9a5e34");
    grd.addColorStop(0.8, "#6b3a1c");
    grd.addColorStop(1, "#3a1d0c");
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#f4e6d0";
    g.beginPath();
    const cx = s / 2;
    const cy = s / 2 + 20;
    g.moveTo(cx, cy + 110);
    g.bezierCurveTo(cx - 190, cy - 20, cx - 90, cy - 170, cx, cy - 70);
    g.bezierCurveTo(cx + 90, cy - 170, cx + 190, cy - 20, cx, cy + 110);
    g.fill();
    g.strokeStyle = "#8a5230";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(cx, cy - 66);
    g.lineTo(cx, cy + 100);
    g.stroke();
  });
}

function Ceramic({ color = "#f6f2ec" }: { color?: string }) {
  return <meshPhysicalMaterial color={color} roughness={0.18} clearcoat={1} clearcoatRoughness={0.06} envMapIntensity={1.3} />;
}

function Cup({ progress }: { progress: SceneProps["progress"] }) {
  const latte = useLatte();
  const cup = useMemo(
    () =>
      lathe([
        [0, -0.62],
        [0.42, -0.62],
        [0.48, -0.55],
        [0.66, -0.1],
        [0.78, 0.38],
        [0.8, 0.46],
        [0.76, 0.46],
        [0.73, 0.38],
        [0.6, -0.08],
        [0.42, -0.5],
        [0, -0.5],
      ]),
    [],
  );
  const saucer = useMemo(
    () =>
      lathe([
        [0, -0.7],
        [0.5, -0.7],
        [1.1, -0.66],
        [1.32, -0.56],
        [1.34, -0.53],
        [1.1, -0.61],
        [0.5, -0.64],
        [0, -0.64],
      ]),
    [],
  );
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const p = smooth(0, 1, progress.get());
    g.current.rotation.y = -0.6 + p * 1.2 + Math.sin(clock.elapsedTime * 0.4) * 0.05;
    g.current.position.y = -0.3 + Math.sin(clock.elapsedTime * 0.8) * 0.04;
  });
  return (
    <group ref={g} position={[0, -0.3, 0]}>
      <mesh geometry={cup}>
        <Ceramic />
      </mesh>
      <mesh geometry={saucer}>
        <Ceramic color={CORAL} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.73, 64]} />
        <meshPhysicalMaterial map={latte} roughness={0.35} clearcoat={0.4} />
      </mesh>
      <mesh position={[0.82, 0.02, 0]} rotation={[0, 0, -0.1]}>
        <torusGeometry args={[0.24, 0.055, 16, 40, Math.PI * 1.25]} />
        <Ceramic />
      </mesh>
      <Steam count={12} origin={[0, 0.5, 0]} spread={0.5} rise={2.2} size={1} opacity={0.2} speed={0.16} />
    </group>
  );
}

/** Their ceiling has green circular rings; here they hang behind the cup and turn slowly. */
function Rings({ progress }: { progress: SceneProps["progress"] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const rings = [
    { r: 2.1, y: 0.4, z: -2.4, tilt: 1.2 },
    { r: 1.5, y: 1.4, z: -1.8, tilt: 1.35 },
    { r: 2.8, y: -0.2, z: -3.4, tilt: 1.1 },
  ];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = progress.get();
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.rotation.x = rings[i].tilt + Math.sin(t * 0.3 + i) * 0.08 - p * 0.3;
      m.rotation.z = t * 0.06 * (i % 2 ? -1 : 1);
    });
  });
  return (
    <group>
      {rings.map((r, i) => (
        <mesh key={i} ref={(n) => void (refs.current[i] = n)} position={[0, r.y, r.z]}>
          <torusGeometry args={[r.r, 0.035, 12, 160]} />
          <meshBasicMaterial color={GREEN} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={[0, 1, -2]} intensity={10} distance={6} color={GREEN} />
    </group>
  );
}

export default function CupScene(props: SceneProps) {
  return (
    <Stage {...props} fog="#0d1f17" env="#13281e" warm="#fff1e2" camera={[0, 1.6, 6.8]}>
      <CamScroll progress={props.progress} from={[0, 1.2, 6.8]} to={[0, 2.8, 4.8]} look={[0, -0.1, 0]} lookTo={[0, -0.2, 0]} />
      <directionalLight position={[2, 4, 3]} intensity={1.3} color="#fff4e6" />
      <Rings progress={props.progress} />
      <Cup progress={props.progress} />
    </Stage>
  );
}
