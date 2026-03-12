"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Sensor, StructureType } from "@/lib/structures";

export type DigitalTwinProps = {
  type: StructureType;
  sensors: Sensor[];
  activeSensorIds: Set<string>;
};

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#050816" />
    </mesh>
  );
}

function BridgeTwin({ sensors, activeSensorIds }: DigitalTwinProps) {
  return (
    <>
      <Ground />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.1}
        castShadow
        color="#a5f3fc"
      />
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[16, 0.6, 3]} />
        <meshStandardMaterial color="#1f2937" metalness={0.1} roughness={0.6} />
      </mesh>
      <mesh position={[-5, 0.5, 0]} castShadow>
        <boxGeometry args={[1, 1, 2]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[5, 0.5, 0]} castShadow>
        <boxGeometry args={[1, 1, 2]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[-4, 3, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 4]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh position={[4, 3, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 4]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      {sensors.map((s) => {
        const isActive = activeSensorIds.has(s.id);
        return (
          <mesh
            key={s.id}
            position={[s.x, s.y, s.z]}
            castShadow
            scale={isActive ? 1.2 : 1}
          >
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial
              color={isActive ? "#f97316" : "#22c55e"}
              emissive={isActive ? "#f97316" : "#16a34a"}
              emissiveIntensity={isActive ? 1.1 : 0.5}
            />
          </mesh>
        );
      })}
    </>
  );
}

function DamTwin({ sensors, activeSensorIds }: DigitalTwinProps) {
  return (
    <>
      <Ground />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[0, 12, 10]}
        intensity={1}
        castShadow
        color="#e5e7eb"
      />
      <mesh position={[0, 0.1, -6]} receiveShadow>
        <boxGeometry args={[22, 0.2, 12]} />
        <meshStandardMaterial
          color="#0369a1"
          transparent
          opacity={0.85}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 2.5, -2]} castShadow>
        <boxGeometry args={[20, 5, 1.2]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {sensors.map((s) => {
        const isActive = activeSensorIds.has(s.id);
        return (
          <mesh
            key={s.id}
            position={[s.x, s.y, s.z - 2]}
            castShadow
            scale={isActive ? 1.2 : 1}
          >
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial
              color={isActive ? "#f97316" : "#22c55e"}
              emissive={isActive ? "#f97316" : "#16a34a"}
              emissiveIntensity={isActive ? 1.1 : 0.5}
            />
          </mesh>
        );
      })}
    </>
  );
}

function TunnelTwin({ sensors, activeSensorIds }: DigitalTwinProps) {
  return (
    <>
      <Ground />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 8, 8]}
        intensity={1}
        castShadow
        color="#e5e7eb"
      />
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[2, 2, 16, 32, 1, true]} />
        <meshStandardMaterial
          color="#020617"
          side={2}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, 0.8, 0]} receiveShadow>
        <boxGeometry args={[1.8, 0.2, 15.5]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {sensors.map((s) => {
        const isActive = activeSensorIds.has(s.id);
        return (
          <mesh
            key={s.id}
            position={[s.x, s.y, s.z]}
            castShadow
            scale={isActive ? 1.2 : 1}
          >
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial
              color={isActive ? "#f97316" : "#22c55e"}
              emissive={isActive ? "#f97316" : "#16a34a"}
              emissiveIntensity={isActive ? 1.1 : 0.5}
            />
          </mesh>
        );
      })}
    </>
  );
}

export function TwinScene({ type, sensors, activeSensorIds }: DigitalTwinProps) {
  return (
    <Canvas
      camera={{ position: [10, 10, 10], fov: 45 }}
      shadows
      className="h-full w-full rounded-xl bg-slate-950"
    >
      <color attach="background" args={["#020617"]} />
      {type === "bridge" && (
        <BridgeTwin
          type={type}
          sensors={sensors}
          activeSensorIds={activeSensorIds}
        />
      )}
      {type === "dam" && (
        <DamTwin
          type={type}
          sensors={sensors}
          activeSensorIds={activeSensorIds}
        />
      )}
      {type === "tunnel" && (
        <TunnelTwin
          type={type}
          sensors={sensors}
          activeSensorIds={activeSensorIds}
        />
      )}
      <OrbitControls enablePan enableZoom />
    </Canvas>
  );
}

