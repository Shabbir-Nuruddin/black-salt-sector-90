import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, RoundedBox, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SITE } from "../content";
import type { Pour } from "../lib";
import { Backdrop, M, Ready, Table, flick, prep, useNode, type Flame } from "./real";
import { StillLife } from "./celebration";
import { Steam, lathe, rng, smooth, speckle, useCanvasTexture, type SceneProps } from "./kit";

/*
 * Scroll-scrubbed pour. A scanned jug or brass pan hangs over the vessel; the
 * first scroll tilts it, a physically shaped stream (parabola from the lip,
 * thinning as it speeds up) fills the vessel, the surface ripples where the
 * stream lands, then the pourer rights itself and the camera pushes in.
 * Units are metres; the table top is y = 0 and the vessel sits at the origin.
 */

const POUR: Pour = SITE.pour ?? { from: "jug", into: "glass", liquid: "#b5302a", foam: "#f0a090", thick: 1 };
const G = 9.8;

type Vessel = { top: number; base: number; r: (y: number) => number; fill: [number, number]; land: number; cam: number; inset: number };
const lerpY = (pts: [number, number][]) => (y: number) => {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [y1, r1] = pts[i];
    const [y0, r0] = pts[i - 1];
    if (y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return pts[pts.length - 1][1];
};
const VESSELS: Record<Pour["into"], Vessel> = {
  glass: { top: 0.115, base: 0.012, r: lerpY([[0.012, 0.0305], [0.115, 0.0375]]), fill: [0.03, 0.094], land: 0.004, cam: 0.95, inset: 0.0006 },
  kulhad: { top: 0.085, base: 0.008, r: lerpY([[0.008, 0.022], [0.03, 0.028], [0.07, 0.0325], [0.085, 0.0335]]), fill: [0.024, 0.072], land: 0.003, cam: 0.9, inset: 0.0006 },
  kadhai: { top: 0.108, base: 0.012, r: lerpY([[0.012, 0.118], [0.04, 0.13], [0.108, 0.145]]), fill: [0.032, 0.084], land: 0.03, cam: 1.9, inset: 0.004 },
};
const V = VESSELS[POUR.into];

type Pourer = { model: string; tip: [number, number, number]; spin: number; rest: number; tilt: number; vx: number };
const POURERS: Record<Pour["from"], Pourer> = {
  // ceramic jug: spout tip measured from the scan, pours along +x
  jug: { model: "jug_01", tip: [0.123, 0.21, 0], spin: 0, rest: 0, tilt: -1.12, vx: 0.32 },
  // brass tadka pan, turned so its pouring lip faces +x and the handle trails left
  pan: { model: "brass_pan_01", tip: [0.09, 0.053, 0], spin: Math.PI / 2, rest: -0.12, tilt: -0.82, vx: 0.24 },
};
const PR = POURERS[POUR.from];
const VY0 = -0.45;
const TIP_Y = V.top + 0.1;
const FALL = (L: number) => {
  // time for the stream to drop from the lip to level L with the lip's downward speed
  const h = TIP_Y - L;
  return (VY0 + Math.sqrt(VY0 * VY0 + 2 * G * h)) / G;
};
// place the lip so the stream lands just off centre at mid-fill
const TIP_X = V.land - (PR.vx / Math.max(1, POUR.thick)) * FALL((V.fill[0] + V.fill[1]) / 2);
const VX = PR.vx / Math.max(1, POUR.thick);

[PR.model, "food_lime_01", "brass_pot_01", POUR.into === "kadhai" ? "brass_pot_02" : ""].filter(Boolean).forEach((n) => useGLTF.preload(M(n)));

/** Everything time-varying lives here so every part reads the same frame. */
type State = {
  P: number; // damped scroll progress
  t: number; // seconds since mount
  intro: number;
  tilt: number;
  head: number;
  tail: number;
  L: number; // liquid level (m)
  impacts: { x: number; z: number; t: number; a: number }[];
  lastImpact: number;
  butter: number;
};

const frame = (s: State, p: number, t: number, still: boolean) => {
  s.t = t;
  s.P = still ? 0.62 : p;
  const P = s.P;
  s.intro = still ? 1 : smooth(0.2, 2.4, t);
  s.tilt = PR.rest + (PR.tilt - PR.rest) * (smooth(0.1, 0.22, P) - smooth(0.8, 0.9, P));
  s.head = smooth(0.2, 0.27, P);
  s.tail = smooth(0.74, 0.8, P);
  s.L = V.fill[0] + (V.fill[1] - V.fill[0]) * smooth(0.24, 0.78, P);
  s.butter = POUR.butter ? smooth(0.8, 0.95, P) : 0;
};

/* ---------- liquid surface: polar grid displaced by decaying ring waves ---------- */

function polarDisc(rings: number, seg: number) {
  const pos: number[] = [0, 0, 0];
  const idx: number[] = [];
  for (let r = 1; r <= rings; r++) {
    const rad = r / rings;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2;
      pos.push(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    }
  }
  const at = (r: number, s: number) => (r === 0 ? 0 : 1 + (r - 1) * seg + (s % seg));
  for (let s = 0; s < seg; s++) idx.push(0, at(1, s + 1), at(1, s));
  for (let r = 1; r < rings; r++)
    for (let s = 0; s < seg; s++) {
      const a = at(r, s), b = at(r, s + 1), c = at(r + 1, s), d = at(r + 1, s + 1);
      idx.push(a, b, c, b, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(new Array(pos.length).fill(1), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function Surface({ s }: { s: State }) {
  const geo = useMemo(() => polarDisc(30, 72), []);
  const base = useMemo(() => geo.attributes.position.array.slice() as Float32Array, [geo]);
  const liquid = useMemo(() => new THREE.Color(POUR.liquid), []);
  const foam = useMemo(() => new THREE.Color(POUR.foam), []);
  const mesh = useRef<THREE.Mesh>(null);
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const R = V.r(s.L) - V.inset;
    m.position.y = s.L;
    const pos = geo.attributes.position.array as Float32Array;
    const col = geo.attributes.color.array as Float32Array;
    const flowing = s.head > 0.6 && s.tail < 0.98;
    const lx = TIP_X + VX * FALL(s.L);
    for (let i = 0; i < pos.length; i += 3) {
      const x = base[i] * R;
      const z = base[i + 2] * R;
      let h = 0;
      for (const im of s.impacts) {
        const age = s.t - im.t;
        const d = Math.hypot(x - im.x, z - im.z);
        h += (im.a * Math.exp(-2.4 * age) * Math.sin(260 * d - 34 * age)) / (1 + 70 * d);
      }
      // fade the waves into the wall so the rim stays put
      const edge = 1 - Math.pow(Math.hypot(base[i], base[i + 2]), 6);
      pos[i] = x;
      pos[i + 1] = h * edge;
      pos[i + 2] = z;
      // froth gathers where the stream lands
      const fd = Math.hypot(x - lx, z);
      const fr = flowing ? Math.exp(-fd * (POUR.thick > 1.3 ? 90 : 55)) * 0.85 : 0;
      tmp.copy(liquid).lerp(foam, fr);
      col[i] = tmp.r;
      col[i + 1] = tmp.g;
      col[i + 2] = tmp.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return (
    <mesh ref={mesh} geometry={geo} renderOrder={1}>
      <meshPhysicalMaterial vertexColors roughness={POUR.thick > 1.3 ? 0.32 : 0.08} clearcoat={1} clearcoatRoughness={0.06} envMapIntensity={1.2} />
    </mesh>
  );
}

/** The liquid's body inside a see-through glass: a tapered cylinder from the base to the level. */
function Body({ s }: { s: State }) {
  const seg = 48;
  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, seg, 1, true), []);
  useFrame(() => {
    const pos = geo.attributes.position.array as Float32Array;
    const rt = V.r(s.L) - V.inset;
    const rb = V.r(V.base) - V.inset;
    for (let row = 0; row < 2; row++)
      for (let k = 0; k <= seg; k++) {
        const i = (row * (seg + 1) + k) * 3;
        const a = (k / seg) * Math.PI * 2;
        const r = row === 0 ? rt : rb;
        pos[i] = Math.sin(a) * r;
        pos[i + 1] = row === 0 ? s.L : V.base + 0.0004;
        pos[i + 2] = Math.cos(a) * r;
      }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  });
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial color={POUR.liquid} roughness={0.15} clearcoat={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ---------- the stream: a tube rebuilt each frame along the falling parabola ---------- */

const RINGS = 44;
const SIDES = 12;
function Stream({ s }: { s: State }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(RINGS * SIDES * 3), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(RINGS * SIDES * 3), 3));
    const idx: number[] = [];
    for (let r = 0; r < RINGS - 1; r++)
      for (let k = 0; k < SIDES; k++) {
        const a = r * SIDES + k, b = r * SIDES + ((k + 1) % SIDES), c = a + SIDES, d = b + SIDES;
        idx.push(a, c, b, b, c, d);
      }
    g.setIndex(idx);
    return g;
  }, []);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const on = s.head > 0.001 && s.tail < 0.999;
    m.visible = on;
    if (!on) return;
    const T = FALL(s.L);
    const ta = s.tail * T;
    const tb = s.head * T;
    const r0 = 0.0042 * POUR.thick;
    const v0 = Math.hypot(VX, VY0);
    const pos = geo.attributes.position.array as Float32Array;
    const nor = geo.attributes.normal.array as Float32Array;
    for (let r = 0; r < RINGS; r++) {
      const u = r / (RINGS - 1);
      const tt = ta + (tb - ta) * u;
      const x = TIP_X + VX * tt;
      const y = TIP_Y + VY0 * tt - 0.5 * G * tt * tt;
      const vy = VY0 - G * tt;
      const sp = Math.hypot(VX, vy);
      const tx = VX / sp, ty = vy / sp;
      // continuity: faster liquid is thinner; a travelling bulge keeps it alive
      let rad = r0 * Math.max(0.5, Math.sqrt(v0 / sp));
      rad *= 1 + 0.13 * Math.sin(tt * 90 - s.t * 26) + 0.05 * Math.sin(tt * 210 - s.t * 41);
      // round off the leading and trailing ends
      const endA = s.tail > 0.001 ? smooth(0, 0.06, u) : 1;
      const endB = s.head < 0.999 ? smooth(1, 0.94, u) : 1;
      rad *= Math.max(0.15, Math.min(endA, endB));
      const n1x = -ty, n1y = tx;
      for (let k = 0; k < SIDES; k++) {
        const a = (k / SIDES) * Math.PI * 2;
        const c = Math.cos(a), sn = Math.sin(a);
        const nx = c * n1x, ny = c * n1y, nz = sn;
        const i = (r * SIDES + k) * 3;
        pos[i] = x + nx * rad;
        pos[i + 1] = y + ny * rad;
        pos[i + 2] = nz * rad;
        nor[i] = nx;
        nor[i + 1] = ny;
        nor[i + 2] = nz;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.normal.needsUpdate = true;
    geo.computeBoundingSphere();
  });
  return (
    <mesh ref={mesh} geometry={geo} frustumCulled={false}>
      <meshPhysicalMaterial color={POUR.liquid} roughness={0.06} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={1.6} />
    </mesh>
  );
}

/* ---------- drops: idle drips from the lip and splashes where the stream lands ---------- */

const DROPS = 48;
function Drops({ s, still }: { s: State; still: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const d = useMemo(
    () => ({ p: new Float32Array(DROPS * 3), v: new Float32Array(DROPS * 3), life: new Float32Array(DROPS), drip: new Uint8Array(DROPS), next: 0, lastDrip: 0, rand: rng(11) }),
    [],
  );
  const o = useMemo(() => new THREE.Object3D(), []);
  const spawn = (x: number, y: number, z: number, vx: number, vy: number, vz: number, drip: boolean) => {
    const i = d.next;
    d.next = (d.next + 1) % DROPS;
    d.p.set([x, y, z], i * 3);
    d.v.set([vx, vy, vz], i * 3);
    d.life[i] = 1;
    d.drip[i] = drip ? 1 : 0;
  };
  useFrame((_, dtRaw) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(dtRaw, 1 / 30);
    const r = d.rand;
    const flowing = s.head > 0.95 && s.tail < 0.02;
    const R = V.r(s.L) - V.inset;
    if (!still) {
      // a slow drip from the lip while the guest hasn't scrolled yet
      if (s.P < 0.1 && s.intro > 0.98 && s.t - d.lastDrip > 1.5) {
        d.lastDrip = s.t;
        spawn(TIP_X, TIP_Y - 0.004, 0, VX * 0.15, -0.05, 0, true);
      }
      // the stream keeps the surface moving
      if (flowing && s.t - s.lastImpact > 0.09) {
        s.lastImpact = s.t;
        const lx = TIP_X + VX * FALL(s.L);
        s.impacts.push({ x: lx + (r() - 0.5) * 0.004, z: (r() - 0.5) * 0.004, t: s.t, a: 0.0009 / POUR.thick });
        const n = POUR.thick > 1.3 ? 1 : 3;
        for (let k = 0; k < n; k++) {
          const a = r() * Math.PI * 2;
          const sp = (0.12 + r() * 0.22) / POUR.thick;
          spawn(lx, s.L + 0.002, 0, Math.cos(a) * sp, (0.35 + r() * 0.5) / POUR.thick, Math.sin(a) * sp, false);
        }
      }
    }
    if (s.impacts.length > 10) s.impacts.splice(0, s.impacts.length - 10);
    while (s.impacts.length && s.t - s.impacts[0].t > 2.2) s.impacts.shift();

    for (let i = 0; i < DROPS; i++) {
      if (d.life[i] <= 0) {
        o.scale.setScalar(0);
      } else {
        const j = i * 3;
        d.v[j + 1] -= G * dt;
        d.p[j] += d.v[j] * dt;
        d.p[j + 1] += d.v[j + 1] * dt;
        d.p[j + 2] += d.v[j + 2] * dt;
        const inside = Math.hypot(d.p[j], d.p[j + 2]) < R;
        if (d.p[j + 1] <= s.L && d.v[j + 1] < 0) {
          d.life[i] = 0;
          if (d.drip[i] && inside) {
            s.impacts.push({ x: d.p[j], z: d.p[j + 2], t: s.t, a: 0.0012 });
            for (let k = 0; k < 3; k++) {
              const a = r() * Math.PI * 2;
              spawn(d.p[j], s.L + 0.001, d.p[j + 2], Math.cos(a) * 0.08, 0.28 + r() * 0.18, Math.sin(a) * 0.08, false);
            }
          }
        }
        o.position.set(d.p[j], d.p[j + 1], d.p[j + 2]);
        const vy = d.v[j + 1];
        o.scale.set(1, 1 + Math.min(1.2, Math.abs(vy) * 0.6), 1).multiplyScalar(d.drip[i] ? 0.0032 : 0.0019 * POUR.thick);
      }
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, DROPS]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshPhysicalMaterial color={POUR.liquid} roughness={0.05} clearcoat={1} envMapIntensity={1.6} />
    </instancedMesh>
  );
}

/* ---------- vessels ---------- */

function Glass({ lite }: { lite: boolean }) {
  const geo = useMemo(
    () => lathe([[0, 0], [0.032, 0], [0.0336, 0.003], [0.0402, 0.115], [0.0388, 0.1158], [0.0375, 0.115], [0.0305, 0.012], [0, 0.012]], 72),
    [],
  );
  return (
    <mesh geometry={geo} renderOrder={2} castShadow={!lite}>
      {lite ? (
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.16} roughness={0.04} metalness={0} clearcoat={1} envMapIntensity={2.4} depthWrite={false} side={THREE.DoubleSide} />
      ) : (
        <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.006} ior={1.5} roughness={0.03} clearcoat={1} envMapIntensity={1.6} specularIntensity={1} />
      )}
    </mesh>
  );
}

function Kulhad() {
  const geo = useMemo(
    () => lathe([[0, 0], [0.024, 0], [0.026, 0.004], [0.031, 0.03], [0.036, 0.07], [0.0372, 0.084], [0.0352, 0.086], [0.0335, 0.085], [0.0325, 0.07], [0.028, 0.03], [0.022, 0.008], [0, 0.008]], 72),
    [],
  );
  const map = useCanvasTexture(256, (g, sz) => {
    g.fillStyle = "#a7552f";
    g.fillRect(0, 0, sz, sz);
    const r = rng(5);
    for (let i = 0; i < 40; i++) {
      // the potter's wheel leaves faint horizontal rings
      g.fillStyle = `rgba(${r() > 0.5 ? "70,25,10" : "220,140,90"},${0.05 + r() * 0.08})`;
      g.fillRect(0, r() * sz, sz, 1 + r() * 3);
    }
    speckle(g, sz, 34);
  });
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial map={map} roughness={0.92} envMapIntensity={0.7} />
    </mesh>
  );
}

