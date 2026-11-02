import type { WaveDef } from '../types';
import { t } from '../i18n';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** a cada 5 ondas aparece um chefe */
export const BOSS_EVERY = 5;

export function isBossWave(n: number): boolean {
  return n > 0 && n % BOSS_EVERY === 0;
}

/**
 * Gera a definição da onda `n`. A dificuldade cresce em número de alvos,
 * cadência, velocidade e variedade; de 5 em 5 ondas o primeiro alvo é um chefe
 * acompanhado de escoltas.
 */
export function makeWave(n: number): WaveDef {
  const boss = isBossWave(n);
  const tier = Math.floor(n / BOSS_EVERY);
  const targetCount = boss ? 1 + 4 + tier * 2 : 6 + n * 2;
  const bombs = n >= 3;
  const armored = n >= 2;
  const splitter = n >= 3;
  const ghost = n >= 4;

  let objective = t('wave.objective', { n: targetCount });
  if (boss) objective = t('wave.objectiveBoss');
  else if (ghost && n % 4 === 0) objective = t('wave.objectiveGhost', { n: targetCount });
  else if (bombs && n % 3 === 0) objective = t('wave.objectiveBombs', { n: targetCount });
  else if (armored && n % 2 === 0) objective = t('wave.objectiveArmored', { n: targetCount });

  return {
    index: n,
    label: boss ? t('wave.bossLabel', { n }) : t('wave.label', { n }),
    objective,
    targetCount,
    spawnInterval: clamp(2200 - n * 150, 700, 2200),
    maxAlive: clamp(2 + Math.ceil(n / 2), 2, 6),
    yawRange: clamp(0.7 + n * 0.3, 0.7, Math.PI),
    pitchRange: clamp(0.12 + n * 0.05, 0.12, 0.55),
    speedScale: Math.min(1.6, 1 + (n - 1) * 0.05),
    boss,
    weights: {
      balloon: Math.max(0.5, 6 - n),
      drone: 2 + n * 0.5,
      armored: armored ? n * 0.6 : 0,
      splitter: splitter ? n * 0.45 : 0,
      ghost: ghost ? n * 0.35 : 0,
      bonus: 0.6,
      bomb: bombs ? 0.5 + n * 0.12 : 0,
      // nunca saem do sorteio: nascem por divisão, por queda ou como chefe
      mini: 0,
      boss: 0,
      heal: 0,
      ammo: 0,
      slow: 0,
      double: 0,
    },
  };
}

export const WAVE_INTRO_MS = 2600;
export const WAVE_COMPLETE_MS = 2600;
