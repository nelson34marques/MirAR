import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore';
import { spawnBoss, spawnTarget } from '../game/spawn';
import { runtime } from '../game/runtime';
import { sfx, vibrate } from '../audio/sfx';
import { TARGETS } from '../config/targets';

/**
 * Avança o relógio do jogo e decide quando nascem novos alvos.
 * Corre dentro do Canvas para partilhar o mesmo loop de frames.
 */
export function GameDirector() {
  const nextSpawnAt = useRef(0);
  const prevWaveStatus = useRef<string>('');
  const prevPhase = useRef<string>('');
  const warnedAttackAt = useRef(0);

  // sons de transição (onda, fim de jogo) e limpeza de posições de alvos removidos
  useEffect(() => {
    return useGameStore.subscribe((s) => {
      if (s.waveStatus !== prevWaveStatus.current) {
        if (s.phase === 'playing') {
          if (s.waveStatus === 'intro') sfx.waveStart();
          if (s.waveStatus === 'complete') sfx.waveComplete();
        }
        prevWaveStatus.current = s.waveStatus;
      }
      if (s.phase !== prevPhase.current) {
        if (s.phase === 'gameover') sfx.gameOver();
        prevPhase.current = s.phase;
      }
      const ids = new Set(s.targets.map((t) => t.id));
      for (const id of runtime.targetPositions.keys()) {
        if (!ids.has(id)) runtime.targetPositions.delete(id);
      }
    });
  }, []);

  useFrame((_, dt) => {
    const realNow = performance.now();
    const clamped = Math.min(dt, 0.1);
    const store = useGameStore.getState();
    // o relógio do jogo só anda enquanto se joga, e pode abrandar (câmera lenta)
    if (store.phase === 'playing') runtime.gameTime += clamped * 1000 * runtime.timeScale;
    const now = runtime.gameTime;
    store.tick(now, clamped, realNow);

    while (runtime.events.length) {
      const ev = runtime.events.pop()!;
      switch (ev.type) {
        case 'attack':
          // explosão no sítio do alvo, abalo de câmera e som
          runtime.bursts.push({ position: ev.position, color: ev.color, count: 36 });
          runtime.bursts.push({ position: ev.position, color: '#f97316', count: 24 });
          runtime.shake += 0.07;
          sfx.escape();
          vibrate([60, 30, 60]);
          break;
        case 'bossAttack':
          runtime.bursts.push({ position: ev.position, color: '#ef4444', count: 50 });
          runtime.bursts.push({ position: ev.position, color: '#fde68a', count: 20 });
          runtime.shake += 0.12;
          sfx.bossAttack();
          vibrate([90, 40, 90, 40, 120]);
          break;
        case 'pickup':
          runtime.bursts.push({ position: ev.position, color: ev.color, count: 30 });
          runtime.bursts.push({ position: ev.position, color: '#ffffff', count: 10 });
          sfx.pickup();
          vibrate(25);
          break;
        case 'bossDown':
          runtime.bursts.push({ position: ev.position, color: ev.color, count: 90 });
          runtime.bursts.push({ position: ev.position, color: '#fde68a', count: 60 });
          runtime.shake += 0.1;
          sfx.bossDown();
          vibrate([40, 30, 40, 30, 160]);
          break;
      }
    }

    const s = useGameStore.getState();
    if (s.phase !== 'playing') {
      nextSpawnAt.current = now + 400;
      return;
    }

    // aviso sonoro pouco antes de um ataque do chefe
    for (const e of s.targets) {
      if (TARGETS[e.kind].attack && e.nextAttackAt !== undefined && e.nextAttackAt - now < 700 && warnedAttackAt.current !== e.nextAttackAt) {
        warnedAttackAt.current = e.nextAttackAt;
        sfx.bossWarn();
      }
    }

    if (s.waveStatus !== 'active') {
      nextSpawnAt.current = now + 400;
      return;
    }
    if (s.waveSpawned >= s.wave.targetCount) return;
    const hostiles = s.targets.filter((e) => TARGETS[e.kind].category !== 'pickup').length;
    if (hostiles >= s.wave.maxAlive) return;
    if (now < nextSpawnAt.current) return;

    if (s.wave.boss && s.waveSpawned === 0) {
      s.addTarget(spawnBoss(s.wave, runtime.cameraYaw, now));
      nextSpawnAt.current = now + 1800;
      return;
    }
    s.addTarget(spawnTarget(s.wave, runtime.cameraYaw, now));
    // intervalo com variação para não ficar previsível
    nextSpawnAt.current = now + s.wave.spawnInterval * (0.7 + Math.random() * 0.6);
  });

  return null;
}