function Kadhai() {
  const node = useNode("brass_pot_02");
  const o = useMemo(() => prep(node, [], 0, 0), [node]);
  return <primitive object={o} />;
}

/* ---------- extras ---------- */

function Ice({ s }: { s: State }) {
  const cubes = useMemo(() => {
    const r = rng(3);
    return [0, 1, 2].map((i) => ({ a: (i / 3) * Math.PI * 2 + 0.4, rad: 0.013 + r() * 0.004, rot: [r() * 0.6, r() * 3, r() * 0.6] as [number, number, number], ph: r() * 6 }));
  }, []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    cubes.forEach((c, i) => {
      const m = refs.current[i];
      if (!m) return;
      const R = V.r(s.L) - 0.013;
      const rad = Math.min(c.rad, R);
      // ice sits on the bottom until the liquid lifts it, then bobs
      const y = Math.max(V.base + 0.008 + i * 0.006, s.L - 0.006 + Math.sin(s.t * 1.7 + c.ph) * 0.0012);
      m.position.set(Math.cos(c.a) * rad, y, Math.sin(c.a) * rad);
    });
  });
  return (
    <group>
      {cubes.map((c, i) => (
        <RoundedBox key={i} ref={(n: THREE.Mesh | null) => void (refs.current[i] = n)} args={[0.016, 0.016, 0.016]} radius={0.003} smoothness={3} rotation={c.rot}>
          <meshPhysicalMaterial color="#e8f3f7" roughness={0.18} clearcoat={1} envMapIntensity={1.4} />
        </RoundedBox>
      ))}
    </group>
  );
}

