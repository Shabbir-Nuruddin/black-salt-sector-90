import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CamScroll, Stage, Steam, glowTexture, rng, useCanvasTexture, type SceneProps } from "./kit";

const AMBER = "#f2b45a";

/** Banded "Jupiter" globe skin, painted once: warm bands, a storm eye, soft turbulence. */
function useBands() {
  return useCanvasTexture(512, (g, s) => {
    const r = rng(3);
    const cols = ["#f7d8a0", "#e8a95a", "#c9773a", "#f3c27a", "#b9652f", "#f9e2b6", "#d98d48"];
    let y = 0;
    while (y < s) {
      const h = 10 + r() * 46;
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.fillRect(0, y, s, h);
      y += h;
    }
    g.globalAlpha = 0.18;
    for (let i = 0; i < 260; i++) {
      g.fillStyle = r() > 0.5 ? "#fff3dc" : "#8f4a22";
      g.beginPath();
      g.ellipse(r() * s, r() * s, 20 + r() * 60, 2 + r() * 5, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 0.85;
    g.fillStyle = "#b3522a";
    g.beginPath();
    g.ellipse(s * 0.62, s * 0.6, 34, 18, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  });
}

const LAMPS = Array.from({ length: 9 }, (_, i) => {
  const r = rng(11 + i * 5);
  return {
    x: (i - 4) * 0.78 + (r() - 0.5) * 0.4,
    z: (r() - 0.5) * 2.6,
    drop: 1.2 + r() * 1.9,
    size: 0.26 + r() * 0.24,
    phase: r() * 6,
    tilt: r() * 6,
  };
});

function Lamps() {
  const tex = useBands();
  const refs = useRef<(THREE.Group | null)[]>([]);
  const halo = glowTexture();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    LAMPS.forEach((l, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.rotation.z = Math.sin(t * 0.6 + l.phase) * 0.05;
      g.rotation.x = Math.cos(t * 0.45 + l.phase) * 0.04;
      g.children[1].rotation.y = t * 0.12 + l.tilt;
    });
  });
  return (
    <group position={[0, 3.2, 0]}>
      {LAMPS.map((l, i) => (
        <group key={i} ref={(n) => void (refs.current[i] = n)} position={[l.x, 0, l.z]}>
          <mesh position={[0, -l.drop / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, l.drop, 4]} />
            <meshBasicMaterial color="#2a2018" />
          </mesh>
          <mesh position={[0, -l.drop - l.size, 0]}>
            <sphereGeometry args={[l.size, 48, 32]} />
            <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffb562" emissiveIntensity={1.35} roughness={0.55} toneMapped={false} />
          </mesh>
          <sprite position={[0, -l.drop - l.size, 0]} scale={l.size * 7}>
            <spriteMaterial map={halo} color={AMBER} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}
    </group>
  );
}

/** The city below the rooftop: a field of warm and white windows sinking into fog. */
function City() {
  const geo = useMemo(() => {
    const r = rng(77);
    const n = 1400;
    const p = new Float32Array(n * 3);
    const c = new Float32Array(n * 3);
    const warm = new THREE.Color("#ffc278");
    const cool = new THREE.Color("#dfe8ff");
    for (let i = 0; i < n; i++) {
      const tower = Math.floor(r() * 70);
      const tx = ((tower * 37) % 70) / 70;
      p[i * 3] = (tx - 0.5) * 34 + (r() - 0.5) * 0.5;
      p[i * 3 + 1] = -3.4 + r() * (1 + ((tower * 13) % 7)) * 0.7;
      p[i * 3 + 2] = -9 - ((tower * 7) % 10) * 0.9;
      (r() > 0.3 ? warm : cool).toArray(c, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.09} vertexColors transparent opacity={0.85} map={glowTexture()} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

export default function LanternScene(props: SceneProps) {
  return (
    <Stage {...props} fog="#0b0e17" env="#141826" warm="#ffd9a6" camera={[0, -0.6, 8.5]} envIntensity={0.7}>
      <CamScroll progress={props.progress} from={[0, -0.8, 8.5]} to={[0.4, 1.6, 7]} look={[0, 0.4, 0]} lookTo={[0, -0.6, -2]} />
      <pointLight position={[0, 1.2, 1.5]} intensity={14} distance={8} color={AMBER} />
      <Lamps />
      <City />
      {/* rooftop misters: a cool low haze drifting through the lamps */}
      <Steam count={props.lite ? 8 : 16} origin={[0, -1.6, 0.5]} spread={6} rise={2.2} size={2.6} color="#c9d6ff" opacity={0.09} speed={0.05} />
    </Stage>
  );
}
