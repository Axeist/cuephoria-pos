import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRef, useMemo, memo } from "react";

// ─── Galaxy particle field ────────────────────────────────────────────────────
function Galaxy({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null!);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#a78bfa"),
      new THREE.Color("#f0abfc"),
      new THREE.Color("#93c5fd"),
      new THREE.Color("#7c3aed"),
      new THREE.Color("#e879f9"),
    ];
    for (let i = 0; i < count; i++) {
      const arm = (Math.floor(Math.random() * 3) / 3) * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.45) * 9 + 0.5;
      const angle = arm + (radius / 9) * Math.PI * 3 + (Math.random() - 0.5) * 0.5;
      pos[i * 3]     = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * (1 - radius / 14) * 3;
      pos[i * 3 + 2] = Math.sin(angle) * radius - 2;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);

  const mat = useMemo(() => new THREE.PointsMaterial({
    size: 0.022, vertexColors: true, transparent: true,
    opacity: 0.75, depthWrite: false, sizeAttenuation: true,
  }), []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.016;
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, state.pointer.y * 0.08 - 0.15, 0.012);
    ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, state.pointer.x * 0.04, 0.012);
  });

  return <points ref={ref} geometry={geo} material={mat} />;
}

// ─── Floating wireframe shape ─────────────────────────────────────────────────
type ShapeType = "icosahedron" | "torusknot" | "octahedron";

function WireShape({ type, position, color, speed, scale = 1, floatOffset = 0 }: {
  type: ShapeType; position: [number, number, number];
  color: string; speed: number; scale?: number; floatOffset?: number;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const originY = position[1];

  const { geo, wireMat, glowMat } = useMemo(() => {
    const geo =
      type === "icosahedron" ? new THREE.IcosahedronGeometry(1, 1)
      : type === "torusknot" ? new THREE.TorusKnotGeometry(0.7, 0.22, 80, 8)
      : new THREE.OctahedronGeometry(1);
    const c = new THREE.Color(color);
    const wireMat = new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: 0.11, depthWrite: false });
    const glowMat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.025, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide });
    return { geo, wireMat, glowMat };
  }, [type, color]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.x += 0.003 * speed;
    groupRef.current.rotation.y += 0.007 * speed;
    groupRef.current.rotation.x += state.pointer.y * 0.0007;
    groupRef.current.rotation.y += state.pointer.x * 0.0007;
    // Float up/down
    groupRef.current.position.y = originY + Math.sin(t * 0.5 + floatOffset) * 0.35;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh geometry={geo} material={wireMat} />
      <mesh geometry={geo} material={glowMat} scale={1.18} />
    </group>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
//
// Wireframe shapes are all pushed to the right half of the canvas (x > 2) so
// they frame the dashboard mockup without sitting behind the headline column.
// Anything that has to sit on the left is pushed far back (z ≤ -12) and kept
// small, so it reads as distant ambient geometry instead of a dangling object.
function Scene({ mobile }: { mobile: boolean }) {
  return (
    <>
      <color attach="background" args={["#07030f"]} />
      <Galaxy count={mobile ? 2500 : 5000} />
      <WireShape type="icosahedron" position={[ 5.0,  0.8, -3.5]} color="#a78bfa" speed={0.8} scale={1.3} floatOffset={0}   />
      <WireShape type="torusknot"   position={[ 4.2, -1.8, -5.5]} color="#f0abfc" speed={0.6} scale={0.9} floatOffset={1.5} />
      <WireShape type="octahedron"  position={[ 3.0,  2.6, -7.0]} color="#93c5fd" speed={1.0} scale={1.2} floatOffset={3.0} />
      <WireShape type="icosahedron" position={[-6.5, -1.2, -13.0]} color="#e879f9" speed={0.4} scale={1.6} floatOffset={4.5} />
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
const HeroScene3D = memo(({ mobile = false }: { mobile?: boolean }) => (
  <Canvas
    camera={{ position: [0, 0, 6], fov: 60 }}
    gl={{ antialias: true, alpha: false }}
    dpr={[1, mobile ? 1 : 1.5]}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
  >
    <Scene mobile={mobile} />
  </Canvas>
));

export default HeroScene3D;
