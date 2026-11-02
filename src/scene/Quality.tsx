import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useSettings } from '../state/settings';
import { runtime } from '../game/runtime';
import { AUTO_FPS_HIGH, AUTO_FPS_LOW, AUTO_STEP_UP_COOLDOWN_MS, dprFor, QUALITY, QUALITY_ORDER } from '../game/quality';
import type { QualityLevel } from '../types';

/**
 * Mede os fps e, em modo "auto", baixa a resolução do canvas 3D e o número de
 * partículas quando o telemóvel não aguenta; volta a subir quando sobra folga.
 * Em modo manual aplica o nível escolhido nas definições.
 */
export function PerformanceGovernor() {
  const setDpr = useThree((s) => s.setDpr);
  const quality = useSettings((s) => s.quality);
  const level = useRef<QualityLevel>('high');
  const frames = useRef(0);
  const acc = useRef(0);
  const lowStreak = useRef(0);
  const highStreak = useRef(0);
  const lastChange = useRef(0);

  const apply = (lvl: QualityLevel) => {
    level.current = lvl;
    runtime.qualityLevel = lvl;
    runtime.particleCap = QUALITY[lvl].particles;
    setDpr(dprFor(lvl));
    lastChange.current = performance.now();
  };

  useEffect(() => {
    apply(quality === 'auto' ? level.current : quality);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality]);

  useFrame((_, dt) => {
    frames.current += 1;
    acc.current += dt;
    if (acc.current < 1) return;
    const fps = frames.current / acc.current;
    runtime.fps = fps;
    frames.current = 0;
    acc.current = 0;
    if (quality !== 'auto') return;

    const idx = QUALITY_ORDER.indexOf(level.current);
    if (fps < AUTO_FPS_LOW) {
      lowStreak.current += 1;
      highStreak.current = 0;
      if (lowStreak.current >= 2 && idx > 0) {
        apply(QUALITY_ORDER[idx - 1]);
        lowStreak.current = 0;
      }
    } else if (fps > AUTO_FPS_HIGH) {
      highStreak.current += 1;
      lowStreak.current = 0;
      if (highStreak.current >= 10 && idx < QUALITY_ORDER.length - 1 && performance.now() - lastChange.current > AUTO_STEP_UP_COOLDOWN_MS) {
        apply(QUALITY_ORDER[idx + 1]);
        highStreak.current = 0;
      }
    } else {
      lowStreak.current = 0;
      highStreak.current = 0;
    }
  });

  return null;
}
