import type { PickupKind, TargetEntity, TargetKind, WaveDef } from '../types';
import { bossAttackInterval, bossHp, SPAWN_DISTANCE_MAX, SPAWN_DISTANCE_MIN, TARGETS } from '../config/targets';

let counter = 0;

/** fonte de aleatoriedade substituível (testes) */
export const gameRandom = { next: (): number => Math.random() };

const rand = (lo: number, hi: number) => lo + gameRandom.next() * (hi - lo);

function pickKind(weights: Record<TargetKind, number>): TargetKind {
  const entries = (Object.entries(weights) as [TargetKind, number][]).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = gameRandom.next() * total;
  for (const [kind, w] of entries) {
    r -= w;
    if (r <= 0) return kind;
  }
  return entries[entries.length - 1][0];
}

function nextId(now: number): string {
  counter += 1;
  return `t${Math.round(now).toString(36)}_${counter}`;
}

function baseEntity(kind: TargetKind, now: number, yaw: number, pitch: number, distance: number, speedScale: number): TargetEntity {
  const def = TARGETS[kind];
  const dir = gameRandom.next() < 0.5 ? -1 : 1;
  return {
    id: nextId(now),
    kind,
    hp: def.hp,
    maxHp: def.hp,
    spawnedAt: now,
    ttl: def.ttl,
    yaw,
    pitch,
    distance,
    yawSpeed: def.yawSpeed * dir * rand(0.8, 1.2) * speedScale,
    pitchAmp: def.pitchAmp,
    pitchFreq: rand(0.8, 1.8),
    phase: gameRandom.next() * Math.PI * 2,
  };
}

/**
 * Cria um alvo numa direção aleatória em torno da direção atual do jogador.
 * Garante um afastamento mínimo do centro para obrigar a procurar.
 */
export function spawnTarget(wave: WaveDef, cameraYaw: number, now: number, kind: TargetKind = pickKind(wave.weights)): TargetEntity {
  const minOffset = 0.3;
  const side = gameRandom.next() < 0.5 ? -1 : 1;
  const yawOffset = side * rand(minOffset, Math.max(minOffset + 0.1, wave.yawRange));
  const pitch = rand(-wave.pitchRange * 0.5, wave.pitchRange);
  const distance = rand(SPAWN_DISTANCE_MIN, SPAWN_DISTANCE_MAX);
  return baseEntity(kind, now, cameraYaw + yawOffset, pitch, distance, wave.speedScale);
}

/** o chefe nasce um pouco ao lado, mais longe e mais alto, com a vida do nível */
export function spawnBoss(wave: WaveDef, cameraYaw: number, now: number): TargetEntity {
  const side = gameRandom.next() < 0.5 ? -1 : 1;
  const e = baseEntity('boss', now, cameraYaw + side * rand(0.5, 1.0), rand(0.05, 0.2), 7, 1);
  const hp = bossHp(wave.index);
  e.hp = hp;
  e.maxHp = hp;
  e.nextAttackAt = now + bossAttackInterval(wave.index) + 1500;
  return e;
}

/** alvos pequenos que saem de um divisor abatido */
export function spawnMinis(parent: TargetEntity, now: number, count = 2, speedScale = 1): TargetEntity[] {
  const out: TargetEntity[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const e = baseEntity('mini', now, parent.yaw + side * rand(0.08, 0.18), parent.pitch + rand(-0.06, 0.1), parent.distance, speedScale);
    out.push(e);
  }
  return out;
}

/** cápsula de power-up deixada por um alvo abatido, na direção em que ele estava */
export function spawnPickup(kind: PickupKind, yaw: number, pitch: number, distance: number, now: number): TargetEntity {
  return baseEntity(kind, now, yaw, pitch, distance, 1);
}
