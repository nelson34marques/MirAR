import { Vector3 } from 'three';
import { runtime } from './runtime';
import { TARGETS } from '../config/targets';
import { isTargetVisible, targetPosition } from './targetMotion';
import type { TargetEntity, TargetKind } from '../types';

const toTarget = new Vector3();
const scratch = new Vector3();

export interface AimPick {
  id: string;
  kind: TargetKind;
  point: Vector3;
  /** 0 = centro do alvo, 1 = borda do raio de acerto */
  closeness: number;
}

/**
 * Teste de acerto analítico: cada alvo é uma esfera de raio `hitRadius`
 * (um pouco maior do que o modelo, para a mira ser tolerante no telemóvel).
 * Escolhe o alvo cujo centro está mais perto da direção do tiro, em termos
 * angulares, o que funciona como uma ajuda de mira suave.
 */
export function pickTarget(origin: Vector3, direction: Vector3, targets: TargetEntity[], now: number, assist: number): AimPick | null {
  let best: AimPick | null = null;
  for (const t of targets) {
    if (!isTargetVisible(t, now)) continue;
    let pos = runtime.targetPositions.get(t.id);
    if (!pos) pos = targetPosition(t, now, scratch);
    toTarget.copy(pos).sub(origin);
    const dist = toTarget.length();
    if (dist < 0.01) continue;
    const cos = toTarget.dot(direction) / dist;
    if (cos <= 0) continue;
    const angle = Math.acos(Math.min(1, cos));
    // o alvo ainda está a "nascer": raio reduzido na mesma proporção
    const grow = Math.min(1, (now - t.spawnedAt) / 350);
    const radius = TARGETS[t.kind].hitRadius * grow * assist;
    const angular = Math.atan(radius / dist);
    if (angular <= 0) continue;
    const closeness = angle / angular;
    if (closeness <= 1 && (!best || closeness < best.closeness)) {
      const point = origin.clone().addScaledVector(direction, dist * Math.cos(angle));
      best = { id: t.id, kind: t.kind, point, closeness };
    }
  }
  return best;
}
