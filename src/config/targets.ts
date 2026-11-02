import type { PickupKind, TargetDef, TargetKind } from '../types';

export const TARGETS: Record<TargetKind, TargetDef> = {
  balloon: {
    kind: 'balloon',
    category: 'enemy',
    hp: 1,
    score: 50,
    size: 0.42,
    hitRadius: 0.62,
    ttl: 9000,
    yawSpeed: 0.04,
    pitchAmp: 0.05,
    color: '#4ade80',
  },
  drone: {
    kind: 'drone',
    category: 'enemy',
    hp: 1,
    score: 100,
    size: 0.36,
    hitRadius: 0.6,
    ttl: 8500,
    yawSpeed: 0.3,
    pitchAmp: 0.12,
    color: '#38bdf8',
  },
  armored: {
    kind: 'armored',
    category: 'enemy',
    hp: 3,
    score: 250,
    size: 0.5,
    hitRadius: 0.68,
    ttl: 11000,
    yawSpeed: 0.14,
    pitchAmp: 0.04,
    color: '#a78bfa',
  },
  splitter: {
    kind: 'splitter',
    category: 'enemy',
    hp: 1,
    score: 120,
    size: 0.46,
    hitRadius: 0.64,
    ttl: 9500,
    yawSpeed: 0.2,
    pitchAmp: 0.08,
    color: '#f472b6',
    onKill: 'split',
  },
  mini: {
    kind: 'mini',
    category: 'enemy',
    hp: 1,
    score: 40,
    size: 0.22,
    hitRadius: 0.42,
    ttl: 5500,
    yawSpeed: 0.5,
    pitchAmp: 0.1,
    color: '#86efac',
  },
  ghost: {
    kind: 'ghost',
    category: 'enemy',
    hp: 1,
    score: 150,
    size: 0.4,
    hitRadius: 0.6,
    ttl: 10000,
    yawSpeed: 0.22,
    pitchAmp: 0.06,
    color: '#c4b5fd',
    blink: { on: 1500, off: 900 },
  },
  bonus: {
    kind: 'bonus',
    category: 'bonus',
    hp: 1,
    score: 500,
    size: 0.26,
    hitRadius: 0.5,
    ttl: 3800,
    yawSpeed: 0.8,
    pitchAmp: 0.2,
    color: '#fbbf24',
  },
  bomb: {
    kind: 'bomb',
    category: 'bomb',
    hp: 1,
    score: -300,
    size: 0.44,
    // a bomba só conta se o tiro for mesmo em cima: raio de acerto igual ao corpo
    hitRadius: 0.44,
    ttl: 7000,
    yawSpeed: 0.1,
    pitchAmp: 0.03,
    color: '#ef4444',
  },
  boss: {
    kind: 'boss',
    category: 'boss',
    hp: 12,
    score: 2000,
    size: 0.9,
    hitRadius: 1.15,
    ttl: 75000,
    yawSpeed: 0.12,
    pitchAmp: 0.08,
    color: '#fb7185',
    attack: { interval: 3800, damage: 8 },
  },
  heal: {
    kind: 'heal',
    category: 'pickup',
    hp: 1,
    score: 0,
    size: 0.3,
    hitRadius: 0.55,
    ttl: 5500,
    yawSpeed: 0.05,
    pitchAmp: 0.08,
    color: '#34d399',
  },
  ammo: {
    kind: 'ammo',
    category: 'pickup',
    hp: 1,
    score: 0,
    size: 0.3,
    hitRadius: 0.55,
    ttl: 5500,
    yawSpeed: 0.05,
    pitchAmp: 0.08,
    color: '#fbbf24',
  },
  slow: {
    kind: 'slow',
    category: 'pickup',
    hp: 1,
    score: 0,
    size: 0.3,
    hitRadius: 0.55,
    ttl: 5500,
    yawSpeed: 0.05,
    pitchAmp: 0.08,
    color: '#38bdf8',
  },
  double: {
    kind: 'double',
    category: 'pickup',
    hp: 1,
    score: 0,
    size: 0.3,
    hitRadius: 0.55,
    ttl: 5500,
    yawSpeed: 0.05,
    pitchAmp: 0.08,
    color: '#f0abfc',
  },
};

export const PICKUP_KINDS: PickupKind[] = ['heal', 'ammo', 'slow', 'double'];

/** distância (unidades) a que os alvos aparecem */
export const SPAWN_DISTANCE_MIN = 4.5;
export const SPAWN_DISTANCE_MAX = 7.5;

/** vida perdida quando um alvo legítimo expira e explode; cresce com as ondas */
export const ESCAPE_PENALTY = 10;
export function escapePenalty(waveIndex: number): number {
  return Math.min(30, ESCAPE_PENALTY + (waveIndex - 1) * 2);
}
/** vida perdida se o chefe sobreviver ao tempo limite */
export const BOSS_ESCAPE_PENALTY = 30;
/** vida perdida ao atingir uma bomba */
export const BOMB_PENALTY = 25;
export const MAX_HEALTH = 100;

/** power-ups */
export const PICKUP_DROP_CHANCE = 0.14;
export const PICKUP_MIN_INTERVAL = 7000;
export const HEAL_AMOUNT = 25;
export const AMMO_DURATION = 10000;
export const SLOW_DURATION = 7000;
export const SLOW_TIME_SCALE = 0.45;
export const DOUBLE_DURATION = 15000;

/** vida do chefe por nível (onda 5 = nível 1) */
export function bossHp(waveIndex: number): number {
  const level = Math.max(1, Math.floor(waveIndex / 5));
  return TARGETS.boss.hp + (level - 1) * 4;
}
/** intervalo entre ataques do chefe (ms), mais curto a cada nível */
export function bossAttackInterval(waveIndex: number): number {
  const level = Math.max(1, Math.floor(waveIndex / 5));
  return Math.max(2200, TARGETS.boss.attack!.interval - (level - 1) * 300);
}
