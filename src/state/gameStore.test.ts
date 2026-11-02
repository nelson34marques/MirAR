import { beforeEach, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { useGameStore } from './gameStore';
import { runtime } from '../game/runtime';
import { gameRandom } from '../game/spawn';
import {
  AMMO_DURATION,
  BOMB_PENALTY,
  bossAttackInterval,
  escapePenalty,
  HEAL_AMOUNT,
  MAX_HEALTH,
  SLOW_DURATION,
  SLOW_TIME_SCALE,
  TARGETS,
} from '../config/targets';
import { WAVE_COMPLETE_MS, WAVE_INTRO_MS } from '../config/waves';
import type { TargetEntity, TargetKind } from '../types';

let ids = 0;
function entity(kind: TargetKind, now: number, extra: Partial<TargetEntity> = {}): TargetEntity {
  const def = TARGETS[kind];
  ids += 1;
  return {
    id: `${kind}${ids}`,
    kind,
    hp: def.hp,
    maxHp: def.hp,
    spawnedAt: now,
    ttl: def.ttl,
    yaw: 0,
    pitch: 0,
    distance: 6,
    yawSpeed: 0,
    pitchAmp: 0,
    pitchFreq: 1,
    phase: 0,
    ...extra,
  };
}

const store = () => useGameStore.getState();

/** começa um jogo e avança até a onda estar ativa */
function startActive() {
  store().startGame();
  runtime.gameTime = WAVE_INTRO_MS + 1;
  store().tick(runtime.gameTime, 0.016, 0);
  expect(store().waveStatus).toBe('active');
}

beforeEach(() => {
  gameRandom.next = () => 0.99; // nunca deixa cair cápsulas por acaso
  runtime.events.length = 0;
  runtime.targetPositions.clear();
  store().returnToMenu();
});

describe('ondas e dano', () => {
  it('alvo que expira explode, tira vida, conta como resolvido e gera evento', () => {
    startActive();
    const now = runtime.gameTime;
    const d = entity('drone', now - TARGETS.drone.ttl - 1);
    runtime.targetPositions.set(d.id, new Vector3(0, 0, -6));
    store().addTarget(d);
    store().tick(now, 0.016, 0);
    const s = store();
    expect(s.health).toBe(MAX_HEALTH - escapePenalty(1));
    expect(s.targets).toHaveLength(0);
    expect(s.waveResolved).toBe(1);
    expect(s.lastDamageAt).toBe(now);
    expect(runtime.events.map((e) => e.type)).toEqual(['attack']);
    expect(s.messages.at(-1)?.tone).toBe('bad');
  });

  it('cápsula que expira não tira vida nem conta', () => {
    startActive();
    const now = runtime.gameTime;
    store().addTarget(entity('heal', now - TARGETS.heal.ttl - 1));
    store().tick(now, 0.016, 0);
    expect(store().health).toBe(MAX_HEALTH);
    expect(store().waveResolved).toBe(0);
  });

  it('a onda termina quando todos os alvos previstos nasceram e nenhum hostil está vivo', () => {
    startActive();
    const now = runtime.gameTime;
    const count = store().wave.targetCount;
    useGameStore.setState({ waveSpawned: count, waveResolved: count - 1 });
    store().addTarget(entity('heal', now)); // uma cápsula viva não impede o fim
    store().tick(now, 0.016, 0);
    expect(store().waveStatus).toBe('complete');
    expect(store().score).toBe(100);
    // e a seguinte começa com vida recuperada
    useGameStore.setState({ health: 50 });
    store().tick(now + WAVE_COMPLETE_MS + 1, 0.016, 0);
    expect(store().waveStatus).toBe('intro');
    expect(store().wave.index).toBe(2);
    expect(store().health).toBe(65);
    expect(store().waveSpawned).toBe(0);
    expect(store().messages.some((m) => m.text.includes('Fuzil') || m.text.includes('Rifle'))).toBe(true);
  });

  it('a onda não termina enquanto houver um alvo hostil vivo', () => {
    startActive();
    const now = runtime.gameTime;
    useGameStore.setState({ waveSpawned: store().wave.targetCount });
    store().addTarget(entity('balloon', now));
    store().tick(now, 0.016, 0);
    expect(store().waveStatus).toBe('active');
  });

  it('vida a zero termina o jogo', () => {
    startActive();
    const now = runtime.gameTime;
    useGameStore.setState({ health: 5 });
    store().addTarget(entity('balloon', now - TARGETS.balloon.ttl - 1));
    store().tick(now, 0.016, 0);
    expect(store().phase).toBe('gameover');
    expect(store().health).toBe(0);
  });

  it('o relógio do jogo não anda em pausa: alvos não expiram', () => {
    startActive();
    const now = runtime.gameTime;
    store().addTarget(entity('balloon', now));
    store().pause();
    store().tick(now + 60000, 0.016, 0);
    expect(store().targets).toHaveLength(1);
    store().resume();
    expect(store().phase).toBe('playing');
  });
});

describe('damageTarget', () => {
  it('abate soma pontos com multiplicador de combo', () => {
    startActive();
    const now = runtime.gameTime;
    useGameStore.setState({ combo: 4 });
    const b = entity('balloon', now);
    store().addTarget(b);
    expect(store().damageTarget(b.id, 1, now)).toBe('killed');
    // combo passa a 5 → multiplicador 1.5
    expect(store().score).toBe(Math.round(TARGETS.balloon.score * 1.5));
    expect(store().combo).toBe(5);
    expect(store().waveKills).toBe(1);
    expect(store().waveResolved).toBe(1);
    expect(store().targets).toHaveLength(0);
  });

  it('blindado precisa de 3 tiros', () => {
    startActive();
    const now = runtime.gameTime;
    const a = entity('armored', now);
    store().addTarget(a);
    expect(store().damageTarget(a.id, 1, now)).toBe('hit');
    expect(store().targets[0].hp).toBe(2);
    expect(store().targets[0].lastHitAt).toBe(now);
    expect(store().damageTarget(a.id, 1, now)).toBe('hit');
    expect(store().damageTarget(a.id, 1, now)).toBe('killed');
  });

  it('bomba tira vida e conta como resolvida', () => {
    startActive();
    const now = runtime.gameTime;
    const b = entity('bomb', now);
    store().addTarget(b);
    expect(store().damageTarget(b.id, 1, now)).toBe('bomb');
    expect(store().health).toBe(MAX_HEALTH - BOMB_PENALTY);
    expect(store().waveResolved).toBe(1);
    expect(store().combo).toBe(0);
  });

  it('divisor gera dois minis que contam para a onda', () => {
    startActive();
    const now = runtime.gameTime;
    const sp = entity('splitter', now);
    store().addTarget(sp);
    const spawnedBefore = store().waveSpawned;
    store().damageTarget(sp.id, 1, now);
    const s = store();
    expect(s.targets).toHaveLength(2);
    expect(s.targets.every((e) => e.kind === 'mini')).toBe(true);
    expect(s.waveSpawned).toBe(spawnedBefore + 2);
  });

  it('deixa cair uma cápsula quando a sorte permite', () => {
    startActive();
    const now = runtime.gameTime;
    gameRandom.next = () => 0.01; // drop garantido, primeiro tipo (heal)
    const b = entity('balloon', now);
    store().addTarget(b);
    store().damageTarget(b.id, 1, now);
    const s = store();
    expect(s.targets).toHaveLength(1);
    expect(TARGETS[s.targets[0].kind].category).toBe('pickup');
    expect(s.lastPickupAt).toBe(now);
  });
});

describe('power-ups', () => {
  it('vida cura até ao máximo', () => {
    startActive();
    const now = runtime.gameTime;
    useGameStore.setState({ health: 90 });
    const h = entity('heal', now);
    store().addTarget(h);
    expect(store().damageTarget(h.id, 1, now)).toBe('pickup');
    expect(store().health).toBe(MAX_HEALTH);
    useGameStore.setState({ health: 40 });
    const h2 = entity('heal', now);
    store().addTarget(h2);
    store().damageTarget(h2.id, 1, now);
    expect(store().health).toBe(40 + HEAL_AMOUNT);
    expect(runtime.events.at(-1)?.type).toBeUndefined(); // sem posição registada não há evento
  });

  it('munição infinita não gasta balas enquanto dura', () => {
    startActive();
    const now = runtime.gameTime;
    const a = entity('ammo', now);
    store().addTarget(a);
    store().damageTarget(a.id, 1, now);
    expect(store().effects.ammoUntil).toBe(now + AMMO_DURATION);
    expect(store().fire(1000)).toBe(true);
    expect(store().ammo.pistol).toBe(12);
    runtime.gameTime = now + AMMO_DURATION + 1;
    expect(store().fire(5000)).toBe(true);
    expect(store().ammo.pistol).toBe(11);
  });

  it('câmera lenta abranda o relógio e pontos a dobrar duplicam', () => {
    startActive();
    const now = runtime.gameTime;
    const sl = entity('slow', now);
    store().addTarget(sl);
    store().damageTarget(sl.id, 1, now);
    expect(runtime.timeScale).toBe(SLOW_TIME_SCALE);
    store().tick(now + SLOW_DURATION + 1, 0.016, 0);
    expect(runtime.timeScale).toBe(1);

    const d = entity('double', now);
    store().addTarget(d);
    store().damageTarget(d.id, 1, now);
    const before = store().score;
    const b = entity('balloon', now);
    store().addTarget(b);
    store().damageTarget(b.id, 1, now);
    expect(store().score - before).toBe(TARGETS.balloon.score * 2);
  });
});

describe('chefe', () => {
  it('ataca ao jogador a intervalos e cai com a vida a zero', () => {
    startActive();
    const now = runtime.gameTime;
    const boss = entity('boss', now, { hp: 2, maxHp: 2, nextAttackAt: now + 100 });
    runtime.targetPositions.set(boss.id, new Vector3(0, 0, -7));
    store().addTarget(boss);
    store().tick(now + 150, 0.016, 0);
    let s = store();
    expect(s.health).toBe(MAX_HEALTH - TARGETS.boss.attack!.damage);
    expect(s.targets[0].nextAttackAt).toBe(now + 150 + bossAttackInterval(1));
    expect(runtime.events.map((e) => e.type)).toEqual(['bossAttack']);

    expect(store().damageTarget(boss.id, 1, now + 200)).toBe('hit');
    expect(store().damageTarget(boss.id, 1, now + 300)).toBe('killed');
    s = store();
    expect(s.targets).toHaveLength(0);
    expect(s.score).toBeGreaterThanOrEqual(TARGETS.boss.score);
    expect(s.messages.at(-1)?.tone).toBe('good');
  });
});
