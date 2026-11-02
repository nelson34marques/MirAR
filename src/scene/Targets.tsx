import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { Color, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { TargetEntity } from '../types';
import { TARGETS } from '../config/targets';
import { useGameStore } from '../state/gameStore';
import { runtime } from '../game/runtime';
import { targetLifeFraction, targetOpacity, targetPosition } from '../game/targetMotion';

export const TARGETS_GROUP = 'targets';

export function Targets() {
  const targets = useGameStore((s) => s.targets);
  return (
    <group name={TARGETS_GROUP}>
      {targets.map((t) => (
        <TargetMesh key={t.id} entity={t} />
      ))}
    </group>
  );
}

const scratch = new Vector3();
const RED = new Color('#ef4444');

function TargetMesh({ entity }: { entity: TargetEntity }) {
  const group = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const bodyMat = useRef<MeshStandardMaterial>(null);
  const def = TARGETS[entity.kind];
  const baseColor = useMemo(() => new Color(def.color), [def.color]);
  const white = useMemo(() => new Color('#ffffff'), []);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const now = runtime.gameTime;
    targetPosition(entity, now, scratch);
    g.position.copy(scratch);
    runtime.targetPositions.set(entity.id, g.position);

    // entrada: cresce de 0 até 1 em 350 ms; saída: pulsa quando falta pouco tempo
    const age = now - entity.spawnedAt;
    const life = targetLifeFraction(entity, now);
    let scale = Math.min(1, age / 350);
    scale = 1 - Math.pow(1 - scale, 3);
    const mat = bodyMat.current;
    if (def.category === 'pickup') {
      // cápsulas flutuam e desvanecem no fim
      scale *= 1 + Math.sin(state.clock.elapsedTime * 4) * 0.06;
      if (mat) mat.emissiveIntensity = 0.9 + Math.sin(state.clock.elapsedTime * 6) * 0.4;
      if (life > 0.75) scale *= 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 20));
    } else if (life > 0.72 && def.category !== 'boss') {
      const blink = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * (life > 0.9 ? 30 : 14));
      scale *= 0.92 + 0.08 * blink;
      if (mat) mat.emissiveIntensity = 0.3 + blink * 0.9;
    } else if (mat) {
      mat.emissiveIntensity = def.category === 'bonus' || def.category === 'bomb' ? 0.8 : 0.35;
    }

    // fantasma: aparece e desaparece
    const opacity = targetOpacity(entity, now);
    if (def.blink) {
      g.visible = opacity > 0.02;
      scale *= 0.6 + 0.4 * opacity;
      if (mat) mat.opacity = 0.35 + 0.65 * opacity;
    }

    // chefe: avisa o ataque com pulsar vermelho
    if (def.attack && entity.nextAttackAt !== undefined && mat) {
      const until = entity.nextAttackAt - now;
      if (until < 700) {
        const k = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 40);
        mat.emissive.copy(baseColor).lerp(RED, k);
        mat.emissiveIntensity = 0.8 + k * 0.8;
        scale *= 1 + k * 0.08;
      } else {
        mat.emissive.copy(baseColor);
      }
    }

    g.scale.setScalar(scale * def.size);
    g.lookAt(0, 0, 0);

    if (inner.current) {
      const spin = def.category === 'bonus' ? 4 : def.category === 'pickup' ? 2.2 : def.category === 'boss' ? 0.6 : 1.2;
      inner.current.rotation.y = state.clock.elapsedTime * spin;
      inner.current.rotation.x = entity.kind === 'drone' ? Math.sin(state.clock.elapsedTime * 3) * 0.2 : 0;
    }

    // flash branco ao receber dano
    if (mat && entity.lastHitAt !== undefined) {
      const t = 1 - Math.min(1, (now - entity.lastHitAt) / 140);
      mat.color.copy(baseColor).lerp(white, Math.max(0, t) * 0.8);
    }
  });

  return (
    <group ref={group} userData={{ targetId: entity.id, kind: entity.kind }}>
      <group ref={inner}>
        <TargetShape entity={entity} matRef={bodyMat} />
      </group>
    </group>
  );
}

