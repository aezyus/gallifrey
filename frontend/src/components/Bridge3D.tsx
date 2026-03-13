"use client";

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Bridge3DProps {
  isAnomaly?: boolean;
  anomalyScore?: number;
}

function BridgeModel({ isAnomaly }: Bridge3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  /*
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.1;

    if (pulseRef.current && isAnomaly) {
      pulseRef.current.scale.setScalar(1 + Math.sin(t * 10) * 0.2);
    }
  });
  */

  const mainColor = isAnomaly ? '#ff1e1e' : '#00f2ff';

  return (
    <group ref={groupRef}>
      {/* Main Span */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[10, 0.5, 2]} />
        <meshStandardMaterial color={mainColor} wireframe transparent opacity={0.3} />
      </mesh>

      {/* Pillars */}
      <mesh position={[-4, -2, 0]}>
        <boxGeometry args={[0.5, 4, 0.5]} />
        <meshStandardMaterial color={mainColor} wireframe transparent opacity={0.3} />
      </mesh>
      <mesh position={[4, -2, 0]}>
        <boxGeometry args={[0.5, 4, 0.5]} />
        <meshStandardMaterial color={mainColor} wireframe transparent opacity={0.3} />
      </mesh>

      {/* Cables */}
      <mesh position={[0, 2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[5, 0.05, 16, 32, Math.PI]} />
        <meshStandardMaterial color={mainColor} wireframe transparent opacity={0.3} />
      </mesh>

      {/* Critical Joint Highlight */}
      {isAnomaly && (
        <mesh ref={pulseRef} position={[2, 0, 0]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#ff1e1e" emissive="#ff0000" emissiveIntensity={2} />
        </mesh>
      )}
    </group>
  );
}

export function DigitalTwin3D({ isAnomaly = false, anomalyScore = 0 }: Bridge3DProps) {
  const [isReady, setIsReady] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    setIsReady(true);

    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebglSupported(Boolean(gl));
    } catch {
      setWebglSupported(false);
    }
  }, []);

  return (
    <div className="w-full h-full min-h-[400px] relative rounded-3xl overflow-hidden bg-black/40 hud-border hud-corner-extra">
      <div className="absolute top-4 left-6 z-10">
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Asset-01 // Digital Twin</h4>
        <div className="flex items-center gap-2 mt-1">
          <div className={isAnomaly ? "w-2 h-2 bg-red-500 rounded-full animate-pulse" : "w-2 h-2 bg-emerald-500 rounded-full"} />
          <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">
            {isAnomaly ? "Model: Active Alert" : "Model: Monitoring"}
          </span>
        </div>
      </div>

      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="scanline" />

      {!isReady || !webglSupported ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-4 py-3 rounded-xl border border-white/10 bg-black/50 text-white/60 text-xs uppercase tracking-widest">
            {!isReady ? 'Initializing Digital Twin...' : 'WebGL not available'}
          </div>
        </div>
      ) : (
        <Canvas camera={{ position: [0, 2, 12], fov: 50 }}>
          <ambientLight intensity={1} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#00f2ff" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#ff0000" />

          <BridgeModel isAnomaly={isAnomaly} anomalyScore={anomalyScore} />

          <OrbitControls
            enableZoom={false}
            autoRotate={!isAnomaly}
            autoRotateSpeed={0.5}
          />

          <gridHelper args={[20, 20, '#00f2ff', '#004444']} position={[0, -4, 0]} />
        </Canvas>
      )}

      <div className="absolute bottom-6 right-8 flex flex-col items-end gap-1">
         <span className="text-[8px] font-mono text-white/30 truncate max-w-[150px]">SHM_BR_019 // ANALYTICS_READY</span>
      </div>
    </div>
  );
}
