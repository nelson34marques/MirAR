import { Quaternion, Vector3 } from 'three';
import type { QualityLevel, TargetKind } from '../types';

export interface Burst {
  position: Vector3;
  color: string;
  count: number;
}

export interface Tracer {
  from: Vector3;
  to: Vector3;
}

/** acontecimentos de jogo para a cena reagir (explosões, sons) */
export interface GameEvent {
  type: 'attack' | 'bossAttack' | 'pickup' | 'bossDown';
  position: Vector3;
  color: string;
}

/**
 * Estado mutável por frame, partilhado entre a cena 3D e o HUD.
 * Vive fora do React para não provocar re-renders a 60 fps.
 */
export const runtime = {
  cameraQuaternion: new Quaternion(),
  cameraYaw: 0,
  cameraPitch: 0,
  fireHeld: false,
  fireTap: false,
  reloadRequest: false,
  hoverKind: null as TargetKind | null,
  targetPositions: new Map<string, Vector3>(),
  bursts: [] as Burst[],
  tracers: [] as Tracer[],
  recoilKick: 0,
  flash: 0,
  shake: 0,
  /** tempo de jogo acumulado (s); só vai para o store de segundo a segundo */
  elapsed: 0,
  /**
   * relógio do jogo em ms: só avança enquanto se joga e pode abrandar
   * (câmera lenta). Alvos, ondas e mensagens usam este tempo, não performance.now().
   */
  gameTime: 0,
  /** 1 = tempo normal; <1 = câmera lenta */
  timeScale: 1,
  /** fps medidos no último segundo */
  fps: 60,
  /** nível de qualidade em vigor (depois do ajuste automático) */
  qualityLevel: 'high' as QualityLevel,
  /** limite de partículas em simultâneo (depende da qualidade) */
  particleCap: 400,
  /** eventos de jogo para a cena reagir (sons, etc.) */
  events: [] as GameEvent[],
};

const FORWARD = new Vector3(0, 0, -1);
const tmp = new Vector3();

/** ângulo horizontal (rad) da direção "para a frente" de um quaternion. 0 = -Z */
export function yawOf(q: Quaternion): number {
  tmp.copy(FORWARD).applyQuaternion(q);
  return Math.atan2(-tmp.x, -tmp.z);
}

export function pitchOf(q: Quaternion): number {
  tmp.copy(FORWARD).applyQuaternion(q);
  return Math.asin(Math.max(-1, Math.min(1, tmp.y)));
}

/** diferença angular normalizada para [-PI, PI] */
export function angleDelta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** posição cartesiana a partir de coordenadas esféricas do jogo */
export function sphericalToWorld(yaw: number, pitch: number, distance: number, out: Vector3): Vector3 {
  const c = Math.cos(pitch) * distance;
  out.set(-Math.sin(yaw) * c, Math.sin(pitch) * distance, -Math.cos(yaw) * c);
  return out;
}
