import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { memo, useMemo, useRef } from "react";

// Subtle, slow-drifting galaxy field that sits behind the whole page.
// Kept intentionally lighter than HeroScene3D so it doesn't fight the
// section content — small points, low opacity, slow rotation, no shapes.
function AmbientGalaxy({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null!);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#a78bfa"),
      new THREE.Color("#f0abfc"),
      new THREE.Color("#93c5fd"),
      new THREE.Color("#c4b5fd"),
    ];
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 0.55) * 14 + 1;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = Math.sin(a) * r - 4;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.018,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.008;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
  });

  return <points ref={ref} geometry={geo} material={mat} />;
}

const AmbientScene3D = memo(({ mobile = false }: { mobile?: boolean }) => (
  <Canvas
    camera={{ position: [0, 0, 6], fov: 60 }}
    gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
    dpr={[1, mobile ? 1 : 1.25]}
    style={{
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    }}
  >
    <AmbientGalaxy count={mobile ? 1200 : 2800} />
  </Canvas>
));

export default AmbientScene3D;