function TargetShape({ entity, matRef }: { entity: TargetEntity; matRef: RefObject<MeshStandardMaterial | null> }) {
  const def = TARGETS[entity.kind];
  const common = (
    <meshStandardMaterial
      ref={matRef}
      color={def.color}
      emissive={def.color}
      emissiveIntensity={0.35}
      roughness={0.35}
      metalness={0.2}
      transparent={!!def.blink}
    />
  );

  switch (entity.kind) {
    case 'balloon':
      return (
        <group>
          <mesh>
            <sphereGeometry args={[1, 24, 18]} />
            {common}
          </mesh>
          <mesh position={[0, -1.15, 0]}>
            <coneGeometry args={[0.18, 0.3, 8]} />
            <meshStandardMaterial color={def.color} roughness={0.6} />
          </mesh>
          <Ring color="#ffffff" radius={1.25} />
        </group>
      );
    case 'mini':
      return (
        <group>
          <mesh>
            <sphereGeometry args={[1, 16, 12]} />
            {common}
          </mesh>
          <Ring color="#ffffff" radius={1.3} width={0.12} />
        </group>
      );
    case 'drone':
      return (
        <group>
          <mesh>
            <octahedronGeometry args={[0.9, 0]} />
            {common}
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI) / 2) * 1.1, 0, Math.sin((i * Math.PI) / 2) * 1.1]}>
              <boxGeometry args={[0.45, 0.08, 0.45]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
            </mesh>
          ))}
          <Ring color={def.color} radius={1.5} />
        </group>
      );
    case 'armored':
      return (
        <group>
          <mesh>
            <icosahedronGeometry args={[1, 0]} />
            {common}
          </mesh>
          <mesh>
            <icosahedronGeometry args={[1.18, 0]} />
            <meshStandardMaterial color="#1e1b4b" wireframe transparent opacity={0.9} />
          </mesh>
          <HpPips hp={entity.hp} max={entity.maxHp} color={def.color} />
        </group>
      );
    case 'splitter':
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.8, 20, 14]} />
            {common}
          </mesh>
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0]}>
                <sphereGeometry args={[0.42, 14, 10]} />
                <meshStandardMaterial color={def.color} emissive={def.color} emissiveIntensity={0.5} roughness={0.4} />
              </mesh>
            );
          })}
          <Ring color={def.color} radius={1.55} />
        </group>
      );
    case 'ghost':
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.75, 20, 14]} />
            {common}
          </mesh>
          <mesh>
            <icosahedronGeometry args={[1.15, 1]} />
            <meshStandardMaterial color={def.color} wireframe transparent opacity={0.6} />
          </mesh>
          <Ring color="#ffffff" radius={1.45} />
        </group>
      );
    case 'bonus':
      return (
        <group>
          <mesh>
            <torusKnotGeometry args={[0.7, 0.26, 64, 10, 2, 3]} />
            {common}
          </mesh>
          <Ring color="#fde68a" radius={1.7} />
        </group>
      );
    case 'bomb':
      return (
        <group>
          <mesh>
            <dodecahedronGeometry args={[0.9, 0]} />
            {common}
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0]} rotation={[0, 0, a - Math.PI / 2]}>
                <coneGeometry args={[0.16, 0.5, 6]} />
                <meshStandardMaterial color="#7f1d1d" roughness={0.6} />
              </mesh>
            );
          })}
          <Ring color="#ef4444" radius={1.6} />
          <StripedBar />
        </group>
      );
    case 'boss':
      return (
        <group>
          <mesh>
            <octahedronGeometry args={[0.9, 1]} />
            {common}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.25, 0.09, 10, 40]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
          </mesh>
          {[0, 1, 2, 3].map((i) => {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            return (
              <mesh key={i} position={[Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.12, 0.18, 0.7, 8]} />
                <meshStandardMaterial color={def.color} emissive={def.color} emissiveIntensity={0.6} roughness={0.4} />
              </mesh>
            );
          })}
          <mesh>
            <icosahedronGeometry args={[1.55, 1]} />
            <meshStandardMaterial color={def.color} wireframe transparent opacity={0.35} />
          </mesh>
          <Ring color="#ffffff" radius={1.9} width={0.06} />
        </group>
      );
    case 'heal':
    case 'ammo':
    case 'slow':
    case 'double':
      return (
        <group>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.45, 0.9, 6, 14]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.25} transparent opacity={0.55} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.42, 16, 12]} />
            {common}
          </mesh>
          <PickupSymbol kind={entity.kind} color={def.color} />
          <Ring color={def.color} radius={1.25} width={0.1} />
        </group>
      );
  }
}

/** símbolo simples por tipo de cápsula: cruz (vida), barras (munição), relógio (lento), ×2 (dobro) */
function PickupSymbol({ kind, color }: { kind: string; color: string }) {
  const mat = <meshBasicMaterial color={color} toneMapped={false} />;
  switch (kind) {
    case 'heal':
      return (
        <group position={[0, 0, 0.5]}>
          <mesh>
            <boxGeometry args={[0.5, 0.14, 0.05]} />
            {mat}
          </mesh>
          <mesh>
            <boxGeometry args={[0.14, 0.5, 0.05]} />
            {mat}
          </mesh>
        </group>
      );
    case 'ammo':
      return (
        <group position={[0, 0, 0.5]}>
          {[-0.18, 0, 0.18].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <boxGeometry args={[0.1, 0.5, 0.05]} />
              {mat}
            </mesh>
          ))}
        </group>
      );
    case 'slow':
      return (
        <group position={[0, 0, 0.5]}>
          <mesh>
            <ringGeometry args={[0.22, 0.3, 24]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[0.06, 0.22, 0.05]} />
            {mat}
          </mesh>
        </group>
      );
    default:
      return (
        <group position={[0, 0, 0.5]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.5, 0.12, 0.05]} />
            {mat}
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.5, 0.12, 0.05]} />
            {mat}
          </mesh>
        </group>
      );
  }
}

function Ring({ color, radius, width = 0.08 }: { color: string; radius: number; width?: number }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = state.clock.elapsedTime * 1.5;
  });
  return (
    <mesh ref={ref}>
      <ringGeometry args={[radius, radius + width, 48, 1, 0, Math.PI * 1.5]} />
      <meshBasicMaterial color={color} transparent opacity={0.75} side={2} />
    </mesh>
  );
}

function HpPips({ hp, max, color }: { hp: number; max: number; color: string }) {
  const spacing = 0.5;
  const start = -((max - 1) * spacing) / 2;
  return (
    <group position={[0, 1.6, 0]}>
      {Array.from({ length: max }).map((_, i) => (
        <mesh key={i} position={[start + i * spacing, 0, 0]}>
          <boxGeometry args={[0.35, 0.18, 0.1]} />
          <meshBasicMaterial color={i < hp ? color : '#334155'} />
        </mesh>
      ))}
    </group>
  );
}

function StripedBar() {
  return (
    <group position={[0, -1.6, 0]}>
      {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.38, 0.22, 0.1]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#facc15' : '#111111'} />
        </mesh>
      ))}
    </group>
  );
}
