import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Group, Mesh, PointLight } from 'three';
import { runtime } from '../game/runtime';
import { useGameStore } from '../state/gameStore';
import { WEAPONS } from '../config/weapons';
import type { WeaponId } from '../types';

/**
 * Modelo de arma em primeira pessoa. Segue a câmera, balança com o movimento,
 * recua ao disparar e baixa durante a recarga.
 */
export function Weapon() {
  const camera = useThree((s) => s.camera);
  const rig = useRef<Group>(null);
  const model = useRef<Group>(null);
  const flash = useRef<Mesh>(null);
  const light = useRef<PointLight>(null);
  const weaponId = useGameStore((s) => s.weaponId);
  const kick = useRef(0);
  const swayYaw = useRef(0);
  const swayPitch = useRef(0);
  const lastYaw = useRef(0);
  const lastPitch = useRef(0);
  const reloadAnim = useRef(0);

  useFrame((state, dt) => {
    const r = rig.current;
    const m = model.current;
    if (!r || !m) return;
    const clamped = Math.min(dt, 0.05);
    r.position.copy(camera.position);
    r.quaternion.copy(camera.quaternion);

    // sway: atraso ligeiro em relação ao movimento da câmera
    const dYaw = runtime.cameraYaw - lastYaw.current;
    const dPitch = runtime.cameraPitch - lastPitch.current;
    lastYaw.current = runtime.cameraYaw;
    lastPitch.current = runtime.cameraPitch;
    const wrapped = Math.abs(dYaw) > Math.PI ? 0 : dYaw;
    swayYaw.current += (wrapped * 2.5 - swayYaw.current) * (1 - Math.exp(-clamped * 12));
    swayPitch.current += (dPitch * 2.5 - swayPitch.current) * (1 - Math.exp(-clamped * 12));

    // recuo da arma
    if (runtime.flash > 0.95) kick.current = 1;
    kick.current *= Math.exp(-clamped * 16);

    const { reloading, reloadEndsAt, phase } = useGameStore.getState();
    const def = WEAPONS[weaponId];
    const reloadTarget = reloading ? 1 : 0;
    reloadAnim.current += (reloadTarget - reloadAnim.current) * (1 - Math.exp(-clamped * 10));
    const reloadSpin = reloading ? Math.sin(((reloadEndsAt - performance.now()) / def.reloadTime) * Math.PI) : 0;

    const t = state.clock.elapsedTime;
    const idle = phase === 'playing' ? Math.sin(t * 1.6) * 0.004 : 0;
    const hidden = phase === 'menu' || phase === 'calibrating' || phase === 'gameover' ? 1 : 0;

    m.position.set(
      0.17 + swayYaw.current * 0.04,
      -0.19 + idle - reloadAnim.current * 0.18 - swayPitch.current * 0.04 - hidden * 0.6,
      -0.55 + kick.current * 0.05,
    );
    m.rotation.set(
      -kick.current * 0.25 - reloadAnim.current * 0.6 + reloadSpin * 0.25 - swayPitch.current * 0.4,
      Math.PI * 0.03 + swayYaw.current * 0.4,
      reloadAnim.current * 0.4,
    );

    // flash do cano
    runtime.flash *= Math.exp(-clamped * 30);
    if (flash.current) {
      flash.current.visible = runtime.flash > 0.08;
      flash.current.scale.setScalar(0.6 + runtime.flash * 1.6);
      flash.current.rotation.z = t * 20;
    }
    if (light.current) light.current.intensity = runtime.flash * 6;
  });

  return (
    <group ref={rig}>
      {/* luz fixa à câmera para a arma nunca ficar às escuras */}
      <pointLight position={[0.4, 0.35, -0.1]} intensity={2.2} distance={2.5} decay={1} />
      <group ref={model} scale={0.45}>
        <WeaponModel id={weaponId} />
        <mesh ref={flash} position={[0, 0.035, -0.62]} visible={false}>
          <planeGeometry args={[0.16, 0.16]} />
          <meshBasicMaterial color="#ffd166" transparent opacity={0.9} depthWrite={false} />
        </mesh>
        <pointLight ref={light} position={[0, 0.05, -0.55]} color="#ffb347" intensity={0} distance={3} />
      </group>
    </group>
  );
}

function WeaponModel({ id }: { id: WeaponId }) {
  const def = WEAPONS[id];
  const dark = '#475569';
  const accent = def.color;

  switch (id) {
    case 'pistol':
      return (
        <group scale={0.9}>
          <mesh position={[0, 0.02, -0.28]}>
            <boxGeometry args={[0.06, 0.07, 0.42]} />
            <meshStandardMaterial color={dark} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.045, -0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.1, 12]} />
            <meshStandardMaterial color="#111827" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.09, -0.12]} rotation={[0.25, 0, 0]}>
            <boxGeometry args={[0.055, 0.18, 0.09]} />
            <meshStandardMaterial color={accent} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.03, -0.2]}>
            <boxGeometry args={[0.04, 0.05, 0.08]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      );
    case 'rifle':
      return (
        <group>
          <mesh position={[0, 0.02, -0.4]}>
            <boxGeometry args={[0.065, 0.075, 0.75]} />
            <meshStandardMaterial color={dark} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.03, -0.82]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.28, 12]} />
            <meshStandardMaterial color="#111827" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.11, -0.3]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.05, 0.2, 0.07]} />
            <meshStandardMaterial color={accent} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.09, -0.12]} rotation={[0.35, 0, 0]}>
            <boxGeometry args={[0.055, 0.17, 0.08]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0.02, 0.1]}>
            <boxGeometry args={[0.06, 0.09, 0.28]} />
            <meshStandardMaterial color={accent} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.085, -0.3]}>
            <boxGeometry args={[0.03, 0.03, 0.14]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      );
    case 'shotgun':
      return (
        <group>
          <mesh position={[0, 0.03, -0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.85, 14]} />
            <meshStandardMaterial color="#111827" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.02, -0.45]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.026, 0.026, 0.7, 14]} />
            <meshStandardMaterial color={accent} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.09, -0.12]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.055, 0.17, 0.08]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0.0, 0.12]}>
            <boxGeometry args={[0.065, 0.1, 0.3]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
        </group>
      );
    case 'sniper':
      return (
        <group>
          <mesh position={[0, 0.02, -0.5]}>
            <boxGeometry args={[0.06, 0.07, 0.9]} />
            <meshStandardMaterial color={dark} metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.03, -1.05]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.013, 0.013, 0.4, 12]} />
            <meshStandardMaterial color="#111827" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.1, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.3, 14]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.1, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 14]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, -0.09, -0.15]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.055, 0.17, 0.08]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0.0, 0.1]}>
            <boxGeometry args={[0.06, 0.1, 0.3]} />
            <meshStandardMaterial color={accent} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.08, -0.75]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.012, 0.14, 0.012]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      );
  }
}
