import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CamScroll, Embers, Stage, rng, smooth, type SceneProps } from "./kit";

const ROSE = "#e7a3b1";

/** A rough, faceted salt crystal: a jittered icosahedron, flat shaded so every face catches the rose rim. */
function crystalGeo(seed: number) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const r = rng(seed);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const map = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!map.has(key)) map.set(key, 0.72 + r() * 0.5);
    const k = map.get(key)!;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 1.15, pos.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

const PIECES = Array.from({ length: 11 }, (_, i) => {
  const r = rng(40 + i * 7);
  const a = (i / 11) * Math.PI * 2 + r() * 0.4;
  const ring = i === 0 ? 0 : 0.55 + r() * 0.55;
  return {
    seed: 40 + i * 7,
    home: new THREE.Vector3(Math.cos(a) * ring, (r() - 0.5) * 0.7 + (i === 0 ? 0.15 : 0), Math.sin(a) * ring * 0.8),
    out: new THREE.Vector3(Math.cos(a) * (1.6 + r() * 1.4), (r() - 0.35) * 2.4, Math.sin(a) * (1 + r()) - 0.2),
    size: i === 0 ? 0.95 : 0.28 + r() * 0.35,
    spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.6),
  };
});

function Crystals({ progress }: { progress: SceneProps["progress"] }) {
  const geos = useMemo(() => PIECES.map((p) => crystalGeo(p.seed)), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = smooth(0.05, 0.85, progress.get());
    PIECES.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      v.copy(c.home).lerp(c.out, p);
      v.y += Math.sin(t * 0.7 + i) * 0.05;
      m.position.copy(v);
      m.rotation.set(c.spin.x * t + i, c.spin.y * t + p * 2 * c.spin.y, c.spin.z * t);
    });
  });
  return (
    <group>
      {PIECES.map((c, i) => (
        <mesh key={i} ref={(n) => void (refs.current[i] = n)} geometry={geos[i]} scale={c.size}>
          <meshPhysicalMaterial
            color={i === 0 ? "#2a2024" : "#3b2b31"}
            roughness={0.12}
            metalness={0.05}
            clearcoat={1}
            clearcoatRoughness={0.08}
            iridescence={1}
            iridescenceIOR={1.45}
            iridescenceThicknessRange={[180, 520]}
            sheen={1}
            sheenColor={ROSE}
            sheenRoughness={0.35}
            envMapIntensity={1.6}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

export default function SaltScene(props: SceneProps) {
  return (
    <Stage {...props} fog="#0f0c0d" env="#1a1214" warm="#ffd9e0" camera={[0, 0.6, 7.6]}>
      <CamScroll progress={props.progress} from={[0, 0.6, 7.6]} to={[0, 0.2, 6.2]} />
      <pointLight position={[-2.5, 1.5, -2]} intensity={18} distance={9} color={ROSE} />
      <pointLight position={[2.4, -1, 2]} intensity={6} distance={7} color="#ffd9c2" />
      <Crystals progress={props.progress} />
      <Embers count={props.lite ? 40 : 90} origin={[0, -1.8, 0]} area={[4, 1, 3]} rise={4} color="#f4c6cf" size={0.05} speed={0.06} />
    </Stage>
  );
}
