import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CamScroll, Embers, Stage, rng, speckle, useCanvasTexture, type SceneProps } from "./kit";

/** Imarti: an outer ring of small loops piped around a centre ring. Epitrochoid path, then a tube. */
class Rosette extends THREE.Curve<THREE.Vector3> {
  constructor(private R: number, private loops: number, private d: number) {
    super();
  }
  getPoint(u: number, out = new THREE.Vector3()) {
    const t = u * Math.PI * 2;
    const k = this.loops;
    const x = this.R * Math.cos(t) + this.d * Math.cos(k * t + Math.PI);
    const y = this.R * Math.sin(t) + this.d * Math.sin(k * t + Math.PI);
    return out.set(x, y, Math.sin(k * t) * 0.04);
  }
}

class Ring extends THREE.Curve<THREE.Vector3> {
  constructor(private r: number) {
    super();
  }
  getPoint(u: number, out = new THREE.Vector3()) {
    const t = u * Math.PI * 2;
    return out.set(Math.cos(t) * this.r, Math.sin(t) * this.r, Math.sin(t * 3) * 0.02);
  }
}

function Syrup({ color = "#f2741c" }: { color?: string }) {
  return <meshPhysicalMaterial color={color} roughness={0.18} clearcoat={1} clearcoatRoughness={0.05} sheen={0.6} sheenColor="#ffd08a" envMapIntensity={1.4} />;
}

function Imarti({ progress }: { progress: SceneProps["progress"] }) {
  const outer = useMemo(() => new THREE.TubeGeometry(new Rosette(0.78, 11, 0.24), 640, 0.075, 14, true), []);
  const inner = useMemo(() => new THREE.TubeGeometry(new Ring(0.42), 160, 0.08, 14, true), []);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const p = progress.get();
    g.current.rotation.z = clock.elapsedTime * 0.2;
    g.current.rotation.x = -1.05 + p * 0.85;
  });
  return (
    <group position={[0, 0.55, 0]}>
      <group ref={g}>
        <mesh geometry={outer}>
          <Syrup />
        </mesh>
        <mesh geometry={inner}>
          <Syrup color="#e8641a" />
        </mesh>
      </group>
    </group>
  );
}

/** Laddoo pyramid: bumpy boondi balls stacked 6-3-1. */
function Laddoos({ progress }: { progress: SceneProps["progress"] }) {
  const tex = useCanvasTexture(256, (g, s) => {
    g.fillStyle = "#f2a531";
    g.fillRect(0, 0, s, s);
    const r = rng(21);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = r() > 0.5 ? "rgba(255,210,120,0.55)" : "rgba(190,110,20,0.45)";
      g.beginPath();
      g.arc(r() * s, r() * s, 2 + r() * 4, 0, Math.PI * 2);
      g.fill();
    }
    speckle(g, s, 20);
  });
  const balls = useMemo(() => {
    const out: [number, number, number][] = [];
    const R = 0.26;
    [[-1, 0], [1, 0], [0, 1.73], [-2, 1.73], [2, 1.73], [0, -1.73]].forEach(([x, z]) => out.push([x * R, R, z * R * 0.9]));
    [[-1, 0.58], [1, 0.58], [0, -0.58]].forEach(([x, z]) => out.push([x * R, R * 2.55, z * R * 1.3]));
    out.push([0, R * 4.05, 0]);
    return out;
  }, []);
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const p = progress.get();
    g.current.position.y = -1.95 + Math.min(1, p * 1.6) * 0.35;
  });
  return (
    <group ref={g} position={[1.4, -1.95, 0.6]}>
      {balls.map((b, i) => (
        <mesh key={i} position={b}>
          <sphereGeometry args={[0.26, 32, 24]} />
          <meshStandardMaterial map={tex} bumpMap={tex} bumpScale={2.5} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export default function ImartiScene(props: SceneProps) {
  return (
    <Stage {...props} fog="#3a0b0b" env="#3a1010" warm="#ffe2b0" camera={[0, 0.4, 7]}>
      <CamScroll progress={props.progress} from={[0, 0.6, 7.2]} to={[-0.4, 0, 6]} look={[0, 0, 0]} lookTo={[0.2, -0.3, 0]} />
      <pointLight position={[-2, 2, 2]} intensity={12} distance={9} color="#ffcf6b" />
      <Imarti progress={props.progress} />
      <Laddoos progress={props.progress} />
      {/* steel thali under the laddoos */}
      <mesh position={[1.4, -1.97, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.05, 64]} />
        <meshStandardMaterial color="#cfd3d8" metalness={1} roughness={0.22} />
      </mesh>
      <Embers count={props.lite ? 30 : 70} origin={[0, -1.5, 0]} area={[4, 1, 2]} rise={4} color="#ffd36b" size={0.05} speed={0.08} />
    </Stage>
  );
}