function Limes() {
  const lime = useNode("food_lime_01");
  const l = useMemo(() => [0, 1].map(() => prep(lime, [], 0, 0)), [lime]);
  return (
    <group>
      <primitive object={l[0]} position={[V.r(V.top) + 0.07, 0, 0.07]} rotation={[0, 0.7, 0]} />
      <primitive object={l[1]} position={[V.r(V.top) + 0.11, 0, -0.01]} rotation={[0, -1.2, 0]} />
    </group>
  );
}

function Handi() {
  const n = useNode("brass_pot_01");
  const o = useMemo(() => prep(n, [], 0, 0), [n]);
  return <primitive object={o} position={[-0.42, 0, -0.32]} rotation-y={0.5} />;
}

function Butter({ s }: { s: State }) {
  const ref = useRef<THREE.Mesh>(null);
  const landed = useRef(false);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const b = s.butter;
    m.visible = b > 0;
    if (!b) {
      landed.current = false;
      return;
    }
    const drop = smooth(0, 0.35, b);
    const melt = smooth(0.35, 1, b);
    const y0 = TIP_Y + 0.06;
    m.position.set(0.01, y0 + (s.L + 0.004 - y0) * drop * drop - melt * 0.004, 0.012);
    m.scale.set(0.015 * (1 + melt * 0.7), 0.011 * (1 - melt * 0.72), 0.015 * (1 + melt * 0.7));
    if (drop >= 1 && !landed.current) {
      landed.current = true;
      s.impacts.push({ x: 0.01, z: 0.012, t: s.t, a: 0.0018 });
    }
  });
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshPhysicalMaterial color="#fff5d6" roughness={0.35} sheen={0.6} sheenColor="#ffffff" clearcoat={0.4} />
    </mesh>
  );
}

