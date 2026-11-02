import { Vector3 } from 'three';
import type { TargetEntity } from '../types';
import { TARGETS } from '../config/targets';
import { sphericalToWorld } from './runtime';

export function targetYaw(e: TargetEntity, now: number): number {
  const age = (now - e.spawnedAt) / 1000;
  return e.yaw + e.yawSpeed * age;
}

export function targetPitch(e: TargetEntity, now: number): number {
  const age = (now - e.spawnedAt) / 1000;
  return e.pitch + e.pitchAmp * Math.sin(age * e.pitchFreq + e.phase);
}

export function targetPosition(e: TargetEntity, now: number, out: Vector3): Vector3 {
  return sphericalToWorld(targetYaw(e, now), targetPitch(e, now), e.distance, out);
}

/** 0..1 — fração do tempo de vida já consumido */
export function targetLifeFraction(e: TargetEntity, now: number): number {
  return Math.min(1, (now - e.spawnedAt) / e.ttl);
}

/** alvos intermitentes (fantasma) só podem ser atingidos quando visíveis */
export function isTargetVisible(e: TargetEntity, now: number): boolean {
  const blink = TARGETS[e.kind].blink;
  if (!blink) return true;
  const cycle = blink.on + blink.off;
  return (now - e.spawnedAt) % cycle < blink.on;
}

/** 0..1: quão perto o fantasma está de desaparecer/aparecer (para o efeito de fade) */
export function targetOpacity(e: TargetEntity, now: number): number {
  const blink = TARGETS[e.kind].blink;
  if (!blink) return 1;
  const cycle = blink.on + blink.off;
  const p = (now - e.spawnedAt) % cycle;
  const fade = 220;
  if (p < blink.on) {
    if (p < fade) return p / fade;
    if (blink.on - p < fade) return (blink.on - p) / fade;
    return 1;
  }
  return 0;
}
