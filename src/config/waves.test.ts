import { describe, expect, it } from 'vitest';
import { isBossWave, makeWave } from './waves';

describe('makeWave', () => {
  it('cresce em alvos e cadência com a onda', () => {
    const w1 = makeWave(1);
    const w4 = makeWave(4);
    expect(w4.targetCount).toBeGreaterThan(w1.targetCount);
    expect(w4.spawnInterval).toBeLessThan(w1.spawnInterval);
    expect(w4.speedScale).toBeGreaterThan(w1.speedScale);
    expect(w4.maxAlive).toBeGreaterThanOrEqual(w1.maxAlive);
  });

  it('respeita os limites', () => {
    const w = makeWave(60);
    expect(w.spawnInterval).toBe(700);
    expect(w.maxAlive).toBe(6);
    expect(w.yawRange).toBeCloseTo(Math.PI);
    expect(w.speedScale).toBe(1.6);
  });

  it('chefe de 5 em 5 ondas', () => {
    expect(isBossWave(5)).toBe(true);
    expect(isBossWave(10)).toBe(true);
    expect(isBossWave(7)).toBe(false);
    const w5 = makeWave(5);
    expect(w5.boss).toBe(true);
    expect(w5.targetCount).toBe(7);
    expect(w5.label).toContain('5');
    expect(makeWave(10).targetCount).toBe(9);
  });

  it('introduz tipos novos gradualmente e nunca sorteia minis, chefe ou cápsulas', () => {
    const w1 = makeWave(1);
    expect(w1.weights.armored).toBe(0);
    expect(w1.weights.bomb).toBe(0);
    expect(w1.weights.ghost).toBe(0);
    const w4 = makeWave(4);
    expect(w4.weights.armored).toBeGreaterThan(0);
    expect(w4.weights.splitter).toBeGreaterThan(0);
    expect(w4.weights.ghost).toBeGreaterThan(0);
    expect(w4.weights.bomb).toBeGreaterThan(0);
    for (const w of [w1, w4, makeWave(12)]) {
      expect(w.weights.mini).toBe(0);
      expect(w.weights.boss).toBe(0);
      expect(w.weights.heal).toBe(0);
      expect(w.weights.double).toBe(0);
    }
  });
});