/* ---------- pourer ---------- */

function PourerRig({ s, rig }: { s: State; rig: React.RefObject<THREE.Group | null> }) {
  const node = useNode(PR.model);
  const o = useMemo(() => prep(node, [], 0, 0), [node]);
  useFrame(() => {
    const g = rig.current;
    if (!g) return;
    const k = 1 - s.intro;
    // glides in from the upper left, then breathes slightly while it waits
    g.position.set(TIP_X - k * 0.45, TIP_Y + k * 0.28 + (s.P < 0.12 ? Math.sin(s.t * 1.3) * 0.003 : 0), 0);
    g.rotation.z = s.tilt + k * 0.35;
  });
  return (
    <group ref={rig}>
      <group position={[-PR.tip[0], -PR.tip[1], -PR.tip[2]]}>
        <group rotation-y={PR.spin}>
          <primitive object={o} />
        </group>
      </group>
    </group>
  );
}

/* ---------- camera, flames and the headless framing probe ---------- */

const box = new THREE.Box3();
const corner = new THREE.Vector3();
function ndc(o: THREE.Object3D, cam: THREE.Camera) {
  box.setFromObject(o, true);
  let x0 = 9, y0 = 9, x1 = -9, y1 = -9;
  for (let i = 0; i < 8; i++) {
    corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(cam);
    x0 = Math.min(x0, corner.x);
    x1 = Math.max(x1, corner.x);
    y0 = Math.min(y0, corner.y);
    y1 = Math.max(y1, corner.y);
  }
  return [x0, y0, x1, y1].map((v) => +v.toFixed(3));
}

