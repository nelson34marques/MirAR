import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { angleDelta, pitchOf, sphericalToWorld, yawOf } from './runtime';

describe('geometria do jogo', () => {
  it('angleDelta normaliza para [-PI, PI]', () => {
    expect(angleDelta(0.1, -0.1)).toBeCloseTo(0.2);
    expect(angleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(-0.2);
    expect(Math.abs(angleDelta(0, Math.PI * 3))).toBeCloseTo(Math.PI);
  });

  it('sphericalToWorld e yawOf/pitchOf são consistentes', () => {
    const out = new Vector3();
    for (const yaw of [0, 0.5, -1.2, 2.5]) {
      for (const pitch of [0, 0.3, -0.4]) {
        sphericalToWorld(yaw, pitch, 6, out);
        expect(out.length()).toBeCloseTo(6);
        // uma câmera rodada por (pitch, yaw) olha exatamente para esse ponto
        const q = new Quaternion().setFromEuler(new Euler(pitch, yaw, 0, 'YXZ'));
        expect(yawOf(q)).toBeCloseTo(yaw, 5);
        expect(pitchOf(q)).toBeCloseTo(pitch, 5);
        const fwd = new Vector3(0, 0, -1).applyQuaternion(q);
        expect(fwd.angleTo(out)).toBeLessThan(1e-6);
      }
    }
  });

  it('yaw positivo é para a esquerda (-X)', () => {
    const out = new Vector3();
    sphericalToWorld(0.5, 0, 5, out);
    expect(out.x).toBeLessThan(0);
    expect(out.z).toBeLessThan(0);
  });
});
