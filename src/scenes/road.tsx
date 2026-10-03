import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CamScroll, Stage, glowTexture, rng, speckle, useCanvasTexture, type SceneProps } from "./kit";

const LANE = "#ffd23f";
const LEN = 60;

function useAsphalt() {
  return useCanvasTexture(
    512,
    (g, s) => {
      g.fillStyle = "#1d1e20";
      g.fillRect(0, 0, s, s);
      speckle(g, s, 46);
    },
    [6, 40],
  );
}

/** The road scrolls toward the camera; scroll progress adds speed, like pulling off the highway. */
function Road({ progress }: { progress: SceneProps["progress"] }) {
  const asphalt = useAsphalt();
  const dashes = useRef<THREE.InstancedMesh>(null);
  const trails = useRef<THREE.InstancedMesh>(null);
  const travel = useRef(0);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const trailSeeds = useMemo(() => {
    const r = rng(2);
    return Array.from({ length: 14 }, (_, i) => ({ lane: i % 2 ? 0.9 : -0.9, off: r() * LEN, speed: 0.6 + r() * 0.8, red: i % 2 === 0 }));
  }, []);
  const red = useMemo(() => new THREE.Color("#ff3b2f"), []);
  const white = useMemo(() => new THREE.Color("#fff3d6"), []);
  useFrame((_, dt) => {
    const p = progress.get();
    travel.current += dt * (4 + p * 10);
    if (dashes.current) {
      for (let i = 0; i < 24; i++) {
        const z = ((i * 2.6 + travel.current) % LEN) - LEN + 8;
        m.makeTranslation(0, 0.005, z);
        dashes.current.setMatrixAt(i, m);
      }
      dashes.current.instanceMatrix.needsUpdate = true;
    }
    if (trails.current) {
      trailSeeds.forEach((t, i) => {
        const dir = t.red ? -1 : 1;
        const z = ((((t.off + travel.current * t.speed * dir) % LEN) + LEN) % LEN) - LEN + 8;
        m.makeTranslation(t.lane + (t.red ? 0.2 : -0.2), 0.35, z);
        trails.current!.setMatrixAt(i, m);
        trails.current!.setColorAt(i, t.red ? red : white);
      });
      trails.current.instanceMatrix.needsUpdate = true;
      if (trails.current.instanceColor) trails.current.instanceColor.needsUpdate = true;
    }
  });
  return (
    <group position={[0, -1.4, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -LEN / 2 + 8]}>
        <planeGeometry args={[7, LEN]} />
        <meshStandardMaterial map={asphalt} roughness={0.75} metalness={0.15} />
      </mesh>
      {[-1.9, 1.9].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.004, -LEN / 2 + 8]}>
          <planeGeometry args={[0.07, LEN]} />
          <meshBasicMaterial color="#d8d8d0" />
        </mesh>
      ))}
      <instancedMesh ref={dashes} args={[undefined, undefined, 24]}>
        <boxGeometry args={[0.1, 0.01, 1.2]} />
        <meshBasicMaterial color={LANE} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={trails} args={[undefined, undefined, 14]}>
        <boxGeometry args={[0.04, 0.04, 3.2]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.75} blending={THREE.AdditiveBlending} />
      </instancedMesh>
      <Streetlights />
      <Sign />
    </group>
  );
}

function Streetlights() {
  const halo = glowTexture();
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => {
        const z = 2 - i * 7;
        return (
          <group key={i} position={[-3.2, 0, z]}>
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.035, 0.05, 3.2, 8]} />
              <meshStandardMaterial color="#2c2d30" metalness={0.6} roughness={0.5} />
            </mesh>
            <mesh position={[0.4, 3.2, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
              <meshStandardMaterial color="#2c2d30" />
            </mesh>
            <sprite position={[0.8, 3.15, 0]} scale={1.6}>
              <spriteMaterial map={halo} color="#ffcf85" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
            <pointLight position={[0.8, 3, 0]} intensity={i < 3 ? 6 : 0} distance={6} color="#ffcf85" />
          </group>
        );
      })}
    </group>
  );
}

/** The roadside sign: a lit box on two legs, lettering painted to canvas. */
function Sign() {
  const tex = useCanvasTexture(512, (g, s) => {
    g.fillStyle = "#0e0e0f";
    g.fillRect(0, 0, s, s);
    g.fillStyle = LANE;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "bold 120px 'Bebas Neue', Impact, sans-serif";
    g.shadowColor = LANE;
    g.shadowBlur = 24;
    g.fillText("ROADSIDE", s / 2, s * 0.36);
    g.font = "bold 92px 'Bebas Neue', Impact, sans-serif";
    g.fillStyle = "#fff6d8";
    g.fillText("CAFE", s / 2, s * 0.62);
    g.fillStyle = LANE;
    g.fillRect(s * 0.18, s * 0.78, s * 0.64, 6);
  });
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) ref.current.emissiveIntensity = 1.4 + (Math.sin(t * 23) > 0.97 ? -0.6 : 0);
  });
  return (
    <group position={[2.7, 0, -3.5]} rotation={[0, -0.5, 0]}>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]}>
          <boxGeometry args={[0.06, 1.8, 0.06]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
      <mesh position={[0, 2.35, 0]}>
        <boxGeometry args={[2.1, 1.3, 0.18]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, 2.35, 0.095]}>
        <planeGeometry args={[2, 2]} />
        <meshStandardMaterial ref={ref} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.3, 0.8]} intensity={10} distance={5} color={LANE} />
    </group>
  );
}

export default function RoadScene(props: SceneProps) {
  return (
    <Stage {...props} fog="#0c0c0d" env="#141416" warm="#ffd9a0" envIntensity={0.5} camera={[0, 0.6, 7]} fov={40} controls={false}>
      <CamScroll progress={props.progress} from={[0.2, 0.4, 7]} to={[1.6, 0.9, 5.2]} look={[0, -0.2, -6]} lookTo={[2.2, 0.4, -3.5]} />
      <Road progress={props.progress} />
    </Stage>
  );
}