function Director({ progress, side, still, s, flames, vessel, rig }: Pick<SceneProps, "progress" | "side" | "still"> & { s: State; flames: Flame[]; vessel: React.RefObject<THREE.Group | null>; rig: React.RefObject<THREE.Group | null> }) {
  const { size, pointer } = useThree();
  const start = useRef<number | null>(null);
  const damp = useRef(0);
  const look = useMemo(() => new THREE.Vector3(), []);
  const want = useMemo(() => new THREE.Vector3(), []);
  const n = useRef(0);
  useFrame(({ camera, clock }, dt) => {
    const now = clock.elapsedTime;
    if (start.current === null) start.current = now;
    damp.current += (progress.get() - damp.current) * (1 - Math.pow(0.003, Math.min(dt, 0.1)));
    frame(s, damp.current, now - start.current, !!still);
    const P = s.P;
    const narrow = size.width < 768;
    const cam = camera as THREE.PerspectiveCamera;
    const fov = narrow ? 38 : 28;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    // on phones the frame is tall and thin: aim between the pourer and the vessel so both fit
    // the pan's long handle needs a wider, more left-leaning phone frame than the jug
    const pan = POUR.from === "pan";
    const off = narrow ? -(POUR.into === "kadhai" ? 0.1 : pan ? 0.24 : 0.15) * V.cam : (side === "left" ? -0.27 : 0.27) * V.cam * (POUR.into === "kadhai" ? 0.8 : 1) * (1 - 0.45 * smooth(0.6, 1, P));
    const dist = V.cam * (narrow ? (pan ? 2.3 : 1.75) : 1) * (1 + (1 - s.intro) * 0.45 - 0.2 * smooth(0.25, 1, P));
    const ang = (1 - s.intro) * -0.3 + 0.28 * smooth(0, 1, P) + (still ? 0 : pointer.x * 0.04);
    const lookY = (narrow ? -0.005 : 0.15) * V.cam;
    const elev = 0.24 - 0.08 * smooth(0.2, 1, P) + (still ? 0 : pointer.y * 0.02);
    want.set(off + Math.sin(ang) * dist * Math.cos(elev), lookY + Math.sin(elev) * dist, Math.cos(ang) * dist * Math.cos(elev));
    camera.position.lerp(want, still ? 1 : 1 - Math.pow(0.02, dt));
    look.set(off, lookY, 0);
    camera.lookAt(look);

    for (const f of flames) {
      const on = still ? 1 : smooth(f.at, f.at + 0.5, s.t);
      const k = flick(now, f.seed) * on;
      f.mat.emissiveIntensity = f.base * k;
      f.mat.opacity = on;
      if (f.light) f.light.intensity = 0.9 * k;
    }

    // framing probe for the headless check
    if (vessel.current && rig.current && now - n.current > 0.25) {
      n.current = now;
      (window as unknown as { __pour: object }).__pour = { P: +P.toFixed(3), L: +s.L.toFixed(4), vessel: ndc(vessel.current, camera), pourer: ndc(rig.current, camera) };
    }
  });
  return null;
}

export default function PourScene({ progress, lite, still, side }: SceneProps) {
  const [ready, setReady] = useState(false);
  const flames = useMemo<Flame[]>(() => [], []);
  const s = useMemo<State>(() => ({ P: 0, t: 0, intro: 0, tilt: 0, head: 0, tail: 0, L: V.fill[0], impacts: [], lastImpact: 0, butter: 0 }), []);
  const vessel = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const backdrop = SITE.hero.backdrop ?? SITE.hero.fallback;
  return (
    <Canvas
      shadows={!lite}
      frameloop={still ? "demand" : "always"}
      dpr={lite ? [1, 1.25] : [1, 1.75]}
      camera={{ position: [0, 0.4, 1.6], fov: 28, near: 0.02, far: 30 }}
      gl={{ antialias: !lite, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y", opacity: ready ? 1 : 0, transition: "opacity 1.2s cubic-bezier(.2,.7,.2,1)" }}
    >
      <Suspense fallback={null}>
        <Environment files="/hdr/warm_restaurant_night_1k.hdr" environmentIntensity={0.6} environmentRotation={[0, 2.2, 0]} />
        <Backdrop src={backdrop} progress={progress} />
        <Table lite={lite} />
        <group ref={vessel}>
          {POUR.into === "glass" && <Glass lite={lite} />}
          {POUR.into === "kulhad" && <Kulhad />}
          {POUR.into === "kadhai" && <Kadhai />}
        </group>
        {POUR.into === "glass" && <Body s={s} />}
        <Surface s={s} />
        <Stream s={s} />
        <Drops s={s} still={!!still} />
        {POUR.ice && <Ice s={s} />}
        {POUR.butter && <Butter s={s} />}
        {POUR.lime && <Limes />}
        {POUR.extras === "handi" && <Handi />}
        {POUR.extras === "candles" && (
          <group position={[0.05, 0, -0.55]}>
            <StillLife flames={flames} />
          </group>
        )}
        {POUR.hot && (
          <Steam count={10} origin={[0, V.fill[1], 0]} spread={V.r(V.top) * 0.9} rise={0.22 * V.cam} size={0.07 * V.cam} opacity={0.16} speed={0.22} strength={() => smooth(0.3, 0.8, s.P) * 0.7 + 0.3} />
        )}
        <PourerRig s={s} rig={rig} />
        <ContactShadows position={[0, 0.001, 0]} scale={1.6} blur={2.2} far={0.4} opacity={0.7} frames={1} resolution={lite ? 256 : 512} />
        <spotLight position={[0.9, 1.4, 1.1]} angle={0.4} penumbra={0.9} intensity={9} color="#ffe6c8" castShadow={!lite} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
        <directionalLight position={[-1.4, 0.9, -1.6]} intensity={1.1} color={SITE.theme.accent} />
        <Director progress={progress} side={side} still={still} s={s} flames={flames} vessel={vessel} rig={rig} />
        {!lite && (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur luminanceThreshold={1} intensity={0.7} radius={0.6} />
            <Vignette offset={0.25} darkness={0.6} />
          </EffectComposer>
        )}
        <Ready onReady={() => setReady(true)} />
      </Suspense>
    </Canvas>
  );
}
